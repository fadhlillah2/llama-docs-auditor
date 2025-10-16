import os
import json
import hashlib
import asyncio
import random
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor

class EmbeddingsCreator:
    def __init__(self, cache_dir: str = "../cache/embeddings"):
        """Initialize embeddings creator with caching support."""
        self.cache_dir = cache_dir
        self._embeddings_model = None
        self._ensure_cache_dir()

    def _ensure_cache_dir(self) -> None:
        """Ensure cache directory exists."""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir, exist_ok=True)
            print(f"✓ Created embeddings cache directory: {self.cache_dir}")

    def _get_cache_key(self, text: str) -> str:
        """Generate cache key from text content."""
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    def _load_from_cache(self, cache_key: str) -> Optional[List[float]]:
        """Load embedding from cache if exists."""
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    return data.get('embedding')
            except Exception as e:
                print(f"⚠️ Error loading cache {cache_key}: {e}")
        return None

    def _save_to_cache(self, cache_key: str, embedding: List[float], text: str) -> None:
        """Save embedding to cache."""
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        try:
            with open(cache_file, 'w') as f:
                json.dump({
                    'embedding': embedding,
                    'text_preview': text[:100] + "..." if len(text) > 100 else text,
                    'text_length': len(text)
                }, f)
        except Exception as e:
            print(f"⚠️ Error saving to cache {cache_key}: {e}")

    def create_embeddings(self):
        """Creates embeddings from text using fake embeddings for development."""
        if self._embeddings_model is None:
            print("✓ Using fake embeddings for development (no external dependencies)")
            self._embeddings_model = FakeEmbeddings()

        return self._embeddings_model

    def embed_documents_cached(self, texts: List[str]) -> List[List[float]]:
        """Embed documents with caching support and batch processing."""
        embeddings_model = self.create_embeddings()
        results = []
        cache_hits = 0
        uncached_texts = []
        uncached_indices = []
        
        # Check cache for all texts first
        for i, text in enumerate(texts):
            cache_key = self._get_cache_key(text)
            cached_embedding = self._load_from_cache(cache_key)
            
            if cached_embedding is not None:
                results.append(cached_embedding)
                cache_hits += 1
            else:
                results.append(None)  # Placeholder
                uncached_texts.append(text)
                uncached_indices.append(i)
        
        # Process uncached texts in batches
        if uncached_texts:
            batch_size = 10  # Process in batches to avoid memory issues
            for i in range(0, len(uncached_texts), batch_size):
                batch = uncached_texts[i:i + batch_size]
                batch_indices = uncached_indices[i:i + batch_size]
                
                # Generate embeddings for batch
                batch_embeddings = embeddings_model.embed_documents(batch)
                
                # Update results and cache
                for j, embedding in enumerate(batch_embeddings):
                    result_index = batch_indices[j]
                    results[result_index] = embedding
                    
                    # Cache the embedding
                    cache_key = self._get_cache_key(batch[j])
                    self._save_to_cache(cache_key, embedding, batch[j])
        
        if cache_hits > 0:
            print(f"✓ Cache hits: {cache_hits}/{len(texts)} embeddings loaded from cache")
        
        return results

    async def embed_documents_async(self, texts: List[str]) -> List[List[float]]:
        """Async version of embed_documents_cached for better performance."""
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=2) as executor:
            future = loop.run_in_executor(executor, self.embed_documents_cached, texts)
            return await future

    def embed_query_cached(self, text: str) -> List[float]:
        """Embed query with caching support."""
        cache_key = self._get_cache_key(text)
        cached_embedding = self._load_from_cache(cache_key)
        
        if cached_embedding is not None:
            print(f"✓ Query embedding loaded from cache")
            return cached_embedding
        
        # Generate new embedding
        embeddings_model = self.create_embeddings()
        embedding = embeddings_model.embed_query(text)
        self._save_to_cache(cache_key, embedding, text)
        
        return embedding


class FakeEmbeddings:
    """Fake embeddings class for development/testing purposes."""

    def __init__(self, embedding_dim: int = 384):
        """Initialize fake embeddings with specified dimension."""
        self.embedding_dim = embedding_dim
        print(f"✓ Created fake embeddings with dimension: {embedding_dim}")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate fake embeddings for documents."""
        print(f"✓ Generating fake embeddings for {len(texts)} documents")
        embeddings = []
        for i, text in enumerate(texts):
            # Generate consistent fake embeddings based on text hash
            hash_val = hash(text) % 1000
            random.seed(hash_val)
            embedding = [random.uniform(-1, 1) for _ in range(self.embedding_dim)]
            embeddings.append(embedding)
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        """Generate fake embedding for query."""
        print(f"✓ Generating fake embedding for query")
        # Generate consistent fake embedding based on text hash
        hash_val = hash(text) % 1000
        random.seed(hash_val)
        return [random.uniform(-1, 1) for _ in range(self.embedding_dim)]