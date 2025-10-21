import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  BookmarkIcon,
  ShareIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowPathIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  confidence?: number;
  categories?: string[];
  bookmarks?: number;
  feedback?: 'positive' | 'negative' | null;
}

interface SmartSuggestion {
  id: string;
  text: string;
  category: string;
  icon: React.ComponentType<any>;
  description: string;
  popular?: boolean;
  recent?: boolean;
}

interface ConversationContext {
  documentContext: string;
  previousTopics: string[];
  userIntent: string;
  suggestedFollowups: string[];
}

interface EnhancedChatFeaturesProps {
  messages: ChatMessage[];
  onSuggestionClick: (suggestion: string) => void;
  onBookmarkMessage: (messageId: string) => void;
  onShareMessage: (messageId: string) => void;
  onFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
  className?: string;
}

const EnhancedChatFeatures: React.FC<EnhancedChatFeaturesProps> = ({
  messages,
  onSuggestionClick,
  onBookmarkMessage,
  onShareMessage,
  onFeedback,
  className = ''
}) => {
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);
  const [contextualSuggestions, setContextualSuggestions] = useState<SmartSuggestion[]>([]);
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Smart suggestions based on conversation context
  const smartSuggestions: SmartSuggestion[] = [
    {
      id: '1',
      text: 'What are the payment terms and deadlines?',
      category: 'Financial',
      icon: CurrencyDollarIcon,
      description: 'Get details about payment schedules, amounts, and due dates',
      popular: true
    },
    {
      id: '2',
      text: 'When and how can this contract be terminated?',
      category: 'Termination',
      icon: CalendarIcon,
      description: 'Understand termination clauses and notice periods',
      popular: true
    },
    {
      id: '3',
      text: 'What liabilities and risks are involved?',
      category: 'Risk',
      icon: ExclamationTriangleIcon,
      description: 'Identify potential risks and liability limitations',
      popular: true
    },
    {
      id: '4',
      text: 'Summarize the key obligations of each party',
      category: 'Obligations',
      icon: UserGroupIcon,
      description: 'Get a clear summary of responsibilities',
      recent: true
    },
    {
      id: '5',
      text: 'Are there any compliance or regulatory requirements?',
      category: 'Compliance',
      icon: ShieldCheckIcon,
      description: 'Check for regulatory compliance issues',
      recent: true
    },
    {
      id: '6',
      text: 'What happens in case of disputes?',
      category: 'Legal',
      icon: ScaleIcon,
      description: 'Understand dispute resolution procedures',
      recent: true
    },
    {
      id: '7',
      text: 'Identify unusual or unfavorable clauses',
      category: 'Analysis',
      icon: LightBulbIcon,
      description: 'Get AI-powered insights about clause terms',
      popular: true
    },
    {
      id: '8',
      text: 'Compare this to standard industry terms',
      category: 'Benchmarking',
      icon: ChartBarIcon,
      description: 'See how terms compare to industry standards'
    },
    {
      id: '9',
      text: 'What information is considered confidential?',
      category: 'Confidentiality',
      icon: DocumentTextIcon,
      description: 'Understand confidentiality obligations'
    },
    {
      id: '10',
      text: 'Extract all deadlines and key dates',
      category: 'Timeline',
      icon: ClockIcon,
      description: 'Get a timeline of all important dates'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Suggestions', icon: SparklesIcon },
    { id: 'Financial', name: 'Financial', icon: CurrencyDollarIcon },
    { id: 'Termination', name: 'Termination', icon: CalendarIcon },
    { id: 'Risk', name: 'Risk Analysis', icon: ExclamationTriangleIcon },
    { id: 'Legal', name: 'Legal Terms', icon: ScaleIcon },
    { id: 'Compliance', name: 'Compliance', icon: ShieldCheckIcon },
    { id: 'Analysis', name: 'AI Insights', icon: LightBulbIcon }
  ];

  // Analyze conversation to generate contextual suggestions
  useEffect(() => {
    const analyzeConversation = () => {
      if (messages.length < 2) return;

      const lastMessages = messages.slice(-5);
      const topics = lastMessages
        .filter(msg => msg.type === 'user')
        .map(msg => msg.content.toLowerCase())
        .join(' ');

      // Generate contextual suggestions based on conversation history
      let contextSuggestions = [...smartSuggestions];

      // Boost recently relevant categories
      if (topics.includes('payment') || topics.includes('money')) {
        contextSuggestions = contextSuggestions.map(s =>
          s.category === 'Financial' ? { ...s, recent: true } : s
        );
      }

      if (topics.includes('terminate') || topics.includes('end')) {
        contextSuggestions = contextSuggestions.map(s =>
          s.category === 'Termination' ? { ...s, recent: true } : s
        );
      }

      setContextualSuggestions(contextSuggestions);
    };

    analyzeConversation();
  }, [messages]);

  const filteredSuggestions = activeCategory === 'all'
    ? contextualSuggestions
    : contextualSuggestions.filter(s => s.category === activeCategory);

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    onFeedback(messageId, feedback);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Smart Suggestions Panel */}
      <AnimatePresence>
        {suggestionsVisible && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-cyan-600" />
                <h4 className="text-sm font-medium text-gray-900">Smart Suggestions</h4>
                <span className="text-xs text-gray-500">
                  Based on your document analysis
                </span>
              </div>
              <button
                onClick={() => setSuggestionsVisible(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Hide
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === category.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <category.icon className="w-3 h-3" />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSuggestions.slice(0, 6).map((suggestion) => (
                <motion.button
                  key={suggestion.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.random() * 0.1 }}
                  onClick={() => onSuggestionClick(suggestion.text)}
                  className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-cyan-300 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
                      <suggestion.icon className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.text}
                        </p>
                        {suggestion.popular && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Popular
                          </span>
                        )}
                        {suggestion.recent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Recent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Show More */}
            {filteredSuggestions.length > 6 && (
              <div className="mt-3 text-center">
                <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                  View all suggestions ({filteredSuggestions.length})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Suggestions Toggle */}
      {!suggestionsVisible && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSuggestionsVisible(true)}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
        >
          <SparklesIcon className="w-4 h-4 text-cyan-600" />
          <span className="text-sm text-gray-700">Show Smart Suggestions</span>
        </motion.button>
      )}

      {/* Message Enhancement Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Conversation Tools</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex flex-col items-center space-y-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <BookmarkIcon className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-700">Bookmarks</span>
            <span className="text-xs text-gray-500">
              {messages.filter(m => m.bookmarks && m.bookmarks > 0).length} saved
            </span>
          </button>

          <button className="flex flex-col items-center space-y-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <ShareIcon className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-700">Share</span>
            <span className="text-xs text-gray-500">Export chat</span>
          </button>

          <button className="flex flex-col items-center space-y-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <LinkIcon className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-700">Sources</span>
            <span className="text-xs text-gray-500">View references</span>
          </button>

          <button className="flex flex-col items-center space-y-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowPathIcon className="w-5 h-5 text-gray-600" />
            <span className="text-xs text-gray-700">Reset</span>
            <span className="text-xs text-gray-500">New chat</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center space-x-2 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium hover:bg-cyan-100 transition-colors">
          <DocumentTextIcon className="w-4 h-4" />
          <span>Generate Summary</span>
        </button>

        <button className="inline-flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Risk Analysis</span>
        </button>

        <button className="inline-flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
          <ChartBarIcon className="w-4 h-4" />
          <span>Compare Terms</span>
        </button>
      </div>
    </div>
  );
};

export default EnhancedChatFeatures;