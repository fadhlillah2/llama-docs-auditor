import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  CpuChipIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ProgressStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
}

interface EnhancedProgressIndicatorProps {
  isActive: boolean;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  onError?: (error: string) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

const EnhancedProgressIndicator: React.FC<EnhancedProgressIndicatorProps> = ({
  isActive,
  fileName = 'Document',
  fileType = 'PDF',
  fileSize,
  onError,
  onComplete,
  onCancel
}) => {
  const [stages, setStages] = useState<ProgressStage[]>([
    {
      id: 'upload',
      name: 'Upload Document',
      description: 'Securingly uploading your file to encrypted storage',
      icon: <CloudArrowUpIcon className="w-5 h-5" />,
      estimatedTime: '2-5 seconds',
      status: 'pending',
      progress: 0
    },
    {
      id: 'extract',
      name: 'Extract Content',
      description: 'Parsing text and analyzing document structure',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      estimatedTime: '3-8 seconds',
      status: 'pending',
      progress: 0
    },
    {
      id: 'chunk',
      name: 'Smart Chunking',
      description: 'Breaking document into intelligent segments for analysis',
      icon: <CpuChipIcon className="w-5 h-5" />,
      estimatedTime: '2-5 seconds',
      status: 'pending',
      progress: 0
    },
    {
      id: 'embed',
      name: 'Generate Embeddings',
      description: 'Creating AI-powered understanding of document content',
      icon: <CpuChipIcon className="w-5 h-5" />,
      estimatedTime: '5-12 seconds',
      status: 'pending',
      progress: 0
    },
    {
      id: 'index',
      name: 'Vector Database',
      description: 'Indexing content for instant semantic search',
      icon: <CpuChipIcon className="w-5 h-5" />,
      estimatedTime: '3-7 seconds',
      status: 'pending',
      progress: 0
    },
    {
      id: 'ready',
      name: 'Ready for Chat',
      description: 'Document is ready - Start asking questions!',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      estimatedTime: 'Completed',
      status: 'pending',
      progress: 0
    }
  ]);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(30);

  // Simulate progress when active
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  // Progress simulation logic
  useEffect(() => {
    if (!isActive) return;

    const progressInterval = setInterval(() => {
      setStages(prevStages => {
        const newStages = [...prevStages];
        let currentIdx = newStages.findIndex(stage => stage.status === 'in-progress');

        if (currentIdx === -1 && newStages[0].status === 'pending') {
          currentIdx = 0;
          newStages[0].status = 'in-progress';
        }

        if (currentIdx !== -1) {
          const currentStage = newStages[currentIdx];
          // Smoother, more realistic progress increments
          let increment;
          if (currentStage.id === 'extract' || currentStage.id === 'chunk') {
            increment = Math.random() * 20 + 10; // 10-30% for faster stages
          } else if (currentStage.id === 'embed' || currentStage.id === 'index') {
            increment = Math.random() * 8 + 3; // 3-11% for slower AI stages
          } else {
            increment = Math.random() * 15 + 8; // 8-23% default
          }
          currentStage.progress = Math.min(currentStage.progress + increment, 100);

          if (currentStage.progress >= 100) {
            currentStage.status = 'completed';
            currentStage.progress = 100;

            if (currentIdx < newStages.length - 1) {
              newStages[currentIdx + 1].status = 'in-progress';
              setCurrentStageIndex(currentIdx + 1);
            } else {
              // All stages completed
              onComplete?.();
            }
          }

          // Calculate overall progress
          const totalProgress = newStages.reduce((sum, stage) => sum + stage.progress, 0);
          setOverallProgress(Math.round(totalProgress / newStages.length));
        }

        return newStages;
      });
    }, 800);

    return () => clearInterval(progressInterval);
  }, [isActive, onComplete]);

  // Update estimated time remaining
  useEffect(() => {
    if (!isActive || currentStageIndex >= stages.length - 1) {
      setEstimatedTimeRemaining(0);
      return;
    }

    const remainingStages = stages.slice(currentStageIndex + 1);
    const estimatedSeconds = remainingStages.reduce((total, stage) => {
      const [min, max] = stage.estimatedTime.match(/\d+/g)?.map(Number) || [5, 10];
      return total + (min + max) / 2;
    }, 0);

    setEstimatedTimeRemaining(Math.round(estimatedSeconds - timeElapsed));
  }, [currentStageIndex, stages, timeElapsed, isActive]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStageColor = (status: ProgressStage['status']) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'in-progress': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getProgressBarColor = (status: ProgressStage['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-cyan-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-600';
    }
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-700"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">
                Processing Document
              </h3>
              <p className="text-sm text-gray-400">
                {fileName} • {fileType} {fileSize && `• ${fileSize}`}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-cyan-400 font-medium">{overallProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Time Estimates */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-400">Time elapsed: {formatTime(timeElapsed)}</span>
            {estimatedTimeRemaining > 0 && (
              <span className="text-cyan-400">
                ~{formatTime(estimatedTimeRemaining)} remaining
              </span>
            )}
          </div>
        </div>

        {/* Stages */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                p-4 rounded-lg border transition-all duration-300
                ${getStageColor(stage.status)}
              `}
            >
              <div className="flex items-start space-x-3">
                <div className={`
                  p-2 rounded-lg
                  ${stage.status === 'in-progress' ? 'animate-pulse' : ''}
                `}>
                  {stage.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{stage.name}</h4>
                    <span className="text-xs text-gray-400">{stage.estimatedTime}</span>
                  </div>

                  <p className="text-sm text-gray-300 mb-3">{stage.description}</p>

                  {/* Stage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-gray-300">{Math.round(stage.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-600/50 rounded-full h-1.5">
                      <motion.div
                        className={`h-1.5 rounded-full ${getProgressBarColor(stage.status)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Icon */}
                <div className="ml-3">
                  {stage.status === 'completed' && (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  )}
                  {stage.status === 'in-progress' && (
                    <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {stage.status === 'error' && (
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900/50 border-t border-gray-700">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span>AI Processing in Progress</span>
            <span>•</span>
            <span>Powered by Groq Llama 3.3</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedProgressIndicator;