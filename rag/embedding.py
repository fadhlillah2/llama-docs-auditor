from langchain_community.embeddings import HuggingFaceEmbeddings

class EmbeddingsCreator:
    def create_embeddings(self):
        """Creates embeddings from text using local HuggingFace model."""
        try:
            # Use a small, efficient model for embeddings
            model_name = "sentence-transformers/all-MiniLM-L6-v2"
            embeddings = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={'device': 'cpu'}
            )
            print(f"Created HuggingFace embeddings with model: {model_name}")
            return embeddings
        except Exception as e:
            print(f"Error creating embeddings: {e}")
            # Fallback to a simpler implementation
            return HuggingFaceEmbeddings()