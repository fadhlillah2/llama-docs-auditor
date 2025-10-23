import React, { useState, useCallback, KeyboardEvent, useEffect } from "react";
import Message from "../components/Message";
import Svg from "../components/Svg";
import LoadingSpinner, { ChatLoadingIndicator } from "../components/LoadingSpinner";
import { ChatErrorMessage, ConnectionErrorMessage } from "../components/ErrorDisplay";
import { ChatTypingIndicator, EnhancedChatTypingIndicator } from "../components/TypingIndicator";
import MobileChat from "./MobileChat";
import ApiService from "../services/api";
import type {
  ChatMessage,
  ChatApiRequest,
  ChatApiResponse
} from "../types/api";


function Chat(): JSX.Element {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      position: "left_bubble",
      message: "🤖 **Welcome to Legal Expert AI - High-Precision Contract Advisor RAG**\n\nI'm your specialized AI assistant powered by advanced Retrieval-Augmented Generation technology. I can help you analyze, understand, and extract insights from legal contracts with high precision.\n\n**How I can help:**\n• 📄 Analyze contract terms and clauses\n• 🔍 Explain complex legal language in simple terms\n• ⚖️ Identify potential risks and obligations\n• 💡 Provide insights on payment terms, termination clauses, and more\n• 📊 Extract key information and summarize contract details\n\nPlease upload a contract document first, then ask me any questions about it. I support PDF, DOCX, DOC, and TXT files.\n\nWhat would you like to know about your contract?",
      timestamp: new Date().toISOString(),
      id: "welcome-message"
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Enhanced loading states
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'retrieving' | 'generating' | 'finalizing'>('analyzing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // Mobile chat state
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Document state
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  // Load conversation history and documents on component mount
  useEffect(() => {
    loadConversationHistory();
    loadDocuments();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const messagesContainer = document.querySelector(".messages-container") as HTMLElement;
    if (messagesContainer) {
      const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 100;

      // Only auto-scroll if user is near bottom or it's a new conversation
      if (isNearBottom || chatMessages.length <= 2) {
        setTimeout(() => {
          messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, [chatMessages]);

  const loadDocuments = () => {
    try {
      const documents = localStorage.getItem('uploadedDocuments');
      if (documents) {
        const parsedDocs = JSON.parse(documents);
        setSelectedFiles(parsedDocs.map((doc: any) => ({
          id: doc.id,
          fileName: doc.fileName
        })));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

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

  
  const chatScrollUp = useCallback((): void => {
    const messagesContainer = document.querySelector(".messages-container") as HTMLElement;
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
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

    // Initialize enhanced loading states
    setLoadingStage('analyzing');
    setLoadingProgress(10);
    setLoadingMessage('Understanding your question...');

    // Simulate stage progression
    const stageProgression = [
      { stage: 'analyzing' as const, progress: 25, delay: 500, message: 'Analyzing your query...' },
      { stage: 'retrieving' as const, progress: 50, delay: 1000, message: 'Searching through documents...' },
      { stage: 'generating' as const, progress: 75, delay: 2000, message: 'Generating AI response...' },
      { stage: 'finalizing' as const, progress: 90, delay: 3000, message: 'Finalizing answer...' }
    ];

    stageProgression.forEach(({ stage, progress, delay, message }) => {
      setTimeout(() => {
        if (isLoading) { // Only update if still loading
          setLoadingStage(stage);
          setLoadingProgress(progress);
          setLoadingMessage(message);
        }
      }, delay);
    });

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

    // Set timeout to 5 minutes for Groq llama-3.3-70b-versatile model processing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

    try {
      // Use ApiService for RAG query
      const response = await ApiService.askQuestion(prompt, JSON.stringify(chatMessages));
      const resData = response.data;

      // Finalize loading state
      setLoadingStage('finalizing');
      setLoadingProgress(100);
      setLoadingMessage('Response ready!');

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

    } catch (err: any) {
      console.error("Chat API Error:", err);

      const errorMessage = err.response?.data?.error ||
        err.message ||
        'Failed to get response. Please try again.';

      // Check if it's a connection error
      const isConnectionError = err.message?.includes('fetch') ||
                               err.message?.includes('network') ||
                               err.message?.includes('Connection') ||
                               err.code === 'ECONNREFUSED';

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
      setLoadingStage('analyzing');
      setLoadingProgress(0);
      setLoadingMessage('');
    }
  }, [chatMessages, chatScrollUp]);

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      askAI();
    }
  };

  // Enhanced contextual suggestions with document awareness
  const [contextualSuggestions, setContextualSuggestions] = useState([
    "What are the payment terms?",
    "When can this contract be terminated?",
    "What are the obligations of each party?",
    "Are there any liability limitations?",
    "What is the governing law?",
    "Is there a confidentiality clause?",
    "What are the dispute resolution procedures?",
    "Are there any non-compete restrictions?"
  ]);

  // Smart suggestion generation based on document content
  const generateSmartSuggestions = useCallback(() => {
    try {
      const documents = localStorage.getItem('uploadedDocuments');
      if (!documents) return;

      const parsedDocs = JSON.parse(documents);
      const docNames = parsedDocs.map((doc: any) => doc.fileName.toLowerCase());

      let smartSuggestions: string[] = [];

      // Document type-specific suggestions
      if (docNames.some((name: string) => name.includes('nda') || name.includes('confidential'))) {
        smartSuggestions.push(
          "What information is considered confidential?",
          "How long does confidentiality last?",
          "What are the penalties for breach?"
        );
      }

      if (docNames.some((name: string) => name.includes('employment') || name.includes('work'))) {
        smartSuggestions.push(
          "What is the salary and compensation structure?",
          "What are the working hours and leave policies?",
          "What grounds exist for termination?"
        );
      }

      if (docNames.some((name: string) => name.includes('sales') || name.includes('service'))) {
        smartSuggestions.push(
          "What products or services are covered?",
          "What are the delivery timelines?",
          "What happens if deadlines are missed?"
        );
      }

      // Add conversation-aware suggestions
      if (chatMessages.length > 3) {
        const lastUserMessage = chatMessages.slice(-2).find(msg => msg.position === "right_bubble");
        if (lastUserMessage) {
          const question = lastUserMessage.message.toLowerCase();
          if (question.includes('payment')) {
            smartSuggestions.push("Are there late payment penalties?");
            smartSuggestions.push("What payment methods are accepted?");
          } else if (question.includes('terminate')) {
            smartSuggestions.push("What happens after termination?");
            smartSuggestions.push("Are there any termination fees?");
          } else if (question.includes('liable')) {
            smartSuggestions.push("What insurance is required?");
            smartSuggestions.push("How are disputes handled?");
          }
        }
      }

      // Update suggestions if we have smart ones
      if (smartSuggestions.length > 0) {
        setContextualSuggestions(prev => [...new Set([...smartSuggestions, ...prev.slice(0, 5)])]);
      }
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
    }
  }, [chatMessages]);

  // Generate smart suggestions when documents or messages change
  useEffect(() => {
    generateSmartSuggestions();
  }, [generateSmartSuggestions]);

  const contractCategories = [
    { icon: "💰", category: "Payment & Compensation", questions: ["What are the payment terms?", "How is compensation calculated?", "When are payments due?"] },
    { icon: "⏰", category: "Duration & Termination", questions: ["What is the contract duration?", "How can this be terminated?", "What is the notice period?"] },
    { icon: "⚖️", category: "Legal & Compliance", questions: ["What is the governing law?", "Are there compliance requirements?", "What warranties are provided?"] },
    { icon: "🔒", category: "Confidentiality & Security", questions: ["Is there a confidentiality clause?", "How is data protected?", "What are the security obligations?"] },
    { icon: "🚫", category: "Liability & Limitations", questions: ["What are the liability limitations?", "Are there indemnification clauses?", "What risks are covered?"] },
    { icon: "🤝", category: "Obligations & Responsibilities", questions: ["What are the main obligations?", "Who is responsible for what?", "What are the deliverables?"] }
  ];

  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSuggestionClick = (suggestion: string) => {
    const input = document.getElementById("chat-input") as HTMLInputElement;
    if (input) {
      input.value = suggestion;
      askAI();
    }
    setSuggestionsVisible(false);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  return (
    <div>
      <div id="assistant-chat" className="show ai_chart">
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
                    <span className="text-yellow-400">Processing with Groq llama-3.3-70b-versatile (10-30 seconds)...</span>
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
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                title="Start new conversation"
                aria-label="Start new conversation"
              >
                New Chat
              </button>

              <button
                onClick={clearConversationHistory}
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                title="Clear all history"
                aria-label="Clear conversation history"
              >
                Clear History
              </button>
            </div>
          </div>

          <div className="start-chat">
            {error && !isConnected && (
              <div className="p-4 flex-shrink-0">
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
              <div className="p-4 flex-shrink-0">
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
              <div className="messages-container flex-1 overflow-y-auto">
                {chatMessages.map((chatMessage, index) => (
                  <Message
                    key={chatMessage.id || `msg-${index}`}
                    position={chatMessage.position}
                    message={chatMessage.message}
                  />
                ))}
                {isLoading && (
                  <EnhancedChatTypingIndicator
                    stage={loadingStage}
                    progress={loadingProgress}
                    message={loadingMessage}
                  />
                )}

                {/* Enhanced Contextual Suggestions */}
                {chatMessages.length <= 1 && !isLoading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-300">
                      💬 Smart Suggestions
                    </h4>
                    <button
                      onClick={() => setSuggestionsVisible(!suggestionsVisible)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {suggestionsVisible ? 'Hide' : 'Show'} suggestions
                    </button>
                  </div>

                  {suggestionsVisible && (
                    <div className="space-y-3">
                      {/* Quick Questions */}
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Quick Questions:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {contextualSuggestions.slice(0, 6).map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-left text-xs text-gray-300 bg-gray-700 hover:bg-cyan-900 hover:text-white rounded-lg px-3 py-2 transition-colors duration-200 border border-gray-600 hover:border-cyan-600"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Contract Categories */}
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Explore by Category:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {contractCategories.map((cat) => (
                            <button
                              key={cat.category}
                              onClick={() => handleCategoryClick(cat.category)}
                              className={`text-left rounded-lg px-3 py-2 transition-all duration-200 border ${
                                selectedCategory === cat.category
                                  ? 'bg-cyan-900 text-white border-cyan-600'
                                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-1">
                                <span className="text-sm">{cat.icon}</span>
                                <span className="text-xs font-medium">{cat.category.split(' & ')[0]}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Category-specific questions */}
                        {selectedCategory && (
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <p className="text-xs text-cyan-400 mb-2">
                              {contractCategories.find(cat => cat.category === selectedCategory)?.icon} {selectedCategory}:
                            </p>
                            <div className="space-y-1">
                              {contractCategories
                                .find(cat => cat.category === selectedCategory)
                                ?.questions.map((question, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(question)}
                                    className="text-left text-xs text-gray-300 bg-gray-700 hover:bg-cyan-900 hover:text-white rounded px-2 py-1.5 transition-colors duration-200 w-full text-left"
                                  >
                                    {question}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Advanced Suggestions */}
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Advanced Analysis:</p>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleSuggestionClick("Summarize the key terms and conditions of this contract.")}
                            className="text-left text-xs text-gray-300 bg-gray-700 hover:bg-purple-900 hover:text-white rounded-lg px-3 py-2 transition-colors duration-200 border border-gray-600 hover:border-purple-600 w-full"
                          >
                            📋 Summarize key terms & conditions
                          </button>
                          <button
                            onClick={() => handleSuggestionClick("Identify potential risks or unfavorable clauses.")}
                            className="text-left text-xs text-gray-300 bg-gray-700 hover:bg-red-900 hover:text-white rounded-lg px-3 py-2 transition-colors duration-200 border border-gray-600 hover:border-red-600 w-full"
                          >
                            ⚠️ Identify potential risks
                          </button>
                          <button
                            onClick={() => handleSuggestionClick("What clauses should be negotiated or improved?")}
                            className="text-left text-xs text-gray-300 bg-gray-700 hover:bg-yellow-900 hover:text-white rounded-lg px-3 py-2 transition-colors duration-200 border border-gray-600 hover:border-yellow-600 w-full"
                          >
                            💡 Suggest improvements
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>

            <div className="blanter-msg">
              <div className="flex items-center space-x-2 px-4 py-3 bg-gray-800 border-t border-gray-600">
                {/* Voice Input Button (Mock) */}
                <button
                  className="text-gray-400 hover:text-cyan-400 transition-colors p-2"
                  title="Voice input (coming soon)"
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                {/* Enhanced Input */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    id="chat-input"
                    placeholder={selectedFiles && selectedFiles.length > 0
                      ? `Ask about your ${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''}...`
                      : "What can I help you with? Try: 'What are the payment terms?'"
                    }
                    maxLength={400}
                    onKeyPress={handleKeyPress}
                    onFocus={() => setSuggestionsVisible(true)}
                    disabled={isLoading}
                    aria-label="Chat input"
                    className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 pr-10 placeholder-gray-400 border border-gray-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all duration-200 ${
                      isLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />

                  {/* Character count */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    <span id="char-count">0</span>/400
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={askAI}
                  id="send-it"
                  className={`bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg p-2.5 transition-all duration-200 transform hover:scale-105 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                  disabled={isLoading}
                  aria-label="Send message"
                  type="button"
                  title="Send message (Enter)"
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M8 6l4-4 4 4M8 18l4 4 4-4" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 448 448" className="w-5 h-5 fill-current">
                      <path d="M.213 32L0 181.333 320 224 0 266.667.213 416 448 224z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Input Enhancement Script */}
              <script dangerouslySetInnerHTML={{
                __html: `
                  // Character count functionality
                  const input = document.getElementById('chat-input');
                  const charCount = document.getElementById('char-count');
                  if (input && charCount) {
                    input.addEventListener('input', () => {
                      charCount.textContent = input.value.length;
                    });
                  }
                `
              }} />
            </div>
          </div>
        </div>

      {/* Mobile Chat Component */}
      <MobileChat
        isOpen={isMobileChatOpen}
        onClose={() => setIsMobileChatOpen(false)}
        onSendMessage={(message) => {
          // Set the message in input and trigger askAI
          const input = document.getElementById("chat-input") as HTMLInputElement;
          if (input) {
            input.value = message;
            askAI();
          }
          setIsMobileChatOpen(false);
        }}
        isLoading={isLoading}
        placeholder={
          selectedFiles && selectedFiles.length > 0
            ? `Ask about your ${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''}...`
            : "What can I help you with? Try: 'What are the payment terms?'"
        }
      >
        {/* Pass chat messages to mobile component */}
        <div className="space-y-4">
          {chatMessages.map((message, index) => (
            <Message key={index} message={message} />
          ))}
        </div>
      </MobileChat>
    </div>
  );
}

export default Chat;