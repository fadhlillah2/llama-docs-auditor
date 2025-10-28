"""
Optimized RAG Pipeline with Enhanced Performance
Integrates optimized document processing, chunking, embeddings, and retrieval
"""

import os
import time
import psutil
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# Import optimized components
from optimized_document_processor import OptimizedDocumentProcessor, ProcessingConfig, create_optimized_processor
from optimized_retriever import OptimizedRetriever, RetrievalConfig, create_optimized_retriever
from langchain_core.documents import Document

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizedRAGPipeline:
    """High-performance RAG pipeline with all optimizations integrated."""

    def __init__(self,
                 vector_db_path: str = "data/optimized_chroma_db",
                 processing_config: Optional[ProcessingConfig] = None,
                 retrieval_config: Optional[RetrievalConfig] = None):
        """
        Initialize optimized RAG pipeline.

        Args:
            vector_db_path: Path to vector database storage
            processing_config: Configuration for document processing
            retrieval_config: Configuration for retrieval operations
        """
        self.vector_db_path = Path(vector_db_path)
        self.vector_db_path.mkdir(parents=True, exist_ok=True)

        # Initialize configurations
        self.processing_config = processing_config or ProcessingConfig()
        self.retrieval_config = retrieval_config or RetrievalConfig()

        # Initialize components
        self.document_processor = OptimizedDocumentProcessor(self.processing_config)
        self.retriever: Optional[OptimizedRetriever] = None

        # Performance tracking
        self.pipeline_stats = {
            'total_files_processed': 0,
            'total_processing_time': 0.0,
            'total_documents_created': 0,
            'total_chunks_created': 0,
            'total_embeddings_generated': 0,
            'pipeline_initializations': 0,
            'memory_usage_mb': 0,
            'cache_hit_rates': {
                'documents': 0.0,
                'chunks': 0.0,
                'embeddings': 0.0,
                'queries': 0.0
            }
        }

        logger.info("🚀 Optimized RAG Pipeline initialized")
        logger.info(f"   Vector DB path: {self.vector_db_path}")
        logger.info(f"   Processing workers: {self.processing_config.max_workers}")
        logger.info(f"   Retrieval workers: {self.retrieval_config.max_workers}")

    def process_file(self, file_path: str, create_retriever: bool = True) -> Dict[str, Any]:
        """
        Process a single file and optionally create retriever.

        Args:
            file_path: Path to the file to process
            create_retriever: Whether to create retriever after processing

        Returns:
            Processing results with optional retriever
        """
        start_time = time.time()

        try:
            logger.info(f"📄 Processing file: {file_path}")
            logger.info(f"   File size: {os.path.getsize(file_path) / 1024 / 1024:.1f}MB")

            # Check if file exists and is accessible
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            # Process the file
            result = self.document_processor.process_single_file(file_path)

            if not result['success']:
                raise ValueError(f"File processing failed: {result.get('error', 'Unknown error')}")

            # Create retriever if requested
            retriever = None
            if create_retriever:
                retriever = self._create_retriever_from_result(result)

            # Update statistics
            processing_time = time.time() - start_time
            self._update_pipeline_stats(result, processing_time)

            # Compile final result
            final_result = {
                'success': True,
                'file_path': file_path,
                'processing_time': processing_time,
                'document_count': result['document_count'],
                'chunk_count': result['chunk_count'],
                'embedding_count': result['embedding_count'],
                'retriever': retriever,
                'metadata': result.get('metadata', {}),
                'performance_stats': self.get_performance_stats()
            }

            logger.info(f"✅ File processing completed in {processing_time:.2f}s")
            logger.info(f"   Documents: {result['document_count']}, Chunks: {result['chunk_count']}")

            return final_result

        except Exception as e:
            logger.error(f"❌ Error processing file {file_path}: {e}")
            return {
                'success': False,
                'file_path': file_path,
                'error': str(e),
                'processing_time': time.time() - start_time,
                'retriever': None
            }

    def process_multiple_files(self, file_paths: List[str], create_retriever: bool = True) -> Dict[str, Any]:
        """
        Process multiple files in parallel and optionally create retriever.

        Args:
            file_paths: List of file paths to process
            create_retriever: Whether to create retriever after processing

        Returns:
            Batch processing results with optional retriever
        """
        start_time = time.time()

        try:
            logger.info(f"📚 Processing {len(file_paths)} files in parallel...")

            # Validate files exist
            valid_files = []
            for file_path in file_paths:
                if os.path.exists(file_path):
                    valid_files.append(file_path)
                else:
                    logger.warning(f"⚠️  File not found, skipping: {file_path}")

            if not valid_files:
                raise ValueError("No valid files found to process")

            # Process files
            batch_result = self.document_processor.process_multiple_files(valid_files)

            if not batch_result['success']:
                raise ValueError(f"Batch processing failed: {batch_result.get('error', 'Unknown error')}")

            # Create retriever if requested and we have successful results
            retriever = None
            if create_retriever and batch_result['successful_files'] > 0:
                retriever = self._create_retriever_from_batch_results(batch_result['results'])

            # Update statistics
            processing_time = time.time() - start_time
            self._update_batch_pipeline_stats(batch_result, processing_time)

            # Compile final result
            final_result = {
                'success': True,
                'total_files': len(file_paths),
                'successful_files': batch_result['successful_files'],
                'failed_files': batch_result['failed_files'],
                'failed_file_paths': batch_result.get('failed_file_paths', []),
                'processing_time': processing_time,
                'total_documents': batch_result['total_documents'],
                'total_chunks': batch_result['total_chunks'],
                'total_embeddings': batch_result['total_embeddings'],
                'retriever': retriever,
                'performance_stats': self.get_performance_stats(),
                'individual_results': batch_result.get('results', [])
            }

            logger.info(f"✅ Batch processing completed in {processing_time:.2f}s")
            logger.info(f"   Successful: {batch_result['successful_files']}/{len(file_paths)} files")
            logger.info(f"   Total documents: {batch_result['total_documents']}, chunks: {batch_result['total_chunks']}")

            return final_result

        except Exception as e:
            logger.error(f"❌ Error in batch processing: {e}")
            return {
                'success': False,
                'total_files': len(file_paths),
                'successful_files': 0,
                'failed_files': len(file_paths),
                'error': str(e),
                'processing_time': time.time() - start_time,
                'retriever': None
            }

    def _create_retriever_from_result(self, result: Dict[str, Any]) -> OptimizedRetriever:
        """Create retriever from single file processing result."""
        try:
            documents = result['documents']
            embeddings = result['embeddings']

            if not documents or not embeddings:
                raise ValueError("No documents or embeddings available for retriever creation")

            retriever = create_optimized_retriever(
                documents=documents,
                embeddings=embeddings,
                top_k=self.retrieval_config.top_k,
                hybrid_search=self.retrieval_config.hybrid_weight < 1.0,
                enable_caching=self.retrieval_config.enable_query_cache,
                parallel_search=self.retrieval_config.enable_parallel_search,
                max_workers=self.retrieval_config.max_workers
            )

            self.pipeline_stats['pipeline_initializations'] += 1
            logger.info(f"✓ Retriever created with {len(documents)} documents")

            return retriever

        except Exception as e:
            logger.error(f"❌ Error creating retriever: {e}")
            raise

    def _create_retriever_from_batch_results(self, results: List[Dict[str, Any]]) -> OptimizedRetriever:
        """Create retriever from batch processing results."""
        try:
            # Collect all successful documents and embeddings
            all_documents = []
            all_embeddings = []

            for result in results:
                if result.get('success') and result.get('documents') and result.get('embeddings'):
                    all_documents.extend(result['documents'])
                    all_embeddings.extend(result['embeddings'])

            if not all_documents or not all_embeddings:
                raise ValueError("No valid documents or embeddings found in batch results")

            retriever = create_optimized_retriever(
                documents=all_documents,
                embeddings=all_embeddings,
                top_k=self.retrieval_config.top_k,
                hybrid_search=self.retrieval_config.hybrid_weight < 1.0,
                enable_caching=self.retrieval_config.enable_query_cache,
                parallel_search=self.retrieval_config.enable_parallel_search,
                max_workers=self.retrieval_config.max_workers
            )

            self.pipeline_stats['pipeline_initializations'] += 1
            logger.info(f"✓ Batch retriever created with {len(all_documents)} documents")

            return retriever

        except Exception as e:
            logger.error(f"❌ Error creating batch retriever: {e}")
            raise

    def _update_pipeline_stats(self, result: Dict[str, Any], processing_time: float):
        """Update pipeline statistics from single file result."""
        self.pipeline_stats['total_files_processed'] += 1
        self.pipeline_stats['total_processing_time'] += processing_time
        self.pipeline_stats['total_documents_created'] += result.get('document_count', 0)
        self.pipeline_stats['total_chunks_created'] += result.get('chunk_count', 0)
        self.pipeline_stats['total_embeddings_generated'] += result.get('embedding_count', 0)
        self.pipeline_stats['memory_usage_mb'] = psutil.Process().memory_info().rss / 1024 / 1024

        # Update cache hit rates
        proc_stats = self.document_processor.get_comprehensive_stats()
        cache_stats = proc_stats.get('cache_stats', {})
        self.pipeline_stats['cache_hit_rates']['documents'] = cache_stats.get('hit_rate', 0)
        self.pipeline_stats['cache_hit_rates']['chunks'] = cache_stats.get('hit_rate', 0)
        self.pipeline_stats['cache_hit_rates']['embeddings'] = proc_stats.get('embedding_stats', {}).get('cache_hit_rate', 0)

    def _update_batch_pipeline_stats(self, batch_result: Dict[str, Any], processing_time: float):
        """Update pipeline statistics from batch result."""
        self.pipeline_stats['total_files_processed'] += batch_result.get('successful_files', 0)
        self.pipeline_stats['total_processing_time'] += processing_time
        self.pipeline_stats['total_documents_created'] += batch_result.get('total_documents', 0)
        self.pipeline_stats['total_chunks_created'] += batch_result.get('total_chunks', 0)
        self.pipeline_stats['total_embeddings_generated'] += batch_result.get('total_embeddings', 0)
        self.pipeline_stats['memory_usage_mb'] = psutil.Process().memory_info().rss / 1024 / 1024

        # Update cache hit rates
        perf_stats = batch_result.get('performance_stats', {})
        cache_stats = perf_stats.get('cache_stats', {})
        self.pipeline_stats['cache_hit_rates']['documents'] = cache_stats.get('hit_rate', 0)
        self.pipeline_stats['cache_hit_rates']['chunks'] = cache_stats.get('hit_rate', 0)
        self.pipeline_stats['cache_hit_rates']['embeddings'] = perf_stats.get('embedding_stats', {}).get('cache_hit_rate', 0)

    def get_retriever(self) -> Optional[OptimizedRetriever]:
        """Get the current retriever instance."""
        return self.retriever

    def set_retriever(self, retriever: OptimizedRetriever):
        """Set the retriever instance."""
        self.retriever = retriever
        self.pipeline_stats['pipeline_initializations'] += 1

    def retrieve_documents(self, query: str, top_k: Optional[int] = None) -> List[Document]:
        """
        Retrieve documents using the current retriever.

        Args:
            query: Search query
            top_k: Number of documents to retrieve

        Returns:
            List of relevant documents
        """
        if not self.retriever:
            logger.warning("⚠️  No retriever available. Please process a file first.")
            return []

        try:
            start_time = time.time()
            results = self.retriever.invoke(query)

            if top_k:
                results = results[:top_k]

            logger.debug(f"Retrieved {len(results)} documents in {time.time() - start_time:.3f}s")
            return results

        except Exception as e:
            logger.error(f"Error in document retrieval: {e}")
            return []

    def batch_retrieve_documents(self, queries: List[str], top_k: Optional[int] = None) -> List[List[Document]]:
        """
        Retrieve documents for multiple queries.

        Args:
            queries: List of search queries
            top_k: Number of documents to retrieve per query

        Returns:
            List of document lists for each query
        """
        if not self.retriever:
            logger.warning("⚠️  No retriever available. Please process a file first.")
            return [[] for _ in queries]

        try:
            start_time = time.time()
            results = self.retriever.batch_retrieve(queries)

            if top_k:
                results = [docs[:top_k] for docs in results]

            total_docs = sum(len(docs) for docs in results)
            logger.debug(f"Batch retrieved {total_docs} documents for {len(queries)} queries in {time.time() - start_time:.3f}s")
            return results

        except Exception as e:
            logger.error(f"Error in batch document retrieval: {e}")
            return [[] for _ in queries]

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics."""
        # Get current component statistics
        proc_stats = self.document_processor.get_comprehensive_stats()
        retriever_stats = self.retriever.get_comprehensive_stats() if self.retriever else {}

        # Calculate averages
        avg_time_per_file = 0
        if self.pipeline_stats['total_files_processed'] > 0:
            avg_time_per_file = self.pipeline_stats['total_processing_time'] / self.pipeline_stats['total_files_processed']

        avg_chunks_per_document = 0
        if self.pipeline_stats['total_documents_created'] > 0:
            avg_chunks_per_document = self.pipeline_stats['total_chunks_created'] / self.pipeline_stats['total_documents_created']

        return {
            'pipeline_stats': self.pipeline_stats.copy(),
            'processing_stats': proc_stats,
            'retriever_stats': retriever_stats,
            'performance_metrics': {
                'avg_time_per_file': avg_time_per_file,
                'avg_chunks_per_document': avg_chunks_per_document,
                'current_memory_mb': psutil.Process().memory_info().rss / 1024 / 1024,
                'total_processing_time': self.pipeline_stats['total_processing_time'],
                'cache_hit_rates': self.pipeline_stats['cache_hit_rates'].copy()
            },
            'configuration': {
                'processing_config': {
                    'max_workers': self.processing_config.max_workers,
                    'adaptive_chunking': self.processing_config.adaptive_chunking,
                    'chunk_size': self.processing_config.chunk_size,
                    'enable_caching': self.processing_config.enable_document_cache
                },
                'retrieval_config': {
                    'top_k': self.retrieval_config.top_k,
                    'hybrid_search': self.retrieval_config.hybrid_weight < 1.0,
                    'enable_caching': self.retrieval_config.enable_query_cache,
                    'parallel_search': self.retrieval_config.enable_parallel_search
                }
            }
        }

    def save_state(self):
        """Save current pipeline state to disk."""
        try:
            # Save retriever state
            if self.retriever:
                self.retriever.save_state()

            # Save document processor caches
            self.document_processor.document_cache._save_caches()

            logger.info("✅ Pipeline state saved successfully")
        except Exception as e:
            logger.warning(f"Error saving pipeline state: {e}")

    def clear_caches(self):
        """Clear all caches and free memory."""
        try:
            # Clear document processor caches
            self.document_processor.document_cache.cache_stats = {
                'hits': 0,
                'misses': 0,
                'saves': 0,
                'errors': 0
            }

            # Clear retriever caches
            if self.retriever:
                self.retriever.vector_store.query_cache.clear()
                self.retriever.vector_store.result_cache.clear()
                self.retriever.vector_store.cache_timestamps.clear()

            # Force garbage collection
            import gc
            gc.collect()

            logger.info("✅ All caches cleared")
        except Exception as e:
            logger.warning(f"Error clearing caches: {e}")

# Utility function for easy usage
def create_optimized_rag_pipeline(
    max_workers: int = 4,
    enable_caching: bool = True,
    adaptive_chunking: bool = True,
    hybrid_search: bool = True,
    vector_db_path: str = "data/optimized_chroma_db",
    memory_limit_mb: int = 2048
) -> OptimizedRAGPipeline:
    """Create an optimized RAG pipeline with sensible defaults."""

    processing_config = ProcessingConfig(
        max_workers=max_workers,
        enable_document_cache=enable_caching,
        enable_chunk_cache=enable_caching,
        enable_embedding_cache=enable_caching,
        adaptive_chunking=adaptive_chunking,
        max_memory_mb=memory_limit_mb
    )

    retrieval_config = RetrievalConfig(
        top_k=10,
        hybrid_weight=0.7 if hybrid_search else 1.0,
        enable_query_cache=enable_caching,
        enable_result_cache=enable_caching,
        enable_parallel_search=True,
        max_workers=max_workers
    )

    return OptimizedRAGPipeline(
        vector_db_path=vector_db_path,
        processing_config=processing_config,
        retrieval_config=retrieval_config
    )

# Example usage and testing
if __name__ == "__main__":
    # Test the optimized RAG pipeline
    pipeline = create_optimized_rag_pipeline(
        max_workers=2,
        enable_caching=True,
        adaptive_chunking=True,
        hybrid_search=True
    )

    # Test with sample files
    test_files = [
        "data/uploads_test/sample_contract.txt",
        "data/uploads_test/simple_test.txt"
    ]

    existing_files = [f for f in test_files if os.path.exists(f)]
    if existing_files:
        # Process single file
        if len(existing_files) == 1:
            result = pipeline.process_file(existing_files[0])
        else:
            # Process multiple files
            result = pipeline.process_multiple_files(existing_files)

        if result['success']:
            print("✅ Processing completed!")
            print(f"   Files processed: {result.get('successful_files', 0)}")
            print(f"   Total documents: {result.get('total_documents', 0)}")
            print(f"   Total chunks: {result.get('total_chunks', 0)}")
            print(f"   Processing time: {result.get('processing_time', 0):.2f}s")

            # Test retrieval
            retriever = result.get('retriever')
            if retriever:
                docs = pipeline.retrieve_documents("payment terms")
                print(f"   Retrieved {len(docs)} documents for query")

            # Show performance stats
            stats = pipeline.get_performance_stats()
            print("\n📊 Performance Statistics:")
            print(f"   Avg time per file: {stats['performance_metrics']['avg_time_per_file']:.2f}s")
            print(f"   Cache hit rates: {stats['performance_metrics']['cache_hit_rates']}")
            print(f"   Memory usage: {stats['performance_metrics']['current_memory_mb']:.1f}MB")
        else:
            print(f"❌ Processing failed: {result.get('error', 'Unknown error')}")
    else:
        print(f"❌ No test files found. Looking for: {test_files}")