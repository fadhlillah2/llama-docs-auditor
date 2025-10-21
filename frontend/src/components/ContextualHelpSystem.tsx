import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartTooltip, { TooltipType, TooltipPosition } from './SmartTooltip';
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  LightBulbIcon,
  InformationCircleIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  type: TooltipType;
  category: 'getting-started' | 'upload' | 'chat' | 'analytics' | 'insights' | 'advanced';
  keywords: string[];
  relatedTopics?: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
  helpLink?: {
    url: string;
    label: string;
  };
}

export interface HelpContext {
  topics: HelpTopic[];
  showHelp: (topicId: string, position?: TooltipPosition) => void;
  hideHelp: () => void;
  searchHelp: (query: string) => HelpTopic[];
  getRelatedTopics: (topicId: string) => HelpTopic[];
  addCustomTopic: (topic: Omit<HelpTopic, 'id'>) => string;
}

const HelpContext = createContext<HelpContext | null>(null);

export const useHelp = (): HelpContext => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};

interface HelpProviderProps {
  children: ReactNode;
  customTopics?: HelpTopic[];
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children, customTopics = [] }) => {
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [activeTopic, setActiveTopic] = useState<{ id: string; position?: TooltipPosition } | null>(null);

  // Default help topics
  const defaultTopics: HelpTopic[] = [
    // Getting Started
    {
      id: 'getting-started-upload',
      title: 'Upload Your First Document',
      content: 'Start by uploading a contract document. We support PDF, DOCX, DOC, and TXT files up to 16MB. Simply drag and drop or click to browse.',
      type: 'tutorial',
      category: 'getting-started',
      keywords: ['upload', 'first', 'document', 'file', 'start'],
      action: {
        label: 'Start Upload',
        onClick: () => {
          const uploadTab = document.querySelector('[data-tab="upload"]');
          if (uploadTab) {
            (uploadTab as HTMLElement).click();
          }
        }
      }
    },
    {
      id: 'getting-started-chat',
      title: 'Ask Questions About Your Document',
      content: 'Once your document is processed, you can ask questions like "What are the payment terms?" or "When can this contract be terminated?"',
      type: 'tutorial',
      category: 'getting-started',
      keywords: ['chat', 'questions', 'ask', 'ai', 'analyze'],
      relatedTopics: ['chat-best-practices', 'document-analysis'],
      action: {
        label: 'Try Chat',
        onClick: () => {
          const chatButton = document.querySelector('.blantershow-chat');
          if (chatButton) {
            (chatButton as HTMLElement).click();
          }
        }
      }
    },

    // Upload Help
    {
      id: 'upload-file-types',
      title: 'Supported File Types',
      content: 'We support PDF documents, Microsoft Word files (DOCX, DOC), and plain text files (TXT). Maximum file size is 16MB per document.',
      type: 'info',
      category: 'upload',
      keywords: ['file', 'type', 'format', 'pdf', 'docx', 'doc', 'txt']
    },
    {
      id: 'upload-multiple',
      title: 'Multiple File Upload',
      content: 'Enable multi-file upload to process several documents at once. Each document will be analyzed independently and available for questioning.',
      type: 'help',
      category: 'upload',
      keywords: ['multiple', 'batch', 'several', 'many', 'files']
    },
    {
      id: 'upload-processing',
      title: 'Document Processing',
      content: 'Your document goes through AI-powered analysis including content extraction, semantic understanding, and knowledge base creation. This usually takes 10-30 seconds.',
      type: 'info',
      category: 'upload',
      keywords: ['processing', 'analysis', 'ai', 'time', 'duration', 'wait']
    },

    // Chat Help
    {
      id: 'chat-best-practices',
      title: 'Chat Best Practices',
      content: 'Ask specific questions about your document. Examples: "What is the liability limit?", "Who are the parties involved?", "What is the governing law?"',
      type: 'tip',
      category: 'chat',
      keywords: ['questions', 'best', 'practices', 'tips', 'examples'],
      relatedTopics: ['chat-advanced-queries']
    },
    {
      id: 'chat-advanced-queries',
      title: 'Advanced Query Techniques',
      content: 'Use follow-up questions for deeper analysis. Reference specific clauses by asking "What does clause 3.2 mean?" Compare terms by asking "How do payment terms differ from termination terms?"',
      type: 'tip',
      category: 'chat',
      keywords: ['advanced', 'follow-up', 'comparison', 'specific', 'clauses'],
      relatedTopics: ['chat-best-practices']
    },
    {
      id: 'chat-sources',
      title: 'Understanding AI Responses',
      content: 'Each AI response includes source citations showing exactly where the information was found in your document. Click on sources to verify the information.',
      type: 'info',
      category: 'chat',
      keywords: ['sources', 'citations', 'verification', 'accuracy', 'references']
    },

    // Analytics Help
    {
      id: 'analytics-overview',
      title: 'Document Analytics',
      content: 'View comprehensive insights about your documents including risk distribution, clause categorization, compliance scoring, and activity patterns.',
      type: 'info',
      category: 'analytics',
      keywords: ['analytics', 'insights', 'dashboard', 'statistics', 'metrics']
    },
    {
      id: 'analytics-risk-scores',
      title: 'Understanding Risk Scores',
      content: 'Risk scores are calculated based on factors like ambiguous language, unfavorable terms, missing clauses, and compliance issues. Higher scores indicate greater attention needed.',
      type: 'help',
      category: 'analytics',
      keywords: ['risk', 'scores', 'assessment', 'danger', 'warning', 'levels']
    },

    // Insights Help
    {
      id: 'insights-clause-analysis',
      title: 'Clause Analysis',
      content: 'AI automatically identifies and categorizes key clauses like payment terms, liability limitations, termination conditions, and compliance requirements.',
      type: 'info',
      category: 'insights',
      keywords: ['clauses', 'analysis', 'categorization', 'identification', 'key terms']
    },
    {
      id: 'insights-compliance',
      title: 'Compliance Checking',
      content: 'Our system checks your contract against common regulatory requirements and best practices, flagging potential issues that may need legal review.',
      type: 'warning',
      category: 'insights',
      keywords: ['compliance', 'regulatory', 'legal', 'requirements', 'checking']
    },

    // Advanced Features
    {
      id: 'advanced-mobile',
      title: 'Mobile Experience',
      content: 'Use our mobile-optimized interface with full-screen chat, touch gestures, and responsive design for on-the-go contract analysis.',
      type: 'tip',
      category: 'advanced',
      keywords: ['mobile', 'phone', 'tablet', 'touch', 'responsive']
    },
    {
      id: 'advanced-sessions',
      title: 'Session Management',
      content: 'Each document upload creates a new session with 30-minute timeout. Sessions allow you to maintain conversation context and document-specific analysis.',
      type: 'info',
      category: 'advanced',
      keywords: ['session', 'timeout', 'context', 'memory', 'duration']
    }
  ];

  // Initialize topics
  useEffect(() => {
    setTopics([...defaultTopics, ...customTopics]);
  }, [customTopics]);

  const showHelp = useCallback((topicId: string, position?: TooltipPosition) => {
    setActiveTopic({ id: topicId, position });
  }, []);

  const hideHelp = useCallback(() => {
    setActiveTopic(null);
  }, []);

  const searchHelp = useCallback((query: string): HelpTopic[] => {
    const lowercaseQuery = query.toLowerCase();
    return topics.filter(topic =>
      topic.title.toLowerCase().includes(lowercaseQuery) ||
      topic.content.toLowerCase().includes(lowercaseQuery) ||
      topic.keywords.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
    );
  }, [topics]);

  const getRelatedTopics = useCallback((topicId: string): HelpTopic[] => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic || !topic.relatedTopics) return [];

    return topics.filter(t => topic.relatedTopics!.includes(t.id));
  }, [topics]);

  const addCustomTopic = useCallback((topic: Omit<HelpTopic, 'id'>): string => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newTopic: HelpTopic = { ...topic, id };
    setTopics(prev => [...prev, newTopic]);
    return id;
  }, []);

  const contextValue: HelpContext = {
    topics,
    showHelp,
    hideHelp,
    searchHelp,
    getRelatedTopics,
    addCustomTopic
  };

  return (
    <HelpContext.Provider value={contextValue}>
      {children}

      {/* Global Help Tooltip */}
      <AnimatePresence>
        {activeTopic && (
          <HelpTooltip
            topic={topics.find(t => t.id === activeTopic.id)!}
            position={activeTopic.position}
            onClose={hideHelp}
          />
        )}
      </AnimatePresence>
    </HelpContext.Provider>
  );
};

// Help Tooltip Component
interface HelpTooltipProps {
  topic: HelpTopic;
  position?: TooltipPosition;
  onClose: () => void;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({ topic, position = 'top', onClose }) => {
  const [showRelated, setShowRelated] = useState(false);
  const { getRelatedTopics } = useHelp();
  const relatedTopics = getRelatedTopics(topic.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className={`
        fixed z-[60] max-w-sm
        ${topic.type === 'tutorial' ? 'bg-purple-900/95 border-purple-600' :
          topic.type === 'tip' ? 'bg-green-900/95 border-green-600' :
          topic.type === 'warning' ? 'bg-yellow-900/95 border-yellow-600' :
          topic.type === 'help' ? 'bg-cyan-900/95 border-cyan-600' :
          'bg-blue-900/95 border-blue-600'}
        border rounded-lg shadow-xl backdrop-blur-sm p-4
      `}
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '400px'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {topic.type === 'tutorial' && <BookOpenIcon className="w-5 h-5 text-purple-400" />}
          {topic.type === 'tip' && <LightBulbIcon className="w-5 h-5 text-green-400" />}
          {topic.type === 'warning' && <BeakerIcon className="w-5 h-5 text-yellow-400" />}
          {topic.type === 'help' && <QuestionMarkCircleIcon className="w-5 h-5 text-cyan-400" />}
          {topic.type === 'info' && <InformationCircleIcon className="w-5 h-5 text-blue-400" />}

          <h3 className="font-semibold text-white text-sm">
            {topic.title}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-200 leading-relaxed mb-4">
        {topic.content}
      </p>

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className="text-xs text-gray-300 hover:text-white underline"
          >
            {showRelated ? 'Hide' : 'Show'} Related Topics ({relatedTopics.length})
          </button>

          <AnimatePresence>
            {showRelated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1"
              >
                {relatedTopics.map(relatedTopic => (
                  <button
                    key={relatedTopic.id}
                    onClick={() => {
                      // Switch to related topic
                      const { showHelp } = useHelp();
                      showHelp(relatedTopic.id, position);
                    }}
                    className="block w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-white/10 rounded"
                  >
                    {relatedTopic.title}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between space-x-2">
        {topic.action && (
          <button
            onClick={topic.action.onClick}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-white/20 text-white rounded hover:bg-white/30 transition-colors"
          >
            {topic.action.label}
          </button>
        )}

        {topic.helpLink && (
          <a
            href={topic.helpLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-1.5 text-xs text-gray-300 hover:text-white underline"
          >
            {topic.helpLink.label}
          </a>
        )}
      </div>
    </motion.div>
  );
};

// Help Button Component
interface HelpButtonProps {
  topicId?: string;
  position?: TooltipPosition;
  type?: TooltipType;
  className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  topicId,
  position = 'top',
  type = 'help',
  className = ''
}) => {
  const { showHelp } = useHelp();

  if (!topicId) {
    return null;
  }

  return (
    <button
      onClick={() => showHelp(topicId, position)}
      className={`
        p-1.5 rounded-full hover:bg-gray-700/50 transition-colors
        text-gray-400 hover:text-white
        ${className}
      `}
      title="Get help"
    >
      <QuestionMarkCircleIcon className="w-4 h-4" />
    </button>
  );
};

// Inline Help Component
interface InlineHelpProps {
  topicId: string;
  children: React.ReactNode;
  position?: TooltipPosition;
  trigger?: 'hover' | 'click';
}

export const InlineHelp: React.FC<InlineHelpProps> = ({
  topicId,
  children,
  position = 'top',
  trigger = 'hover'
}) => {
  const { topics, showHelp } = useHelp();
  const topic = topics.find(t => t.id === topicId);

  if (!topic) {
    return <>{children}</>;
  }

  return (
    <SmartTooltip
      content={topic.content}
      title={topic.title}
      type={topic.type}
      position={position}
      trigger={trigger}
      action={topic.action}
      helpLink={topic.helpLink}
    >
      {children}
    </SmartTooltip>
  );
};

export default HelpProvider;