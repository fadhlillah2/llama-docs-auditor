from langchain_ollama import OllamaLLM

class ChatModel:
    def __init__(self, model_name="qwen3:1.7b"):
        self.model_name = model_name
    
    def initialize_chat_model(self):
        """Initializes the chat model with Ollama."""
        return OllamaLLM(
            model=self.model_name,
            temperature=0.0,
            base_url="http://localhost:11434"
        )