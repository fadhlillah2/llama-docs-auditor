import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(2)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.state.errorId!);
    }

    // Log error to external service (in production)
    this.logErrorToService(error, errorInfo, this.state.errorId!);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // In a real application, you would send this to an error reporting service
    // like Sentry, LogRocket, or your own API
    const errorReport = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount
    };

    console.error('Error Report:', errorReport);

    // Example: Send to API (uncomment in production)
    /*
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport)
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
    */
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorContext = () => {
    if (!this.state.error || !this.state.errorInfo) return null;

    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: this.state.error.stack,
      componentStack: this.state.errorInfo.componentStack,
      errorId: this.state.errorId,
      retryCount: this.retryCount
    };
  };

  private getErrorMessage = () => {
    const error = this.state.error;
    if (!error) return 'An unexpected error occurred';

    // Provide user-friendly messages for common errors
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. Please refresh the page.';
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }

    if (error.message.includes('NetworkError')) {
      return 'Unable to connect to the server. Please try again later.';
    }

    return error.message || 'An unexpected error occurred';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <ErrorDisplay
              title="Application Error"
              message={this.getErrorMessage()}
              type="error"
              details={this.props.showErrorDetails ? JSON.stringify(this.getErrorContext(), null, 2) : undefined}
              actionButton={
                this.props.enableRetry && this.retryCount < this.maxRetries
                  ? {
                      label: `Retry (${this.retryCount}/${this.maxRetries})`,
                      onClick: this.handleRetry
                    }
                  : {
                      label: 'Reload Page',
                      onClick: this.handleReload
                    }
              }
              className="bg-gray-800 border-gray-700"
            />

            {/* Additional error information for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Development Details:</h4>
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-300 font-mono mb-2">
                    Error Stack Trace
                  </summary>
                  <pre className="whitespace-pre-wrap overflow-x-auto bg-gray-900 p-2 rounded text-red-400 font-mono text-xs">
                    {this.state.error.stack}
                  </pre>
                </details>
                {this.state.errorInfo && (
                  <details className="text-xs text-gray-400 mt-2">
                    <summary className="cursor-pointer hover:text-gray-300 font-mono mb-2">
                      Component Stack
                    </summary>
                    <pre className="whitespace-pre-wrap overflow-x-auto bg-gray-900 p-2 rounded text-yellow-400 font-mono text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Contact support information */}
            <div className="mt-4 text-center text-sm text-gray-400">
              <p>If this problem persists, please contact support with the error ID:</p>
              <code className="bg-gray-700 px-2 py-1 rounded text-xs text-cyan-400 font-mono">
                {this.state.errorId}
              </code>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to use ErrorBoundary context
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Error captured by useErrorBoundary:', error);
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Higher-order component for wrapping components with ErrorBoundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;