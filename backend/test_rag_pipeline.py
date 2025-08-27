import unittest
import tempfile
import os
import sys
from unittest.mock import patch, MagicMock

# Add paths for imports
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock the dependencies that might not be installed
# sys.modules['langchain_community'] = MagicMock()
# sys.modules['langchain_community.document_loaders'] = MagicMock()
# sys.modules['langchain'] = MagicMock()
# sys.modules['langchain.retrievers'] = MagicMock()

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
    
    def tearDown(self):
        """Clean up test files"""
        if os.path.exists(self.test_file_path):
            os.unlink(self.test_file_path)
    
    def test_rag_pipeline_initialization(self):
        """Test RAG pipeline can be initialized"""
        pipeline = RAGPipeline(self.test_file_path)
        self.assertIsNotNone(pipeline)
        self.assertEqual(pipeline.file_path, self.test_file_path)
    
    @patch('rag.rag_pipeline.LoadDocuments')
    @patch('rag.rag_pipeline.EmbeddingsCreator')
    @patch('rag.rag_pipeline.Retriever')
    @patch('rag.rag_pipeline.ChatModel')
    @patch('rag.rag_pipeline.ConversationChain')
    def test_create_conversation_chain(self, mock_conv_chain, mock_chat_model, 
                                     mock_retriever, mock_embeddings, mock_load_docs):
        """Test conversation chain creation with mocked components"""
        
        # Mock all components
        mock_docs = MagicMock()
        mock_embeddings_obj = MagicMock()
        mock_retriever_obj = MagicMock()
        mock_chat_obj = MagicMock()
        mock_chain = MagicMock()
        
        mock_load_docs.return_value = mock_docs
        mock_docs.load_documents.return_value = [MagicMock()]
        
        mock_embeddings.return_value = mock_embeddings_obj
        mock_embeddings_obj.create_embeddings.return_value = MagicMock()
        
        mock_retriever.return_value = mock_retriever_obj
        mock_retriever_obj.create_retriever.return_value = MagicMock()
        
        mock_chat_model.return_value = mock_chat_obj
        mock_chat_obj.create_chat_model.return_value = MagicMock()
        
        mock_conv_chain.return_value = mock_chain
        mock_chain.create_conversation_chain.return_value = MagicMock()
        
        # Test pipeline execution
        pipeline = RAGPipeline(self.test_file_path)
        result = pipeline.create_conversation_chain()
        
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
        pipeline = RAGPipeline(invalid_path)
        
        # Should still initialize but will fail during document loading
        self.assertEqual(pipeline.file_path, invalid_path)

if __name__ == '__main__':
    unittest.main()