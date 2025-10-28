"""
Optimized Vector Store and Retriever with Enhanced Performance
Advanced caching, memory management, and hybrid search capabilities
"""

import os
import time
import json
import hashlib
import pickle
import gc
import psutil
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks.manager import CallbackManagerForRetrieverRun
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RetrievalConfig:
    """Configuration for optimized retrieval operations."""
    # Search parameters
    top_k: int = 10
    similarity_threshold: float = 0.3
    hybrid_weight: float = 0.7  # Weight for semantic search vs keyword search

    # Caching
    enable_query_cache: bool = True
    enable_result_cache: bool = True
    query_cache_size: int = 1000
    result_cache_ttl: int = 3600  # 1 hour

    # Performance
    enable_parallel_search: bool = True
    max_workers: int = 4
    batch_retrieval: bool = True
    batch_size: int = 5

    # Memory management
    enable_memory_optimization: bool = True
    max_memory_mb: int = 1024
    cleanup_interval: int = 50

    # Vector storage
    use_approximate_search: bool = False
    index_type: str = "exact"  # "exact", "hnsw", "ivf"

class OptimizedVectorStore:
    """Optimized vector store with advanced indexing and caching."""

    def __init__(self, config: RetrievalConfig):
        self.config = config
        self.documents: List[Document] = []
        self.embeddings: List[List[float]] = []
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None

        # Caching systems
        self.query_cache = {}
        self.result_cache = {}
        self.cache_timestamps = {}

        # Performance tracking
        self.stats = {
            'total_queries': 0,
            'cache_hits': 0,
            'avg_query_time': 0.0,
            'total_query_time': 0.0,
            'memory_cleanups': 0,
            'documents_indexed': 0,
            'embeddings_stored': 0
        }

        # Memory management
        self.process = psutil.Process()
        self.query_count = 0

        # Initialize storage
        self._initialize_storage()

    def _initialize_storage(self):
        """Initialize storage backends and indexes."""
        logger.info("🔧 Initializing optimized vector store...")
        self.cache_dir = Path("cache/vector_store")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Load persistent caches if available
        self._load_caches()

        logger.info("✓ Vector store initialized")

    def _load_caches(self):
        """Load persistent caches from disk."""
        try:
            query_cache_file = self.cache_dir / "query_cache.pkl"
            if query_cache_file.exists():
                with open(query_cache_file, 'rb') as f:
                    self.query_cache = pickle.load(f)
                logger.info(f"✓ Loaded {len(self.query_cache)} cached queries")

            result_cache_file = self.cache_dir / "result_cache.pkl"
            if result_cache_file.exists():
                with open(result_cache_file, 'rb') as f:
                    cache_data = pickle.load(f)
                    self.result_cache = cache_data['results']
                    self.cache_timestamps = cache_data['timestamps']
                logger.info(f"✓ Loaded {len(self.result_cache)} cached results")
        except Exception as e:
            logger.warning(f"Error loading caches: {e}")

    def _save_caches(self):
        """Save caches to disk."""
        try:
            # Save query cache
            query_cache_file = self.cache_dir / "query_cache.pkl"
            with open(query_cache_file, 'wb') as f:
                pickle.dump(self.query_cache, f)

            # Save result cache
            result_cache_file = self.cache_dir / "result_cache.pkl"
            with open(result_cache_file, 'wb') as f:
                pickle.dump({
                    'results': self.result_cache,
                    'timestamps': self.cache_timestamps
                }, f)

            logger.debug("✓ Caches saved to disk")
        except Exception as e:
            logger.warning(f"Error saving caches: {e}")

    def _get_query_hash(self, query: str, top_k: int) -> str:
        """Generate hash for query caching."""
        content = f"{query}:{top_k}:{self.config.similarity_threshold}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def _cleanup_expired_cache(self):
        """Remove expired entries from result cache."""
        current_time = time.time()
        expired_keys = []

        for key, timestamp in self.cache_timestamps.items():
            if current_time - timestamp > self.config.result_cache_ttl:
                expired_keys.append(key)

        for key in expired_keys:
            self.result_cache.pop(key, None)
            self.cache_timestamps.pop(key, None)

        if expired_keys:
            logger.debug(f"🗑️  Removed {len(expired_keys)} expired cache entries")

    def _manage_memory(self):
        """Manage memory usage during operations."""
        if not self.config.enable_memory_optimization:
            return

        self.query_count += 1

        # Cleanup memory at intervals
        if self.query_count % self.config.cleanup_interval == 0:
            current_memory = self.process.memory_info().rss / 1024 / 1024

            if current_memory > self.config.max_memory_mb:
                logger.info(f"🧹 Memory cleanup triggered (current: {current_memory:.1f}MB)")

                # Cleanup caches
                self._cleanup_expired_cache()

                # Limit query cache size
                if len(self.query_cache) > self.config.query_cache_size:
                    # Remove oldest entries
                    keys_to_remove = list(self.query_cache.keys())[:-self.config.query_cache_size//2]
                    for key in keys_to_remove:
                        self.query_cache.pop(key, None)
                    logger.debug(f"🗑️  Removed {len(keys_to_remove)} query cache entries")

                # Force garbage collection
                gc.collect()
                self.stats['memory_cleanups'] += 1

                new_memory = self.process.memory_info().rss / 1024 / 1024
                logger.info(f"✓ Memory cleanup completed (new: {new_memory:.1f}MB)")

    def add_documents(self, documents: List[Document], embeddings: List[List[float]]):
        """Add documents and embeddings to the store."""
        start_time = time.time()

        if not documents or not embeddings:
            logger.warning("⚠️  No documents or embeddings provided")
            return

        if len(documents) != len(embeddings):
            raise ValueError(f"Documents ({len(documents)}) and embeddings ({len(embeddings)}) count mismatch")

        # Add to store
        self.documents.extend(documents)
        self.embeddings.extend(embeddings)

        # Update TF-IDF
        self._update_tfidf_index(documents)

        # Update statistics
        self.stats['documents_indexed'] += len(documents)
        self.stats['embeddings_stored'] += len(embeddings)

        logger.info(f"✓ Added {len(documents)} documents to vector store in {time.time() - start_time:.2f}s")

        # Save caches periodically
        if len(self.documents) % 100 == 0:
            self._save_caches()

    def _update_tfidf_index(self, new_documents: List[Document]):
        """Update TF-IDF index for hybrid search."""
        try:
            # Extract texts from all documents
            all_texts = [doc.page_content for doc in self.documents]

            # Create or update TF-IDF vectorizer
            if self.tfidf_vectorizer is None:
                self.tfidf_vectorizer = TfidfVectorizer(
                    max_features=5000,
                    stop_words='english',
                    ngram_range=(1, 2),
                    min_df=1,
                    max_df=0.8,
                    lowercase=True,
                    token_pattern=r'\b[A-Za-z][A-Za-z]+\b'
                )

            # Update TF-IDF matrix
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts)

            logger.debug(f"✓ TF-IDF index updated with {len(all_texts)} documents")
        except Exception as e:
            logger.warning(f"Error updating TF-IDF index: {e}")

    def _semantic_search(self, query_embedding: List[float], top_k: int) -> List[Tuple[int, float]]:
        """Perform semantic search using cosine similarity."""
        if not self.embeddings:
            return []

        # Convert to numpy arrays
        query_array = np.array(query_embedding).reshape(1, -1)
        embeddings_array = np.array(self.embeddings)

        # Calculate similarities
        similarities = cosine_similarity(query_array, embeddings_array)[0]

        # Get top results
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = [(int(idx), float(similarities[idx])) for idx in top_indices if similarities[idx] > self.config.similarity_threshold]

        return results

    def _keyword_search(self, query: str, top_k: int) -> List[Tuple[int, float]]:
        """Perform keyword search using TF-IDF."""
        if self.tfidf_vectorizer is None or self.tfidf_matrix is None:
            return []

        try:
            # Transform query
            query_vector = self.tfidf_vectorizer.transform([query])

            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.tfidf_matrix)[0]

            # Get top results
            top_indices = np.argsort(similarities)[::-1][:top_k]
            results = [(int(idx), float(similarities[idx])) for idx in top_indices if similarities[idx] > 0.1]

            return results
        except Exception as e:
            logger.warning(f"Error in keyword search: {e}")
            return []

    def _hybrid_search(self, query: str, query_embedding: List[float], top_k: int) -> List[Tuple[int, float]]:
        """Perform hybrid search combining semantic and keyword search."""
        # Get results from both searches
        semantic_results = dict(self._semantic_search(query_embedding, top_k * 2))
        keyword_results = dict(self._keyword_search(query, top_k * 2))

        # Combine results with weights
        combined_scores = {}

        # Add semantic scores
        for idx, score in semantic_results.items():
            combined_scores[idx] = score * self.config.hybrid_weight

        # Add keyword scores
        for idx, score in keyword_results.items():
            if idx in combined_scores:
                combined_scores[idx] += score * (1 - self.config.hybrid_weight)
            else:
                combined_scores[idx] = score * (1 - self.config.hybrid_weight)

        # Sort by combined score
        sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_results[:top_k]

    def search(self, query: str, query_embedding: List[float], top_k: Optional[int] = None) -> List[Document]:
        """Search for similar documents."""
        start_time = time.time()
        top_k = top_k or self.config.top_k

        self.stats['total_queries'] += 1

        # Check query cache
        if self.config.enable_query_cache:
            query_hash = self._get_query_hash(query, top_k)
            if query_hash in self.query_cache:
                self.stats['cache_hits'] += 1
                cached_indices = self.query_cache[query_hash]
                results = [self.documents[idx] for idx in cached_indices if idx < len(self.documents)]
                logger.debug(f"Cache hit for query: {query[:50]}...")
                return results

        # Check result cache
        if self.config.enable_result_cache:
            result_key = self._get_query_hash(query, top_k)
            if result_key in self.result_cache:
                current_time = time.time()
                if current_time - self.cache_timestamps[result_key] < self.config.result_cache_ttl:
                    self.stats['cache_hits'] += 1
                    logger.debug(f"Result cache hit for query: {query[:50]}...")
                    return self.result_cache[result_key]

        # Perform search
        if self.config.hybrid_weight < 1.0:
            # Hybrid search
            search_results = self._hybrid_search(query, query_embedding, top_k)
        else:
            # Semantic search only
            search_results = self._semantic_search(query_embedding, top_k)

        # Convert to documents
        results = []
        for idx, score in search_results:
            if idx < len(self.documents):
                doc = self.documents[idx]
                doc.metadata['similarity_score'] = score
                doc.metadata['search_method'] = 'hybrid' if self.config.hybrid_weight < 1.0 else 'semantic'
                results.append(doc)

        # Cache results
        if self.config.enable_query_cache and search_results:
            query_hash = self._get_query_hash(query, top_k)
            self.query_cache[query_hash] = [idx for idx, _ in search_results]

        if self.config.enable_result_cache and results:
            result_key = self._get_query_hash(query, top_k)
            self.result_cache[result_key] = results
            self.cache_timestamps[result_key] = time.time()

        # Update statistics
        query_time = time.time() - start_time
        self.stats['total_query_time'] += query_time
        self.stats['avg_query_time'] = self.stats['total_query_time'] / self.stats['total_queries']

        # Memory management
        self._manage_memory()

        logger.debug(f"Search completed in {query_time:.3f}s, found {len(results)} results")
        return results

    def batch_search(self, queries: List[str], query_embeddings: List[List[float]], top_k: Optional[int] = None) -> List[List[Document]]:
        """Perform batch search for multiple queries."""
        if not self.config.batch_retrieval:
            # Sequential processing
            return [self.search(q, emb, top_k) for q, emb in zip(queries, query_embeddings)]

        start_time = time.time()
        top_k = top_k or self.config.top_k

        if len(queries) != len(query_embeddings):
            raise ValueError("Queries and embeddings count mismatch")

        # Process in batches
        all_results = []
        batch_size = self.config.batch_size

        for i in range(0, len(queries), batch_size):
            batch_queries = queries[i:i + batch_size]
            batch_embeddings = query_embeddings[i:i + batch_size]

            if self.config.enable_parallel_search and len(batch_queries) > 1:
                # Parallel processing
                with ThreadPoolExecutor(max_workers=min(self.config.max_workers, len(batch_queries))) as executor:
                    futures = [
                        executor.submit(self.search, q, emb, top_k)
                        for q, emb in zip(batch_queries, batch_embeddings)
                    ]

                    batch_results = []
                    for future in futures:
                        try:
                            result = future.result()
                            batch_results.append(result)
                        except Exception as e:
                            logger.warning(f"Error in parallel search: {e}")
                            batch_results.append([])

                    all_results.extend(batch_results)
            else:
                # Sequential processing
                for q, emb in zip(batch_queries, batch_embeddings):
                    result = self.search(q, emb, top_k)
                    all_results.append(result)

        avg_time = (time.time() - start_time) / len(queries)
        logger.info(f"Batch search completed: {len(queries)} queries in {time.time() - start_time:.2f}s (avg: {avg_time:.3f}s)")

        return all_results

    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics."""
        return {
            **self.stats,
            'document_count': len(self.documents),
            'embedding_count': len(self.embeddings),
            'cache_sizes': {
                'query_cache': len(self.query_cache),
                'result_cache': len(self.result_cache)
            },
            'memory_usage_mb': self.process.memory_info().rss / 1024 / 1024,
            'avg_query_time': self.stats['avg_query_time'],
            'cache_hit_rate': self.stats['cache_hits'] / max(self.stats['total_queries'], 1)
        }

class OptimizedRetriever(BaseRetriever):
    """Optimized retriever with enhanced performance and caching."""

    def __init__(self, documents: List[Document], embeddings: List[List[float]], config: Optional[RetrievalConfig] = None):
        super().__init__()
        self.config = config or RetrievalConfig()
        self.vector_store = OptimizedVectorStore(self.config)
        self.embedding_function = None

        # Store documents and embeddings
        self.vector_store.add_documents(documents, embeddings)

        # Initialize embedding function
        self._initialize_embedding_function()

        # Performance tracking
        self.retrieval_stats = {
            'total_retrievals': 0,
            'documents_returned': 0,
            'avg_retrieval_time': 0.0,
            'total_retrieval_time': 0.0
        }

        logger.info(f"✅ Optimized retriever initialized with {len(documents)} documents")

    def _initialize_embedding_function(self):
        """Initialize embedding function for queries."""
        try:
            from rag.embedding import EmbeddingsCreator
            embedding_creator = EmbeddingsCreator()
            self.embedding_function = embedding_creator.create_embeddings()
            logger.info("✓ Embedding function initialized")
        except Exception as e:
            logger.error(f"Failed to initialize embedding function: {e}")
            raise

    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> List[Document]:
        """Retrieve relevant documents for a query."""
        start_time = time.time()

        try:
            # Generate query embedding
            if hasattr(self.embedding_function, 'embed_query'):
                query_embedding = self.embedding_function.embed_query(query)
            elif hasattr(self.embedding_function, '__call__'):
                query_embedding = self.embedding_function([query])[0]
            else:
                raise AttributeError("Embedding function doesn't have required methods")

            # Search vector store
            results = self.vector_store.search(query, query_embedding, self.config.top_k)

            # Update statistics
            retrieval_time = time.time() - start_time
            self.retrieval_stats['total_retrievals'] += 1
            self.retrieval_stats['documents_returned'] += len(results)
            self.retrieval_stats['total_retrieval_time'] += retrieval_time
            self.retrieval_stats['avg_retrieval_time'] = self.retrieval_stats['total_retrieval_time'] / self.retrieval_stats['total_retrievals']

            logger.debug(f"Retrieved {len(results)} documents in {retrieval_time:.3f}s")
            return results

        except Exception as e:
            logger.error(f"Error in document retrieval: {e}")
            return []

    def batch_retrieve(self, queries: List[str]) -> List[List[Document]]:
        """Retrieve documents for multiple queries."""
        start_time = time.time()

        try:
            # Generate query embeddings
            if hasattr(self.embedding_function, 'embed_documents'):
                query_embeddings = self.embedding_function.embed_documents(queries)
            elif hasattr(self.embedding_function, '__call__'):
                query_embeddings = self.embedding_function(queries)
            else:
                # Fallback to individual embedding
                query_embeddings = []
                for query in queries:
                    if hasattr(self.embedding_function, 'embed_query'):
                        emb = self.embedding_function.embed_query(query)
                    else:
                        emb = self.embedding_function([query])[0]
                    query_embeddings.append(emb)

            # Batch search
            results = self.vector_store.batch_search(queries, query_embeddings, self.config.top_k)

            # Update statistics
            retrieval_time = time.time() - start_time
            total_docs = sum(len(docs) for docs in results)

            self.retrieval_stats['total_retrievals'] += len(queries)
            self.retrieval_stats['documents_returned'] += total_docs
            self.retrieval_stats['total_retrieval_time'] += retrieval_time
            self.retrieval_stats['avg_retrieval_time'] = self.retrieval_stats['total_retrieval_time'] / self.retrieval_stats['total_retrievals']

            logger.info(f"Batch retrieved {total_docs} documents for {len(queries)} queries in {retrieval_time:.2f}s")
            return results

        except Exception as e:
            logger.error(f"Error in batch retrieval: {e}")
            return [[] for _ in queries]

    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics."""
        return {
            'retrieval_stats': self.retrieval_stats,
            'vector_store_stats': self.vector_store.get_stats(),
            'config': {
                'top_k': self.config.top_k,
                'similarity_threshold': self.config.similarity_threshold,
                'hybrid_weight': self.config.hybrid_weight,
                'enable_caching': self.config.enable_query_cache and self.config.enable_result_cache,
                'enable_parallel_search': self.config.enable_parallel_search,
                'max_workers': self.config.max_workers
            }
        }

    def save_state(self):
        """Save current state to disk."""
        try:
            self.vector_store._save_caches()
            logger.info("✓ Retriever state saved")
        except Exception as e:
            logger.warning(f"Error saving retriever state: {e}")

# Utility function for easy usage
def create_optimized_retriever(
    documents: List[Document],
    embeddings: List[List[float]],
    top_k: int = 10,
    hybrid_search: bool = True,
    enable_caching: bool = True,
    parallel_search: bool = True,
    max_workers: int = 4
) -> OptimizedRetriever:
    """Create an optimized retriever with sensible defaults."""
    config = RetrievalConfig(
        top_k=top_k,
        hybrid_weight=0.7 if hybrid_search else 1.0,
        enable_query_cache=enable_caching,
        enable_result_cache=enable_caching,
        enable_parallel_search=parallel_search,
        max_workers=max_workers
    )

    return OptimizedRetriever(documents, embeddings, config)

# Example usage
if __name__ == "__main__":
    from langchain_core.documents import Document

    # Create sample documents
    documents = [
        Document(page_content="This is a sample contract document about payment terms.", metadata={"source": "contract1.pdf"}),
        Document(page_content="Indonesian law requires specific clauses for service agreements.", metadata={"source": "law_doc.txt"}),
        Document(page_content="The payment schedule is outlined in section 3.1 of the agreement.", metadata={"source": "contract1.pdf"})
    ]

    # Create sample embeddings
    embeddings = [
        [0.1, 0.2, 0.3] * 128,  # Dummy 384-dim embeddings
        [0.2, 0.3, 0.4] * 128,
        [0.3, 0.4, 0.5] * 128
    ]

    # Create optimized retriever
    retriever = create_optimized_retriever(documents, embeddings)

    # Test retrieval
    results = retriever.invoke("What are the payment terms?")
    print(f"✓ Retrieved {len(results)} documents")
    for i, doc in enumerate(results):
        print(f"  {i+1}. {doc.page_content[:100]}... (score: {doc.metadata.get('similarity_score', 0):.3f})")

    # Show statistics
    stats = retriever.get_comprehensive_stats()
    print(f"\n📊 Retrieval Statistics:")
    print(f"   Avg retrieval time: {stats['retrieval_stats']['avg_retrieval_time']:.3f}s")
    print(f"   Cache hit rate: {stats['vector_store_stats']['cache_hit_rate']:.1%}")
    print(f"   Total queries: {stats['vector_store_stats']['total_queries']}")