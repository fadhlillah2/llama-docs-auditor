import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ServerIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useErrorHandler } from '../services/ErrorHandlerService';
import {
  createNetworkError,
  createUploadError,
  createValidationError,
  createSessionError,
  createProcessingError
} from '../services/ErrorHandlerService';

const ErrorTestSuite: React.FC = () => {
  const { addError, showError, showSuccess, showWarning, showInfo, clearAllErrors } = useErrorHandler();
  const [testCounter, setTestCounter] = useState(0);

  const generateTestId = () => {
    const id = ++testCounter;
    setTestCounter(id);
    return id;
  };

  const testScenarios = [
    {
      title: 'Network Errors',
      icon: <ServerIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'Connection Timeout',
          action: () => addError({
            ...createNetworkError('Connection timeout after 30 seconds'),
            errorCode: `TEST-${generateTestId()}`
          })
        },
        {
          name: 'Server Not Found',
          action: () => addError({
            title: 'Server Not Found',
            message: 'Unable to connect to the server at localhost:8081',
            userMessage: 'The application server is not responding. Please check if the server is running.',
            category: 'network',
            severity: 'high',
            timestamp: new Date(),
            actionable: true,
            autoResolve: false,
            errorCode: `TEST-${generateTestId()}`,
            actions: [
              {
                label: 'Check Server Status',
                action: () => fetch('http://localhost:8081/'),
                type: 'primary' as const
              },
              {
                label: 'Reload Page',
                action: () => window.location.reload(),
                type: 'secondary' as const
              }
            ]
          })
        },
        {
          name: 'Rate Limited',
          action: () => addError({
            title: 'Rate Limit Exceeded',
            message: 'Too many requests sent',
            userMessage: 'You\'ve made too many requests. Please wait 30 seconds before trying again.',
            category: 'network',
            severity: 'medium',
            timestamp: new Date(),
            actionable: true,
            autoResolve: false,
            errorCode: `TEST-${generateTestId()}`,
            actions: [
              {
                label: 'Wait & Retry',
                action: async () => {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  showSuccess('Retry ready!');
                },
                type: 'primary' as const
              }
            ]
          })
        }
      ]
    },
    {
      title: 'Upload Errors',
      icon: <DocumentIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'File Too Large',
          action: () => addError(createUploadError('large_document.pdf', 'File size exceeds 16MB limit'))
        },
        {
          name: 'Invalid File Type',
          action: () => addError(createUploadError('image.jpg', 'File type not supported'))
        },
        {
          name: 'Corrupted File',
          action: () => addError(createUploadError('corrupted.pdf', 'File appears to be corrupted or damaged'))
        },
        {
          name: 'Upload Interrupted',
          action: () => addError({
            ...createUploadError('contract.pdf', 'Upload was interrupted'),
            actions: [
              {
                label: 'Resume Upload',
                action: () => showSuccess('Upload resumed!'),
                type: 'primary' as const
              },
              {
                label: 'Start Over',
                action: () => showWarning('Upload restarted from beginning'),
                type: 'secondary' as const
              }
            ]
          })
        }
      ]
    },
    {
      title: 'Validation Errors',
      icon: <ExclamationTriangleIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'Empty Field',
          action: () => addError(createValidationError('document title', 'This field is required'))
        },
        {
          name: 'Invalid Email',
          action: () => addError(createValidationError('email address', 'Please enter a valid email address'))
        },
        {
          name: 'Password Weak',
          action: () => addError({
            ...createValidationError('password', 'Password must be at least 8 characters long'),
            actions: [
              {
                label: 'Show Requirements',
                action: () => showInfo('Password must contain: 8+ characters, uppercase, lowercase, number, and special character'),
                type: 'primary' as const
              }
            ]
          })
        }
      ]
    },
    {
      title: 'Processing Errors',
      icon: <ArrowPathIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'Document Parsing Failed',
          action: () => addError(createProcessingError('PDF parsing'))
        },
        {
          name: 'AI Processing Error',
          action: () => addError({
            title: 'AI Processing Error',
            message: 'Failed to analyze document with AI',
            userMessage: 'Our AI encountered an error while analyzing your document. The document has been uploaded, but AI analysis failed.',
            category: 'processing',
            severity: 'high',
            timestamp: new Date(),
            actionable: true,
            autoResolve: false,
            errorCode: `TEST-${generateTestId()}`,
            actions: [
              {
                label: 'Retry Analysis',
                action: () => showError('Retry failed - AI service temporarily unavailable'),
                type: 'primary' as const
              },
              {
                label: 'Use Basic Analysis',
                action: () => showSuccess('Basic analysis completed successfully!'),
                type: 'secondary' as const
              }
            ]
          })
        },
        {
          name: 'Memory Limit Exceeded',
          action: () => addError({
            title: 'Memory Limit Exceeded',
            message: 'Document too large for processing',
            userMessage: 'This document is too large for our system to process. Please try with a smaller document or split it into multiple files.',
            category: 'processing',
            severity: 'high',
            timestamp: new Date(),
            actionable: true,
            autoResolve: false,
            errorCode: `TEST-${generateTestId()}`,
            helpLink: 'https://docs.example.com/limits/document-size'
          })
        }
      ]
    },
    {
      title: 'Session Errors',
      icon: <XCircleIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'Session Expired',
          action: () => addError(createSessionError())
        },
        {
          name: 'Unauthorized Access',
          action: () => addError({
            title: 'Unauthorized Access',
            message: 'You don\'t have permission to access this resource',
            userMessage: 'Please log in to access this feature. If you believe this is an error, contact support.',
            category: 'permission',
            severity: 'high',
            timestamp: new Date(),
            actionable: true,
            autoResolve: false,
            errorCode: `TEST-${generateTestId()}`,
            actions: [
              {
                label: 'Log In',
                action: () => showSuccess('Login successful!'),
                type: 'primary' as const
              },
              {
                label: 'Contact Support',
                action: () => showInfo('Support ticket created'),
                type: 'secondary' as const
              }
            ]
          })
        }
      ]
    },
    {
      title: 'Success Messages',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'Upload Success',
          action: () => showSuccess('Document uploaded successfully!')
        },
        {
          name: 'Analysis Complete',
          action: () => showSuccess('Document analysis completed! 15 clauses identified.')
        },
        {
          name: 'Settings Saved',
          action: () => showSuccess('Your preferences have been saved.')
        }
      ]
    },
    {
      title: 'Information Messages',
      icon: <ExclamationTriangleIcon className="w-5 h-5" />,
      tests: [
        {
          name: 'New Feature',
          action: () => showInfo('New feature: You can now upload multiple documents at once!')
        },
        {
          name: 'Maintenance Notice',
          action: () => showInfo('Scheduled maintenance: Sunday 2AM-4AM EST')
        },
        {
          name: 'Tip',
          action: () => showInfo('Pro tip: Use specific questions for better AI responses!')
        }
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-semibold text-white mb-4">
          🧪 Error Handling Test Suite
        </h2>
        <p className="text-gray-300 mb-6">
          Test various error scenarios to validate the enhanced error messaging system.
        </p>

        {/* Control Panel */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button
            onClick={clearAllErrors}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear All Errors
          </button>
          <div className="text-sm text-gray-400">
            Tests Run: {testCounter}
          </div>
        </div>
      </motion.div>

      {/* Test Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testScenarios.map((category, categoryIndex) => (
          <motion.div
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gray-700 rounded-lg text-cyan-400">
                  {category.icon}
                </div>
                <h3 className="text-lg font-medium text-white">
                  {category.title}
                </h3>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {category.tests.map((test, testIndex) => (
                <motion.button
                  key={test.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: categoryIndex * 0.1 + testIndex * 0.05 }}
                  onClick={test.action}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200
                    ${category.title === 'Success Messages'
                      ? 'bg-green-900/20 hover:bg-green-900/30 text-green-400 border border-green-800/50'
                      : category.title === 'Information Messages'
                      ? 'bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 border border-blue-800/50'
                      : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white'
                    }
                  `}
                >
                  {test.name}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700"
      >
        <h3 className="text-lg font-medium text-white mb-3">📋 Testing Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Click any test button to simulate that error scenario</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Observe how errors appear in the top-right corner with appropriate severity levels</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Test the action buttons on errors that provide recovery options</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Try dismissing errors manually or waiting for auto-dismiss on low severity messages</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Click "Show Details" on errors to reveal technical information</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-cyan-400">•</span>
            <span>Use "Copy Details" to copy error information to clipboard</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

export default ErrorTestSuite;