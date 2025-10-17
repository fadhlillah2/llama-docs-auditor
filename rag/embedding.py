import os
import json
import hashlib
import asyncio
import random
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

load_dotenv()

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
        """Creates embeddings using ChromaDB default embeddings."""
        if self._embeddings_model is None:
            try:
                print("🔄 Initializing ChromaDB default embeddings...")
                # Import here to avoid dependency issues
                import chromadb
                from chromadb.utils import embedding_functions

                # Use ChromaDB's default embedding function (all-MiniLM-L6-v2)
                self._embeddings_model = embedding_functions.DefaultEmbeddingFunction()
                print("✓ Using ChromaDB default embeddings (all-MiniLM-L6-v2)")
            except Exception as e:
                print(f"⚠️ ChromaDB embeddings failed: {e}")
                print("🔄 Falling back to fake embeddings for development")
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


class HuggingFaceEmbeddings:
    """Real embeddings using HuggingFace via LangChain."""

    def __init__(self, model: str = None):
        """Initialize HuggingFace embeddings via LangChain."""
        # Get model from environment or use default
        self.model = model or os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')

        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings as LCHFEmbeddings
            print(f"📦 Loading HuggingFace model via LangChain: {self.model}")
            self._model = LCHFEmbeddings(model_name=self.model)
            print(f"✓ HuggingFace model loaded successfully via LangChain")
            # Test embedding to verify it works
            test_embedding = self._model.embed_query("test")
            self.embedding_dim = len(test_embedding)
            print(f"✓ Embedding dimension: {self.embedding_dim}")
        except ImportError as e:
            raise Exception(
                f"❌ HuggingFace embeddings import failed: {e}. "
                "Make sure langchain-community is installed."
            )
        except Exception as e:
            raise Exception(f"Failed to load HuggingFace model '{self.model}': {e}")

    def embed_query(self, text: str) -> List[float]:
        """Generate embedding for a query."""
        try:
            embedding = self._model.embed_query(text)
            return embedding if isinstance(embedding, list) else list(embedding)
        except Exception as e:
            print(f"⚠️ Query embedding failed: {e}")
            raise

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple documents using batch processing."""
        try:
            # Use LangChain's efficient batch embedding
            embeddings = self._model.embed_documents(texts)
            print(f"✓ Generated embeddings for {len(embeddings)} documents")
            return embeddings
        except Exception as e:
            print(f"⚠️ Document embeddings failed: {e}")
            raise


class FakeEmbeddings:
    """Fallback fake embeddings class for development/testing purposes."""

    def __init__(self, embedding_dim: int = 384):
        """Initialize fake embeddings with specified dimension."""
        self.embedding_dim = embedding_dim
        print(f"⚠️ Using fake embeddings (semantic search quality will be limited)")
        print(f"   Dimension: {embedding_dim}")
        print(f"   Install sentence-transformers for production: pip install sentence-transformers")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate fake embeddings for documents."""
        print(f"⚠️ Generating fake embeddings for {len(texts)} documents")
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
        # Generate consistent fake embedding based on text hash
        hash_val = hash(text) % 1000
        random.seed(hash_val)
        return [random.uniform(-1, 1) for _ in range(self.embedding_dim)]