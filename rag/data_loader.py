from langchain_community.document_loaders import PyPDFLoader,PyMuPDFLoader,DirectoryLoader 
from langchain_community.document_loaders import Docx2txtLoader, UnstructuredWordDocumentLoader

from langchain_community.document_loaders import TextLoader

import tempfile

class LoadDocuments:
    def __init__(self, uploaded_files):
        self.uploaded_files = uploaded_files

    def load_document(self):
        """Loads the specific uploaded document."""
        try:
            file_path = f'uploads/{self.uploaded_files}'
            print(f"Loading file: {file_path}")
            
            documents = []
            filename = self.uploaded_files.lower()
            
            if filename.endswith('.pdf'):
                try:
                    loader = PyPDFLoader(file_path)
                    documents = loader.load()
                    print(f"Loaded {len(documents)} pages from PDF")
                except Exception as e:
                    print(f"Error loading PDF with PyPDFLoader: {e}")
                    try:
                        loader = PyMuPDFLoader(file_path)
                        documents = loader.load()
                        print(f"Loaded {len(documents)} pages from PDF with PyMuPDF")
                    except Exception as e2:
                        print(f"Error loading PDF with PyMuPDFLoader: {e2}")
                        return []
                        
            elif filename.endswith('.txt'):
                try:
                    loader = TextLoader(file_path)
                    documents = loader.load()
                    print(f"Loaded text file with {len(documents)} documents")
                except Exception as e:
                    print(f"Error loading text file: {e}")
                    return []
                    
            elif filename.endswith(('.docx', '.doc')):
                try:
                    loader = UnstructuredWordDocumentLoader(file_path)
                    documents = loader.load()
                    print(f"Loaded Word document with {len(documents)} documents")
                except Exception as e:
                    print(f"Error loading Word document: {e}")
                    try:
                        loader = Docx2txtLoader(file_path)
                        documents = loader.load()
                        print(f"Loaded Word document with Docx2txt: {len(documents)} documents")
                    except Exception as e2:
                        print(f"Error loading Word with Docx2txt: {e2}")
                        return []
            else:
                print(f"Unsupported file type: {filename}")
                return []
            
            if documents:
                print(f"Successfully loaded {len(documents)} document(s)")
                return documents
            else:
                print("No documents were loaded")
                return []
                
        except Exception as e:
            print(f'Error occurred while loading document: {e}')
            return []
        