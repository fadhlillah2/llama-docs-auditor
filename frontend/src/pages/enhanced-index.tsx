import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorHandlerProvider, useErrorHandler } from "../services/ErrorHandlerService";
import EnhancedUpload from "../components/EnhancedUpload";
import Chat from "../components/Chat";
import DocumentManager from "../components/DocumentManager";
import DocumentAnalyticsDashboard from "../components/DocumentAnalyticsDashboard";
import DocumentInsights from "../components/DocumentInsights";
import OnboardingTour from "../components/OnboardingTour";
import ErrorTestSuite from "../components/ErrorTestSuite";
import ErrorBoundary from "../components/ErrorBoundary";
import {
  DocumentTextIcon,
  ChartBarIcon,
  EyeIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TabInfo {
  id: 'upload' | 'documents' | 'analytics' | 'insights' | 'test-suite';
  label: string;
  icon: React.ReactNode;
  description: string;
}

const EnhancedHomeContent: React.FC = () => {
  const { addError, showSuccess, showWarning } = useErrorHandler();
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'analytics' | 'insights' | 'test-suite'>('upload');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  const tabs: TabInfo[] = [
    {
      id: 'upload',
      label: 'Upload',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      description: 'Upload and analyze your documents'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <DocumentTextIcon className="w-4 h-4" />,
      description: 'View and manage your uploaded documents'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <ChartBarIcon className="w-4 h-4" />,
      description: 'View document analytics and insights'
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: <EyeIcon className="w-4 h-4" />,
      description: 'Deep analysis and contract insights'
    },
    ...(isTestMode ? [{
      id: 'test-suite',
      label: 'Test Suite',
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      description: 'Test error handling scenarios'
    } as TabInfo] : [])
  ];

  // Check if first-time user
  useEffect(() => {
    try {
      const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
      if (!hasVisitedBefore) {
        localStorage.setItem('hasVisitedBefore', 'true');
        setTimeout(() => {
          setShowOnboarding(true);
          showSuccess('Welcome! Take a quick tour to learn about the features.');
        }, 2000);
      }
    } catch (error) {
      addError({
        title: 'LocalStorage Error',
        message: 'Unable to access local storage',
        userMessage: 'Some settings may not be saved properly.',
        category: 'system',
        severity: 'low',
        timestamp: new Date(),
        actionable: false,
        autoResolve: true
      });
    }
  }, [addError, showSuccess]);

  // Handle tab changes with error recovery
  const handleTabChange = useCallback((tabId: typeof activeTab) => {
    try {
      setActiveTab(tabId);
    } catch (error) {
      addError({
        title: 'Navigation Error',
        message: `Failed to switch to ${tabId} tab`,
        userMessage: 'There was an error switching tabs. Please try again.',
        category: 'system',
        severity: 'medium',
        timestamp: new Date(),
        actionable: true,
        autoResolve: false,
        actions: [
          {
            label: 'Retry',
            action: () => handleTabChange(tabId),
            type: 'primary' as const
          }
        ]
      });
    }
  }, [addError]);

  // Simulate some periodic errors for testing (in development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isTestMode) {
      const interval = setInterval(() => {
        if (Math.random() < 0.1) { // 10% chance every 10 seconds
          const errors = [
            () => showWarning('Simulated warning: High memory usage detected'),
            () => showSuccess('Simulated success: Background sync completed'),
            () => showWarning('Simulated warning: Network latency high'),
            () => addError({
              title: 'Simulated Error',
              message: 'This is a test error for development',
              userMessage: 'Test error notification - you can safely ignore this in development.',
              category: 'system',
              severity: 'low',
              timestamp: new Date(),
              actionable: false,
              autoResolve: true
            })
          ];
          const randomError = errors[Math.floor(Math.random() * errors.length)];
          randomError();
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isTestMode, addError, showSuccess, showWarning]);

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'upload':
        return <EnhancedUpload />;
      case 'documents':
        return (
          <ErrorBoundary>
            <DocumentManager className="h-full" />
          </ErrorBoundary>
        );
      case 'analytics':
        return (
          <ErrorBoundary>
            <DocumentAnalyticsDashboard documents={[]} />
          </ErrorBoundary>
        );
      case 'insights':
        return (
          <ErrorBoundary>
            <DocumentInsights />
          </ErrorBoundary>
        );
      case 'test-suite':
        return <ErrorTestSuite />;
      default:
        return (
          <div className="text-center text-white p-8">
            <h2 className="text-2xl font-semibold mb-4">Tab Not Found</h2>
            <p>The selected tab is not available.</p>
          </div>
        );
    }
  }, [activeTab]);

  return (
    <div className="App h-screen flex">
      {/* Sidebar */}
      <aside className="side_menu w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="tab-container flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-xl font-bold text-white mb-2">
              📄 Contract Advisor RAG
            </h1>
            <p className="text-sm text-gray-400">
              AI-powered contract analysis with enhanced error handling
            </p>

            {/* Test Mode Toggle */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isTestMode}
                    onChange={(e) => setIsTestMode(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                  />
                  <span className="text-gray-300">Enable Test Mode</span>
                </label>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-cyan-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                  title={tab.description}
                >
                  <span className="flex-shrink-0">{tab.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Enhanced Error Handler v2.0</span>
              <button
                onClick={() => {
                  setShowOnboarding(true);
                  showSuccess('Tour restarted! Navigate through the features.');
                }}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Restart Tour
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-auto"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Chat Section */}
      <section className="chat_box" id="#chat">
        <ErrorBoundary>
          <Chat />
        </ErrorBoundary>
      </section>

      {/* Onboarding Tour */}
      <OnboardingTour
        isActive={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    </div>
  );
};

// Main component with error boundary and error handler provider
const EnhancedHome: React.FC = () => {
  return (
    <ErrorHandlerProvider maxErrors={5}>
      <ErrorBoundary
        title="Application Error"
        enableRetry={true}
        showErrorDetails={process.env.NODE_ENV === 'development'}
        onError={(error, errorInfo, errorId) => {
          // Log error to external service in production
          if (process.env.NODE_ENV === 'production') {
            console.error('Production error:', { errorId, error, errorInfo });
            // Here you would send to your error reporting service
            // such as Sentry, Bugsnag, etc.
          }
        }}
      >
        <EnhancedHomeContent />
      </ErrorBoundary>
    </ErrorHandlerProvider>
  );
};

export default EnhancedHome;