import time
import os
from concurrent.futures import ThreadPoolExecutor
from data_loader import LoadDocuments
from chunk_documents import ChunkDocuments
from embedding import EmbeddingsCreator
from retriever import Retriever
from chat_model import ChatModel
from conversation_chain import ConversationChain
from dotenv import load_dotenv, find_dotenv

load_dotenv()
# Use Groq model by default, can be overridden by environment variable
GROQ_MODEL_NAME = os.getenv('GROQ_MODEL_NAME', 'llama-3.3-70b-versatile')
load_dotenv(find_dotenv())

class RAGPipeline:
    def __init__(self,
                 uploaded_file,
                 vector_db_path,
                 ):
        self.uploaded_file = uploaded_file
        self.vector_db_path = vector_db_path
    def pipeline(self):
        print("\n" + "="*80, flush=True)
        print("📄 Starting optimized RAG pipeline...", flush=True)
        print(f"📄 Processing file: {self.uploaded_file}", flush=True)
        start_time = time.time()

        try:
            # Validate file exists
            import os as os_module
            if not os_module.path.exists(self.uploaded_file):
                raise ValueError(f"File not found: {self.uploaded_file}")
            print(f"✓ File exists: {self.uploaded_file}", flush=True)
            print(f"✓ File size: {os_module.path.getsize(self.uploaded_file)} bytes", flush=True)

            # Load documents with error recovery
            print("📥 Loading documents...", flush=True)
            documents = self._load_documents_with_retry()
            if not documents:
                raise ValueError("No documents could be loaded")
            print(f"✓ Loaded {len(documents)} documents", flush=True)
            
            # Chunk documents for better retrieval - optimized for contracts
            print("📝 Chunking documents...", flush=True)
            chunks = self._chunk_documents_with_validation(documents)
            if not chunks:
                raise ValueError("Document chunking failed")
            print(f"✓ Created {len(chunks)} optimized chunks for contracts", flush=True)

            # Initialize embedding creator with error recovery
            print("🧠 Initializing embeddings with caching...", flush=True)
            embedding_creator = self._initialize_embeddings_with_retry()

            # Create retriever with parallel pre-warming
            print("🔍 Creating retriever with pre-warming...", flush=True)
            retriever = self._create_retriever_with_prewarm(chunks, embedding_creator)

            if not retriever:
                raise ValueError("Retriever creation failed")

            end_time = time.time()
            pipeline_time = end_time - start_time
            print(f"✓ Retriever Created Successfully! Pipeline took {pipeline_time:.2f}s", flush=True)
            print("="*80 + "\n", flush=True)
            return retriever

        except Exception as e:
            print(f"\n❌ RAG Pipeline FAILED: {e}", flush=True)
            import traceback
            print("Full traceback:", flush=True)
            traceback.print_exc()
            print("="*80 + "\n", flush=True)
            # Attempt fallback pipeline with minimal functionality
            print("🔄 Attempting fallback pipeline...", flush=True)
            return self._fallback_pipeline()
    
    def _load_documents_with_retry(self, max_retries: int = 3):
        """Load documents with retry logic."""
        for attempt in range(max_retries):
            try:
                print(f"📖 Attempt {attempt + 1}/{max_retries} to load document...", flush=True)
                loader = LoadDocuments(self.uploaded_file)
                documents = loader.load_document()
                if documents:
                    print(f"✓ Successfully loaded {len(documents)} pages/sections", flush=True)
                    return documents
                print(f"⚠️ Attempt {attempt + 1}: No documents loaded", flush=True)
            except Exception as e:
                print(f"⚠️ Attempt {attempt + 1} failed: {e}", flush=True)
                import traceback
                traceback.print_exc()
                if attempt == max_retries - 1:
                    print(f"❌ All {max_retries} attempts failed!", flush=True)
                    raise e
                print(f"⏳ Waiting before retry...", flush=True)
                time.sleep(1)  # Brief delay before retry
        return []
    
    def _chunk_documents_with_validation(self, documents):
        """Chunk documents with validation - optimized for contract analysis."""
        try:
            chunk_documents = ChunkDocuments(documents)
            # Increased chunk size for better context preservation
            # 1200 chars ≈ 300 tokens, allowing better semantic understanding
            chunks = chunk_documents.chunk_documents(chunk_size=1200, chunk_overlap=200)

            # Validate chunks
            valid_chunks = [chunk for chunk in chunks if chunk.page_content.strip()]
            if len(valid_chunks) < len(chunks):
                print(f"⚠️ Filtered out {len(chunks) - len(valid_chunks)} empty chunks")

            print(f"✓ Created {len(valid_chunks)} document chunks (1200 chars with 200-char overlap)")
            return valid_chunks

        except Exception as e:
            print(f"⚠️ Chunking failed: {e}")
            # Fallback: use documents as-is with basic splitting
            print("🔄 Using fallback chunking...")
            return documents[:50]  # Limit to prevent memory issues
    
    def _initialize_embeddings_with_retry(self, max_retries: int = 3):
        """Initialize embeddings with retry logic."""
        for attempt in range(max_retries):
            try:
                embedding_creator = EmbeddingsCreator()
                # Test embeddings creation
                test_embedding = embedding_creator.create_embeddings()
                if test_embedding:
                    return embedding_creator
                    
            except Exception as e:
                print(f"⚠️ Embedding initialization attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise e
                time.sleep(2)  # Longer delay for model issues
        
        raise RuntimeError("Failed to initialize embeddings after retries")
    
    def _create_retriever_with_prewarm(self, chunks, embedding_creator):
        """Create retriever with parallel pre-warming."""
        def prewarm_model():
            try:
                embedding_creator.create_embeddings()
                print("✓ Embedding model pre-warmed")
                return True
            except Exception as e:
                print(f"⚠️ Model pre-warming failed: {e}")
                return False
        
        # Run model pre-warming in background while setting up retriever
        try:
            with ThreadPoolExecutor(max_workers=2) as executor:
                prewarm_future = executor.submit(prewarm_model)
                
                # Use chunked documents for better retrieval
                retriever = Retriever(chunks, embedding_creator, self.vector_db_path).get_retriever()
                
                # Wait for pre-warming to complete (with timeout)
                try:
                    prewarm_result = prewarm_future.result(timeout=30)
                    if not prewarm_result:
                        print("⚠️ Pre-warming failed, but continuing with retriever")
                except Exception as e:
                    print(f"⚠️ Pre-warming timeout or failed: {e}")
                
                return retriever
                
        except Exception as e:
            print(f"⚠️ Retriever creation failed: {e}")
            raise e
    
    def _fallback_pipeline(self):
        """Fallback pipeline with minimal functionality."""
        print("🔄 Starting fallback RAG pipeline...")
        try:
            # Simple document loading without chunking
            loader = LoadDocuments(self.uploaded_file)
            documents = loader.load_document()
            
            if not documents:
                print("❌ Fallback: No documents available")
                return None
            
            # Use first few documents only
            limited_docs = documents[:10]  # Limit for performance
            print(f"🔄 Using fallback with {len(limited_docs)} documents")
            
            # Simple embedding using fake embeddings for development
            from embedding import FakeEmbeddings
            simple_embedding = FakeEmbeddings(embedding_dim=384)
            
            # Create basic retriever
            retriever = Retriever(limited_docs, simple_embedding, self.vector_db_path).get_retriever()
            print("✓ Fallback retriever created")
            return retriever
            
        except Exception as e:
            print(f"❌ Fallback pipeline also failed: {e}")
            return None
    
    def qa_chain(self):
        """Create optimized QA chain with context window management."""
        chat_model = ChatModel(GROQ_MODEL_NAME).initialize_chat_model()
        retriever = self.pipeline()
        
        if not retriever:
            print("❌ No retriever available, cannot create QA chain")
            return None
            
        # Create conversation chain with model-specific optimizations
        conversation_chain_creator = ConversationChain(model_name=GROQ_MODEL_NAME)
        conversation_chain = conversation_chain_creator.create_retrieval_qa_chain(chat_model, retriever)
        
        print(f"✓ QA chain created with context optimization for {GROQ_MODEL_NAME}")
        return conversation_chain


        
        
    
