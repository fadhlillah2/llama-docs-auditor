import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onSearch?: () => void;
  onNewChat?: () => void;
  onSave?: () => void;
  onToggleSuggestions?: () => void;
  onUpload?: () => void;
  onDocuments?: () => void;
  onAnalytics?: () => void;
  onInsights?: () => void;
  onHelp?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
}

const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore shortcuts when user is typing in input fields
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.getAttribute('contenteditable') === 'true'
    )) {
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    const isCtrl = ctrlKey || metaKey; // Support both Ctrl (Windows) and Cmd (Mac)

    // Prevent default for all our shortcuts
    let shouldPreventDefault = false;

    switch (key.toLowerCase()) {
      case 'k':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onSearch?.();
          shouldPreventDefault = true;
        }
        break;

      case 'n':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onNewChat?.();
          shouldPreventDefault = true;
        }
        break;

      case 's':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onSave?.();
          shouldPreventDefault = true;
        }
        break;

      case '/':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onToggleSuggestions?.();
          shouldPreventDefault = true;
        }
        break;

      case 'u':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onUpload?.();
          shouldPreventDefault = true;
        }
        break;

      case 'd':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onDocuments?.();
          shouldPreventDefault = true;
        }
        break;

      case 'a':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onAnalytics?.();
          shouldPreventDefault = true;
        }
        break;

      case 'i':
        if (isCtrl && !shiftKey && !altKey) {
          handlers.onInsights?.();
          shouldPreventDefault = true;
        }
        break;

      case '?':
        if (!isCtrl && !shiftKey && !altKey) {
          handlers.onHelp?.();
          shouldPreventDefault = true;
        }
        break;

      case 'arrowright':
      case 'arrowdown':
        if (!isCtrl && !shiftKey && !altKey) {
          handlers.onNextTab?.();
          shouldPreventDefault = true;
        }
        break;

      case 'arrowleft':
      case 'arrowup':
        if (!isCtrl && !shiftKey && !altKey) {
          handlers.onPrevTab?.();
          shouldPreventDefault = true;
        }
        break;

      case 'escape':
        if (!isCtrl && !shiftKey && !altKey) {
          // Close modals, dropdowns, etc.
          const modals = document.querySelectorAll('[data-modal="true"]');
          const dropdowns = document.querySelectorAll('[data-dropdown="true"]');

          modals.forEach(modal => {
            (modal as HTMLElement).style.display = 'none';
          });

          dropdowns.forEach(dropdown => {
            (dropdown as HTMLElement).style.display = 'none';
          });
        }
        break;

      case 'tab':
        if (shiftKey) {
          // Navigate between sections
          const focusableElements = document.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );

          const firstElement = focusableElements[0] as HTMLElement;
          if (firstElement && document.activeElement === firstElement) {
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            lastElement?.focus();
            shouldPreventDefault = true;
          }
        }
        break;
    }

    if (shouldPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [handlers]);

  useEffect(() => {
    if (typeof window !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [handleKeyDown]);
};

export default useKeyboardShortcuts;