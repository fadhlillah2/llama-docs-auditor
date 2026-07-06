import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  position?: 'top' | 'bottom' | 'center';
  action?: () => void;
  imageUrl?: string;
  customClass?: string;
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  forceShow?: boolean;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  forceShow = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);

  const tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: '👋 Welcome to Contract Advisor RAG!',
      content: `Let's take a quick tour to help you get the most out of our AI-powered contract analysis system.

This guided tour will show you how to:
• Upload and analyze your documents
• Chat with your contracts using AI
• View detailed analytics and insights

Ready to transform how you review contracts?`,
      position: 'center',
      customClass: 'welcome-modal',
      action: () => {
        // Highlight upload area
        const uploadArea = document.querySelector('#about');
        if (uploadArea) {
          uploadArea.classList.add('tour-highlight');
          uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    {
      id: 'upload',
      title: '📁 Upload Your Documents',
      content: `Start by uploading your contract documents here.

What you can do:
• Drag & drop files directly
• Click to browse your files
• Upload multiple documents at once
• Supports PDF, DOCX, DOC, and TXT files

Our AI will process your documents and make them ready for intelligent analysis.`,
      target: '#about',
      position: 'top',
      action: () => {
        const uploadArea = document.querySelector('#about');
        if (uploadArea) {
          uploadArea.classList.remove('tour-highlight');
        }
        // Highlight chat button
        const chatButton = document.querySelector('.blantershow-chat');
        if (chatButton) {
          chatButton.classList.add('tour-highlight');
          chatButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    {
      id: 'chat',
      title: '💬 Chat with Your Documents',
      content: `Once your document is processed, you can ask questions about it!

Try questions like:
• "What are the payment terms?"
• "When can this contract be terminated?"
• "What are the liability limitations?"
• "Is this contract compliant with regulations?"

The AI provides accurate answers based on your actual document content.`,
      target: '.blantershow-chat',
      position: 'top',
      action: () => {
        const chatButton = document.querySelector('.blantershow-chat');
        if (chatButton) {
          chatButton.classList.remove('tour-highlight');
        }
        // Highlight analytics tab
        const analyticsTab = document.querySelector('[data-tab="analytics"]');
        if (analyticsTab) {
          analyticsTab.classList.add('tour-highlight');
          analyticsTab.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    {
      id: 'analytics',
      title: '📊 View Analytics & Insights',
      content: `Get comprehensive insights about your documents:

• Document statistics and metrics
• Risk distribution analysis
• Compliance scoring
• Clause categorization
• Monthly activity tracking

These analytics help you understand your documents at a glance!`,
      target: '[data-tab="analytics"]',
      position: 'bottom',
      action: () => {
        const analyticsTab = document.querySelector('[data-tab="analytics"]');
        if (analyticsTab) {
          analyticsTab.classList.remove('tour-highlight');
        }
        // Highlight insights tab
        const insightsTab = document.querySelector('[data-tab="insights"]');
        if (insightsTab) {
          insightsTab.classList.add('tour-highlight');
          insightsTab.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    {
      id: 'insights',
      title: '🔍 Deep Document Analysis',
      content: `Get detailed analysis with actionable insights:

• Risk assessments and recommendations
• Compliance checks
• Key clause identification
• Financial term analysis
• Contract summaries

Save hours of manual review with AI-powered analysis!`,
      target: '[data-tab="insights"]',
      position: 'bottom',
      action: () => {
        // Clean up all highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
          el.classList.remove('tour-highlight');
        });
      }
    },
    {
      id: 'mobile',
      title: '📱 Available on Mobile Too!',
      content: `Take your contract analysis anywhere:

• Full-screen mobile chat interface
• Touch-optimized controls
• Swipe gestures for navigation
• Progress indicators on the go

Works perfectly on your phone and tablet!`,
      position: 'center',
      customClass: 'mobile-info-modal'
    },
    {
      id: 'tips',
      title: '💡 Pro Tips',
      content: `Get the best results with these tips:

✅ Use specific, clear questions
✅ Upload high-quality documents
✅ Ask follow-up questions for details
✅ Review the AI-provided sources
✅ Use analytics to track document patterns

Need help? Look for the help icons (❓) throughout the app!`,
      position: 'center',
      customClass: 'tips-modal'
    },
    {
      id: 'complete',
      title: '🎉 You\'re All Set!',
      content: `Congratulations! You've completed the onboarding tour.

You now have everything you need to:
• Upload and analyze contracts efficiently
• Get instant AI-powered insights
• Make informed decisions faster

Ready to start? Upload your first document and begin your AI-powered contract analysis journey!`,
      position: 'center',
      customClass: 'completion-modal'
    }
  ];

  // Check if user has already seen the tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    const shouldShowTour = isActive && (!hasSeenTour || forceShow);

    if (shouldShowTour) {
      setIsTourActive(true);
      setTimeout(() => startTour(), 1000);
    }
  }, [isActive, forceShow]);

  const startTour = () => {
    showStep(0);
  };

  const showStep = (stepIndex: number) => {
    if (stepIndex >= tourSteps.length) {
      completeTour();
      return;
    }

    const step = tourSteps[stepIndex];
    setCurrentStep(stepIndex);

    // Execute step action if available
    if (step.action) {
      step.action();
    }

    const baseConfig = {
      title: step.title,
      html: `
        <div class="onboarding-content">
          <div class="onboarding-icon">
            ${getStepIcon(step.id)}
          </div>
          <div class="onboarding-text">
            ${step.content}
          </div>
          <div class="onboarding-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${((stepIndex + 1) / tourSteps.length) * 100}%"></div>
            </div>
            <span class="progress-text">Step ${stepIndex + 1} of ${tourSteps.length}</span>
          </div>
        </div>
      `,
      showConfirmButton: stepIndex < tourSteps.length - 1,
      showCancelButton: true,
      confirmButtonText: stepIndex < tourSteps.length - 1 ? 'Next' : 'Get Started!',
      cancelButtonText: stepIndex === 0 ? 'Skip Tour' : 'End Tour',
      confirmButtonColor: '#06b6d4',
      cancelButtonColor: '#6b7280',
      customClass: `onboarding-modal ${step.customClass || ''}`,
      showCloseButton: false,
      allowOutsideClick: false,
      allowEscapeKey: true,
      didOpen: () => {
        // Add custom styles
        const style = document.createElement('style');
        style.textContent = `
          .onboarding-content {
            text-align: center;
            padding: 20px;
          }
          .onboarding-icon {
            font-size: 48px;
            margin-bottom: 20px;
            animation: bounce 2s infinite;
          }
          .onboarding-text {
            font-size: 16px;
            line-height: 1.6;
            color: #374151;
            margin-bottom: 20px;
            white-space: pre-line;
          }
          .onboarding-progress {
            margin-top: 20px;
          }
          .progress-bar {
            width: 100%;
            height: 6px;
            background-color: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #06b6d4, #3b82f6);
            transition: width 0.3s ease;
          }
          .progress-text {
            font-size: 12px;
            color: #6b7280;
          }
          .tour-highlight {
            box-shadow: 0 0 0 4px #06b6d4, 0 0 20px rgba(6, 182, 212, 0.4);
            border-radius: 8px;
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 4px #06b6d4, 0 0 20px rgba(6, 182, 212, 0.4); }
            50% { box-shadow: 0 0 0 8px #06b6d4, 0 0 30px rgba(6, 182, 212, 0.6); }
            100% { box-shadow: 0 0 0 4px #06b6d4, 0 0 20px rgba(6, 182, 212, 0.4); }
          }
          .welcome-modal .swal2-popup {
            max-width: 500px;
          }
          .completion-modal .swal2-popup {
            max-width: 450px;
          }
          .mobile-info-modal .swal2-popup {
            max-width: 400px;
          }
          .tips-modal .swal2-popup {
            max-width: 500px;
          }
        `;
        document.head.appendChild(style);
      },
      willClose: () => {
        // Clean up highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
          el.classList.remove('tour-highlight');
        });
      }
    };

    if (stepIndex === tourSteps.length - 1) {
      // Last step - completion
      Swal.fire({
        ...baseConfig,
        icon: 'success',
        iconHtml: '<div style="font-size: 48px;">🎉</div>'
      }).then((result) => {
        if (result.isConfirmed) {
          completeTour();
        }
      });
    } else {
      // Regular steps
      Swal.fire(baseConfig).then((result) => {
        if (result.isConfirmed) {
          showStep(stepIndex + 1);
        } else if (result.isDismissed) {
          endTour();
        }
      });
    }
  };

  const getStepIcon = (stepId: string): string => {
    const icons = {
      welcome: '👋',
      upload: '📁',
      chat: '💬',
      analytics: '📊',
      insights: '🔍',
      mobile: '📱',
      tips: '💡',
      complete: '🎉'
    };
    return icons[stepId as keyof typeof icons] || '📄';
  };

  const completeTour = () => {
    localStorage.setItem('hasSeenOnboardingTour', 'true');
    setIsTourActive(false);
    onComplete?.();

    // Show completion message
    Swal.fire({
      title: 'Tour Completed!',
      text: 'You can always access the tour again from the help menu.',
      icon: 'success',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const endTour = () => {
    setIsTourActive(false);
    onSkip?.();
  };

  const restartTour = () => {
    localStorage.removeItem('hasSeenOnboardingTour');
    setIsTourActive(true);
    startTour();
  };

  // Add restart tour functionality to help menu
  useEffect(() => {
    if (isTourActive) {
      // Add a restart tour button to help menu if it exists
      const helpMenu = document.querySelector('.help-menu');
      if (helpMenu) {
        const restartButton = document.createElement('button');
        restartButton.innerHTML = '🔄 Restart Tour';
        restartButton.className = 'restart-tour-btn';
        restartButton.onclick = restartTour;
        helpMenu.appendChild(restartButton);
      }
    }
  }, [isTourActive]);

  return null; // This component doesn't render anything directly
};

export default OnboardingTour;