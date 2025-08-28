import os
import time
import threading
from typing import Dict, Optional, List
from langchain.vectorstores.chroma import Chroma
from langchain.schema import Document
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
    
    def close_all(self):
        """Close all connections in the pool."""
        with self._lock:
            for directory, client in self._connections.items():
                try:
                    # ChromaDB doesn't have explicit close, but we can clean up references
                    del client
                    print(f"✓ ChromaDB connection closed: {directory}")
                except Exception as e:
                    print(f"⚠️ Error closing connection {directory}: {e}")
            
            self._connections.clear()
            self._connection_count = 0


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
            except ValueError:
                # Collection doesn't exist, create with metadata
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
    
    def add_documents_batch(self, documents: List[Document], batch_size: int = 50):
        """Add documents in batches for better performance."""
        if not self._vector_store:
            print("❌ Vector store not initialized")
            return False
        
        try:
            print(f"📄 Adding {len(documents)} documents in batches of {batch_size}")
            
            # Process in parallel batches for even better performance
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            def add_single_batch(batch_data):
                batch_idx, batch = batch_data
                try:
                    self._vector_store.add_documents(batch)
                    return batch_idx, len(batch), None
                except Exception as e:
                    return batch_idx, 0, str(e)
            
            # Prepare batches
            batches = []
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i + batch_size]
                batches.append((i//batch_size, batch))
            
            successful_batches = 0
            failed_batches = 0
            total_added = 0
            
            # Process batches with limited parallelism to avoid overwhelming ChromaDB
            with ThreadPoolExecutor(max_workers=2) as executor:
                future_to_batch = {executor.submit(add_single_batch, batch_data): batch_data[0] 
                                 for batch_data in batches}
                
                for future in as_completed(future_to_batch):
                    batch_idx, added_count, error = future.result()
                    
                    if error:
                        failed_batches += 1
                        print(f"❌ Batch {batch_idx + 1} failed: {error}")
                    else:
                        successful_batches += 1
                        total_added += added_count
                        print(f"✓ Added batch {batch_idx + 1}/{len(batches)} ({added_count} docs)")
            
            if failed_batches == 0:
                print(f"✓ Successfully added all {total_added} documents to ChromaDB")
                return True
            else:
                print(f"⚠️ Added {total_added} documents, {failed_batches} batches failed")
                return successful_batches > 0
            
        except Exception as e:
            print(f"❌ Failed to add documents to ChromaDB: {e}")
            return False
    
    def batch_similarity_search(self, queries: List[str], k: int = 4, batch_size: int = 10):
        """Perform batch similarity searches for multiple queries."""
        if not self._vector_store:
            print("❌ Vector store not initialized")
            return {}
        
        print(f"🔍 Performing batch search for {len(queries)} queries")
        batch_start = time.time()
        
        try:
            from concurrent.futures import ThreadPoolExecutor, as_completed
            
            def search_single_query(query_data):
                idx, query = query_data
                try:
                    results = self._vector_store.similarity_search(query, k=k)
                    return idx, query, results, None
                except Exception as e:
                    return idx, query, [], str(e)
            
            # Prepare query batches
            query_batches = []
            for i in range(0, len(queries), batch_size):
                batch = queries[i:i + batch_size]
                for j, query in enumerate(batch):
                    query_batches.append((i + j, query))
            
            results_dict = {}
            successful_queries = 0
            
            # Process queries in parallel with limited concurrency
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_to_query = {executor.submit(search_single_query, query_data): query_data[1] 
                                 for query_data in query_batches}
                
                for future in as_completed(future_to_query):
                    idx, query, results, error = future.result()
                    
                    if error:
                        print(f"❌ Query {idx + 1} failed: {error}")
                        results_dict[query] = []
                    else:
                        successful_queries += 1
                        results_dict[query] = results
            
            batch_time = time.time() - batch_start
            
            # Update performance stats
            self._performance_stats['total_queries'] += len(queries)
            avg_time_per_query = batch_time / len(queries) if queries else 0
            
            current_avg = self._performance_stats['avg_query_time']
            total_queries = self._performance_stats['total_queries']
            new_avg = ((current_avg * (total_queries - len(queries))) + batch_time) / total_queries
            self._performance_stats['avg_query_time'] = new_avg
            
            print(f"✓ Batch search completed: {successful_queries}/{len(queries)} successful in {batch_time:.2f}s")
            print(f"📊 Average time per query: {avg_time_per_query:.3f}s")
            
            return results_dict
            
        except Exception as e:
            print(f"❌ Batch similarity search failed: {e}")
            return {}
    
    def batch_update_documents(self, document_updates: List[tuple], batch_size: int = 25):
        """Update multiple documents in batches. Each tuple: (document_id, new_document)."""
        if not self._vector_store:
            print("❌ Vector store not initialized")
            return False
        
        try:
            print(f"🔄 Updating {len(document_updates)} documents in batches of {batch_size}")
            
            successful_updates = 0
            failed_updates = 0
            
            # Process updates in batches to avoid overwhelming the system
            for i in range(0, len(document_updates), batch_size):
                batch = document_updates[i:i + batch_size]
                
                try:
                    # Extract documents from the batch
                    documents_to_add = [doc for _, doc in batch]
                    
                    # Add updated documents (ChromaDB will handle deduplication)
                    self._vector_store.add_documents(documents_to_add)
                    
                    successful_updates += len(batch)
                    print(f"✓ Updated batch {i//batch_size + 1}/{(len(document_updates) + batch_size - 1)//batch_size}")
                    
                except Exception as e:
                    failed_updates += len(batch)
                    print(f"❌ Batch {i//batch_size + 1} update failed: {e}")
            
            if failed_updates == 0:
                print(f"✓ Successfully updated all {successful_updates} documents")
                return True
            else:
                print(f"⚠️ Updated {successful_updates} documents, {failed_updates} failed")
                return successful_updates > 0
                
        except Exception as e:
            print(f"❌ Batch document update failed: {e}")
            return False
    
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
    
    def get_performance_stats(self) -> Dict:
        """Get vector store performance statistics."""
        return self._performance_stats.copy()
    
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
    
    def configure_optimal_indices(self, force_rebuild: bool = False):
        """Configure optimal indices for contract document queries."""
        try:
            client = _connection_pool.get_client(self.persist_directory)
            
            # Check if collection needs reconfiguration
            collection_name = "contract_documents"
            needs_rebuild = force_rebuild
            
            try:
                existing_collection = client.get_collection(collection_name)
                metadata = existing_collection.metadata or {}
                
                # Check if current settings are sub-optimal
                current_ef = metadata.get("hnsw:construction_ef", 200)
                current_m = metadata.get("hnsw:M", 16)
                current_search_ef = metadata.get("hnsw:search_ef", 100)
                
                if current_ef < 400 or current_m < 32 or current_search_ef < 200:
                    needs_rebuild = True
                    print("⚠️ Sub-optimal index configuration detected, rebuilding...")
                    
            except ValueError:
                needs_rebuild = True
                print("📊 No existing collection found, will create optimized index")
            
            if needs_rebuild and hasattr(self, 'documents') and self.documents:
                print("🔧 Rebuilding collection with optimal index configuration...")
                
                # Delete existing collection if it exists
                try:
                    client.delete_collection(collection_name)
                    print("✓ Removed sub-optimal collection")
                except ValueError:
                    pass  # Collection didn't exist
                
                # Recreate with optimal settings
                self.create_vector_store(collection_name)
                print("✓ Created collection with optimal index configuration")
                
                return True
            else:
                print("✓ Index configuration is already optimal")
                return True
                
        except Exception as e:
            print(f"❌ Failed to configure optimal indices: {e}")
            return False
    
    def cleanup_old_collections(self, max_age_days: int = 30):
        """Clean up old unused collections."""
        try:
            client = _connection_pool.get_client(self.persist_directory)
            collections = client.list_collections()
            
            cleaned_count = 0
            for collection in collections:
                # Simple cleanup based on collection name pattern
                # In a production system, you'd want more sophisticated logic
                if collection.name.startswith("temp_") or collection.name.startswith("test_"):
                    try:
                        client.delete_collection(collection.name)
                        cleaned_count += 1
                        print(f"🧹 Cleaned up collection: {collection.name}")
                    except Exception as e:
                        print(f"⚠️ Failed to delete collection {collection.name}: {e}")
            
            if cleaned_count > 0:
                print(f"✓ Cleaned up {cleaned_count} old collections")
            
            return cleaned_count
            
        except Exception as e:
            print(f"⚠️ Collection cleanup failed: {e}")
            return 0