from langchain_ollama import OllamaEmbeddings

class EmbeddingsCreator:
    def create_embeddings(self):
        """Creates embeddings from text using Ollama embeddings."""
        try:
            # Use Ollama's qwen3:1.7b model for embeddings to keep it simple
            model_name = "qwen3:1.7b"
            print(f"Creating Ollama embeddings with model: {model_name}")
            embeddings = OllamaEmbeddings(
                model=model_name,
                base_url="http://localhost:11434"
            )
            print(f"✓ Created Ollama embeddings with model: {model_name}")
            return embeddings
        except Exception as e:
            print(f"❌ Error creating Ollama embeddings: {e}")
            import traceback
            traceback.print_exc()
            raise e