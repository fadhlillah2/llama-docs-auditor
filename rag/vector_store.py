import os
import time
import threading
from typing import Dict
from langchain_community.vectorstores import Chroma
import chromadb
from chromadb.config import Settings


class ChromaDBConnectionPool:
    """Thread-safe connection pool for ChromaDB instances."""
    
    def __init__(self, max_connections: int = 5, persist_directory: str = None):
        self.max_connections = max_connections
        self.persist_directory = persist_directory
        self._connections: Dict[str, chromadb.PersistentClient] = {}
        self._connection_count = 0
        self._lock = threading.RLock()
        
    def get_client(self, persist_directory: str = None) -> chromadb.PersistentClient:
        """Get or create a ChromaDB client for the specified directory."""
        directory = persist_directory or self.persist_directory
        
        with self._lock:
            # Use existing connection if available
            if directory in self._connections:
                return self._connections[directory]
            
            # Check connection limit
            if self._connection_count >= self.max_connections:
                # Find least recently used connection to remove
                oldest_dir = min(self._connections.keys(), 
                               key=lambda d: os.path.getmtime(d) if os.path.exists(d) else 0)
                self._connections.pop(oldest_dir, None)
                self._connection_count -= 1
            
            # Create new connection with optimized settings
            client = chromadb.PersistentClient(
                path=directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                    is_persistent=True
                )
            )
            
            self._connections[directory] = client
            self._connection_count += 1
            print(f"✓ ChromaDB connection pool: created connection for {directory}")
            
            return client
    

# Global connection pool instance
_connection_pool = ChromaDBConnectionPool()


class VectorStore:
    """Enhanced vector store with ChromaDB connection pooling and optimization."""
    
    def __init__(self, documents, embedding, persist_directory):
        self.documents = documents
        self.embedding = embedding
        self.persist_directory = persist_directory
        self._vector_store = None
        self._performance_stats = {
            'creation_time': 0,
            'total_queries': 0,
            'avg_query_time': 0,
            'cache_enabled': True
        }

    def create_vector_store(self, collection_name: str = "contract_documents"):
        """Creates optimized ChromaDB vector store with connection pooling."""
        print(f"🗃️ Creating ChromaDB vector store at {self.persist_directory}")
        creation_start = time.time()
        
        try:
            # Ensure persist directory exists
            os.makedirs(self.persist_directory, exist_ok=True)
            
            # Get pooled client
            client = _connection_pool.get_client(self.persist_directory)
            
            # Configure collection settings optimized for contract documents
            collection_metadata = {
                # HNSW Index settings optimized for legal document similarity search
                "hnsw:space": "cosine",  # Cosine similarity best for normalized text embeddings
                "hnsw:construction_ef": 400,  # Higher for better index quality (trade-off with build time)
                "hnsw:M": 32,  # Higher connectivity for better recall on legal queries
                "hnsw:search_ef": 200,  # Higher search effort for better precision
                "hnsw:num_threads": 4,  # Multi-threading for faster operations
                
                # Contract-specific optimizations
                "description": "Contract document embeddings optimized for legal Q&A",
                "document_type": "legal_contracts",
                "embedding_model": "sentence-transformers",
                "optimization_target": "precision_over_speed",  # Legal accuracy is critical
                
                # Performance settings
                "batch_size": 50,  # Optimal batch size for contract documents
                "max_elements": 10000,  # Support for large contract collections
                "allow_replace_deleted": True  # Enable updates/deletions
            }
            
            # Create or get collection with optimized settings
            try:
                collection = client.get_collection(
                    name=collection_name,
                    embedding_function=None  # We'll handle embeddings ourselves
                )
                print(f"✓ Using existing ChromaDB collection: {collection_name}")
            except Exception as e:
                # Collection doesn't exist, create with metadata
                print(f"⚠️ Collection not found, creating new collection: {e}")
                collection = client.create_collection(
                    name=collection_name,
                    metadata=collection_metadata,
                    embedding_function=None
                )
                print(f"✓ Created new ChromaDB collection: {collection_name}")
            
            # Create Langchain Chroma wrapper with pooled client
            if self.documents:
                self._vector_store = Chroma.from_documents(
                    documents=self.documents,
                    embedding=self.embedding,
                    persist_directory=self.persist_directory,
                    collection_name=collection_name,
                    client=client
                )
                print(f"✓ Added {len(self.documents)} documents to ChromaDB")
            else:
                # Create empty vector store for incremental addition
                self._vector_store = Chroma(
                    persist_directory=self.persist_directory,
                    embedding_function=self.embedding,
                    collection_name=collection_name,
                    client=client
                )
                print("✓ Created empty ChromaDB vector store")
            
            creation_time = time.time() - creation_start
            self._performance_stats['creation_time'] = creation_time
            print(f"✓ ChromaDB vector store created in {creation_time:.2f}s")
            
            return self._vector_store
            
        except Exception as e:
            print(f"❌ Failed to create ChromaDB vector store: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def similarity_search_with_stats(self, query: str, k: int = 4):
        """Perform similarity search with performance tracking."""
        if not self._vector_store:
            print("❌ Vector store not initialized")
            return []
        
        query_start = time.time()
        
        try:
            results = self._vector_store.similarity_search(query, k=k)
            
            query_time = time.time() - query_start
            self._update_query_stats(query_time)
            
            print(f"🔍 ChromaDB search returned {len(results)} results in {query_time:.3f}s")
            return results
            
        except Exception as e:
            print(f"❌ ChromaDB search failed: {e}")
            return []
    
    def _update_query_stats(self, query_time: float):
        """Update performance statistics."""
        self._performance_stats['total_queries'] += 1
        total_queries = self._performance_stats['total_queries']
        current_avg = self._performance_stats['avg_query_time']
        
        # Update running average
        new_avg = ((current_avg * (total_queries - 1)) + query_time) / total_queries
        self._performance_stats['avg_query_time'] = new_avg
    
    def optimize_collection(self):
        """Optimize ChromaDB collection for better performance."""
        if not self._vector_store:
            print("❌ Vector store not initialized")
            return False
        
        try:
            # Force persistence to disk
            self._vector_store.persist()
            
            # Validate index configuration
            self._validate_index_configuration()
            
            print("✓ ChromaDB collection optimized and persisted")
            return True
            
        except Exception as e:
            print(f"⚠️ Collection optimization failed: {e}")
            return False
    
    def _validate_index_configuration(self):
        """Validate that the index is properly configured for contract documents."""
        try:
            client = _connection_pool.get_client(self.persist_directory)
            collections = client.list_collections()
            
            for collection in collections:
                if collection.name == "contract_documents":
                    # Check collection metadata
                    metadata = collection.metadata or {}
                    
                    # Validate HNSW settings
                    hnsw_space = metadata.get("hnsw:space", "l2")
                    if hnsw_space != "cosine":
                        print(f"⚠️ Index using {hnsw_space} distance, cosine recommended for text")
                    else:
                        print("✓ Index using optimal cosine distance")
                    
                    # Check construction quality
                    construction_ef = metadata.get("hnsw:construction_ef", 200)
                    if construction_ef < 400:
                        print(f"⚠️ Construction EF is {construction_ef}, recommend ≥400 for legal docs")
                    else:
                        print(f"✓ Construction EF optimized: {construction_ef}")
                    
                    # Check connectivity
                    m_value = metadata.get("hnsw:M", 16)
                    if m_value < 32:
                        print(f"⚠️ HNSW M parameter is {m_value}, recommend ≥32 for recall")
                    else:
                        print(f"✓ HNSW M parameter optimized: {m_value}")
                    
                    # Check search quality
                    search_ef = metadata.get("hnsw:search_ef", 100)
                    if search_ef < 200:
                        print(f"⚠️ Search EF is {search_ef}, recommend ≥200 for precision")
                    else:
                        print(f"✓ Search EF optimized: {search_ef}")
                    
                    break
            else:
                print("⚠️ Contract documents collection not found for validation")
                
        except Exception as e:
            print(f"⚠️ Index validation failed: {e}")
    
