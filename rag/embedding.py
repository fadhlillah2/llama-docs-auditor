from langchain_community.embeddings import OllamaEmbeddings

class EmbeddingsCreator:
    def create_embeddings(self):
        """Creates embeddings from text using Ollama embeddings."""
        try:
            # Use Ollama's nomic-embed-text model for embeddings
            model_name = "nomic-embed-text:latest"
            embeddings = OllamaEmbeddings(
                model=model_name,
                base_url="http://localhost:11434"
            )
            print(f"Created Ollama embeddings with model: {model_name}")
            return embeddings
        except Exception as e:
            print(f"Error creating Ollama embeddings: {e}")
            # Try with a different model if the first fails
            try:
                fallback_model = "qwen3:1.7b"
                embeddings = OllamaEmbeddings(
                    model=fallback_model,
                    base_url="http://localhost:11434"
                )
                print(f"Created Ollama embeddings with fallback model: {fallback_model}")
                return embeddings
            except Exception as e2:
                print(f"Error with fallback embeddings: {e2}")
                raise e2