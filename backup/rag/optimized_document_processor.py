"""
Optimized Document Processor for RAG Pipeline
Enhanced with parallel processing, intelligent caching, and memory management
"""

import os
import time
import hashlib
import json
import gc
import psutil
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path
import pickle
import numpy as np
from functools import lru_cache
import logging

# Document processing imports
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from data_loader import LoadDocuments

# Embedding imports
from embedding import EmbeddingsCreator, HuggingFaceEmbeddings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ProcessingConfig:
    """Configuration for document processing optimization."""
    # Parallel processing
    max_workers: int = 4
    use_process_pool: bool = False  # Use ProcessPool for CPU-intensive tasks

    # Memory management
    max_memory_mb: int = 2048  # Maximum memory usage in MB
    cleanup_interval: int = 10  # Cleanup after every N documents
    enable_gc: bool = True

    # Caching
    enable_document_cache: bool = True
    enable_chunk_cache: bool = True
    enable_embedding_cache: bool = True
    cache_dir: str = "cache/documents"

    # Chunking optimization
    chunk_size: int = 1200
    chunk_overlap: int = 200
    adaptive_chunking: bool = True

    # Embedding optimization
    embedding_batch_size: int = 32
    enable_embedding_parallel: bool = True

    # Progressive processing
    enable_progressive: bool = True
    max_document_size_mb: int = 50  # Split large documents

    # Performance monitoring
    enable_profiling: bool = True
    log_interval: int = 10

class MemoryManager:
    """Manages memory usage during document processing."""

    def __init__(self, max_memory_mb: int = 2048):
        self.max_memory_mb = max_memory_mb
        self.process = psutil.Process()
        self.cleanup_count = 0

    def get_memory_usage(self) -> float:
        """Get current memory usage in MB."""
        return self.process.memory_info().rss / 1024 / 1024

    def check_memory_limit(self) -> bool:
        """Check if memory usage exceeds limit."""
        current_usage = self.get_memory_usage()
        return current_usage > self.max_memory_mb

    def force_cleanup(self):
        """Force garbage collection and memory cleanup."""
        gc.collect()
        self.cleanup_count += 1
        logger.info(f"🧹 Forced cleanup #{self.cleanup_count}. Memory: {self.get_memory_usage():.1f}MB")

    def cleanup_if_needed(self):
        """Cleanup only if memory limit is exceeded."""
        if self.check_memory_limit():
            self.force_cleanup()
            return True
        return False

class DocumentCache:
    """Intelligent caching system for documents, chunks, and embeddings."""

    def __init__(self, cache_dir: str = "cache/documents", enabled: bool = True):
        self.cache_dir = Path(cache_dir)
        self.enabled = enabled
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'saves': 0,
            'errors': 0
        }

        if self.enabled:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            # Create subdirectories
            (self.cache_dir / "documents").mkdir(exist_ok=True)
            (self.cache_dir / "chunks").mkdir(exist_ok=True)
            (self.cache_dir / "embeddings").mkdir(exist_ok=True)

    def _get_cache_key(self, content: str) -> str:
        """Generate cache key from content."""
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def _get_file_path(self, cache_key: str, cache_type: str) -> Path:
        """Get cache file path."""
        return self.cache_dir / cache_type / f"{cache_key}.pkl"

    def cache_document(self, file_path: str, documents: List[Document]) -> bool:
        """Cache parsed documents."""
        if not self.enabled:
            return False

        try:
            cache_key = self._get_cache_key(file_path + str(os.path.getmtime(file_path)))
            cache_file = self._get_file_path(cache_key, "documents")

            with open(cache_file, 'wb') as f:
                pickle.dump({
                    'documents': documents,
                    'timestamp': time.time(),
                    'file_path': file_path
                }, f)

            self.cache_stats['saves'] += 1
            logger.debug(f"Cached documents for: {file_path}")
            return True
        except Exception as e:
            self.cache_stats['errors'] += 1
            logger.warning(f"Failed to cache documents: {e}")
            return False

    def load_cached_documents(self, file_path: str) -> Optional[List[Document]]:
        """Load cached documents."""
        if not self.enabled:
            return None

        try:
            cache_key = self._get_cache_key(file_path + str(os.path.getmtime(file_path)))
            cache_file = self._get_file_path(cache_key, "documents")

            if not cache_file.exists():
                self.cache_stats['misses'] += 1
                return None

            with open(cache_file, 'rb') as f:
                cached_data = pickle.load(f)

            self.cache_stats['hits'] += 1
            logger.debug(f"Loaded cached documents for: {file_path}")
            return cached_data['documents']
        except Exception as e:
            self.cache_stats['errors'] += 1
            logger.warning(f"Failed to load cached documents: {e}")
            return None

    def cache_chunks(self, content_hash: str, chunks: List[Document]) -> bool:
        """Cache document chunks."""
        if not self.enabled:
            return False

        try:
            cache_file = self._get_file_path(content_hash, "chunks")

            with open(cache_file, 'wb') as f:
                pickle.dump({
                    'chunks': chunks,
                    'timestamp': time.time()
                }, f)

            self.cache_stats['saves'] += 1
            return True
        except Exception as e:
            self.cache_stats['errors'] += 1
            logger.warning(f"Failed to cache chunks: {e}")
            return False

    def load_cached_chunks(self, content_hash: str) -> Optional[List[Document]]:
        """Load cached chunks."""
        if not self.enabled:
            return None

        try:
            cache_file = self._get_file_path(content_hash, "chunks")

            if not cache_file.exists():
                self.cache_stats['misses'] += 1
                return None

            with open(cache_file, 'rb') as f:
                cached_data = pickle.load(f)

            self.cache_stats['hits'] += 1
            return cached_data['chunks']
        except Exception as e:
            self.cache_stats['errors'] += 1
            logger.warning(f"Failed to load cached chunks: {e}")
            return None

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = self.cache_stats['hits'] / total_requests if total_requests > 0 else 0

        return {
            **self.cache_stats,
            'hit_rate': hit_rate,
            'total_requests': total_requests,
            'cache_size_mb': sum(f.stat().st_size for f in self.cache_dir.rglob('*.pkl')) / 1024 / 1024 if self.enabled else 0
        }

class OptimizedChunker:
    """Optimized document chunking with adaptive strategies and parallel processing."""

    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.chunking_stats = {
            'documents_processed': 0,
            'chunks_created': 0,
            'adaptive_adjustments': 0,
            'total_time': 0.0
        }

    def _analyze_document_structure(self, documents: List[Document]) -> Dict[str, Any]:
        """Analyze document structure for adaptive chunking."""
        if not documents:
            return {'avg_length': 0, 'has_structure': False, 'structure_type': 'unknown'}

        total_length = sum(len(doc.page_content) for doc in documents)
        avg_length = total_length / len(documents)

        # Detect document structure
        content = ' '.join(doc.page_content for doc in documents)
        has_structure = (
            '\n\n' in content or  # Paragraphs
            any(content.count(f'{i}.') > 2 for i in range(1, 10)) or  # Numbered lists
            any(keyword in content.lower() for keyword in ['pasal', 'article', 'section', 'bab'])
        )

        structure_type = 'structured' if has_structure else 'plain'

        return {
            'avg_length': avg_length,
            'has_structure': has_structure,
            'structure_type': structure_type,
            'total_length': total_length
        }

    def _adaptive_chunk_parameters(self, analysis: Dict[str, Any]) -> Tuple[int, int]:
        """Determine optimal chunking parameters based on document analysis."""
        base_chunk_size = self.config.chunk_size
        base_overlap = self.config.chunk_overlap

        if not self.config.adaptive_chunking:
            return base_chunk_size, base_overlap

        # Adjust based on document structure
        if analysis['structure_type'] == 'structured':
            # Use larger chunks for structured documents
            chunk_size = int(base_chunk_size * 1.2)
            overlap = int(base_overlap * 0.8)
            self.chunking_stats['adaptive_adjustments'] += 1
        elif analysis['avg_length'] < 500:
            # Smaller chunks for short documents
            chunk_size = int(base_chunk_size * 0.8)
            overlap = int(base_overlap * 1.2)
            self.chunking_stats['adaptive_adjustments'] += 1
        elif analysis['total_length'] > 50000:
            # Larger chunks for very long documents
            chunk_size = int(base_chunk_size * 1.3)
            overlap = int(base_overlap * 0.7)
            self.chunking_stats['adaptive_adjustments'] += 1
        else:
            chunk_size = base_chunk_size
            overlap = base_overlap

        # Ensure reasonable bounds
        chunk_size = max(400, min(2000, chunk_size))
        overlap = max(50, min(400, overlap))

        return chunk_size, overlap

    def _enhance_text_content(self, text: str) -> str:
        """Enhance text content with better formatting for contracts."""
        import re

        # Remove special characters but preserve spacing
        text = re.sub(r'-\t|●|\[|\]', ' ', text)

        # Fix common PDF concatenation issues
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        text = re.sub(r'(Business|Working|Calendar)(Day|Week)', r'\1 \2', text)
        text = re.sub(r'(Day|Week|Act|Law|Agreement)([a-z])', r'\1 \2', text)
        text = re.sub(r'(prior|after|other|than|from|with|for)([a-z])', r'\1 \2', text)
        text = re.sub(r'(means)([a-z])', r'\1 \2', text)
        text = re.sub(r'(any|other|than|from|with|for|which|that|this|when|where|here|there)([a-z])', r'\1 \2', text)
        text = re.sub(r'([a-z]{2,})([A-Z][a-z]+)', r'\1 \2', text)

        # Fix Indonesian contract terms
        text = re.sub(r'(banksin)', r'banks in', text)
        text = re.sub(r'(\w+),(\w+)', r'\1, \2', text)

        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        return text

    def _process_single_document(self, doc: Document, chunk_params: Tuple[int, int]) -> List[Document]:
        """Process a single document into chunks."""
        chunk_size, chunk_overlap = chunk_params

        # Enhance text content
        doc.page_content = self._enhance_text_content(doc.page_content)

        # Create text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            separators=["\n\n", "\n", ".", " ", ""],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        # Split document
        chunks = text_splitter.split_documents([doc])

        # Add context to each chunk
        source_file = doc.metadata.get('source', 'unknown document')
        title = doc.metadata.get('title', 'document')
        page = doc.metadata.get('page_label', doc.metadata.get('page', 'unknown page'))
        filename = source_file.split('/')[-1] if '/' in source_file else source_file

        for chunk in chunks:
            doc_context = f"[Document: {filename} | Title: {title} | Page: {page}] "
            chunk.page_content = doc_context + chunk.page_content

        return chunks

    def chunk_documents_parallel(self, documents: List[Document]) -> List[Document]:
        """Chunk documents with parallel processing."""
        start_time = time.time()

        if not documents:
            return []

        # Analyze document structure
        analysis = self._analyze_document_structure(documents)
        chunk_params = self._adaptive_chunk_parameters(analysis)

        logger.info(f"📊 Document analysis: {analysis['structure_type']}, avg_length: {analysis['avg_length']:.0f}")
        logger.info(f"📝 Using chunk parameters: size={chunk_params[0]}, overlap={chunk_params[1]}")

        # Process documents in parallel
        all_chunks = []

        if len(documents) > 2 and self.config.max_workers > 1:
            # Use parallel processing for multiple documents
            with ThreadPoolExecutor(max_workers=min(self.config.max_workers, len(documents))) as executor:
                futures = [
                    executor.submit(self._process_single_document, doc, chunk_params)
                    for doc in documents
                ]

                for future in futures:
                    try:
                        chunks = future.result()
                        all_chunks.extend(chunks)
                    except Exception as e:
                        logger.warning(f"Error in parallel chunking: {e}")
        else:
            # Sequential processing for small number of documents
            for doc in documents:
                chunks = self._process_single_document(doc, chunk_params)
                all_chunks.extend(chunks)

        # Update statistics
        self.chunking_stats['documents_processed'] += len(documents)
        self.chunking_stats['chunks_created'] += len(all_chunks)
        self.chunking_stats['total_time'] += time.time() - start_time

        logger.info(f"✓ Created {len(all_chunks)} chunks from {len(documents)} documents in {time.time() - start_time:.2f}s")

        return all_chunks

    def get_chunking_stats(self) -> Dict[str, Any]:
        """Get chunking statistics."""
        stats = self.chunking_stats.copy()
        if stats['documents_processed'] > 0:
            stats['avg_chunks_per_document'] = stats['chunks_created'] / stats['documents_processed']
            stats['avg_time_per_document'] = stats['total_time'] / stats['documents_processed']
        else:
            stats['avg_chunks_per_document'] = 0
            stats['avg_time_per_document'] = 0

        return stats

class OptimizedEmbeddingGenerator:
    """Optimized embedding generation with intelligent batching and caching."""

    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.embedding_creator = None
        self.embedding_stats = {
            'documents_processed': 0,
            'embeddings_generated': 0,
            'cache_hits': 0,
            'batch_count': 0,
            'total_time': 0.0
        }

        # Initialize embedding creator
        self._initialize_embedding_creator()

    def _initialize_embedding_creator(self):
        """Initialize the embedding creator with error handling."""
        try:
            self.embedding_creator = EmbeddingsCreator()
            # Test embedding creation
            test_embedding = self.embedding_creator.create_embeddings()
            logger.info("✓ Embedding creator initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize embedding creator: {e}")
            # Fallback to HuggingFace embeddings
            try:
                hf_embeddings = HuggingFaceEmbeddings()
                self.embedding_creator = hf_embeddings
                logger.info("✓ Fallback to HuggingFace embeddings")
            except Exception as e2:
                logger.error(f"Failed to initialize fallback embeddings: {e2}")
                raise

    def _create_content_hash(self, texts: List[str]) -> str:
        """Create hash from text content for caching."""
        combined_text = '|||'.join(texts)  # Combine texts with delimiter
        return hashlib.md5(combined_text.encode('utf-8')).hexdigest()

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings with optimized batching and caching."""
        start_time = time.time()

        if not texts:
            return []

        # Check cache first
        content_hash = self._create_content_hash(texts)
        cache_key = f"batch_{content_hash}"

        # Try to load from cache
        cached_embeddings = self._load_from_cache(cache_key)
        if cached_embeddings and len(cached_embeddings) == len(texts):
            self.embedding_stats['cache_hits'] += 1
            logger.debug(f"Loaded {len(cached_embeddings)} embeddings from cache")
            return cached_embeddings

        # Process in optimal batch sizes
        batch_size = self.config.embedding_batch_size
        all_embeddings = []

        if len(texts) <= batch_size:
            # Single batch
            embeddings = self._generate_single_batch(texts)
            all_embeddings.extend(embeddings)
            self.embedding_stats['batch_count'] += 1
        else:
            # Multiple batches
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                embeddings = self._generate_single_batch(batch)
                all_embeddings.extend(embeddings)
                self.embedding_stats['batch_count'] += 1

                # Log progress for large batches
                if self.embedding_stats['batch_count'] % 5 == 0:
                    logger.info(f"Processed {min(i + batch_size, len(texts))}/{len(texts)} texts...")

        # Cache results
        self._save_to_cache(cache_key, all_embeddings)

        # Update statistics
        self.embedding_stats['documents_processed'] += len(texts)
        self.embedding_stats['embeddings_generated'] += len(all_embeddings)
        self.embedding_stats['total_time'] += time.time() - start_time

        logger.info(f"✓ Generated {len(all_embeddings)} embeddings in {time.time() - start_time:.2f}s")

        return all_embeddings

    def _generate_single_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a single batch."""
        try:
            if hasattr(self.embedding_creator, 'embed_documents'):
                return self.embedding_creator.embed_documents(texts)
            elif hasattr(self.embedding_creator, '__call__'):
                return self.embedding_creator(texts)
            elif hasattr(self.embedding_creator, 'embed_documents_cached'):
                return self.embedding_creator.embed_documents_cached(texts)
            else:
                raise AttributeError("Embedding creator doesn't have required methods")
        except Exception as e:
            logger.error(f"Error generating embeddings for batch: {e}")
            # Fallback: return dummy embeddings
            return [[0.0] * 384 for _ in texts]  # Standard embedding dimension

    def _get_cache_path(self, cache_key: str) -> Path:
        """Get cache file path for embeddings."""
        cache_dir = Path("cache/embeddings")
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cache_dir / f"{cache_key}.pkl"

    def _load_from_cache(self, cache_key: str) -> Optional[List[List[float]]]:
        """Load embeddings from cache."""
        if not self.config.enable_embedding_cache:
            return None

        try:
            cache_file = self._get_cache_path(cache_key)
            if cache_file.exists():
                with open(cache_file, 'rb') as f:
                    cached_data = pickle.load(f)
                return cached_data.get('embeddings')
        except Exception as e:
            logger.warning(f"Error loading cached embeddings: {e}")

        return None

    def _save_to_cache(self, cache_key: str, embeddings: List[List[float]]):
        """Save embeddings to cache."""
        if not self.config.enable_embedding_cache:
            return

        try:
            cache_file = self._get_cache_path(cache_key)
            with open(cache_file, 'wb') as f:
                pickle.dump({
                    'embeddings': embeddings,
                    'timestamp': time.time(),
                    'cache_key': cache_key
                }, f)
        except Exception as e:
            logger.warning(f"Error saving embeddings to cache: {e}")

    def get_embedding_stats(self) -> Dict[str, Any]:
        """Get embedding generation statistics."""
        stats = self.embedding_stats.copy()
        if stats['batch_count'] > 0:
            stats['avg_batch_size'] = stats['embeddings_generated'] / stats['batch_count']
            stats['avg_time_per_batch'] = stats['total_time'] / stats['batch_count']
        else:
            stats['avg_batch_size'] = 0
            stats['avg_time_per_batch'] = 0

        if stats['documents_processed'] > 0:
            stats['avg_time_per_document'] = stats['total_time'] / stats['documents_processed']
        else:
            stats['avg_time_per_document'] = 0

        cache_hit_rate = stats['cache_hits'] / (stats['cache_hits'] + stats['batch_count']) if (stats['cache_hits'] + stats['batch_count']) > 0 else 0
        stats['cache_hit_rate'] = cache_hit_rate

        return stats

class OptimizedDocumentProcessor:
    """Main optimized document processor with all enhancements."""

    def __init__(self, config: Optional[ProcessingConfig] = None):
        self.config = config or ProcessingConfig()

        # Initialize components
        self.memory_manager = MemoryManager(self.config.max_memory_mb)
        self.document_cache = DocumentCache(self.config.cache_dir, self.config.enable_document_cache)
        self.chunker = OptimizedChunker(self.config)
        self.embedding_generator = OptimizedEmbeddingGenerator(self.config)

        # Processing statistics
        self.processing_stats = {
            'files_processed': 0,
            'total_processing_time': 0.0,
            'memory_cleanups': 0,
            'errors': 0
        }

        logger.info("🚀 Optimized Document Processor initialized")
        logger.info(f"   Max workers: {self.config.max_workers}")
        logger.info(f"   Memory limit: {self.config.max_memory_mb}MB")
        logger.info(f"   Caching enabled: {self.config.enable_document_cache}")
        logger.info(f"   Adaptive chunking: {self.config.adaptive_chunking}")

    def process_single_file(self, file_path: str) -> Dict[str, Any]:
        """Process a single file with all optimizations."""
        start_time = time.time()

        try:
            logger.info(f"📄 Processing file: {file_path}")

            # Step 1: Load documents (with caching)
            documents = self._load_documents_with_cache(file_path)

            if not documents:
                raise ValueError(f"No documents could be loaded from {file_path}")

            logger.info(f"✓ Loaded {len(documents)} documents")

            # Memory cleanup check
            self.memory_manager.cleanup_if_needed()

            # Step 2: Chunk documents (with caching)
            chunks = self._chunk_documents_with_cache(documents)

            if not chunks:
                raise ValueError(f"No chunks could be created from {file_path}")

            logger.info(f"✓ Created {len(chunks)} chunks")

            # Memory cleanup check
            self.memory_manager.cleanup_if_needed()

            # Step 3: Generate embeddings
            chunk_texts = [chunk.page_content for chunk in chunks]
            embeddings = self.embedding_generator.generate_embeddings_batch(chunk_texts)

            logger.info(f"✓ Generated {len(embeddings)} embeddings")

            # Memory cleanup check
            if self.memory_manager.cleanup_if_needed():
                self.processing_stats['memory_cleanups'] += 1

            # Step 4: Create result
            processing_time = time.time() - start_time

            result = {
                'success': True,
                'file_path': file_path,
                'documents': documents,
                'chunks': chunks,
                'embeddings': embeddings,
                'processing_time': processing_time,
                'document_count': len(documents),
                'chunk_count': len(chunks),
                'embedding_count': len(embeddings),
                'metadata': {
                    'file_size_mb': os.path.getsize(file_path) / 1024 / 1024,
                    'processing_config': self.config,
                    'memory_usage_mb': self.memory_manager.get_memory_usage()
                }
            }

            self.processing_stats['files_processed'] += 1
            self.processing_stats['total_processing_time'] += processing_time

            logger.info(f"✅ File processing completed in {processing_time:.2f}s")

            return result

        except Exception as e:
            self.processing_stats['errors'] += 1
            logger.error(f"❌ Error processing file {file_path}: {e}")
            return {
                'success': False,
                'file_path': file_path,
                'error': str(e),
                'processing_time': time.time() - start_time
            }

    def _load_documents_with_cache(self, file_path: str) -> List[Document]:
        """Load documents with caching support."""
        # Try cache first
        cached_documents = self.document_cache.load_cached_documents(file_path)
        if cached_documents:
            return cached_documents

        # Load from file
        loader = LoadDocuments(file_path)
        documents = loader.load_document()

        # Cache results
        if documents:
            self.document_cache.cache_document(file_path, documents)

        return documents

    def _chunk_documents_with_cache(self, documents: List[Document]) -> List[Document]:
        """Chunk documents with caching support."""
        if not self.config.enable_chunk_cache:
            return self.chunker.chunk_documents_parallel(documents)

        # Create content hash for caching
        combined_content = '|||'.join(doc.page_content for doc in documents)
        content_hash = hashlib.md5(combined_content.encode('utf-8')).hexdigest()

        # Try cache first
        cached_chunks = self.document_cache.load_cached_chunks(content_hash)
        if cached_chunks:
            return cached_chunks

        # Generate chunks
        chunks = self.chunker.chunk_documents_parallel(documents)

        # Cache results
        if chunks:
            self.document_cache.cache_chunks(content_hash, chunks)

        return chunks

    def process_multiple_files(self, file_paths: List[str]) -> Dict[str, Any]:
        """Process multiple files with parallel execution."""
        start_time = time.time()

        logger.info(f"📚 Processing {len(file_paths)} files in parallel...")

        all_results = []
        successful_results = []
        failed_files = []

        # Process files in parallel
        if len(file_paths) > 1 and self.config.max_workers > 1:
            executor_class = ProcessPoolExecutor if self.config.use_process_pool else ThreadPoolExecutor

            with executor_class(max_workers=min(self.config.max_workers, len(file_paths))) as executor:
                future_to_file = {
                    executor.submit(self.process_single_file, file_path): file_path
                    for file_path in file_paths
                }

                for future in future_to_file:
                    file_path = future_to_file[future]
                    try:
                        result = future.result()
                        all_results.append(result)

                        if result['success']:
                            successful_results.append(result)
                            logger.info(f"✅ {os.path.basename(file_path)}")
                        else:
                            failed_files.append(file_path)
                            logger.warning(f"❌ {os.path.basename(file_path)}: {result.get('error', 'Unknown error')}")

                    except Exception as e:
                        logger.error(f"❌ Exception processing {os.path.basename(file_path)}: {e}")
                        failed_files.append(file_path)
                        all_results.append({
                            'success': False,
                            'file_path': file_path,
                            'error': str(e),
                            'processing_time': 0
                        })
        else:
            # Sequential processing for single file or disabled parallel processing
            for file_path in file_paths:
                result = self.process_single_file(file_path)
                all_results.append(result)

                if result['success']:
                    successful_results.append(result)
                else:
                    failed_files.append(file_path)

        # Compile results
        total_time = time.time() - start_time
        total_documents = sum(r.get('document_count', 0) for r in successful_results)
        total_chunks = sum(r.get('chunk_count', 0) for r in successful_results)
        total_embeddings = sum(r.get('embedding_count', 0) for r in successful_results)

        summary = {
            'success': len(successful_results) > 0,
            'total_files': len(file_paths),
            'successful_files': len(successful_results),
            'failed_files': len(failed_files),
            'failed_file_paths': failed_files,
            'total_processing_time': total_time,
            'total_documents': total_documents,
            'total_chunks': total_chunks,
            'total_embeddings': total_embeddings,
            'avg_time_per_file': total_time / len(file_paths) if file_paths else 0,
            'results': all_results,
            'performance_stats': self.get_comprehensive_stats()
        }

        logger.info(f"🎉 Batch processing completed in {total_time:.2f}s")
        logger.info(f"   Successful: {len(successful_results)}/{len(file_paths)} files")
        logger.info(f"   Total documents: {total_documents}, chunks: {total_chunks}")

        return summary

    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive processing statistics."""
        return {
            'processing_stats': self.processing_stats.copy(),
            'memory_stats': {
                'current_usage_mb': self.memory_manager.get_memory_usage(),
                'max_limit_mb': self.config.max_memory_mb,
                'cleanup_count': self.memory_manager.cleanup_count
            },
            'cache_stats': self.document_cache.get_cache_stats(),
            'chunking_stats': self.chunker.get_chunking_stats(),
            'embedding_stats': self.embedding_generator.get_embedding_stats(),
            'config': {
                'max_workers': self.config.max_workers,
                'chunk_size': self.config.chunk_size,
                'embedding_batch_size': self.config.embedding_batch_size,
                'adaptive_chunking': self.config.adaptive_chunking,
                'caching_enabled': {
                    'documents': self.config.enable_document_cache,
                    'chunks': self.config.enable_chunk_cache,
                    'embeddings': self.config.enable_embedding_cache
                }
            }
        }

# Utility function for easy usage
def create_optimized_processor(
    max_workers: int = 4,
    enable_caching: bool = True,
    adaptive_chunking: bool = True,
    memory_limit_mb: int = 2048
) -> OptimizedDocumentProcessor:
    """Create an optimized document processor with sensible defaults."""
    config = ProcessingConfig(
        max_workers=max_workers,
        enable_document_cache=enable_caching,
        enable_chunk_cache=enable_caching,
        enable_embedding_cache=enable_caching,
        adaptive_chunking=adaptive_chunking,
        max_memory_mb=memory_limit_mb
    )

    return OptimizedDocumentProcessor(config)

# Example usage and testing
if __name__ == "__main__":
    # Test the optimized processor
    processor = create_optimized_processor()

    # Test with a sample file
    sample_file = "data/uploads_test/sample_contract.txt"
    if os.path.exists(sample_file):
        result = processor.process_single_file(sample_file)

        print("✅ Processing completed!")
        print(f"   Documents: {result.get('document_count', 0)}")
        print(f"   Chunks: {result.get('chunk_count', 0)}")
        print(f"   Embeddings: {result.get('embedding_count', 0)}")
        print(f"   Time: {result.get('processing_time', 0):.2f}s")

        # Show comprehensive stats
        stats = processor.get_comprehensive_stats()
        print("\n📊 Performance Statistics:")
        print(f"   Memory usage: {stats['memory_stats']['current_usage_mb']:.1f}MB")
        print(f"   Cache hit rate: {stats['cache_stats']['hit_rate']:.1%}")
        print(f"   Chunks per document: {stats['chunking_stats']['avg_chunks_per_document']:.1f}")
    else:
        print(f"❌ Sample file not found: {sample_file}")