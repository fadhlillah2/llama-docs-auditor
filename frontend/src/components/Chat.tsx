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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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
    const prompt = inputText.trim();

    if (!validateInput(prompt)) {
      console.warn("Invalid input: empty or too long");
      return;
    }

    setInputText("");
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
  }, [inputText, chatMessages, chatScrollUp]);

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
        setContextualSuggestions(prev => [...Array.from(new Set([...smartSuggestions, ...prev.slice(0, 5)]))]);
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
    setInputText(suggestion);
    // Use setTimeout to ensure the state is updated before calling askAI
    setTimeout(() => {
      askAI();
    }, 0);
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
              {chatMessages.length === 0 && !isLoading && (
                <div className="welcome-suggestions-container">
                  <div className="welcome-header">
                    <div className="welcome-title">
                      <div className="welcome-icon">🤖</div>
                      <h3 className="welcome-heading">Welcome to Legal Expert AI</h3>
                      <p className="welcome-subtitle">Your intelligent contract advisor powered by advanced AI</p>
                    </div>
                  </div>

                  <div className="suggestions-section">
                    {/* Quick Start Actions */}
                    <div className="suggestion-card">
                      <div className="suggestion-card-header">
                        <span className="suggestion-card-icon">⚡</span>
                        <h4 className="suggestion-card-title">Quick Start</h4>
                      </div>
                      <p className="suggestion-card-desc">Get immediate answers with these common questions</p>
                      <div className="suggestion-grid">
                        {contextualSuggestions.slice(0, 6).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="suggestion-chip"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contract Analysis Categories */}
                    <div className="suggestion-card">
                      <div className="suggestion-card-header">
                        <span className="suggestion-card-icon">📊</span>
                        <h4 className="suggestion-card-title">Contract Analysis</h4>
                      </div>
                      <p className="suggestion-card-desc">Explore different aspects of your contract</p>
                      <div className="category-grid">
                        {contractCategories.map((cat) => (
                          <button
                            key={cat.category}
                            onClick={() => handleCategoryClick(cat.category)}
                            className={`category-card ${
                              selectedCategory === cat.category ? 'category-card-active' : ''
                            }`}
                          >
                            <div className="category-icon">{cat.icon}</div>
                            <div className="category-info">
                              <h5 className="category-name">{cat.category.split(' & ')[0]}</h5>
                              <p className="category-desc">{cat.category.split(' & ')[1] || 'Analysis'}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Category-specific questions */}
                      {selectedCategory && (
                        <div className="category-questions">
                          <h5 className="category-questions-title">
                            {contractCategories.find(cat => cat.category === selectedCategory)?.icon} {selectedCategory}
                          </h5>
                          <div className="category-questions-grid">
                            {contractCategories
                              .find(cat => cat.category === selectedCategory)
                              ?.questions.map((question, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSuggestionClick(question)}
                                  className="category-question-item"
                                >
                                  {question}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Analysis Tools */}
                    <div className="suggestion-card">
                      <div className="suggestion-card-header">
                        <span className="suggestion-card-icon">🔬</span>
                        <h4 className="suggestion-card-title">Advanced Analysis</h4>
                      </div>
                      <p className="suggestion-card-desc">Deep dive into contract details and risks</p>
                      <div className="advanced-actions">
                        <button
                          onClick={() => handleSuggestionClick("Summarize the key terms and conditions of this contract.")}
                          className="advanced-action-btn advanced-action-purple"
                        >
                          <span className="advanced-action-icon">📋</span>
                          <div className="advanced-action-content">
                            <h5 className="advanced-action-title">Contract Summary</h5>
                            <p className="advanced-action-desc">Get a comprehensive overview of key terms</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleSuggestionClick("Identify potential risks or unfavorable clauses.")}
                          className="advanced-action-btn advanced-action-red"
                        >
                          <span className="advanced-action-icon">⚠️</span>
                          <div className="advanced-action-content">
                            <h5 className="advanced-action-title">Risk Analysis</h5>
                            <p className="advanced-action-desc">Identify potential legal risks and issues</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleSuggestionClick("What clauses should be negotiated or improved?")}
                          className="advanced-action-btn advanced-action-yellow"
                        >
                          <span className="advanced-action-icon">💡</span>
                          <div className="advanced-action-content">
                            <h5 className="advanced-action-title">Improvement Suggestions</h5>
                            <p className="advanced-action-desc">Get recommendations for contract improvements</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Enhanced Chat Input Area */}
            <div className="chat-input-wrapper">
              {/* Quick Actions Toolbar */}
              <div className="quick-actions-toolbar">
                <div className="flex items-center space-x-2">
                  <button className="quick-action-btn" title="Attach file" disabled={isLoading}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button className="quick-action-btn" title="Voice input" disabled={isLoading}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  <button className="quick-action-btn" title="Formatting" disabled={isLoading}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                    </svg>
                  </button>
                  <button className="quick-action-btn" title="Templates" disabled={isLoading}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-400 hidden sm:block">
                    {selectedFiles && selectedFiles.length > 0
                      ? `${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''} loaded`
                      : 'No documents loaded'
                    }
                  </div>
                  <button
                    className="quick-action-btn pulse-animation"
                    title="Get help"
                    onClick={() => setSuggestionsVisible(!suggestionsVisible)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Main Input Container */}
              <div className="chat-input-container">
                {/* Enhanced Input with Modern Styling */}
                <div className="input-wrapper">
                  <input
                    id="chat-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      selectedFiles && selectedFiles.length > 0
                        ? `Ask about your ${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''}...`
                        : "Hi! I'm your AI legal assistant. Ask me anything about your contracts, or try one of the suggested questions above to get started."
                    }
                    maxLength={400}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        askAI();
                      }
                    }}
                    onFocus={() => setSuggestionsVisible(true)}
                    disabled={isLoading}
                    className="chat-input-basic"
                    aria-label="Chat input"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: '#ffffff',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      outline: 'none',
                      zIndex: 1000,
                      position: 'relative',
                      pointerEvents: 'auto',
                      minHeight: '48px',
                      fontFamily: 'inherit'
                    }}
                  />

                  {/* Input Enhancements */}
                  <div className="input-enhancements">
                    {/* Smart Suggestions Dropdown */}
                    {suggestionsVisible && !isLoading && (
                      <div className="suggestions-dropdown">
                        <div className="suggestions-header">
                          <span className="suggestions-title">💡 Quick Questions</span>
                          <button
                            className="suggestions-close"
                            onClick={() => setSuggestionsVisible(false)}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="suggestions-grid">
                          {contextualSuggestions.slice(0, 8).map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="suggestion-item"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Character Count and Microphone */}
                    <div className="input-footer">
                      <div className="character-count">
                        <span id="char-count">0</span>/400
                      </div>

                      <div className="input-actions">
                        <button
                          className={`voice-btn ${isLoading ? 'voice-btn-disabled' : ''}`}
                          title="Voice input (coming soon)"
                          disabled={isLoading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Send Button with Enhanced Animation */}
                <button
                  onClick={askAI}
                  id="send-it"
                  className={`send-button ${isLoading ? 'send-button-loading' : 'send-button-ready'}`}
                  disabled={isLoading}
                  aria-label="Send message"
                  type="button"
                  title="Send message (Enter)"
                >
                  {isLoading ? (
                    <div className="loading-spinner">
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Input Enhancement Script */}
              <script dangerouslySetInnerHTML={{
                __html: `
                  // Auto-resize textarea
                  const textarea = document.getElementById('chat-input');
                  const charCount = document.getElementById('char-count');

                  if (textarea) {
                    textarea.addEventListener('input', function() {
                      // Auto-resize
                      this.style.height = 'auto';
                      this.style.height = Math.min(this.scrollHeight, 120) + 'px';

                      // Character count
                      if (charCount) {
                        charCount.textContent = this.value.length;
                      }
                    });

                    // Focus/blur effects
                    textarea.addEventListener('focus', () => {
                      document.querySelector('.chat-input-container').classList.add('input-focused');
                    });

                    textarea.addEventListener('blur', () => {
                      document.querySelector('.chat-input-container').classList.remove('input-focused');
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
          setInputText(message);
          // Use setTimeout to ensure the state is updated before calling askAI
          setTimeout(() => {
            askAI();
          }, 0);
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
          {chatMessages.map((chatMessage, index) => (
            <Message
              key={chatMessage.id || `msg-${index}`}
              position={chatMessage.position}
              message={chatMessage.message}
            />
          ))}
        </div>
      </MobileChat>
    </div>
  );
}

export default Chat;