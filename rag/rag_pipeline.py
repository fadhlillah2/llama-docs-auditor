import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from data_loader import LoadDocuments
from chunk_documents import ChunkDocuments
from embedding import EmbeddingsCreator
from retriever import Retriever
from chat_model import ChatModel
from conversation_chain import ConversationChain
from dotenv import load_dotenv, find_dotenv

load_dotenv()
OLLAMA_MODEL_NAME = 'qwen3:1.7b'
load_dotenv(find_dotenv())

class RAGPipeline:
    def __init__(self,
                 uploaded_file,
                 vector_db_path,
                 ):
        self.uploaded_file = uploaded_file
        self.vector_db_path = vector_db_path
    def pipeline(self):
        print("📄 Starting optimized RAG pipeline...")
        start_time = time.time()
        
        # Load documents
        print("📥 Loading documents...")
        loader = LoadDocuments(self.uploaded_file)
        documents = loader.load_document()
        print(f"✓ Loaded {len(documents)} documents")
        
        # Chunk documents for better retrieval - optimized for contracts
        print("📝 Chunking documents...")
        chunk_documents = ChunkDocuments(documents)
        chunks = chunk_documents.chunk_documents(chunk_size=800, chunk_overlap=100)
        print(f"✓ Created {len(chunks)} optimized chunks for contracts")
        
        # Initialize embedding creator in parallel with other operations
        print("🧠 Initializing embeddings with caching...")
        embedding_creator = EmbeddingsCreator()
        
        # Pre-warm the Ollama model to avoid cold start during retrieval
        def prewarm_model():
            try:
                embedding_creator.create_embeddings()
                print("✓ Ollama model pre-warmed")
            except Exception as e:
                print(f"⚠️ Model pre-warming failed: {e}")
        
        # Run model pre-warming in background while setting up retriever
        with ThreadPoolExecutor(max_workers=2) as executor:
            prewarm_future = executor.submit(prewarm_model)
            
            # Use chunked documents for better retrieval
            retriever = Retriever(chunks, embedding_creator, self.vector_db_path).get_retriever()
            
            # Wait for pre-warming to complete
            prewarm_future.result()
        
        end_time = time.time()
        pipeline_time = end_time - start_time
        print(f"✓ Retriever Created Successfully with caching! Pipeline took {pipeline_time:.2f}s")
        return retriever
    
    def qa_chain(self):
        chat_model = ChatModel(OLLAMA_MODEL_NAME).initialize_chat_model()
        retriever = self.pipeline()
        conversation_chain = ConversationChain().create_retrieval_qa_chain(chat_model,retriever)
        return conversation_chain


        
        
    
