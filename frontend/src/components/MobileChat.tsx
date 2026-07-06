import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ChevronDownIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';

interface MobileChatProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

const MobileChat: React.FC<MobileChatProps> = ({
  isOpen,
  onClose,
  children,
  onSendMessage,
  isLoading,
  placeholder = "Ask about your document..."
}) => {
  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Check voice recognition support
  useEffect(() => {
    const checkVoiceSupport = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setVoiceSupported(!!SpeechRecognition);
    };
    checkVoiceSupport();
  }, []);

  // Voice recognition handlers
  const startVoiceRecognition = () => {
    if (!voiceSupported) {
      alert('Voice recognition is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone access to use voice input.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopVoiceRecognition = () => {
    setIsListening(false);
  };

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isDownSwipe = distance > 50;

    if (isDownSwipe && chatContainerRef.current) {
      const scrollHeight = chatContainerRef.current.scrollHeight;
      const scrollTop = chatContainerRef.current.scrollTop;
      const isAtTop = scrollTop === 0;

      if (isAtTop) {
        setIsMinimized(true);
      }
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickSuggestions = [
    "What are the payment terms?",
    "When can this contract be terminated?",
    "What are the liability limitations?",
    "Is this contract compliant with regulations?",
    "What obligations do I have?"
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Full-screen Overlay */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={onClose}
            />
          )}
        </AnimatePresence>

        {/* Chat Container */}
        <motion.div
          ref={chatContainerRef}
          initial={{ y: '100%', opacity: 0 }}
          animate={{
            y: isMinimized ? 'calc(100% - 120px)' : '0%',
            opacity: 1
          }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`
            fixed inset-x-0 bottom-0 bg-gray-900 text-white z-50
            flex flex-col h-[100vh] max-h-[100vh]
            border-t border-gray-700
            ${isMinimized ? 'rounded-t-3xl' : 'rounded-t-2xl'}
          `}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Contract Assistant</h3>
                <p className="text-xs text-gray-400">
                  {isLoading ? 'Processing...' : 'Ready to help'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              >
                <ChevronDownIcon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isMinimized ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Minimized State */}
          {isMinimized && (
            <div className="p-4 bg-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300">Tap to expand chat</p>
                <div className="flex space-x-2">
                  <button className="p-2 bg-cyan-600 rounded-full">
                    <MicrophoneIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
              {children}

              {isLoading && (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}

          {/* Quick Suggestions */}
          {!isMinimized && showSuggestions && !isLoading && (
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-3">Quick Questions:</p>
              <div className="grid grid-cols-1 gap-2">
                {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setMessage(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="text-left text-sm text-gray-300 bg-gray-700 hover:bg-cyan-900 hover:text-white rounded-lg px-3 py-2 transition-all duration-200 border border-gray-600"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          {!isMinimized && (
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={placeholder}
                    disabled={isLoading}
                    rows={1}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 placeholder-gray-400 border border-gray-600 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-all duration-200"
                    style={{
                      minHeight: '44px',
                      maxHeight: '120px',
                      fontSize: '16px' // Prevents zoom on iOS
                    }}
                  />
                </div>

                <div className="flex space-x-2">
                  {/* Voice Input Button */}
                  <button
                    onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                    className={`
                      p-3 rounded-full transition-all duration-200
                      ${isListening
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                        : voiceSupported
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-800 opacity-50 cursor-not-allowed'
                      }
                    `}
                    title={voiceSupported ? (isListening ? 'Stop recording' : 'Start voice input') : 'Voice not supported'}
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>

                  <button
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-200"
                  >
                    <CameraIcon className="w-5 h-5" />
                  </button>

                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className={`
                      p-3 rounded-full transition-all duration-200 transform hover:scale-105
                      ${message.trim() && !isLoading
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }
                    `}
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Character count */}
              <div className="mt-2 text-right">
                <span className={`text-xs ${
                  message.length > 350 ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {message.length}/400
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default MobileChat;