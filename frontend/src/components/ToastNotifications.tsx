import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const newToast: Toast = { id, ...toast };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove non-persistent toasts
    if (!toast.persistent) {
      const duration = toast.duration || (toast.type === 'error' ? 8000 : toast.type === 'warning' ? 6000 : 4000);
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Enter animation
    setIsVisible(true);
    return () => {
      setIsLeaving(true);
    };
  }, []);

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          bgColor: 'bg-green-900/90',
          borderColor: 'border-green-600',
          iconColor: 'text-green-400',
          titleColor: 'text-green-100',
          messageColor: 'text-green-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'error':
        return {
          bgColor: 'bg-red-900/90',
          borderColor: 'border-red-600',
          iconColor: 'text-red-400',
          titleColor: 'text-red-100',
          messageColor: 'text-red-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-900/90',
          borderColor: 'border-yellow-600',
          iconColor: 'text-yellow-400',
          titleColor: 'text-yellow-100',
          messageColor: 'text-yellow-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'info':
        return {
          bgColor: 'bg-blue-900/90',
          borderColor: 'border-blue-600',
          iconColor: 'text-blue-400',
          titleColor: 'text-blue-100',
          messageColor: 'text-blue-200',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          bgColor: 'bg-gray-900/90',
          borderColor: 'border-gray-600',
          iconColor: 'text-gray-400',
          titleColor: 'text-gray-100',
          messageColor: 'text-gray-200',
          icon: null
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} backdrop-blur-sm
        border rounded-lg shadow-lg p-4 min-w-[300px]
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
        ${isLeaving ? 'translate-x-full opacity-0 scale-95' : ''}
      `}
    >
      <div className="flex items-start space-x-3">
        {config.icon && (
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            {config.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`font-medium ${config.titleColor}`}>
            {toast.title}
          </div>
          {toast.message && (
            <div className={`mt-1 text-sm ${config.messageColor}`}>
              {toast.message}
            </div>
          )}
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={() => {
                  toast.action.onClick();
                  onRemove();
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-600 rounded-md text-xs font-medium text-gray-200 hover:bg-gray-700/50 transition-colors"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={onRemove}
            className={`inline-flex text-gray-400 hover:text-gray-200 transition-colors`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      {!toast.persistent && (
        <div className="mt-2">
          <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className="bg-cyan-500 h-1 rounded-full transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${toast.duration || 4000}ms linear forwards`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Convenience hooks for common toast types
export const useSuccessToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    showToast({ type: 'success', title, message, ...options });
  }, [showToast]);
};

export const useErrorToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    showToast({ type: 'error', title, message, ...options });
  }, [showToast]);
};

export const useWarningToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    showToast({ type: 'warning', title, message, ...options });
  }, [showToast]);
};

export const useInfoToast = () => {
  const { showToast } = useToast();
  return useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
    showToast({ type: 'info', title, message, ...options });
  }, [showToast]);
};

// Add custom styles to globals.css for the animation
const toastStyles = `
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
`;

export default ToastProvider;