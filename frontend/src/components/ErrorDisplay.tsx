import React from "react";

// TypeScript interfaces for error display
interface ErrorDisplayProps {
  title?: string;
  message: string;
  type?: "error" | "warning" | "info";
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
  showIcon?: boolean;
  details?: string;
}

interface ErrorContextInfo {
  timestamp: string;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  type = "error",
  actionButton,
  onClose,
  className = "",
  showIcon = true,
  details
}) => {

  // Error type configurations
  const typeConfig = {
    error: {
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      iconColor: "text-red-400",
      titleColor: "text-red-800",
      messageColor: "text-red-700",
      buttonColor: "bg-red-600 hover:bg-red-700 text-white"
    },
    warning: {
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200", 
      iconColor: "text-yellow-400",
      titleColor: "text-yellow-800",
      messageColor: "text-yellow-700",
      buttonColor: "bg-yellow-600 hover:bg-yellow-700 text-white"
    },
    info: {
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-400", 
      titleColor: "text-blue-800",
      messageColor: "text-blue-700",
      buttonColor: "bg-blue-600 hover:bg-blue-700 text-white"
    }
  };

  const config = typeConfig[type];

  // Error icon components
  const renderIcon = (): JSX.Element | null => {
    if (!showIcon) return null;

    const iconClass = `w-6 h-6 ${config.iconColor}`;

    switch (type) {
      case "error":
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case "warning":
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case "info":
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getDefaultTitle = (): string => {
    switch (type) {
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      default:
        return "Notification";
    }
  };

  return (
    <div 
      className={`
        rounded-md p-4 border
        ${config.bgColor} 
        ${config.borderColor}
        ${className}
      `.trim()}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {renderIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.titleColor}`}>
            {title || getDefaultTitle()}
          </h3>
          <div className={`mt-2 text-sm ${config.messageColor}`}>
            <p>{message}</p>
            {details && (
              <details className="mt-2">
                <summary className="cursor-pointer hover:underline font-medium">
                  Show details
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap">
                  {details}
                </div>
              </details>
            )}
          </div>
          {actionButton && (
            <div className="mt-4">
              <button
                type="button"
                className={`
                  inline-flex items-center px-3 py-2 border border-transparent 
                  text-sm leading-4 font-medium rounded-md 
                  ${config.buttonColor}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 
                  transition-colors duration-200
                `.trim()}
                onClick={actionButton.onClick}
              >
                {actionButton.label}
              </button>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`
                  inline-flex p-1.5 rounded-md hover:bg-opacity-20 hover:bg-gray-600
                  focus:outline-none focus:ring-2 focus:ring-offset-2 
                  ${config.iconColor}
                `.trim()}
                onClick={onClose}
                aria-label="Close error message"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized error components for different contexts
export const ChatErrorMessage: React.FC<{ 
  message: string; 
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ message, onRetry, onDismiss }) => (
  <ErrorDisplay
    title="Chat Error"
    message={message}
    type="error"
    actionButton={onRetry ? {
      label: "Try Again",
      onClick: onRetry
    } : undefined}
    onClose={onDismiss}
    className="mb-4"
  />
);

export const UploadErrorMessage: React.FC<{
  message: string;
  fileName?: string;
  onRetry?: () => void;
}> = ({ message, fileName, onRetry }) => (
  <ErrorDisplay
    title="Upload Failed"
    message={fileName ? `Failed to upload "${fileName}": ${message}` : message}
    type="error"
    actionButton={onRetry ? {
      label: "Try Again",
      onClick: onRetry
    } : undefined}
    className="mb-4"
  />
);

export const ConnectionErrorMessage: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => (
  <ErrorDisplay
    title="Connection Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    type="warning"
    actionButton={onRetry ? {
      label: "Retry Connection",
      onClick: onRetry
    } : undefined}
    details="This error usually occurs when the backend server is not running or there are network connectivity issues."
  />
);

export const SessionExpiredMessage: React.FC<{
  onStartNewSession?: () => void;
}> = ({ onStartNewSession }) => (
  <ErrorDisplay
    title="Session Expired"
    message="Your session has expired. Please upload a document again to start a new session."
    type="info"
    actionButton={onStartNewSession ? {
      label: "Start New Session",
      onClick: onStartNewSession
    } : undefined}
  />
);

export const ValidationErrorMessage: React.FC<{
  field: string;
  message: string;
  onFocus?: () => void;
}> = ({ field, message, onFocus }) => (
  <ErrorDisplay
    title={`${field} Validation Error`}
    message={message}
    type="warning"
    actionButton={onFocus ? {
      label: "Focus Field",
      onClick: onFocus
    } : undefined}
    showIcon={false}
    className="text-xs"
  />
);

export default ErrorDisplay;

// Export types for use in other components
export type { ErrorDisplayProps, ErrorContextInfo };