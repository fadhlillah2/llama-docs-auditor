from langchain_ollama import OllamaLLM

class ChatModel:
    def __init__(self, model_name="llama3.2:3b-instruct-q4_0"):
        self.model_name = model_name
    
    def initialize_chat_model(self):
        """Initializes the chat model with Ollama."""
        return OllamaLLM(
            model=self.model_name,
            temperature=0.0,
            base_url="http://localhost:11434",
            timeout=300,  # 5 minutes timeout for llama3.2:3b-instruct-q4_0 model loading
            keep_alive="15m"  # Keep model loaded for 15 minutes to avoid reloading
        )