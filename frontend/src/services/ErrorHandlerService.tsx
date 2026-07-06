import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedErrorDisplay, {
  UserFriendlyError,
  ErrorCategory,
  ErrorSeverity,
  ErrorAction
} from '../components/EnhancedErrorDisplay';

export interface ErrorHandlerContextType {
  errors: UserFriendlyError[];
  addError: (error: Partial<UserFriendlyError> | Error | string) => string;
  removeError: (errorId: string) => void;
  clearAllErrors: () => void;
  showError: (error: Partial<UserFriendlyError>) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ErrorHandlerContext = createContext<ErrorHandlerContextType | null>(null);

export const useErrorHandler = () => {
  const context = useContext(ErrorHandlerContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorHandlerProvider');
  }
  return context;
};

interface ErrorHandlerProviderProps {
  children: ReactNode;
  maxErrors?: number;
  enableToast?: boolean;
}

export const ErrorHandlerProvider: React.FC<ErrorHandlerProviderProps> = ({
  children,
  maxErrors = 5,
  enableToast = true
}) => {
  const [errors, setErrors] = useState<UserFriendlyError[]>([]);

  const generateErrorId = () => `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const createErrorFromTechnical = useCallback((
    error: Error | string,
    category: ErrorCategory = 'system',
    severity: ErrorSeverity = 'medium'
  ): Partial<UserFriendlyError> => {
    const errorId = generateErrorId();
    const timestamp = new Date();

    if (typeof error === 'string') {
      return {
        id: errorId,
        title: 'Notification',
        message: error,
        userMessage: error,
        category,
        severity,
        timestamp,
        actionable: false,
        autoResolve: severity === 'low'
      };
    }

    // Extract meaningful information from technical errors
    const errorMap: Record<string, Partial<UserFriendlyError>> = {
      // Network errors
      'NetworkError': {
        title: 'Connection Problem',
        userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
        category: 'network',
        severity: 'high',
        actionable: true,
        autoResolve: false,
        helpLink: 'https://docs.example.com/troubleshooting/network-issues'
      },
      'ChunkLoadError': {
        title: 'App Update Required',
        userMessage: 'The application has been updated. Please refresh the page to get the latest version.',
        category: 'system',
        severity: 'medium',
        actionable: true,
        autoResolve: false
      },
      'TypeError': {
        title: 'Application Error',
        userMessage: 'Something went wrong in the application. Please try again.',
        category: 'system',
        severity: 'high',
        actionable: true,
        autoResolve: false
      },
      'ValidationError': {
        title: 'Invalid Input',
        userMessage: 'Please check your input and try again.',
        category: 'validation',
        severity: 'low',
        actionable: true,
        autoResolve: true
      },
      'TimeoutError': {
        title: 'Request Timeout',
        userMessage: 'The request took too long to complete. Please try again.',
        category: 'network',
        severity: 'medium',
        actionable: true,
        autoResolve: false
      },
      'AbortError': {
        title: 'Request Cancelled',
        userMessage: 'The operation was cancelled.',
        category: 'network',
        severity: 'low',
        actionable: false,
        autoResolve: true
      }
    };

    // Check for specific error patterns
    if (error.message.includes('fetch')) {
      return {
        id: errorId,
        title: 'Network Error',
        message: error.message,
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        category: 'network',
        severity: 'high',
        timestamp,
        actionable: true,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'NETWORK_001'
      };
    }

    if (error.message.includes('401')) {
      return {
        id: errorId,
        title: 'Authentication Required',
        message: error.message,
        userMessage: 'Please log in to access this feature.',
        category: 'permission',
        severity: 'medium',
        timestamp,
        actionable: true,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'AUTH_401'
      };
    }

    if (error.message.includes('403')) {
      return {
        id: errorId,
        title: 'Access Denied',
        message: error.message,
        userMessage: 'You don\'t have permission to perform this action.',
        category: 'permission',
        severity: 'high',
        timestamp,
        actionable: false,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'AUTH_403'
      };
    }

    if (error.message.includes('404')) {
      return {
        id: errorId,
        title: 'Not Found',
        message: error.message,
        userMessage: 'The requested resource was not found.',
        category: 'system',
        severity: 'medium',
        timestamp,
        actionable: true,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'HTTP_404'
      };
    }

    if (error.message.includes('413') || error.message.includes('file too large')) {
      return {
        id: errorId,
        title: 'File Too Large',
        message: error.message,
        userMessage: 'The file you\'re trying to upload is too large. Please choose a smaller file (max 16MB).',
        category: 'upload',
        severity: 'medium',
        timestamp,
        actionable: true,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'UPLOAD_001'
      };
    }

    if (error.message.includes('422') || error.message.includes('validation')) {
      return {
        id: errorId,
        title: 'Validation Error',
        message: error.message,
        userMessage: 'Please check your input and correct any errors.',
        category: 'validation',
        severity: 'low',
        timestamp,
        actionable: true,
        autoResolve: true,
        technicalMessage: error.message,
        errorCode: 'VALIDATION_001'
      };
    }

    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return {
        id: errorId,
        title: 'Too Many Requests',
        message: error.message,
        userMessage: 'You\'ve made too many requests. Please wait a moment and try again.',
        category: 'network',
        severity: 'medium',
        timestamp,
        actionable: true,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'RATE_LIMIT_001'
      };
    }

    if (error.message.includes('500')) {
      return {
        id: errorId,
        title: 'Server Error',
        message: error.message,
        userMessage: 'Our servers are experiencing issues. Please try again in a few moments.',
        category: 'system',
        severity: 'high',
        timestamp,
        actionable: true,
        autoResolve: false,
        technicalMessage: error.message,
        errorCode: 'SERVER_500'
      };
    }

    // Use predefined error mapping or create generic error
    const predefinedError = errorMap[error.name] || errorMap['TypeError'];

    return {
      id: errorId,
      title: predefinedError.title || error.name || 'Error',
      message: error.message,
      userMessage: predefinedError.userMessage || 'An unexpected error occurred. Please try again.',
      category: predefinedError.category || category,
      severity: predefinedError.severity || severity,
      timestamp,
      actionable: predefinedError.actionable || true,
      autoResolve: predefinedError.autoResolve || (severity === 'low'),
      technicalMessage: error.stack,
      errorCode: `${category.toUpperCase()}_${errorId.slice(-6).toUpperCase()}`
    };
  }, []);

  const addError = useCallback((error: Partial<UserFriendlyError> | Error | string) => {
    const newError = typeof error === 'object' && 'message' in error
      ? createErrorFromTechnical(error as Error)
      : typeof error === 'string'
      ? createErrorFromTechnical(error)
      : {
          id: generateErrorId(),
          title: 'Error',
          message: 'An error occurred',
          userMessage: 'An error occurred',
          category: 'system' as ErrorCategory,
          severity: 'medium' as ErrorSeverity,
          timestamp: new Date(),
          actionable: true,
          autoResolve: false,
          ...error
        };

    setErrors(prevErrors => {
      const updatedErrors = [newError as UserFriendlyError, ...prevErrors];
      return updatedErrors.slice(0, maxErrors);
    });

    return (newError as UserFriendlyError).id;
  }, [createErrorFromTechnical, maxErrors]);

  const removeError = useCallback((errorId: string) => {
    setErrors(prevErrors => prevErrors.filter(error => error.id !== errorId));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const showError = useCallback((error: Partial<UserFriendlyError>) => {
    addError({
      ...error,
      severity: 'high',
      category: error.category || 'system'
    });
  }, [addError]);

  const showSuccess = useCallback((message: string, title = 'Success') => {
    const successError: Partial<UserFriendlyError> = {
      id: generateErrorId(),
      title,
      message,
      userMessage: message,
      category: 'system',
      severity: 'low',
      timestamp: new Date(),
      actionable: false,
      autoResolve: true
    };
    addError(successError);
  }, [addError]);

  const showWarning = useCallback((message: string, title = 'Warning') => {
    const warningError: Partial<UserFriendlyError> = {
      id: generateErrorId(),
      title,
      message,
      userMessage: message,
      category: 'validation',
      severity: 'medium',
      timestamp: new Date(),
      actionable: true,
      autoResolve: false
    };
    addError(warningError);
  }, [addError]);

  const showInfo = useCallback((message: string, title = 'Information') => {
    const infoError: Partial<UserFriendlyError> = {
      id: generateErrorId(),
      title,
      message,
      userMessage: message,
      category: 'system',
      severity: 'low',
      timestamp: new Date(),
      actionable: false,
      autoResolve: true
    };
    addError(infoError);
  }, [addError]);

  const contextValue: ErrorHandlerContextType = {
    errors,
    addError,
    removeError,
    clearAllErrors,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };

  return (
    <ErrorHandlerContext.Provider value={contextValue}>
      {children}

      {/* Error Display Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        <AnimatePresence>
          {errors.map((error) => (
            <EnhancedErrorDisplay
              key={error.id}
              error={error}
              onDismiss={() => removeError(error.id)}
              onResolve={(errorId) => removeError(errorId)}
              compact={errors.length > 2}
              position="relative"
            />
          ))}
        </AnimatePresence>
      </div>
    </ErrorHandlerContext.Provider>
  );
};

// Specialized error creators for common scenarios
export const createNetworkError = (message?: string): Partial<UserFriendlyError> => ({
  title: 'Connection Error',
  message: message || 'Unable to connect to the server',
  userMessage: 'Please check your internet connection and try again.',
  category: 'network',
  severity: 'high',
  actionable: true,
  autoResolve: false,
  errorCode: 'NETWORK_001',
  actions: [
    {
      label: 'Retry',
      action: () => window.location.reload(),
      type: 'primary'
    }
  ]
});

export const createUploadError = (fileName?: string, reason?: string): Partial<UserFriendlyError> => ({
  title: 'Upload Failed',
  message: reason || 'Failed to upload file',
  userMessage: fileName
    ? `Failed to upload "${fileName}". Please check the file and try again.`
    : 'Failed to upload file. Please check the file and try again.',
  category: 'upload',
  severity: 'medium',
  actionable: true,
  autoResolve: false,
  errorCode: 'UPLOAD_001',
  context: { fileName }
});

export const createValidationError = (field: string, message: string): Partial<UserFriendlyError> => ({
  title: 'Validation Error',
  message: `${field}: ${message}`,
  userMessage: `Please check the ${field.toLowerCase()} field: ${message}`,
  category: 'validation',
  severity: 'low',
  actionable: true,
  autoResolve: true,
  errorCode: 'VALIDATION_001',
  context: { field, originalMessage: message }
});

export const createSessionError = (): Partial<UserFriendlyError> => ({
  title: 'Session Expired',
  message: 'Your session has expired',
  userMessage: 'Please upload a document again to start a new session.',
  category: 'session',
  severity: 'medium',
  actionable: true,
  autoResolve: false,
  errorCode: 'SESSION_001',
  actions: [
    {
      label: 'Start New Session',
      action: () => window.location.reload(),
      type: 'primary'
    }
  ]
});

export const createProcessingError = (stage?: string): Partial<UserFriendlyError> => ({
  title: 'Processing Error',
  message: `Error during document processing${stage ? ` at ${stage}` : ''}`,
  userMessage: 'There was an error processing your document. Please try uploading it again.',
  category: 'processing',
  severity: 'high',
  actionable: true,
  autoResolve: false,
  errorCode: 'PROCESSING_001',
  context: { stage }
});

export default ErrorHandlerProvider;