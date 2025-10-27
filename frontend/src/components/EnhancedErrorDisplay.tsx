import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  CommandLineIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'network'
  | 'upload'
  | 'processing'
  | 'validation'
  | 'session'
  | 'permission'
  | 'system'
  | 'user_input';

export interface UserFriendlyError {
  id: string;
  title: string;
  message: string;
  userMessage: string; // Simple, non-technical explanation
  technicalMessage?: string; // Detailed technical info for advanced users
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  actionable: boolean;
  actions?: ErrorAction[];
  autoResolve?: boolean; // Auto-dismiss after some time
  helpLink?: string;
  errorCode?: string;
  context?: Record<string, any>;
}

export interface ErrorAction {
  label: string;
  action: () => void | Promise<void>;
  type?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

export interface EnhancedErrorDisplayProps {
  error: UserFriendlyError;
  onDismiss?: () => void;
  onResolve?: (errorId: string) => void;
  showTechnical?: boolean;
  compact?: boolean;
  position?: 'fixed' | 'relative' | 'absolute';
  className?: string;
}

const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  onDismiss,
  onResolve,
  showTechnical: showTechProp = false,
  compact = false,
  position = 'relative',
  className = ''
}) => {
  const [showTechnical, setShowTechnical] = useState(showTechProp);
  const [isResolving, setIsResolving] = useState(false);

  // Auto-dismiss for low severity errors
  useEffect(() => {
    if (error.autoResolve && error.severity === 'low' && onDismiss) {
      const timer = setTimeout(onDismiss, 8000);
      return () => clearTimeout(timer);
    }
  }, [error.autoResolve, error.severity, onDismiss]);

  const getSeverityConfig = (severity: ErrorSeverity) => {
    const configs = {
      low: {
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-400',
        titleColor: 'text-blue-800 dark:text-blue-200',
        messageColor: 'text-blue-700 dark:text-blue-300',
        progressColor: 'bg-blue-500'
      },
      medium: {
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        titleColor: 'text-yellow-800 dark:text-yellow-200',
        messageColor: 'text-yellow-700 dark:text-yellow-300',
        progressColor: 'bg-yellow-500'
      },
      high: {
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        iconColor: 'text-orange-600 dark:text-orange-400',
        titleColor: 'text-orange-800 dark:text-orange-200',
        messageColor: 'text-orange-700 dark:text-orange-300',
        progressColor: 'bg-orange-500'
      },
      critical: {
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        iconColor: 'text-red-600 dark:text-red-400',
        titleColor: 'text-red-800 dark:text-red-200',
        messageColor: 'text-red-700 dark:text-red-300',
        progressColor: 'bg-red-500'
      }
    };
    return configs[severity];
  };

  const getErrorIcon = (category: ErrorCategory) => {
    const iconClass = `w-6 h-6 ${getSeverityConfig(error.severity).iconColor}`;

    switch (category) {
      case 'network':
        return <CommandLineIcon className={iconClass} />;
      case 'upload':
        return <DocumentDuplicateIcon className={iconClass} />;
      case 'processing':
        return <ArrowPathIcon className={iconClass} />;
      case 'validation':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'session':
        return <InformationCircleIcon className={iconClass} />;
      default:
        return <ExclamationTriangleIcon className={iconClass} />;
    }
  };

  const handleAction = async (action: ErrorAction) => {
    if (isResolving) return;

    setIsResolving(true);
    try {
      await action.action();
      onResolve?.(error.id);
    } catch (err) {
      console.error('Error action failed:', err);
      // Show secondary error if action fails
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: 'The attempted action failed. Please try a different approach.',
        toast: true,
        timer: 3000,
        position: 'top-end'
      });
    } finally {
      setIsResolving(false);
    }
  };

  const copyErrorDetails = () => {
    const errorText = `
Error ID: ${error.id}
Code: ${error.errorCode || 'N/A'}
Category: ${error.category}
Severity: ${error.severity}
Time: ${error.timestamp.toLocaleString()}

Message: ${error.message}

Technical Details: ${error.technicalMessage || 'N/A'}

Context: ${JSON.stringify(error.context || {}, null, 2)}
    `.trim();

    navigator.clipboard.writeText(errorText);
    Swal.fire({
      icon: 'success',
      title: 'Copied!',
      text: 'Error details copied to clipboard',
      toast: true,
      timer: 2000,
      position: 'top-end'
    });
  };

  const config = getSeverityConfig(error.severity);

  const containerClasses = `
    ${config.bgColor} ${config.borderColor}
    border rounded-lg shadow-lg overflow-hidden
    ${position === 'fixed' ? 'fixed top-4 right-4 z-50 max-w-md' : ''}
    ${position === 'absolute' ? 'absolute top-0 right-0 z-40 max-w-md' : ''}
    ${position === 'relative' ? 'relative' : ''}
    ${className}
  `.trim();

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className={containerClasses}
        role="alert"
        aria-live="polite"
      >
        <div className="p-3">
          <div className="flex items-center space-x-2">
            {getErrorIcon(error.category)}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${config.titleColor} truncate`}>
                {error.title}
              </p>
              <p className={`text-xs ${config.messageColor} truncate`}>
                {error.userMessage}
              </p>
            </div>
            <div className="flex items-center space-x-1">
              {error.actions?.slice(0, 1).map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action)}
                  disabled={isResolving}
                  className={`
                    p-1 rounded hover:bg-opacity-20 hover:bg-gray-600
                    ${config.iconColor} transition-colors
                    disabled:opacity-50
                  `}
                  title={action.label}
                >
                  {action.icon}
                </button>
              ))}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`p-1 rounded hover:bg-opacity-20 hover:bg-gray-600 ${config.iconColor}`}
                  title="Dismiss"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={containerClasses}
      role="alert"
      aria-live="polite"
    >
      {/* Progress bar for critical errors */}
      {error.severity === 'critical' && (
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <motion.div
            className={`h-full ${config.progressColor}`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 10, ease: 'linear' }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Error Icon */}
          <div className="flex-shrink-0">
            {getErrorIcon(error.category)}
          </div>

          {/* Error Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Error Code */}
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-semibold ${config.titleColor}`}>
                {error.title}
                {error.errorCode && (
                  <span className="ml-2 text-xs font-mono opacity-60">
                    ({error.errorCode})
                  </span>
                )}
              </h3>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {error.technicalMessage && (
                  <button
                    onClick={() => setShowTechnical(!showTechnical)}
                    className={`text-xs ${config.iconColor} hover:underline`}
                  >
                    {showTechnical ? 'Hide' : 'Show'} Details
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className={`p-1 rounded hover:bg-opacity-20 hover:bg-gray-600 ${config.iconColor}`}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* User-friendly message */}
            <p className={`text-sm ${config.messageColor} mb-3`}>
              {error.userMessage}
            </p>

            {/* Technical details */}
            <AnimatePresence>
              {showTechnical && error.technicalMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3"
                >
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                    <div className="mb-1 font-semibold">Technical Details:</div>
                    <div className="whitespace-pre-wrap">{error.technicalMessage}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            {error.actions && error.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {error.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    disabled={isResolving}
                    className={`
                      inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded
                      transition-colors duration-200 disabled:opacity-50
                      ${action.type === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : action.type === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                      }
                    `}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                    {isResolving && (
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                    )}
                  </button>
                ))}
                <button
                  onClick={copyErrorDetails}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  <DocumentDuplicateIcon className="w-3 h-3" />
                  <span>Copy Details</span>
                </button>
              </div>
            )}

            {/* Help link */}
            {error.helpLink && (
              <div className="text-xs">
                <a
                  href={error.helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline ${config.iconColor} hover:no-underline`}
                >
                  Learn more about this error →
                </a>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {error.timestamp.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedErrorDisplay;