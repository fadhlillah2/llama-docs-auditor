from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain.chains import ConversationalRetrievalChain
from langchain.schema import Document
from typing import List

class ConversationChain:
    def __init__(self, model_name: str = "llama-3.3-70b-versatile"):
        """Initialize conversation chain with model-specific optimizations."""
        self.model_name = model_name
        self.context_limits = self._get_context_limits()

    def _get_context_limits(self) -> dict:
        """Get context window limits for different models."""
        limits = {
            "llama-3.3-70b-versatile": {
                "max_tokens": 4000,  # Excellent limit for llama-3.3-70b
                "max_context_chars": 8000,
                "max_memory_turns": 6
            },
            "llama3.2:3b-instruct-q4_0": {
                "max_tokens": 2000,  # Good limit for llama3.2:3b
                "max_context_chars": 4000,
                "max_memory_turns": 4
            },
            "llama2": {
                "max_tokens": 3500,
                "max_context_chars": 6000,
                "max_memory_turns": 5
            },
            "default": {
                "max_tokens": 1500,
                "max_context_chars": 2500,
                "max_memory_turns": 2
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
        """Creates an optimized retrieval QA chain for contract analysis."""
        
        # Optimized system template for contracts within token limits
        system_template = """You are a contract analysis expert. Analyze the provided context and answer questions about contracts, legal terms, and obligations.

INSTRUCTIONS:
- Base answers ONLY on the provided context
- If information is not in context, respond "I don't know"
- For yes/no questions, start with "Yes" or "No" and explain
- Reference specific sections when possible
- Be concise but thorough

CONTEXT:
{context}

QUESTION: {question}"""

        user_template = "{question}"
        messages = [
            SystemMessagePromptTemplate.from_template(system_template),
            HumanMessagePromptTemplate.from_template(user_template)
        ]
        qa_prompt = ChatPromptTemplate.from_messages(messages)

        # Use windowed memory to prevent context overflow
        memory = ConversationBufferWindowMemory(
            memory_key='chat_history', 
            return_messages=True,
            output_key='answer',  # Specify which output to store in memory
            k=self.context_limits["max_memory_turns"]  # Limit conversation history
        )
        
        # Create custom chain with context optimization
        conversation_chain = OptimizedConversationalRetrievalChain.from_llm(
            llm=chat_model,
            retriever=retriever,
            chain_type='stuff',
            memory=memory,
            combine_docs_chain_kwargs={"prompt": qa_prompt},
            context_optimizer=self._optimize_context,
            max_tokens_limit=self.context_limits["max_tokens"],
            return_source_documents=True,
            verbose=False
        )
        
        return conversation_chain


class OptimizedConversationalRetrievalChain(ConversationalRetrievalChain):
    """Extended ConversationalRetrievalChain with context optimization."""
    
    def __init__(self, context_optimizer=None, max_tokens_limit=1500, **kwargs):
        super().__init__(**kwargs)
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
        chain = super().from_llm(**kwargs)
        chain.__dict__['context_optimizer'] = context_optimizer
        chain.__dict__['max_tokens_limit'] = max_tokens_limit
        return chain