import React, { useState, useCallback, KeyboardEvent, useEffect } from "react";
import Message from "../components/Message";
import Svg from "../components/Svg";
import LoadingSpinner, { ChatLoadingIndicator } from "../components/LoadingSpinner";
import { ChatErrorMessage, ConnectionErrorMessage } from "../components/ErrorDisplay";
import { ChatTypingIndicator } from "../components/TypingIndicator";
import type { 
  ChatMessage, 
  ChatApiRequest, 
  ChatApiResponse 
} from "../types/api";

interface TechStackItem {
  category: string;
  technologies: string;
}

function Chat(): JSX.Element {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      position: "left_bubble",
      message: "Ask me any question about your document?",
      timestamp: new Date().toISOString(),
      id: "welcome-message"
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load conversation history on component mount
  useEffect(() => {
    loadConversationHistory();
  }, []);

  // Save conversation history whenever messages change
  useEffect(() => {
    if (chatMessages.length > 1) { // Don't save just the welcome message
      saveConversationHistory();
    }
  }, [chatMessages, currentSessionId]);

  const saveConversationHistory = useCallback(() => {
    try {
      const conversationData = {
        sessionId: currentSessionId,
        messages: chatMessages,
        timestamp: new Date().toISOString()
      };

      const existingHistory = localStorage.getItem('conversationHistory');
      const history = existingHistory ? JSON.parse(existingHistory) : {};
      
      if (currentSessionId) {
        history[currentSessionId] = conversationData;
        localStorage.setItem('conversationHistory', JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }, [chatMessages, currentSessionId]);

  const loadConversationHistory = useCallback((sessionId?: string) => {
    try {
      const existingHistory = localStorage.getItem('conversationHistory');
      if (!existingHistory) return;

      const history = JSON.parse(existingHistory);
      const targetSessionId = sessionId || getActiveSessionId();
      
      if (targetSessionId && history[targetSessionId]) {
        const conversationData = history[targetSessionId];
        setChatMessages(conversationData.messages);
        setCurrentSessionId(targetSessionId);
        console.log(`Loaded conversation history for session: ${targetSessionId}`);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }, []);

  const getActiveSessionId = useCallback(() => {
    // Try to get session ID from recent documents
    try {
      const documents = localStorage.getItem('uploadedDocuments');
      if (documents) {
        const parsedDocs = JSON.parse(documents);
        if (parsedDocs.length > 0) {
          // Return the most recent document's session ID
          return parsedDocs[parsedDocs.length - 1].sessionId;
        }
      }
    } catch (error) {
      console.error('Error getting active session ID:', error);
    }
    return null;
  }, []);

  const startNewConversation = useCallback(() => {
    setChatMessages([
      {
        position: "left_bubble",
        message: "Ask me any question about your document?",
        timestamp: new Date().toISOString(),
        id: "welcome-message"
      },
    ]);
    setCurrentSessionId(null);
    setError(null);
    setIsConnected(true);
  }, []);

  const clearConversationHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
      localStorage.removeItem('conversationHistory');
      startNewConversation();
    }
  }, [startNewConversation]);

  // Chat control functions with proper typing
  const openChart = useCallback((): void => {
    const chatElement = document.getElementById("assistant-chat");
    if (chatElement) {
      chatElement.classList.add("show");
      chatElement.classList.remove("hide");
    }
  }, []);

  const closeChart = useCallback((): void => {
    const chatElement = document.getElementById("assistant-chat");
    if (chatElement) {
      chatElement.classList.add("hide");
      chatElement.classList.remove("show");
    }
  }, []);

  const chatScrollUp = useCallback((): void => {
    const elem = document.querySelector(".start-chat") as HTMLElement;
    if (elem) {
      setTimeout(() => {
        elem.scrollTo({
          top: elem.scrollHeight,
          behavior: "smooth",
        });
      }, 200);
    }
  }, []);

  const validateInput = (input: string): boolean => {
    return input.trim().length > 0 && input.trim().length <= 400;
  };

  const askAI = useCallback(async (): Promise<void> => {
    const promptInput = document.getElementById("chat-input") as HTMLInputElement;
    
    if (!promptInput) {
      console.error("Chat input element not found");
      return;
    }

    const prompt = promptInput.value.trim();
    
    if (!validateInput(prompt)) {
      console.warn("Invalid input: empty or too long");
      return;
    }

    promptInput.value = "";
    setIsLoading(true);
    setError(null);

    // Generate unique ID for this conversation
    const messageId = `msg-${Date.now()}`;

    // Add user message
    const messagesWithUser: ChatMessage[] = [
      ...chatMessages,
      {
        position: "right_bubble",
        message: prompt,
        timestamp: new Date().toISOString(),
        id: `${messageId}-user`
      }
    ];
    
    setChatMessages(messagesWithUser);
    chatScrollUp();

    const requestData: ChatApiRequest = {
      chatHistory: JSON.stringify(chatMessages),
      prompt: prompt,
    };

    // Set timeout to 2 minutes for Ollama model loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("http://127.0.0.1:8081/ask_ai", {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resData: ChatApiResponse = await response.json();
      
      // Clear any existing errors on successful response
      setError(null);
      setIsConnected(true);
      
      // Set session ID if not already set
      if (!currentSessionId && resData.session_id) {
        setCurrentSessionId(resData.session_id);
      }
      
      const finalMessages: ChatMessage[] = [
        ...chatMessages,
        {
          position: "right_bubble",
          message: prompt,
          timestamp: new Date().toISOString(),
          id: `${messageId}-user-final`
        },
        {
          position: "left_bubble",
          message: resData.result || resData.error || "No response received",
          timestamp: new Date().toISOString(),
          id: `${messageId}-ai-response`
        },
      ];
      
      setChatMessages(finalMessages);
      chatScrollUp();

    } catch (err: unknown) {
      console.error("Chat API Error:", err);
      
      const error = err as Error;
      const errorMessage = error.name === 'AbortError' 
        ? "Request timed out. The AI model may be loading. Please try again in a moment."
        : `Error: ${error.message || 'Failed to get response'}`;
      
      // Check if it's a connection error
      const isConnectionError = error.message?.includes('fetch') || 
                               error.message?.includes('network') || 
                               error.message?.includes('Connection') ||
                               error.name === 'TypeError';
      
      if (isConnectionError) {
        setIsConnected(false);
      }
      
      setError(errorMessage);
      
      // Still add user message to chat history
      const errorMessages: ChatMessage[] = [
        ...chatMessages,
        {
          position: "right_bubble",
          message: prompt,
          timestamp: new Date().toISOString(),
          id: `${messageId}-user-error`
        }
      ];
      
      setChatMessages(errorMessages);
      chatScrollUp();
    } finally {
      setIsLoading(false);
    }
  }, [chatMessages, chatScrollUp]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      askAI();
    }
  };

  // Tech stack data with proper typing
  const techStack: TechStackItem[] = [
    { category: "Large Language Model", technologies: "Ollama llama3.1:8b, Langchain" },
    { category: "Chunking", technologies: "RecursiveCharacterTextSplitter" },
    { category: "Vector Store", technologies: "ChromaDB with connection pooling" },
    { category: "Retriever", technologies: "Hybrid Search (Semantic + Keyword)" },
    { category: "Generation and Embedding", technologies: "HuggingFace Sentence Transformers" },
    { category: "Architecture", technologies: "Session-based state management" }
  ];

  return (
    <div>
      <section id="about" className="py-10 text-white">
        <div className="mt-10">
          <h3 className="text-4xl font-semibold text-justify leading-7 w-11/12 mx-auto">
            High-Precision Legal Expert LLM APP{" "}
            <span className="text-cyan-600">Contract Advisor RAG</span>
          </h3>

          <h3 className="text-2xl font-semibold text-justify leading-7 w-11/12 mx-auto pt-10">
            10 Academy Cohort A weekly challenge: Week 11.
          </h3>
          
          <p className="text-justify leading-7 w-11/12 mx-auto">
            The goal of this challenge is to build, evaluate and improve a RAG system 
            for Contract Q&A, chatting with a contract and asking questions about the contract.
          </p>
          
          <h3 className="text-2xl font-semibold text-justify leading-7 w-11/12 mx-auto pt-10">
            Business Objective:
          </h3>
          
          <p className="text-justify leading-7 w-11/12 mx-auto">
            Developing the next-generation contract AI by leveraging Hybrid LLM technology 
            (edge, private cloud and LLM services), to build the first, fully autonomous, 
            artificial contract lawyer. The first step in our journey is a powerful contract 
            assistant, with the ultimate goal of developing a fully autonomous contract bot, 
            capable of drafting, reviewing, and negotiating contracts, independently, 
            end-to-end, without human assistance.
          </p>
          
          <h3 className="text-2xl font-semibold text-justify leading-7 w-11/12 mx-auto pt-10">
            Project Methodology:
          </h3>
          
          <p className="text-justify leading-7 w-11/12 mx-auto">
            The project consists of the following tasks:
          </p>
          
          <ul className="text-justify leading-7 w-11/12 mx-auto list-disc list-inside">
            <li>Task 1: Research ways to improve RAG systems in general.</li>
            <li>Task 2: Build simple Q&A pipeline with RAG using Langchain</li>
            <li>Task 3: Build a RAG evaluation pipeline with RAGAS</li>
            <li>Task 4: Idea to optimize Contract Q&A</li>
            <li>Task 5: Implement at least two enhancements</li>
            <li>Task 6: Interpretation & Reporting</li>
          </ul>
          
          <div className="flex flex-row-reverse">
            <div className="grid grid-cols-1">
              <div>
                <h3 className="text-2xl font-semibold text-justify leading-7 mx-auto pt-10">
                  Tech-Stacks Used:
                </h3>
                
                <ul className="text-justify leading-7 mx-auto">
                  {techStack.map((item, index) => (
                    <li key={index}>
                      <span className="text-cyan-600">{item.category}:</span> {item.technologies}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div>
        <div id="assistant-chat" className="hide ai_chart">
          <div className="header-chat">
            <div className="head-home">
              <div className="info-avatar">
                <Svg />
              </div>
              <p>
                <span className="assistant-name">Assistant</span>
                <br />
                <small>
                  {isLoading ? (
                    <span className="text-yellow-400">Thinking...</span>
                  ) : isConnected ? (
                    <span className="text-green-400">Online</span>
                  ) : (
                    <span className="text-red-400">Connection Error</span>
                  )}
                  {currentSessionId && (
                    <span className="text-gray-400 ml-2">
                      • Session: {currentSessionId.substring(0, 8)}...
                    </span>
                  )}
                </small>
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={startNewConversation}
                className="text-xs px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                title="Start new conversation"
                aria-label="Start new conversation"
              >
                New Chat
              </button>
              
              <button
                onClick={clearConversationHistory}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                title="Clear all history"
                aria-label="Clear conversation history"
              >
                Clear History
              </button>
            </div>
          </div>

          <div className="start-chat">
            {error && !isConnected && (
              <div className="p-4">
                <ConnectionErrorMessage 
                  onRetry={() => {
                    setError(null);
                    setIsConnected(true);
                    askAI();
                  }}
                />
              </div>
            )}
            {error && isConnected && (
              <div className="p-4">
                <ChatErrorMessage 
                  message={error}
                  onRetry={() => {
                    setError(null);
                    askAI();
                  }}
                  onDismiss={() => setError(null)}
                />
              </div>
            )}
            <div className="assistant-chat-body">
              {chatMessages.map((chatMessage, index) => (
                <Message
                  key={chatMessage.id || `msg-${index}`}
                  position={chatMessage.position}
                  message={chatMessage.message}
                />
              ))}
              {isLoading && (
                <ChatTypingIndicator />
              )}
            </div>
            
            <div className="blanter-msg">
              <input
                type="text"
                id="chat-input"
                placeholder="What can I help you with..."
                maxLength={400}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                aria-label="Chat input"
                className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
              />
              
              <button
                onClick={askAI}
                id="send-it"
                className={`send_it ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                disabled={isLoading}
                aria-label="Send message"
                type="button"
              >
                <svg viewBox="0 0 448 448" className="w-5 h-5 fill-current">
                  <path d="M.213 32L0 181.333 320 224 0 266.667.213 416 448 224z" />
                </svg>
              </button>
            </div>
          </div>
          
          <button 
            className="close-chat" 
            onClick={closeChart}
            aria-label="Close chat"
            type="button"
          >
            &times;
          </button>
        </div>
        
        <button
          onClick={openChart}
          className="blantershow-chat"
          title="Show Chat"
          aria-label="Open chat"
          type="button"
        >
          <Svg />
          Chat with your legal document
        </button>
      </div>
    </div>
  );
}

export default Chat;