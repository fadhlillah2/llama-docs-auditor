import gc
import time
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import BaseRetriever, Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from typing import List, Any, Dict, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SimpleRetriever(BaseRetriever):
    """Custom retriever using cosine similarity with performance monitoring."""
    
    def __init__(self, documents, embedding):
        super().__init__()
        self._documents = documents
        self._embedding = embedding
        self._chunks = []
        self._embeddings = []
        self._query_cache: Dict[str, List[Document]] = {}
        self._performance_stats = {
            'setup_time': 0,
            'total_queries': 0,
            'avg_query_time': 0,
            'cache_hits': 0
        }
        self._setup()
    
    def _setup(self):
        print("🔍 Starting retriever setup...")
        setup_start = time.time()
        
        # Documents are already chunked, so use them directly
        self._chunks = self._documents
        print(f"✓ Using {len(self._chunks)} pre-chunked documents")
        
        # Create embeddings for all chunks using caching
        if self._chunks:
            print("🧠 Creating embeddings for chunks...")
            chunk_texts = [chunk.page_content for chunk in self._chunks]
            print(f"📊 Processing {len(chunk_texts)} chunk texts...")
            
            # Use cached embedding method if available
            if hasattr(self._embedding, 'embed_documents_cached'):
                self._embeddings = self._embedding.embed_documents_cached(chunk_texts)
            else:
                self._embeddings = self._embedding.embed_documents(chunk_texts)
            
            print(f"✓ Created embeddings for {len(self._embeddings)} chunks")
            
            # Cleanup memory after embedding creation
            gc.collect()
            print("🧹 Memory cleanup completed")
        else:
            print("⚠️ No chunks available for embedding")
        
        setup_time = time.time() - setup_start
        self._performance_stats['setup_time'] = setup_time
        print(f"✓ Retriever setup completed in {setup_time:.2f}s")
    
    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None) -> List[Document]:
        if not self._chunks or not self._embeddings:
            return []
        
        query_start = time.time()
        
        # Check cache first
        if query in self._query_cache:
            self._performance_stats['cache_hits'] += 1
            self._performance_stats['total_queries'] += 1
            print(f"✓ Query result loaded from cache")
            return self._query_cache[query]
        
        # Get query embedding using caching if available
        if hasattr(self._embedding, 'embed_query_cached'):
            query_embedding = self._embedding.embed_query_cached(query)
        else:
            query_embedding = self._embedding.embed_query(query)
        
        # Calculate similarities
        similarities = cosine_similarity([query_embedding], self._embeddings)[0]
        
        # Get top 4 most similar chunks with relevance threshold
        top_indices = np.argsort(similarities)[-6:][::-1]  # Get top 6 for better selection
        
        # Filter by relevance threshold (0.3 is a reasonable threshold for contract documents)
        relevant_docs = []
        for idx in top_indices[:4]:  # Still return top 4
            if similarities[idx] > 0.3:
                relevant_docs.append(self._chunks[idx])
        
        # If no docs meet threshold, return the top 2 anyway
        if not relevant_docs:
            relevant_docs = [self._chunks[i] for i in top_indices[:2]]
        
        # Cache the result
        self._query_cache[query] = relevant_docs
        
        # Update performance stats
        query_time = time.time() - query_start
        self._performance_stats['total_queries'] += 1
        self._update_avg_query_time(query_time)
        
        print(f"🔍 Retrieved {len(relevant_docs)} relevant documents in {query_time:.2f}s")
        return relevant_docs
    
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
        

    def get_retriever(self):
        try:
            if not self.documents:
                print("No documents provided to retriever")
                return None
                
            print(f"Processing {len(self.documents)} documents")
            
            # Create simple retriever
            retriever = SimpleRetriever(self.documents, self.embedding)
            
            print("Retriever created successfully!")
            return retriever
            
        except Exception as e:
            print(f"Error creating retriever: {e}")
            import traceback
            traceback.print_exc()
            return None
