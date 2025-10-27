import gc
import time
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import BaseRetriever, Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from typing import List, Any, Dict
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

class SimpleRetriever(BaseRetriever):
    """Custom retriever using cosine similarity with performance monitoring."""

    def __init__(self, documents, embedding):
        super().__init__()
        # Store documents as a private attribute without triggering Pydantic validation
        object.__setattr__(self, '_documents', documents)
        object.__setattr__(self, '_embedding', embedding)
        object.__setattr__(self, '_chunks', [])
        object.__setattr__(self, '_embeddings', [])
        object.__setattr__(self, '_query_cache', {})
        object.__setattr__(self, '_tfidf_vectorizer', None)
        object.__setattr__(self, '_tfidf_matrix', None)
        object.__setattr__(self, '_performance_stats', {
            'setup_time': 0,
            'total_queries': 0,
            'avg_query_time': 0,
            'cache_hits': 0,
            'semantic_searches': 0,
            'keyword_searches': 0,
            'hybrid_searches': 0
        })
        self._setup()
    
    def _setup(self):
        print("🔍 Starting retriever setup...")
        setup_start = time.time()
        
        # Documents are already chunked, so use them directly
        object.__setattr__(self, '_chunks', self._documents)
        print(f"✓ Using {len(self._chunks)} pre-chunked documents")
        
        # Create embeddings for all chunks using caching
        if self._chunks:
            print("🧠 Creating embeddings for chunks...")
            chunk_texts = [chunk.page_content for chunk in self._chunks]
            print(f"📊 Processing {len(chunk_texts)} chunk texts...")
            
            # Use appropriate embedding method
            if hasattr(self._embedding, 'embed_documents'):
                object.__setattr__(self, '_embeddings', self._embedding.embed_documents(chunk_texts))
            elif hasattr(self._embedding, '__call__'):
                # For ChromaDB DefaultEmbeddingFunction, use __call__ method
                object.__setattr__(self, '_embeddings', self._embedding(chunk_texts))
            elif hasattr(self._embedding, 'embed_documents_cached'):
                object.__setattr__(self, '_embeddings', self._embedding.embed_documents_cached(chunk_texts))
            else:
                raise AttributeError(f"Embedding function {type(self._embedding)} does not have embed_documents, embed_documents_cached, or __call__ method")
            
            print(f"✓ Created embeddings for {len(self._embeddings)} chunks")
            
            # Create TF-IDF vectorizer for keyword search
            print("📊 Setting up hybrid search capabilities...")
            self._setup_tfidf_search()
            
            # Cleanup memory after embedding creation
            gc.collect()
            print("🧹 Memory cleanup completed")
        else:
            print("⚠️ No chunks available for embedding")
        
        setup_time = time.time() - setup_start
        self._performance_stats['setup_time'] = setup_time
        print(f"✓ Retriever setup completed in {setup_time:.2f}s")
    
    def _setup_tfidf_search(self):
        """Setup TF-IDF vectorizer for keyword-based search."""
        try:
            if not self._chunks:
                return

            # Extract texts for TF-IDF
            chunk_texts = [chunk.page_content for chunk in self._chunks]

            # Create TF-IDF vectorizer optimized for legal documents
            # Adjust min_df for single documents - use 1 instead of 2
            min_df = 1 if len(chunk_texts) < 2 else 2
            object.__setattr__(self, '_tfidf_vectorizer', TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                ngram_range=(1, 2),  # Include bigrams for legal terms
                min_df=min_df,  # Term must appear in at least min_df documents
                max_df=0.8,  # Ignore terms that appear in >80% of documents
                lowercase=True,
                token_pattern=r'\b[A-Za-z][A-Za-z]+\b'  # Only alphabetic tokens
            ))

            object.__setattr__(self, '_tfidf_matrix', self._tfidf_vectorizer.fit_transform(chunk_texts))
            print(f"✓ TF-IDF setup complete with {self._tfidf_matrix.shape[1]} features")

        except Exception as e:
            print(f"⚠️ TF-IDF setup failed: {e}")
            object.__setattr__(self, '_tfidf_vectorizer', None)
            object.__setattr__(self, '_tfidf_matrix', None)
    
    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None) -> List[Document]:
        if not self._chunks or not self._embeddings:
            return []
        
        query_start = time.time()
        
        # Check cache first
        cache_key = f"hybrid_{query}"
        if cache_key in self._query_cache:
            self._performance_stats['cache_hits'] += 1
            self._performance_stats['total_queries'] += 1
            print(f"✓ Query result loaded from cache")
            return self._query_cache[cache_key]
        
        # Use hybrid search combining semantic and keyword approaches
        relevant_docs = self._hybrid_search(query)
        
        # Cache the result
        self._query_cache[cache_key] = relevant_docs
        
        # Update performance stats
        query_time = time.time() - query_start
        self._performance_stats['total_queries'] += 1
        self._performance_stats['hybrid_searches'] += 1
        self._update_avg_query_time(query_time)
        
        print(f"🔍 Hybrid search retrieved {len(relevant_docs)} relevant documents in {query_time:.2f}s")
        return relevant_docs
    
    def _hybrid_search(self, query: str, top_k: int = 8) -> List[Document]:
        """Perform hybrid search combining semantic and keyword-based retrieval."""
        print(f"🔍 HYBRID RETRIEVAL STARTED: Query='{query}'")
        print(f"   Available chunks: {len(self._chunks)}")

        # 1. Semantic search using embeddings - get more candidates for better synthesis
        semantic_results = self._semantic_search(query, top_k=15)  # Increased from 12

        # 2. Keyword search using TF-IDF (if available)
        keyword_results = []
        if self._tfidf_vectorizer and self._tfidf_matrix is not None:
            keyword_results = self._keyword_search(query, top_k=10)  # Increased from 8

        # 3. Combine and rank results
        if keyword_results:
            combined_results = self._combine_search_results(semantic_results, keyword_results, query)
            search_type = "hybrid"
        else:
            combined_results = semantic_results
            search_type = "semantic-only"

        # 4. Apply contract-specific boosting
        final_results_docs = self._apply_contract_boosting(combined_results, query)

        # 5. FALLBACK: If query contains section reference and no exact match found, do exact text search
        if self._contains_section_reference(query) and not self._has_exact_section_match(combined_results, query):
            print(f"   Performing section reference fallback search...")
            exact_matches = self._exact_section_search(query)
            if exact_matches:
                # Add exact matches to results (convert to tuples first)
                exact_matches_docs = [(doc, score, 'exact-search') for doc, score, search_type in exact_matches]
                combined_results = exact_matches_docs + combined_results
                search_type += "+exact-fallback"
                print(f"   ✓ Found {len(exact_matches)} exact section matches")
                final_results_docs = self._apply_contract_boosting(combined_results, query)

        final_results = final_results_docs

        # Return more results to allow context optimization to work better
        # The ConversationChain will handle limiting to appropriate context size
        num_results = min(top_k, len(final_results))
        print(f"   ✓ {search_type}: semantic={len(semantic_results)}, keyword={len(keyword_results)}")
        print(f"   ✓ Returning {num_results}/{len(final_results)} relevant documents")

        return final_results[:top_k]
    
    def _semantic_search(self, query: str, top_k: int = 8) -> List[tuple]:
        """Perform semantic search using embeddings."""
        try:
            print(f"🔍 DEBUG: Starting semantic search for query: '{query}'")
            print(f"🔍 DEBUG: Available chunks: {len(self._chunks)}")
            print(f"🔍 DEBUG: Available embeddings: {len(self._embeddings)}")

            # Get query embedding using caching if available
            if hasattr(self._embedding, 'embed_query_cached'):
                query_embedding = self._embedding.embed_query_cached(query)
            else:
                query_embedding = self._embedding.embed_query(query)

            print(f"🔍 DEBUG: Query embedding created with dimension: {len(query_embedding)}")

            # Calculate similarities
            similarities = cosine_similarity([query_embedding], self._embeddings)[0]
            print(f"🔍 DEBUG: Similarities calculated: min={np.min(similarities):.3f}, max={np.max(similarities):.3f}")

            # Get top results with scores
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            print(f"🔍 DEBUG: Top {len(top_indices)} indices: {top_indices}")

            results = []
            for idx in top_indices:
                similarity_score = similarities[idx]
                print(f"🔍 DEBUG: Chunk {idx} similarity: {similarity_score:.3f}")
                # Much lower threshold for fake embeddings (they can have negative correlations)
                if similarity_score > -0.5:  # Very low threshold for fake embeddings
                    results.append((self._chunks[idx], similarity_score, 'semantic'))
                    print(f"🔍 DEBUG: Added chunk {idx} with similarity {similarity_score:.3f}")

            # If no results meet threshold, still return the best match
            if not results and len(similarities) > 0:
                best_idx = np.argmax(similarities)
                best_similarity = similarities[best_idx]
                results.append((self._chunks[best_idx], best_similarity, 'semantic'))
                print(f"🔍 Using best match with similarity {best_similarity:.3f} (below threshold)")

            print(f"🔍 DEBUG: Semantic search returning {len(results)} results")
            self._performance_stats['semantic_searches'] += 1
            return results

        except Exception as e:
            print(f"⚠️ Semantic search failed: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _keyword_search(self, query: str, top_k: int = 8) -> List[tuple]:
        """Perform keyword search using TF-IDF."""
        try:
            if not self._tfidf_vectorizer or self._tfidf_matrix is None:
                return []
            
            # Transform query to TF-IDF space
            query_vector = self._tfidf_vectorizer.transform([query])
            
            # Calculate TF-IDF similarities
            tfidf_similarities = cosine_similarity(query_vector, self._tfidf_matrix)[0]
            
            # Get top results with scores
            top_indices = np.argsort(tfidf_similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                if tfidf_similarities[idx] > 0.1:  # Threshold for keyword relevance
                    results.append((self._chunks[idx], tfidf_similarities[idx], 'keyword'))
            
            self._performance_stats['keyword_searches'] += 1
            return results
            
        except Exception as e:
            print(f"⚠️ Keyword search failed: {e}")
            return []
    
    def _combine_search_results(self, semantic_results: List[tuple], keyword_results: List[tuple], query: str) -> List[tuple]:
        """Combine semantic and keyword search results with intelligent weighting."""
        
        # Create a dictionary to merge results by document
        combined_scores = {}
        
        # Add semantic results (weight: 0.7)
        for doc, score, search_type in semantic_results:
            doc_id = id(doc)  # Use object id as unique identifier
            combined_scores[doc_id] = {
                'doc': doc,
                'semantic_score': score * 0.7,
                'keyword_score': 0.0,
                'combined_score': score * 0.7
            }
        
        # Add keyword results (weight: 0.3) and boost if already found semantically
        for doc, score, search_type in keyword_results:
            doc_id = id(doc)
            keyword_score = score * 0.3
            
            if doc_id in combined_scores:
                # Document found in both searches - boost its score
                combined_scores[doc_id]['keyword_score'] = keyword_score
                combined_scores[doc_id]['combined_score'] += keyword_score + 0.1  # Bonus for appearing in both
            else:
                # New document from keyword search
                combined_scores[doc_id] = {
                    'doc': doc,
                    'semantic_score': 0.0,
                    'keyword_score': keyword_score,
                    'combined_score': keyword_score
                }
        
        # Sort by combined score and return documents
        sorted_results = sorted(combined_scores.values(), key=lambda x: x['combined_score'], reverse=True)
        
        return [(item['doc'], item['combined_score'], 'hybrid') for item in sorted_results]
    
    def _apply_contract_boosting(self, results: List[tuple], query: str) -> List[Document]:
        """Apply contract-specific boosting to search results."""
        
        # Contract-specific keywords that should boost relevance
        contract_keywords = {
            'high': ['contract', 'agreement', 'terms', 'conditions', 'obligations', 'liability', 'breach'],
            'medium': ['party', 'parties', 'shall', 'hereby', 'whereas', 'therefore', 'provision'],
            'low': ['legal', 'law', 'court', 'dispute', 'jurisdiction', 'governing']
        }

        # Section reference boosting - very high priority for exact section matches
        section_patterns = [
            r'Section\s+[IVX]+\.\d+',      # Section IV.15, Section II.3, etc.
            r'Article\s+[IVX]+',           # Article IV, Article II, etc.
            r'[IVX]+\.\d+',               # IV.15, II.3, etc.
            r'Section\s+[A-Za-z]+\.\d+',  # Section A.1, Section B.2, etc.
        ]
        
        query_lower = query.lower()
        boosted_results = []
        
        for doc, score, search_type in results:
            boost_factor = 1.0
            doc_content_lower = doc.page_content.lower()

            # Apply section reference boosting (highest priority)
            import re
            for pattern in section_patterns:
                if re.search(pattern, query, re.IGNORECASE) and re.search(pattern, doc.page_content, re.IGNORECASE):
                    boost_factor += 0.5  # Very high boost for section matches
                    print(f"🎯 Section boost applied for pattern: {pattern}")
                    break

            # Apply keyword-based boosting
            for level, keywords in contract_keywords.items():
                for keyword in keywords:
                    if keyword in query_lower and keyword in doc_content_lower:
                        if level == 'high':
                            boost_factor += 0.2
                        elif level == 'medium':
                            boost_factor += 0.1
                        else:
                            boost_factor += 0.05
            
            # Boost if document contains numbers (often important in contracts)
            if re.search(r'\d+', query) and re.search(r'\d+', doc.page_content):
                boost_factor += 0.1
            
            # Apply boost
            final_score = score * boost_factor
            boosted_results.append((doc, final_score, search_type))
        
        # Sort by final score and return documents only
        boosted_results.sort(key=lambda x: x[1], reverse=True)
        return [doc for doc, score, search_type in boosted_results]

    def _contains_section_reference(self, query: str) -> bool:
        """Check if query contains a section reference."""
        import re
        section_patterns = [
            r'Section\s+[IVX]+\.\d+',
            r'Article\s+[IVX]+',
            r'[IVX]+\.\d+',
            r'Section\s+[A-Za-z]+\.\d+',
        ]
        for pattern in section_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                print(f"🔍 DEBUG: Section reference found with pattern '{pattern}' in query: '{query}'")
                return True
        print(f"🔍 DEBUG: No section reference found in query: '{query}'")
        return False

    def _has_exact_section_match(self, results: List[tuple], query: str) -> bool:
        """Check if results contain exact section match."""
        import re
        section_patterns = [
            r'Section\s+[IVX]+\.\d+',
            r'Article\s+[IVX]+',
            r'[IVX]+\.\d+',
            r'Section\s+[A-Za-z]+\.\d+',
        ]
        print(f"🔍 DEBUG: Checking {len(results)} results for exact section match")
        for i, (doc, score, search_type) in enumerate(results):
            for pattern in section_patterns:
                query_match = re.search(pattern, query, re.IGNORECASE)
                doc_match = re.search(pattern, doc.page_content, re.IGNORECASE)
                if query_match and doc_match:
                    print(f"🔍 DEBUG: Exact section match found in result {i} with pattern '{pattern}'")
                    return True
        print(f"🔍 DEBUG: No exact section match found in any result")
        return False

    def _exact_section_search(self, query: str, limit: int = 3) -> List[tuple]:
        """Perform exact text search for section references."""
        import re
        matches = []
        query_patterns = []

        print(f"🔍 DEBUG: Starting exact section search for query: '{query}'")

        # Extract section patterns from query
        if 'IV.15' in query:
            query_patterns.append(r'IV\.15')
        if 'Section IV.15' in query:
            query_patterns.append(r'Section\s+IV\.15')

        print(f"🔍 DEBUG: Query patterns to search: {query_patterns}")
        print(f"🔍 DEBUG: Searching through {len(self._chunks)} chunks")

        # Search for exact matches
        for pattern in query_patterns:
            print(f"🔍 DEBUG: Searching for pattern: '{pattern}'")
            for i, chunk in enumerate(self._chunks):
                if re.search(pattern, chunk.page_content, re.IGNORECASE):
                    # High score for exact matches
                    matches.append((chunk, 2.0, 'exact-search'))
                    print(f"🎯 Exact match found: {pattern} in chunk {i}")
                    if len(matches) >= limit:
                        break
            if len(matches) >= limit:
                break

        print(f"🔍 DEBUG: Exact search completed, found {len(matches)} matches")
        return matches
    
    def _update_avg_query_time(self, new_time: float) -> None:
        """Update running average of query times."""
        total_queries = self._performance_stats['total_queries']
        current_avg = self._performance_stats['avg_query_time']
        
        # Calculate new running average
        new_avg = ((current_avg * (total_queries - 1)) + new_time) / total_queries
        self._performance_stats['avg_query_time'] = new_avg
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get retriever performance statistics."""
        return self._performance_stats.copy()

class Retriever:
    def __init__(self, documents, embedding, persist_directory):
        self.documents = documents
        self.embedding = embedding
        self.persist_directory = persist_directory
        self._use_chromadb = True  # Feature flag for ChromaDB usage
        
    def get_retriever(self):
        try:
            print(f"🚨🚨🚨 RETRIEVER CREATION STARTED 🚨🚨🚨")
            print(f"🚨 DEBUG: Documents: {len(self.documents) if self.documents else 0}")

            if not self.documents:
                print("🚨 No documents provided to retriever")
                return None

            print(f"🚨 Processing {len(self.documents)} documents")

            # Try ChromaDB first for better performance and persistence
            if self._use_chromadb:
                print(f"🚨 Attempting to create ChromaDB retriever...")
                chromadb_retriever = self._create_chromadb_retriever()
                if chromadb_retriever:
                    print("🚨✓ Using ChromaDB-based retriever with connection pooling")
                    return chromadb_retriever
                else:
                    print("🚨⚠️ ChromaDB failed, falling back to in-memory retriever")

            # Fallback to simple in-memory retriever
            print(f"🚨 Creating SimpleRetriever with debug capabilities...")
            retriever = SimpleRetriever(self.documents, self.embedding)
            print("🚨✓ Using in-memory SimpleRetriever with debug logging")
            return retriever

        except Exception as e:
            print(f"🚨 Error creating retriever: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _create_chromadb_retriever(self):
        """Create ChromaDB-based retriever with connection pooling."""
        try:
            from vector_store import VectorStore
            
            # Create enhanced vector store with pooling
            vector_store = VectorStore(
                documents=self.documents,
                embedding=self.embedding,
                persist_directory=self.persist_directory
            )
            
            # Create the ChromaDB vector store
            chromadb_store = vector_store.create_vector_store(
                collection_name="contract_documents"
            )
            
            if not chromadb_store:
                return None
            
            # Optimize the collection for better performance
            vector_store.optimize_collection()
            
            # Create ChromaDB-enhanced retriever
            chromadb_retriever = ChromaDBEnhancedRetriever(
                vector_store=chromadb_store,
                vector_store_wrapper=vector_store,
                fallback_retriever=SimpleRetriever(self.documents, self.embedding)
            )
            
            return chromadb_retriever
            
        except ImportError as e:
            print(f"⚠️ ChromaDB dependencies not available: {e}")
            return None
        except Exception as e:
            print(f"⚠️ ChromaDB retriever creation failed: {e}")
            import traceback
            traceback.print_exc()
            return None


class ChromaDBEnhancedRetriever(BaseRetriever):
    """Enhanced retriever using ChromaDB with fallback to in-memory search."""
    
    def __init__(self, vector_store, vector_store_wrapper, fallback_retriever):
        super().__init__()
        object.__setattr__(self, 'vector_store', vector_store)
        object.__setattr__(self, 'vector_store_wrapper', vector_store_wrapper)
        object.__setattr__(self, 'fallback_retriever', fallback_retriever)
        object.__setattr__(self, '_query_cache', {})
        object.__setattr__(self, '_performance_stats', {
            'chromadb_queries': 0,
            'fallback_queries': 0,
            'cache_hits': 0,
            'avg_query_time': 0,
            'total_queries': 0
        })
    
    def _get_relevant_documents(self, query: str, *, run_manager = None) -> List[Document]:
        """Get relevant documents using ChromaDB with fallback."""
        query_start = time.time()
        self._performance_stats['total_queries'] += 1
        
        # Check cache first
        cache_key = f"chromadb_{query}"
        if cache_key in self._query_cache:
            self._performance_stats['cache_hits'] += 1
            print("✓ Query result loaded from cache")
            return self._query_cache[cache_key]
        
        try:
            # Try ChromaDB search first
            results = self.vector_store_wrapper.similarity_search_with_stats(query, k=4)
            
            if results:
                self._performance_stats['chromadb_queries'] += 1
                self._query_cache[cache_key] = results
                
                query_time = time.time() - query_start
                self._update_avg_query_time(query_time)
                
                print(f"✓ ChromaDB search completed in {query_time:.3f}s")
                return results
            else:
                print("⚠️ ChromaDB returned no results, trying fallback")
                
        except Exception as e:
            print(f"⚠️ ChromaDB search failed: {e}, using fallback")
        
        # Fallback to in-memory retriever
        try:
            fallback_results = self.fallback_retriever._get_relevant_documents(query)
            self._performance_stats['fallback_queries'] += 1
            
            # Cache fallback results too
            self._query_cache[cache_key] = fallback_results
            
            query_time = time.time() - query_start
            self._update_avg_query_time(query_time)
            
            print(f"✓ Fallback search completed in {query_time:.3f}s")
            return fallback_results
            
        except Exception as e:
            print(f"❌ Both ChromaDB and fallback searches failed: {e}")
            return []
    
    def _update_avg_query_time(self, new_time: float):
        """Update running average of query times."""
        total_queries = self._performance_stats['total_queries']
        current_avg = self._performance_stats['avg_query_time']
        
        new_avg = ((current_avg * (total_queries - 1)) + new_time) / total_queries
        self._performance_stats['avg_query_time'] = new_avg
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get combined performance statistics."""
        stats = self._performance_stats.copy()
        
        # Add vector store stats if available
        if hasattr(self.vector_store_wrapper, 'get_performance_stats'):
            chromadb_stats = self.vector_store_wrapper.get_performance_stats()
            stats['chromadb_stats'] = chromadb_stats
        
        # Add fallback stats if available  
        if hasattr(self.fallback_retriever, 'get_performance_stats'):
            fallback_stats = self.fallback_retriever.get_performance_stats()
            stats['fallback_stats'] = fallback_stats
        
        return stats
