import React from "react";

// TypeScript interfaces for loading component
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white" | "gray";
  className?: string;
  message?: string;
  type?: "spinner" | "dots" | "pulse" | "bars" | "ripple" | "orbit" | "wave";
}

interface LoadingStyles {
  container: string;
  spinner: string;
  message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = "primary",
  className = "",
  message,
  type = "spinner"
}) => {
  
  // Size configurations
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  // Color configurations
  const colorClasses = {
    primary: "text-blue-600",
    secondary: "text-cyan-600", 
    white: "text-white",
    gray: "text-gray-400"
  };

  // Build CSS classes
  const styles: LoadingStyles = {
    container: `flex flex-col items-center justify-center ${className}`.trim(),
    spinner: `animate-spin ${sizeClasses[size]} ${colorClasses[color]}`,
    message: `mt-2 text-sm ${colorClasses[color]} font-medium`
  };

  // Different loading animation types
  const renderLoadingAnimation = (): JSX.Element => {
    switch (type) {
      case "spinner":
        return (
          <svg
            className={styles.spinner}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );

      case "dots":
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            <div className={`w-2 h-2 bg-current rounded-full animate-pulse ${colorClasses[color]}`} />
            <div className={`w-2 h-2 bg-current rounded-full animate-pulse ${colorClasses[color]}`} style={{ animationDelay: "0.2s" }} />
            <div className={`w-2 h-2 bg-current rounded-full animate-pulse ${colorClasses[color]}`} style={{ animationDelay: "0.4s" }} />
          </div>
        );

      case "pulse":
        return (
          <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-pulse`}>
            <div className="w-full h-full bg-current rounded-full opacity-60" />
          </div>
        );

      case "bars":
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            <div className={`w-1 bg-current rounded-full animate-pulse ${colorClasses[color]}`} style={{ height: "100%", animationDelay: "0s" }} />
            <div className={`w-1 bg-current rounded-full animate-pulse ${colorClasses[color]}`} style={{ height: "80%", animationDelay: "0.15s" }} />
            <div className={`w-1 bg-current rounded-full animate-pulse ${colorClasses[color]}`} style={{ height: "100%", animationDelay: "0.3s" }} />
            <div className={`w-1 bg-current rounded-full animate-pulse ${colorClasses[color]}`} style={{ height: "60%", animationDelay: "0.45s" }} />
          </div>
        );

      case "ripple":
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div className={`absolute inset-0 rounded-full border-2 border-current ${colorClasses[color]} animate-ping opacity-75`} />
            <div className={`absolute inset-2 rounded-full border-2 border-current ${colorClasses[color]} animate-ping opacity-50`} style={{ animationDelay: "0.2s" }} />
            <div className={`absolute inset-4 rounded-full border-2 border-current ${colorClasses[color]} animate-ping opacity-25`} style={{ animationDelay: "0.4s" }} />
          </div>
        );

      case "orbit":
        return (
          <div className={`${sizeClasses[size]} relative`}>
            <div className={`absolute inset-0 rounded-full border-2 border-transparent border-t-current ${colorClasses[color]} animate-spin`} />
            <div className={`absolute inset-1 rounded-full border-2 border-transparent border-r-current ${colorClasses[color]} animate-spin`} style={{ animationDirection: "reverse", animationDuration: "0.75s" }} />
            <div className={`absolute inset-2 rounded-full border-2 border-transparent border-b-current ${colorClasses[color]} animate-spin`} style={{ animationDuration: "0.5s" }} />
          </div>
        );

      case "wave":
        return (
          <div className={`flex space-x-1 ${sizeClasses[size]}`}>
            <div className={`w-1 bg-current rounded-full ${colorClasses[color]} animate-bounce`} style={{ height: "100%", animationDelay: "0s" }} />
            <div className={`w-1 bg-current rounded-full ${colorClasses[color]} animate-bounce`} style={{ height: "100%", animationDelay: "0.1s" }} />
            <div className={`w-1 bg-current rounded-full ${colorClasses[color]} animate-bounce`} style={{ height: "100%", animationDelay: "0.2s" }} />
            <div className={`w-1 bg-current rounded-full ${colorClasses[color]} animate-bounce`} style={{ height: "100%", animationDelay: "0.3s" }} />
            <div className={`w-1 bg-current rounded-full ${colorClasses[color]} animate-bounce`} style={{ height: "100%", animationDelay: "0.4s" }} />
          </div>
        );

      default:
        return renderLoadingAnimation();
    }
  };

  return (
    <div className={styles.container} role="status" aria-label={message || "Loading"}>
      {renderLoadingAnimation()}
      {message && (
        <p className={styles.message} aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
};

// Specialized loading components for different contexts
export const ChatLoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg border border-gray-600 shadow-lg">
    <LoadingSpinner size="sm" color="secondary" type="wave" />
    <span className="text-sm text-gray-300 animate-pulse">AI is thinking...</span>
  </div>
);

export const DocumentProcessingLoader: React.FC<{ progress?: number }> = ({ progress }) => (
  <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
    <LoadingSpinner size="lg" color="primary" type="orbit" />
    <div className="text-center">
      <p className="text-sm font-medium text-gray-700 mb-2">Processing document...</p>
      {progress !== undefined && (
        <div className="w-64">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500 ease-out shadow-sm" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

export const UploadProgressIndicator: React.FC<{ 
  fileName?: string; 
  progress?: number; 
  status?: "uploading" | "processing" | "complete" | "error";
}> = ({ fileName, progress, status = "uploading" }) => {
  
  const statusMessages = {
    uploading: "Uploading file...",
    processing: "Processing document...",
    complete: "Upload complete!",
    error: "Upload failed"
  };

  const statusColors = {
    uploading: "primary",
    processing: "secondary",
    complete: "primary",
    error: "gray"
  } as const;

  return (
    <div className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg shadow-md transition-all duration-300">
      {status !== "complete" && status !== "error" && (
        <LoadingSpinner 
          size="sm" 
          color={statusColors[status]} 
          type={status === "uploading" ? "ripple" : "orbit"}
        />
      )}
      {status === "complete" && (
        <div className="w-4 h-4 text-green-600">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      {status === "error" && (
        <div className="w-4 h-4 text-red-600">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          {fileName ? `${statusMessages[status]} ${fileName}` : statusMessages[status]}
        </p>
        {progress !== undefined && status !== "complete" && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;

// Export types for use in other components
export type { LoadingSpinnerProps };