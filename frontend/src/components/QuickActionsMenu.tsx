import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentIcon,
  EyeIcon,
  DocumentTextIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: 'processed' | 'processing' | 'error';
  fileType?: string;
  sessionId?: string;
}

interface QuickActionsMenuProps {
  document: Document;
  onPreview: (document: Document) => void;
  onSummary: (document: Document) => void;
  onShare: (document: Document) => void;
  onExport: (document: Document) => void;
  onDelete: (documentId: string) => void;
}

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  document,
  onPreview,
  onSummary,
  onShare,
  onExport,
  onDelete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (typeof window !== 'undefined' && document.addEventListener) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    // Simulate delete operation
    setTimeout(() => {
      onDelete(document.id);
      setIsDeleting(false);
      setIsOpen(false);
    }, 500);
  };

  const menuItems = [
    {
      icon: <EyeIcon className="w-4 h-4" />,
      label: 'Quick Preview',
      description: 'Show first 500 characters',
      action: () => handleAction(() => onPreview(document)),
      color: 'text-blue-400 hover:bg-blue-500/10'
    },
    {
      icon: <DocumentTextIcon className="w-4 h-4" />,
      label: 'Generate Summary',
      description: 'Create AI-powered summary',
      action: () => handleAction(() => onSummary(document)),
      color: 'text-cyan-400 hover:bg-cyan-500/10'
    },
    {
      icon: <ShareIcon className="w-4 h-4" />,
      label: 'Share Document',
      description: 'Get shareable link',
      action: () => handleAction(() => onShare(document)),
      color: 'text-green-400 hover:bg-green-500/10'
    },
    {
      icon: <ArrowDownTrayIcon className="w-4 h-4" />,
      label: 'Export Analysis',
      description: 'Download full analysis',
      action: () => handleAction(() => onExport(document)),
      color: 'text-purple-400 hover:bg-purple-500/10'
    },
    {
      icon: <TrashIcon className="w-4 h-4" />,
      label: 'Delete',
      description: 'Remove document permanently',
      action: handleDelete,
      color: 'text-red-400 hover:bg-red-500/10',
      danger: true
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 opacity-0 group-hover:opacity-100"
        title="Quick actions"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Menu Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <DocumentIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {document.fileName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {document.fileType ? document.fileType.split('/')[1]?.toUpperCase() : 'Unknown'} •
                    {Math.round(document.fileSize / 1024)} KB
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={item.action}
                  disabled={isDeleting}
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left
                    ${item.color}
                    ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
                  `}
                >
                  <div className={`
                    p-2 rounded-lg bg-gray-700/50
                    ${item.danger ? 'bg-red-500/10' : ''}
                  `}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      item.danger ? 'text-red-400' : 'text-white'
                    }`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.description}
                    </p>
                  </div>
                  {isDeleting && item.danger && (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Menu Footer */}
            <div className="p-3 bg-gray-900/50 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                Press ESC to close
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickActionsMenu;