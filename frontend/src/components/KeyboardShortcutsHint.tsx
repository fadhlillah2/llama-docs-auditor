import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Squares2X2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Shortcut {
  key: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const KeyboardShortcutsHint: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLButtonElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragButtonStartPos = useRef({ x: 0, y: 0 });

  const shortcuts: Shortcut[] = [
    {
      key: 'Ctrl/Cmd + K',
      description: 'Focus search',
      icon: <MagnifyingGlassIcon className="w-4 h-4" />,
      category: 'Navigation'
    },
    {
      key: 'Ctrl/Cmd + N',
      description: 'New conversation',
      icon: <PlusIcon className="w-4 h-4" />,
      category: 'Navigation'
    },
    {
      key: 'Ctrl/Cmd + S',
      description: 'Save/export analysis',
      icon: <DocumentArrowDownIcon className="w-4 h-4" />,
      category: 'Actions'
    },
    {
      key: 'Ctrl/Cmd + /',
      description: 'Toggle suggestions',
      icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />,
      category: 'Actions'
    },
    {
      key: 'Ctrl/Cmd + U',
      description: 'Upload document',
      icon: <PlusIcon className="w-4 h-4" />,
      category: 'Actions'
    },
    {
      key: '?',
      description: 'Show this help',
      icon: <QuestionMarkCircleIcon className="w-4 h-4" />,
      category: 'Help'
    },
    {
      key: 'ESC',
      description: 'Close modals/dropdowns',
      icon: <XMarkIcon className="w-4 h-4" />,
      category: 'Navigation'
    }
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  const toggleVisible = () => setIsVisible(!isVisible);

  // Initialize default position to avoid chat area
  useEffect(() => {
    const buttonWidth = 60; // approximate button width
    const buttonHeight = 60; // approximate button height
    const bottomPadding = 180; // increased padding to avoid chat input area
    const sidePadding = 24; // spacing from side edges

    // Position to bottom right but above chat input area
    setPosition({
      x: window.innerWidth - buttonWidth - sidePadding,
      y: window.innerHeight - buttonHeight - bottomPadding
    });
  }, []);

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      dragButtonStartPos.current = { x: rect.left, y: rect.top };
    }
  };

  // Handle touch start for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      dragButtonStartPos.current = { x: rect.left, y: rect.top };
    }
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      let newX = dragButtonStartPos.current.x + deltaX;
      let newY = dragButtonStartPos.current.y + deltaY;

      // Keep button within viewport bounds
      const buttonSize = 60;
      const padding = 10;

      newX = Math.max(padding, Math.min(newX, window.innerWidth - buttonSize - padding));
      newY = Math.max(padding, Math.min(newY, window.innerHeight - buttonSize - padding));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartPos.current.x;
      const deltaY = touch.clientY - dragStartPos.current.y;

      let newX = dragButtonStartPos.current.x + deltaX;
      let newY = dragButtonStartPos.current.y + deltaY;

      // Keep button within viewport bounds
      const buttonSize = 60;
      const padding = 10;

      newX = Math.max(padding, Math.min(newX, window.innerWidth - buttonSize - padding));
      newY = Math.max(padding, Math.min(newY, window.innerHeight - buttonSize - padding));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging]);

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={dragRef}
        onClick={(e) => !isDragging && toggleVisible()}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`fixed p-3 bg-cyan-600 text-white rounded-full shadow-lg hover:bg-cyan-700 transition-all duration-200 z-40 ${
          isDragging
            ? 'cursor-grabbing scale-110 shadow-2xl'
            : 'cursor-grab hover:scale-110'
        }`}
        title="Keyboard shortcuts (drag to move)"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute inset-0 rounded-full border-2 border-white border-dashed animate-pulse" />
        )}

        {/* Drag hint icon */}
        {!isDragging && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        )}

        <Squares2X2Icon className="w-5 h-5 relative z-10" />
      </button>

      {/* Shortcuts Modal */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={toggleVisible}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">
                      Keyboard Shortcuts
                    </h2>
                    <p className="text-sm text-gray-400">
                      Work faster with these time-saving shortcuts
                    </p>
                  </div>
                  <button
                    onClick={toggleVisible}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {categories.map((category, categoryIndex) => (
                  <div key={category} className={categoryIndex > 0 ? 'mt-6' : ''}>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {shortcuts
                        .filter(shortcut => shortcut.category === category)
                        .map((shortcut, index) => (
                          <motion.div
                            key={shortcut.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="p-2 bg-gray-700 rounded-lg">
                              {shortcut.icon}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">
                                {shortcut.description}
                              </p>
                            </div>
                            <kbd className="px-2 py-1 text-xs font-mono bg-gray-900 border border-gray-600 rounded text-gray-300">
                              {shortcut.key}
                            </kbd>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-900/50 border-t border-gray-700">
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                  <span>Pro tip: Press</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 border border-gray-600 rounded">
                    ?
                  </kbd>
                  <span>anytime to show this help</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default KeyboardShortcutsHint;