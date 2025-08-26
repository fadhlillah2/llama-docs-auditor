from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import BaseRetriever, Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from typing import List
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class SimpleRetriever(BaseRetriever):
    def __init__(self, documents, embedding):
        super().__init__()
        self.documents = documents
        self.embedding = embedding
        self.chunks = []
        self.embeddings = []
        self._setup()
    
    def _setup(self):
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        self.chunks = text_splitter.split_documents(self.documents)
        print(f"Created {len(self.chunks)} text chunks")
        
        # Create embeddings for all chunks
        if self.chunks:
            chunk_texts = [chunk.page_content for chunk in self.chunks]
            self.embeddings = self.embedding.embed_documents(chunk_texts)
            print(f"Created embeddings for {len(self.embeddings)} chunks")
    
    def _get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None) -> List[Document]:
        if not self.chunks or not self.embeddings:
            return []
        
        # Get query embedding
        query_embedding = self.embedding.embed_query(query)
        
        # Calculate similarities
        similarities = cosine_similarity([query_embedding], self.embeddings)[0]
        
        # Get top 4 most similar chunks
        top_indices = np.argsort(similarities)[-4:][::-1]
        
        return [self.chunks[i] for i in top_indices]

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
