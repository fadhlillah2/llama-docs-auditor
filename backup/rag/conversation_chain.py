from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from typing import List, Dict, Any

class ConversationChain:
    def __init__(self, model_name: str = "llama-3.3-70b-versatile"):
        """Initialize conversation chain with model-specific optimizations."""
        self.model_name = model_name
        self.context_limits = self._get_context_limits()
        self.qa_chain = None

    def _get_context_limits(self) -> dict:
        """Get context window limits for different models."""
        limits = {
            "llama-3.3-70b-versatile": {
                "max_tokens": 6000,  # Excellent limit for llama-3.3-70b (can handle more context)
                "max_context_chars": 16000,  # Increased for better document coverage
                "max_memory_turns": 8,
                "max_retrieved_docs": 10  # Retrieve more relevant documents
            },
            "llama3.2:3b-instruct-q4_0": {
                "max_tokens": 2000,  # Good limit for llama3.2:3b
                "max_context_chars": 6000,  # Increased from 4000
                "max_memory_turns": 4,
                "max_retrieved_docs": 6
            },
            "llama2": {
                "max_tokens": 3500,
                "max_context_chars": 8000,  # Increased from 6000
                "max_memory_turns": 5,
                "max_retrieved_docs": 8
            },
            "default": {
                "max_tokens": 2000,  # Increased from 1500
                "max_context_chars": 5000,  # Increased from 2500
                "max_memory_turns": 3,
                "max_retrieved_docs": 6
            }
        }
        return limits.get(self.model_name, limits["default"])
    
    def _optimize_context(self, documents: List[Document]) -> str:
        """Optimize context to fit within model limits."""
        if not documents:
            return ""
        
        max_chars = self.context_limits["max_context_chars"]
        
        # Sort documents by relevance if available (assume first documents are most relevant)
        context_parts = []
        current_length = 0
        
        for doc in documents:
            content = doc.page_content.strip()
            
            # Skip empty content
            if not content:
                continue
            
            # Add section separator and content
            section = f"\n--- Document Section ---\n{content}"
            
            # Check if adding this section would exceed limits
            if current_length + len(section) > max_chars:
                # Try to add a truncated version
                remaining_chars = max_chars - current_length - 50  # Leave some buffer
                if remaining_chars > 100:  # Only add if meaningful content can fit
                    truncated_content = content[:remaining_chars] + "..."
                    context_parts.append(f"\n--- Document Section ---\n{truncated_content}")
                break
            
            context_parts.append(section)
            current_length += len(section)
        
        return "\n".join(context_parts)
    
    def create_retrieval_qa_chain(self, chat_model, retriever):
        """Creates a simplified retrieval QA chain for contract analysis."""
        try:
            # Import working standalone implementation to bypass import issues
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(__file__)))
            from test_simple_direct_qa import TestSimpleDirectQAChain

            # Create a working QA chain
            return TestSimpleDirectQAChain(llm=chat_model, retriever=retriever, conversation_chain=self)
        except Exception as e:
            print(f"⚠️ Failed to create QA chain: {e}")
            raise e






# class OptimizedConversationalRetrievalChain(ConversationalRetrievalChain):
    """Extended ConversationalRetrievalChain with context optimization."""

    def __init__(self, context_optimizer=None, max_tokens_limit=1500, **kwargs):
        # super().__init__(**kwargs)  # Commented out to prevent initialization error
        self.__dict__['context_optimizer'] = context_optimizer
        self.__dict__['max_tokens_limit'] = max_tokens_limit

    def _get_docs(self, question: str, inputs: dict, *, run_manager=None) -> List[Document]:
        """Get documents with potential optimization."""
        docs = super()._get_docs(question, inputs, run_manager=run_manager)

        # Apply context optimization if available
        context_optimizer = self.__dict__.get('context_optimizer')
        max_tokens_limit = self.__dict__.get('max_tokens_limit', 1500)

        if context_optimizer and docs:
            # Estimate tokens and optimize if needed
            total_content = " ".join([doc.page_content for doc in docs])
            estimated_tokens = len(total_content.split()) * 1.3  # Rough token estimation

            if estimated_tokens > max_tokens_limit * 0.7:  # Use 70% of limit for context
                print(f"⚠️ Context optimization: {estimated_tokens:.0f} tokens -> optimizing")
                # Return fewer, more relevant documents
                return docs[:3]  # Limit to top 3 most relevant

        return docs

    @classmethod
    def from_llm(cls, context_optimizer=None, max_tokens_limit=1500, **kwargs):
        """Create optimized chain from LLM."""
        try:
            chain = super().from_llm(**kwargs)
            chain.__dict__['context_optimizer'] = context_optimizer
            chain.__dict__['max_tokens_limit'] = max_tokens_limit
            return chain
        except Exception as e:
            print(f"⚠️ Failed to create OptimizedConversationalRetrievalChain: {e}")
            print("🔄 Falling back to standard ConversationalRetrievalChain")
            try:
                # Fallback to standard chain without optimizations
                from langchain_community.chains import ConversationalRetrievalChain
                return ConversationalRetrievalChain.from_llm(**kwargs)
            except Exception as e2:
                print(f"⚠️ Failed to create standard ConversationalRetrievalChain: {e2}")
                print("🔄 Falling back to SimpleDirectQAChain (bypasses LLMChain validation)")
                # Final fallback to simple direct QA chain
                return SimpleDirectQAChain(**kwargs)