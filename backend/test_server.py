import unittest
import json
import tempfile
import os
from unittest.mock import patch, MagicMock
import sys
import io

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Mock the dependencies that might not be installed
# sys.modules['langchain_community'] = MagicMock()
# sys.modules['langchain_community.document_loaders'] = MagicMock()
# sys.modules['langchain'] = MagicMock()
# sys.modules['langchain.retrievers'] = MagicMock()
# sys.modules['langchain.retrievers.document_compressors'] = MagicMock()
# sys.modules['flask_cors'] = MagicMock()
# sys.modules['dotenv'] = MagicMock()
# sys.modules['rag_pipeline'] = MagicMock()

# Import after mocking
try:
    from server import app
except ImportError as e:
    print(f"Skipping server tests due to missing dependencies: {e}")
    app = None

class TestFlaskServer(unittest.TestCase):
    def setUp(self):
        """Set up test client and temporary upload directory"""
        if app is None:
            self.skipTest("Flask app not available due to missing dependencies")
        
        self.app = app.test_client()
        self.app.testing = True
        
        # Create temporary directory for uploads
        self.temp_dir = tempfile.mkdtemp()
        app.config['UPLOAD_FOLDER'] = self.temp_dir
    
    def tearDown(self):
        """Clean up temporary files"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_health_check(self):
        """Test the health check endpoint"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.decode(), 'Hello, World!')
    
    def test_upload_file_no_file(self):
        """Test upload endpoint with no file"""
        response = self.app.post('/upload_file')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['message'], 'No file part in the request')
    
    def test_upload_file_invalid_extension(self):
        """Test upload endpoint with invalid file extension"""
        data = {'file': (io.BytesIO(b'invalid content'), 'test.invalid')}
        response = self.app.post('/upload_file', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['message'], 'File type is not allowed')
    
    @patch('server.RAGPipeline')
    def test_upload_valid_file(self, mock_rag_pipeline):
        """Test uploading a valid file"""
        # Mock the RAG pipeline
        mock_pipeline_instance = MagicMock()
        mock_rag_pipeline.return_value = mock_pipeline_instance
        mock_pipeline_instance.create_conversation_chain.return_value = MagicMock()
        
        # Create a test file
        data = {'file': (io.BytesIO(b'This is a test contract content'), 'test.txt')}
        
        response = self.app.post('/upload_file', data=data, content_type='multipart/form-data')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['message'], 'File uploaded successfully')
    
    def test_ask_ai_no_qa_chain(self):
        """Test asking AI when no file has been uploaded"""
        data = {'prompt': 'What is this about?'}
        response = self.app.post('/ask_ai', 
                                json=data,
                                content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertIn('error', response_data)
    
    def test_ask_ai_with_qa_chain(self):
        """Test asking AI when QA chain exists"""
        # Mock qa_chain globally
        import server
        original_qa_chain = getattr(server, 'qa_chain', None)
        
        # Create mock qa_chain
        mock_qa_chain = MagicMock()
        mock_qa_chain.invoke.return_value = {'answer': 'This is a test response'}
        server.qa_chain = mock_qa_chain
        
        data = {'prompt': 'What is this about?'}
        response = self.app.post('/ask_ai', 
                                json=data,
                                content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['result'], 'This is a test response')
        
        # Restore original qa_chain
        if original_qa_chain is not None:
            server.qa_chain = original_qa_chain
        elif hasattr(server, 'qa_chain'):
            delattr(server, 'qa_chain')

if __name__ == '__main__':
    unittest.main()