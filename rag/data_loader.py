from langchain_community.document_loaders import PyPDFLoader,PyMuPDFLoader,DirectoryLoader 
from langchain_community.document_loaders import Docx2txtLoader, UnstructuredWordDocumentLoader

from langchain_community.document_loaders import TextLoader

import tempfile

class LoadDocuments:
    def __init__(self, uploaded_files):
        self.uploaded_files = uploaded_files

    def load_document(self):
        """Loads and splits the document into pages."""
        data_path = 'uploads'
        '''         
        try:
               
            if self.uploaded_files is not None:
                file  = self.uploaded_files 
                documents=None            
                print(file.name)   
                with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                    tmp_file.write(file.read())
                    filename = file.name
                    if filename.endswith('.pdf'):
                        print(filename)
                        
                        loader = PyPDFLoader(tmp_file.name)
                        documents=loader.load()
                        
                        loader = PyMuPDFLoader(tmp_file.name)
                        documents=loader.load_and_split()
                    elif filename.endswith('.docx') or filename.endswith('.doc'):
                        loader = UnstructuredWordDocumentLoader(tmp_file.name)
                        documents=loader.load()
                    elif filename.endswith('.txt'):
                        loader = TextLoader(tmp_file.name)
                        documents.extend(loader.load())
                    
                    print("Documents loaded successfully!")
                
                return documents
            
            return None
        '''
        try:
             # Load multiple file types
             loaders = {
                 '.pdf': DirectoryLoader(data_path, glob="./*.pdf"),
                 '.txt': DirectoryLoader(data_path, glob="./*.txt"),
                 '.docx': DirectoryLoader(data_path, glob="./*.docx"),
                 '.doc': DirectoryLoader(data_path, glob="./*.doc")
             }
             
             documents = []
             for file_type, loader in loaders.items():
                 try:
                     docs = loader.load()
                     documents.extend(docs)
                 except Exception as e:
                     print(f"Could not load {file_type} files: {e}")
                     continue
             
             if not documents:
                 print("No documents found in uploads directory")
                 return []
             
             return documents
        except Exception as e:
             return f'An error occurred {e}',400
        