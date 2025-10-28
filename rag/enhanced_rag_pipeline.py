"""
Enhanced RAG Pipeline with Optimized Components
Drop-in replacement for the existing RAG pipeline with performance improvements
"""

import time
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv, find_dotenv

# Import optimized components
try:
    from optimized_rag_pipeline import OptimizedRAGPipeline, create_optimized_rag_pipeline
    from optimized_retriever import create_optimized_retriever
    OPTIMIZED_AVAILABLE = True
    print("✅ Using optimized RAG components")
except ImportError as e:
    print(f"⚠️  Optimized components not available: {e}")
    print("🔄 Falling back to original components")
    OPTIMIZED_AVAILABLE = False

# Fallback to original components if optimized not available
if not OPTIMIZED_AVAILABLE:
    from rag_pipeline import RAGPipeline
    from data_loader import LoadDocuments
    from chunk_documents import ChunkDocuments
    from embedding import EmbeddingsCreator
    from retriever import Retriever
    from chat_model import ChatModel
    from conversation_chain import ConversationChain

load_dotenv()
# Use Groq model by default, can be overridden by environment variable
GROQ_MODEL_NAME = os.getenv('GROQ_MODEL_NAME', 'llama-3.3-70b-versatile')
load_dotenv(find_dotenv())

class EnhancedRAGPipeline:
    """
    Enhanced RAG Pipeline with optimized components and fallback support
    Drop-in replacement for the original RAGPipeline class
    """

    def __init__(self, uploaded_file: str, vector_db_path: str, use_optimized: Optional[bool] = None):
        """
        Initialize Enhanced RAG Pipeline

        Args:
            uploaded_file: Path to the uploaded file
            vector_db_path: Path to vector database storage
            use_optimized: Force use of optimized components (None = auto-detect)
        """
        self.uploaded_file = uploaded_file
        self.vector_db_path = vector_db_path

        # Determine whether to use optimized components
        if use_optimized is None:
            self.use_optimized = OPTIMIZED_AVAILABLE
        else:
            self.use_optimized = use_optimized and OPTIMIZED_AVAILABLE

        # Initialize the appropriate pipeline
        if self.use_optimized:
            self._init_optimized_pipeline()
        else:
            self._init_original_pipeline()

        # Performance tracking
        self.pipeline_stats = {
            'total_processing_time': 0.0,
            'files_processed': 0,
            'documents_created': 0,
            'chunks_created': 0,
            'optimizations_used': self.use_optimized
        }

    def _init_optimized_pipeline(self):
        """Initialize optimized RAG pipeline"""
        try:
            # Create optimized pipeline with sensible defaults
            self.optimized_pipeline = create_optimized_rag_pipeline(
                max_workers=4,
                enable_caching=True,
                adaptive_chunking=True,
                hybrid_search=True,
                vector_db_path=self.vector_db_path,
                memory_limit_mb=2048
            )

            print("✅ Enhanced RAG Pipeline initialized with optimized components")
            print(f"   File: {self.uploaded_file}")
            print(f"   Vector DB: {self.vector_db_path}")
            print(f"   Optimizations: Enabled")

        except Exception as e:
            print(f"⚠️  Failed to initialize optimized pipeline: {e}")
            print("🔄 Falling back to original pipeline")
            self.use_optimized = False
            self._init_original_pipeline()

    def _init_original_pipeline(self):
        """Initialize original RAG pipeline as fallback"""
        self.original_pipeline = RAGPipeline(self.uploaded_file, self.vector_db_path)
        print("✅ Enhanced RAG Pipeline initialized with original components")
        print(f"   File: {self.uploaded_file}")
        print(f"   Vector DB: {self.vector_db_path}")
        print(f"   Optimizations: Disabled")

    def pipeline(self):
        """
        Main pipeline method - processes file and returns retriever
        Compatible with original RAGPipeline.pipeline() method
        """
        start_time = time.time()

        try:
            if self.use_optimized:
                return self._optimized_pipeline_flow()
            else:
                return self._original_pipeline_flow()

        except Exception as e:
            print(f"❌ Pipeline failed: {e}")

            # Try fallback if optimized failed
            if self.use_optimized:
                print("🔄 Attempting fallback to original pipeline...")
                self.use_optimized = False
                self._init_original_pipeline()
                return self._original_pipeline_flow()
            else:
                raise

        finally:
            # Update statistics
            processing_time = time.time() - start_time
            self.pipeline_stats['total_processing_time'] += processing_time
            self.pipeline_stats['files_processed'] += 1

    def _optimized_pipeline_flow(self):
        """Process using optimized components"""
        print("\n" + "="*80, flush=True)
        print("🚀 Starting Enhanced RAG Pipeline with optimizations...", flush=True)
        print(f"📄 Processing file: {self.uploaded_file}", flush=True)

        # Process file with optimized pipeline
        result = self.optimized_pipeline.process_file(self.uploaded_file, create_retriever=True)

        if not result['success']:
            raise ValueError(f"File processing failed: {result.get('error', 'Unknown error')}")

        # Update statistics
        self.pipeline_stats['documents_created'] += result['document_count']
        self.pipeline_stats['chunks_created'] += result['chunk_count']

        # Get retriever
        retriever = result['retriever']
        if not retriever:
            raise ValueError("Failed to create retriever")

        # Show performance stats
        processing_time = result['processing_time']
        perf_stats = result.get('performance_stats', {})

        print(f"✅ Enhanced pipeline completed in {processing_time:.2f}s", flush=True)
        print(f"   Documents: {result['document_count']}")
        print(f"   Chunks: {result['chunk_count']}")
        print(f"   Embeddings: {result['embedding_count']}")

        if perf_stats:
            cache_rates = perf_stats.get('cache_hit_rates', {})
            print(f"   Cache hit rates: Docs={cache_rates.get('documents', 0):.1%}, Chunks={cache_rates.get('chunks', 0):.1%}, Embeddings={cache_rates.get('embeddings', 0):.1%}")

        print("="*80 + "\n", flush=True)
        return retriever

    def _original_pipeline_flow(self):
        """Process using original components"""
        return self.original_pipeline.pipeline()

    def qa_chain(self):
        """
        Create QA chain - compatible with original interface
        """
        try:
            if self.use_optimized:
                # Use optimized pipeline to get retriever
                retriever = self.pipeline()

                if not retriever:
                    raise ValueError("No retriever available")

                # Create chat model and conversation chain
                from chat_model import ChatModel
                from conversation_chain import ConversationChain

                chat_model = ChatModel(GROQ_MODEL_NAME).initialize_chat_model()

                # Create conversation chain with model-specific optimizations
                conversation_chain_creator = ConversationChain(model_name=GROQ_MODEL_NAME)
                conversation_chain = conversation_chain_creator.create_retrieval_qa_chain(chat_model, retriever)

                print(f"✓ Enhanced QA chain created with context optimization for {GROQ_MODEL_NAME}")
                return conversation_chain
            else:
                # Use original pipeline
                return self.original_pipeline.qa_chain()

        except Exception as e:
            print(f"❌ Error creating QA chain: {e}")
            raise

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        if self.use_optimized and hasattr(self, 'optimized_pipeline'):
            # Get optimized pipeline stats
            optimized_stats = self.optimized_pipeline.get_performance_stats()

            # Combine with pipeline stats
            return {
                'pipeline_stats': self.pipeline_stats,
                'optimized_stats': optimized_stats,
                'optimization_enabled': True
            }
        else:
            # Return basic stats for original pipeline
            return {
                'pipeline_stats': self.pipeline_stats,
                'optimization_enabled': False
            }

    def retrieve_documents(self, query: str, top_k: Optional[int] = None) -> List:
        """
        Retrieve documents using the current retriever
        Enhanced method for optimized pipeline
        """
        try:
            if self.use_optimized and hasattr(self, 'optimized_pipeline'):
                # Use optimized retrieval
                return self.optimized_pipeline.retrieve_documents(query, top_k)
            else:
                # Use original retrieval if retriever exists
                if hasattr(self, 'original_pipeline'):
                    retriever = self.original_pipeline.pipeline()
                    if retriever:
                        return retriever.get_relevant_documents(query)
                return []
        except Exception as e:
            print(f"Error in document retrieval: {e}")
            return []

    def batch_retrieve_documents(self, queries: List[str], top_k: Optional[int] = None) -> List[List]:
        """
        Batch retrieve documents for multiple queries
        Enhanced method available only with optimized pipeline
        """
        try:
            if self.use_optimized and hasattr(self, 'optimized_pipeline'):
                return self.optimized_pipeline.batch_retrieve_documents(queries, top_k)
            else:
                # Fallback to individual retrieval
                return [self.retrieve_documents(query, top_k) for query in queries]
        except Exception as e:
            print(f"Error in batch document retrieval: {e}")
            return [[] for _ in queries]

    def save_state(self):
        """Save pipeline state to disk"""
        try:
            if self.use_optimized and hasattr(self, 'optimized_pipeline'):
                self.optimized_pipeline.save_state()
            print("✓ Pipeline state saved")
        except Exception as e:
            print(f"Error saving pipeline state: {e}")

    def clear_caches(self):
        """Clear all caches and free memory"""
        try:
            if self.use_optimized and hasattr(self, 'optimized_pipeline'):
                self.optimized_pipeline.clear_caches()
            print("✓ Pipeline caches cleared")
        except Exception as e:
            print(f"Error clearing pipeline caches: {e}")

# Drop-in replacement function
def create_enhanced_rag_pipeline(uploaded_file: str, vector_db_path: str,
                               use_optimized: Optional[bool] = None) -> EnhancedRAGPipeline:
    """
    Create enhanced RAG pipeline with auto-detection of optimizations

    Args:
        uploaded_file: Path to the uploaded file
        vector_db_path: Path to vector database storage
        use_optimized: Force use of optimized components (None = auto-detect)

    Returns:
        EnhancedRAGPipeline instance
    """
    return EnhancedRAGPipeline(uploaded_file, vector_db_path, use_optimized)

# Backward compatibility aliases
RAGPipelineEnhanced = EnhancedRAGPipeline  # Alternative name

# Test function
def test_enhanced_pipeline():
    """Test the enhanced RAG pipeline"""
    print("🧪 Testing Enhanced RAG Pipeline")
    print("=" * 50)

    # Create test file if needed
    test_file = "data/uploads_test/test_contract.txt"
    os.makedirs("data/uploads_test", exist_ok=True)

    if not os.path.exists(test_file):
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write("""
            SAMPLE CONTRACT DOCUMENT

            This is a sample contract for testing the enhanced RAG pipeline.

            PASAL 1 - DEFINISI
            1.1. Kontrak ini mengatur hubungan hukum antara para pihak.
            1.2. Istilah-istilah dalam kontrak ini memiliki arti sebagaimana dijelaskan.

            PASAL 2 - LINGKUP PEKERJAAN
            2.1. Pihak Pertama menyediakan jasa konsultasi.
            2.2. Pihak Kedua menerima jasa tersebut sesuai ketentuan.

            PASAL 3 - PEMBAYARAN
            3.1. Nilai kontrak adalah Rp 100.000.000.
            3.2. Pembayaran dilakukan sesuai termin yang disepakati.
            """)

    # Test pipeline creation
    try:
        pipeline = create_enhanced_rag_pipeline(
            uploaded_file=test_file,
            vector_db_path="data/test_chroma_db",
            use_optimized=None  # Auto-detect
        )

        print(f"✅ Pipeline created successfully")
        print(f"   Optimizations enabled: {pipeline.use_optimized}")
        print(f"   File: {test_file}")

        # Test pipeline processing
        retriever = pipeline.pipeline()

        if retriever:
            print(f"✅ Pipeline processing completed")
            print(f"   Retriever created: {type(retriever).__name__}")

            # Test retrieval
            docs = pipeline.retrieve_documents("pembayaran")
            print(f"✅ Document retrieval test: {len(docs)} documents found")
        else:
            print(f"❌ Pipeline processing failed")

        # Show performance stats
        stats = pipeline.get_performance_stats()
        print(f"\n📊 Performance Statistics:")
        print(f"   Processing time: {stats['pipeline_stats']['total_processing_time']:.2f}s")
        print(f"   Files processed: {stats['pipeline_stats']['files_processed']}")
        print(f"   Optimizations enabled: {stats['optimization_enabled']}")

        return pipeline

    except Exception as e:
        print(f"❌ Error testing enhanced pipeline: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    # Run test
    test_enhanced_pipeline()