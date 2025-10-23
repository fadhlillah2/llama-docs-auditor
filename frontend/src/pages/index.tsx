import React, { useState, useEffect } from "react";
import Upload from "../components/Upload";
import Chat from "../components/Chat";
import DocumentManager from "../components/DocumentManager";
import DocumentAnalyticsDashboard from "../components/DocumentAnalyticsDashboard";
import DocumentInsights from "../components/DocumentInsights";
import OnboardingTour from "../components/OnboardingTour";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import KeyboardShortcutsHint from "../components/KeyboardShortcutsHint";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'analytics' | 'insights'>('documents');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Enhanced keyboard shortcut handlers
  const shortcutHandlers = {
    onSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      searchInput?.focus();
    },
    onNewChat: () => {
      // Clear chat history and start new conversation
      if (typeof window !== 'undefined') {
        localStorage.removeItem('conversationHistory');
        window.location.reload();
      }
    },
    onSave: () => {
      // Export current analysis
      const documents = localStorage.getItem('uploadedDocuments');
      if (documents) {
        const blob = new Blob([documents], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract-analysis-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    onToggleSuggestions: () => {
      // Toggle chat suggestions visibility
      const suggestionsButton = document.querySelector('[data-testid="toggle-suggestions"]') as HTMLButtonElement;
      suggestionsButton?.click();
    },
    onUpload: () => {
      setActiveTab('upload');
      // Trigger file input
      setTimeout(() => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fileInput?.click();
      }, 100);
    },
    onDocuments: () => {
      setActiveTab('documents');
    },
    onAnalytics: () => {
      setActiveTab('analytics');
    },
    onInsights: () => {
      setActiveTab('insights');
    },
    onHelp: () => {
      setShowOnboarding(true);
    },
    onToggleSidebar: () => {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    },
    // Tab navigation with arrow keys
    onNextTab: () => {
      const tabs: Array<'upload' | 'documents' | 'analytics' | 'insights'> = ['upload', 'documents', 'analytics', 'insights'];
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex] as 'upload' | 'documents' | 'analytics' | 'insights');
    },
    onPrevTab: () => {
      const tabs: Array<'upload' | 'documents' | 'analytics' | 'insights'> = ['upload', 'documents', 'analytics', 'insights'];
      const currentIndex = tabs.indexOf(activeTab);
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prevIndex] as 'upload' | 'documents' | 'analytics' | 'insights');
    }
  };

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(shortcutHandlers);

  // Check if first-time user
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    if (!hasVisitedBefore) {
      localStorage.setItem('hasVisitedBefore', 'true');
      setTimeout(() => {
        setShowOnboarding(true);
      }, 2000); // Show tour after 2 seconds
    }
  }, []);

  return(
      <div className="App">
        {/* Collapsible Sidebar */}
        <aside className={`side_menu ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="app-title">
              <h1>Legal Expert AI</h1>
              <p className="app-subtitle">Contract Advisor RAG</p>
            </div>
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title="Toggle sidebar (Ctrl+B)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
              </svg>
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="tab-container">
              <div className="tab-header">
                <button
                  className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upload')}
                  title="Upload documents (Ctrl+U)"
                >
                  <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="tab-label">Upload</span>
                  {activeTab === 'upload' && <div className="tab-indicator" />}
                </button>
                <button
                  className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveTab('documents')}
                  title="View documents (Ctrl+D)"
                >
                  <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="tab-label">Documents</span>
                  {activeTab === 'documents' && <div className="tab-indicator" />}
                </button>
                <button
                  className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setActiveTab('analytics')}
                  data-tab="analytics"
                  title="View analytics (Ctrl+A)"
                >
                  <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="tab-label">Analytics</span>
                  {activeTab === 'analytics' && <div className="tab-indicator" />}
                </button>
                <button
                  className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                  data-tab="insights"
                  title="View insights (Ctrl+I)"
                >
                  <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="tab-label">Insights</span>
                  {activeTab === 'insights' && <div className="tab-indicator" />}
                </button>
              </div>
              <div className="tab-content">
                {activeTab === 'upload' && <Upload />}
                {activeTab === 'documents' && <DocumentManager className="h-full" />}
                {activeTab === 'analytics' && <DocumentAnalyticsDashboard documents={[]} />}
                {activeTab === 'insights' && <DocumentInsights />}
              </div>
            </div>
          )}
        </aside>

        {/* Main Chat Area - Expanded when sidebar is collapsed */}
        <section className={`chat_box ${isSidebarCollapsed ? 'expanded' : ''}`} id="#chat">
          <Chat/>
        </section>

        {/* Mobile Floating Menu Button */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title="Toggle menu"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Onboarding Tour */}
        <OnboardingTour
          isActive={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />

        {/* Keyboard Shortcuts Hint */}
        <KeyboardShortcutsHint />

      </div>
  )
}

export default Home;