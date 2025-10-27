import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHelp } from './ContextualHelpSystem';
import {
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  LightBulbIcon,
  BeakerIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  EyeIcon,
  XMarkIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const HelpWidget: React.FC = () => {
  const { topics, showHelp, searchHelp, getRelatedTopics } = useHelp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(topics);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Categories
  const categories = [
    { id: 'getting-started', name: 'Getting Started', icon: <BookOpenIcon className="w-4 h-4" />, color: 'text-purple-400' },
    { id: 'upload', name: 'Upload Documents', icon: <DocumentTextIcon className="w-4 h-4" />, color: 'text-blue-400' },
    { id: 'chat', name: 'Chat & Analysis', icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />, color: 'text-green-400' },
    { id: 'analytics', name: 'Analytics', icon: <ChartBarIcon className="w-4 h-4" />, color: 'text-cyan-400' },
    { id: 'insights', name: 'Insights', icon: <EyeIcon className="w-4 h-4" />, color: 'text-orange-400' },
    { id: 'advanced', name: 'Advanced', icon: <BeakerIcon className="w-4 h-4" />, color: 'text-pink-400' }
  ];

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      if (selectedCategory) {
        setSearchResults(topics.filter(topic => topic.category === selectedCategory));
      } else {
        setSearchResults(topics);
      }
    } else {
      const results = searchHelp(searchQuery);
      if (selectedCategory) {
        setSearchResults(results.filter(topic => topic.category === selectedCategory));
      } else {
        setSearchResults(results);
      }
    }
  }, [searchQuery, selectedCategory, topics, searchHelp]);

  // Focus search input when widget opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
  }, []);

  const handleTopicSelect = useCallback((topicId: string) => {
    showHelp(topicId);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedCategory(null);
  }, [showHelp]);

  const getTopicIcon = (type: string) => {
    switch (type) {
      case 'tutorial':
        return <BookOpenIcon className="w-4 h-4 text-purple-400" />;
      case 'tip':
        return <LightBulbIcon className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <BeakerIcon className="w-4 h-4 text-yellow-400" />;
      case 'help':
        return <QuestionMarkCircleIcon className="w-4 h-4 text-cyan-400" />;
      default:
        return <DocumentTextIcon className="w-4 h-4 text-blue-400" />;
    }
  };

  const popularTopics = topics.filter(topic =>
    topic.category === 'getting-started' ||
    topic.keywords.includes('first') ||
    topic.keywords.includes('important')
  ).slice(0, 5);

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full
          bg-gradient-to-r from-cyan-600 to-blue-600
          text-white shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-200
          ${isOpen ? 'rotate-45' : ''}
        `}
        title="Get help"
      >
        <QuestionMarkCircleIcon className="w-7 h-7" />
      </motion.button>

      {/* Help Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Widget Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="
                fixed bottom-24 right-6 z-50
                w-96 max-h-[600px]
                bg-gray-900 border border-gray-700 rounded-lg shadow-2xl
                flex flex-col
                overflow-hidden
              "
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Help Center</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for help..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center space-x-2 mt-3 overflow-x-auto">
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`
                      px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                      ${selectedCategory === null
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }
                    `}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className={`
                        flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                        ${selectedCategory === category.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }
                      `}
                    >
                      <span className={category.color}>{category.icon}</span>
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Search Results */}
                {searchQuery && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                    </h4>
                    {searchResults.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No help topics found. Try different keywords.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.map(topic => (
                          <button
                            key={topic.id}
                            onClick={() => handleTopicSelect(topic.id)}
                            className="w-full text-left p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-start space-x-2">
                              <div className="mt-0.5">
                                {getTopicIcon(topic.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-medium text-white">
                                  {topic.title}
                                </h5>
                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                  {topic.content}
                                </p>
                              </div>
                              <ChevronRightIcon className="w-4 h-4 text-gray-500 mt-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Popular Topics (when not searching) */}
                {!searchQuery && !selectedCategory && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">
                      Popular Topics
                    </h4>
                    <div className="space-y-2">
                      {popularTopics.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => handleTopicSelect(topic.id)}
                          className="w-full text-left p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-start space-x-2">
                            <div className="mt-0.5">
                              {getTopicIcon(topic.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-white">
                                {topic.title}
                              </h5>
                              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                {topic.content}
                              </p>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-500 mt-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Topics */}
                {!searchQuery && selectedCategory && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">
                      {categories.find(c => c.id === selectedCategory)?.name}
                    </h4>
                    <div className="space-y-2">
                      {searchResults.map(topic => (
                        <button
                          key={topic.id}
                          onClick={() => handleTopicSelect(topic.id)}
                          className="w-full text-left p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-start space-x-2">
                            <div className="mt-0.5">
                              {getTopicIcon(topic.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-white">
                                {topic.title}
                              </h5>
                              <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                {topic.content}
                              </p>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-500 mt-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Need more help?</span>
                  <button
                    onClick={() => {
                      // Open comprehensive help or contact support
                      showHelp('getting-started-upload');
                      setIsOpen(false);
                    }}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    View all topics
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpWidget;