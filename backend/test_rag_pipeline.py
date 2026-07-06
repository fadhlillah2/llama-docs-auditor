import unittest
import tempfile
import shutil
import os
import sys
from unittest.mock import patch, MagicMock

# Add paths for imports
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
# rag_pipeline.py uses bare imports (e.g. "from data_loader import ..."),
# same as backend/server.py does at runtime, so the rag/ dir itself must be
# on sys.path too, not just the repo root.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rag'))

try:
    from rag.rag_pipeline import RAGPipeline
except ImportError as e:
    print(f"Skipping RAG pipeline tests due to missing dependencies: {e}")
    RAGPipeline = None

class TestRAGPipeline(unittest.TestCase):
    def setUp(self):
        """Set up test environment"""
        if RAGPipeline is None:
            self.skipTest("RAG pipeline not available due to missing dependencies")
            
        # Create a temporary test file
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        self.temp_file.write("This is a test contract. It contains important clauses about payment terms.")
        self.temp_file.close()

        self.test_file_path = self.temp_file.name
        # RAGPipeline requires a vector_db_path (used by Retriever for ChromaDB
        # persistence) in addition to the uploaded file.
        self.vector_db_path = tempfile.mkdtemp()

    def tearDown(self):
        """Clean up test files"""
        if os.path.exists(self.test_file_path):
            os.unlink(self.test_file_path)
        shutil.rmtree(self.vector_db_path, ignore_errors=True)

    def test_rag_pipeline_initialization(self):
        """Test RAG pipeline can be initialized"""
        pipeline = RAGPipeline(self.test_file_path, self.vector_db_path)
        self.assertIsNotNone(pipeline)
        self.assertEqual(pipeline.uploaded_file, self.test_file_path)
        self.assertEqual(pipeline.vector_db_path, self.vector_db_path)
    
    @patch('rag.rag_pipeline.ChunkDocuments')
    @patch('rag.rag_pipeline.LoadDocuments')
    @patch('rag.rag_pipeline.EmbeddingsCreator')
    @patch('rag.rag_pipeline.Retriever')
    @patch('rag.rag_pipeline.ChatModel')
    @patch('rag.rag_pipeline.ConversationChain')
    def test_create_conversation_chain(self, mock_conv_chain, mock_chat_model,
                                     mock_retriever, mock_embeddings, mock_load_docs,
                                     mock_chunk_docs):
        """Test conversation chain creation (RAGPipeline.qa_chain) with mocked components"""

        # Mock all components, using the method names RAGPipeline actually calls.
        mock_docs = MagicMock()
        mock_chunker_obj = MagicMock()
        mock_embeddings_obj = MagicMock()
        mock_retriever_obj = MagicMock()
        mock_chat_obj = MagicMock()
        mock_chain = MagicMock()

        mock_load_docs.return_value = mock_docs
        mock_docs.load_document.return_value = [MagicMock()]

        mock_chunk = MagicMock()
        mock_chunk.page_content = "chunk content"
        mock_chunk_docs.return_value = mock_chunker_obj
        mock_chunker_obj.chunk_documents.return_value = [mock_chunk]

        mock_embeddings.return_value = mock_embeddings_obj
        mock_embeddings_obj.create_embeddings.return_value = MagicMock()

        mock_retriever.return_value = mock_retriever_obj
        mock_retriever_obj.get_retriever.return_value = MagicMock()

        mock_chat_model.return_value = mock_chat_obj
        mock_chat_obj.initialize_chat_model.return_value = MagicMock()

        mock_conv_chain.return_value = mock_chain
        mock_chain.create_retrieval_qa_chain.return_value = MagicMock()

        # Test pipeline execution
        pipeline = RAGPipeline(self.test_file_path, self.vector_db_path)
        result = pipeline.qa_chain()

        # Verify all components were called
        mock_load_docs.assert_called_once_with(self.test_file_path)
        mock_embeddings.assert_called_once()
        mock_retriever.assert_called_once()
        mock_chat_model.assert_called_once()
        mock_conv_chain.assert_called_once()

        self.assertIsNotNone(result)

    def test_invalid_file_path(self):
        """Test pipeline with invalid file path"""
        invalid_path = "/nonexistent/file.txt"
        pipeline = RAGPipeline(invalid_path, self.vector_db_path)

        # Should still initialize but will fail during document loading
        self.assertEqual(pipeline.uploaded_file, invalid_path)

if __name__ == '__main__':
    unittest.main()