from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import BaseRetriever, Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from typing import List, Any
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SimpleRetriever(BaseRetriever):
    """Custom retriever using cosine similarity."""
    
    def __init__(self, documents, embedding):
        super().__init__()
        self._documents = documents
        self._embedding = embedding
        self._chunks = []
        self._embeddings = []
        self._setup()
    
    def _setup(self):
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        self._chunks = text_splitter.split_documents(self._documents)
        print(f"Created {len(self._chunks)} text chunks")
        
        # Create embeddings for all chunks
        if self._chunks:
            chunk_texts = [chunk.page_content for chunk in self._chunks]
            self._embeddings = self._embedding.embed_documents(chunk_texts)
            print(f"Created embeddings for {len(self._embeddings)} chunks")
    
    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None) -> List[Document]:
        if not self._chunks or not self._embeddings:
            return []
        
        # Get query embedding
        query_embedding = self._embedding.embed_query(query)
        
        # Calculate similarities
        similarities = cosine_similarity([query_embedding], self._embeddings)[0]
        
        # Get top 4 most similar chunks
        top_indices = np.argsort(similarities)[-4:][::-1]
        
        return [self._chunks[i] for i in top_indices]

class Retriever:
    def __init__(self, documents, embedding, persist_directory):
        self.documents = documents
        self.embedding = embedding
        self.persist_directory = persist_directory
        

    def get_retriever(self):
        try:
            if not self.documents:
                print("No documents provided to retriever")
                return None
                
            print(f"Processing {len(self.documents)} documents")
            
            # Create simple retriever
            retriever = SimpleRetriever(self.documents, self.embedding)
            
            print("Retriever created successfully!")
            return retriever
            
        except Exception as e:
            print(f"Error creating retriever: {e}")
            import traceback
            traceback.print_exc()
            return None
