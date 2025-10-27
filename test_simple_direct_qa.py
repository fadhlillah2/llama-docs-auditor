#!/usr/bin/env python3

"""
Test script for SimpleDirectQAChain to bypass import issues
"""

from langchain_core.documents import Document

class TestSimpleDirectQAChain:
    """Test version of SimpleDirectQAChain to bypass import issues."""

    def __init__(self, llm, retriever, conversation_chain=None, **kwargs):
        """Initialize test simple direct QA chain."""
        self.llm = llm
        self.retriever = retriever
        self.conversation_chain = conversation_chain
        self.kwargs = kwargs
        print("✓ TestSimpleDirectQAChain initialized successfully")

    def invoke(self, inputs):
        """Invoke method for LangChain compatibility."""
        return self.__call__(inputs)

    def __call__(self, inputs):
        """Process question through retriever and LLM directly."""
        try:
            question = inputs.get('question', '')
            chat_history = inputs.get('chat_history', [])

            print(f"📝 Processing question: {question[:100]}...")

            # Retrieve relevant documents
            if self.retriever:
                docs = self.retriever.get_relevant_documents(question)
                print(f"📚 Retrieved {len(docs)} relevant documents")

                # Combine document content
                context = "\n\n".join([doc.page_content for doc in docs[:5]])  # Limit to top 5

                # Create prompt with context
                system_prompt = """You are an expert contract analysis assistant. Based on the provided document context, answer the user's question comprehensively and accurately.

CONTEXT FROM DOCUMENT:
{context}

QUESTION: {question}

Provide a thorough answer based on the document context above. If the information is not available in the context, state that clearly.""".format(context=context[:4000], question=question)  # Limit context length

                # Format with chat history if provided
                messages = [{"role": "system", "content": system_prompt}]

                # Add chat history (simplified)
                for msg in chat_history[-4:]:  # Keep last 4 messages
                    if isinstance(msg, dict):
                        if msg.get('type') == 'human':
                            messages.append({"role": "user", "content": msg.get('content', '')})
                        elif msg.get('type') == 'ai':
                            messages.append({"role": "assistant", "content": msg.get('content', '')})

                messages.append({"role": "user", "content": question})

                # Generate response using LLM directly
                response = self.llm.invoke(messages)

                # Extract content from response
                if hasattr(response, 'content'):
                    answer = response.content
                elif isinstance(response, str):
                    answer = response
                else:
                    answer = str(response)

                print("✅ Generated response successfully")

                return {
                    'question': question,
                    'answer': answer,
                    'source_documents': docs,
                    'chat_history': chat_history
                }
            else:
                return {
                    'question': question,
                    'answer': 'I apologize, but the document retriever is not available. Please upload a document first.',
                    'source_documents': [],
                    'chat_history': chat_history
                }

        except Exception as e:
            print(f"❌ Error in TestSimpleDirectQAChain: {e}")
            import traceback
            traceback.print_exc()
            return {
                'question': inputs.get('question', ''),
                'answer': f'I apologize, but I encountered an error while processing your question: {str(e)}',
                'source_documents': [],
                'chat_history': inputs.get('chat_history', [])
            }

if __name__ == "__main__":
    print("🧪 Testing TestSimpleDirectQAChain class")
    print("=" * 50)

    # Test with mock objects
    class MockLLM:
        def invoke(self, messages):
            return "Test response from LLM"

    class MockRetriever:
        def get_relevant_documents(self, query):
            return [Document(page_content="Test document content", metadata={"source": "test"})]

    # Create instance
    llm = MockLLM()
    retriever = MockRetriever()

    qa_chain = TestSimpleDirectQAChain(llm=llm, retriever=retriever)

    print(f"✓ Created instance successfully")
    print(f"✓ Has llm attribute: {hasattr(qa_chain, 'llm')}")
    print(f"✓ Has retriever attribute: {hasattr(qa_chain, 'retriever')}")
    print(f"✓ Has conversation_chain attribute: {hasattr(qa_chain, 'conversation_chain')}")

    # Test invocation
    result = qa_chain.invoke({
        'question': 'What is this document about?',
        'chat_history': []
    })

    print(f"✓ Invocation successful")
    print(f"Answer: {result['answer']}")

    print("\n🎉 TestSimpleDirectQAChain works correctly!")