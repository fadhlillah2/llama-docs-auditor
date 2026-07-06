from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

load_dotenv()

class ChatModel:
    def __init__(self, model_name="llama-3.3-70b-versatile"):
        self.model_name = model_name

    def initialize_chat_model(self):
        """Initializes the chat model with Groq."""
        # Check for Groq API key
        groq_api_key = os.getenv('GROQ_API_KEY')
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY environment variable is required for Groq integration")

        return ChatGroq(
            model=self.model_name,
            temperature=0.0,
            api_key=groq_api_key,
            timeout=300,  # 5 minutes timeout
            max_retries=2  # Retry failed requests
        )