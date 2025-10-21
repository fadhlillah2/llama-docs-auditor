import React from 'react';

interface TypingIndicatorProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dots' | 'bars' | 'wave';
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  message = "AI is thinking",
  size = 'md',
  variant = 'dots',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5', 
    lg: 'w-2 h-2'
  };

  const containerSizeClasses = {
    sm: 'space-x-1',
    md: 'space-x-1.5',
    lg: 'space-x-2'
  };

  const renderTypingAnimation = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex items-center ${containerSizeClasses[size]}`}>
            <div className={`${sizeClasses[size]} bg-gray-400 rounded-full animate-pulse`} style={{ animationDelay: '0s', animationDuration: '1.2s' }} />
            <div className={`${sizeClasses[size]} bg-gray-400 rounded-full animate-pulse`} style={{ animationDelay: '0.2s', animationDuration: '1.2s' }} />
            <div className={`${sizeClasses[size]} bg-gray-400 rounded-full animate-pulse`} style={{ animationDelay: '0.4s', animationDuration: '1.2s' }} />
          </div>
        );

      case 'bars':
        return (
          <div className={`flex items-end ${containerSizeClasses[size]}`}>
            <div className={`w-0.5 bg-gray-400 rounded-full animate-pulse`} style={{ height: '4px', animationDelay: '0s' }} />
            <div className={`w-0.5 bg-gray-400 rounded-full animate-pulse`} style={{ height: '8px', animationDelay: '0.15s' }} />
            <div className={`w-0.5 bg-gray-400 rounded-full animate-pulse`} style={{ height: '6px', animationDelay: '0.3s' }} />
            <div className={`w-0.5 bg-gray-400 rounded-full animate-pulse`} style={{ height: '10px', animationDelay: '0.45s' }} />
            <div className={`w-0.5 bg-gray-400 rounded-full animate-pulse`} style={{ height: '4px', animationDelay: '0.6s' }} />
          </div>
        );

      case 'wave':
        return (
          <div className={`flex items-center ${containerSizeClasses[size]}`}>
            <div className={`${sizeClasses[size]} bg-gray-400 rounded-full animate-bounce`} style={{ animationDelay: '0s' }} />
            <div className={`${sizeClasses[size]} bg-gray-400 rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }} />
            <div className={`${sizeClasses[size]} bg-gray-400 rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }} />
          </div>
        );

      default:
        return renderTypingAnimation();
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {renderTypingAnimation()}
      <span className="text-sm text-gray-500 animate-pulse font-medium">
        {message}...
      </span>
    </div>
  );
};

// Chat-specific typing indicator that matches the chat bubble style
export const ChatTypingIndicator: React.FC = () => (
  <div className="bubble-container">
    <div className="chat-bubble left_bubble bg-gray-100 border border-gray-200">
      <div className="text_message">
        <TypingIndicator 
          message="AI is typing"
          size="sm"
          variant="dots"
          className="py-1"
        />
      </div>
    </div>
    <div className="clear"></div>
  </div>
);

// Inline typing indicator for status displays
export const InlineTypingIndicator: React.FC<{ message?: string }> = ({ 
  message = "Processing" 
}) => (
  <div className="inline-flex items-center space-x-2">
    <TypingIndicator 
      message={message}
      size="sm"
      variant="dots"
    />
  </div>
);

// Advanced typing indicator with typewriter effect
export const TypewriterIndicator: React.FC<{
  text: string;
  speed?: number;
  className?: string;
}> = ({ text, speed = 100, className = "" }) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isTyping, setIsTyping] = React.useState(true);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [currentIndex, text, speed]);

  React.useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
    setIsTyping(true);
  }, [text]);

  return (
    <div className={`font-mono ${className}`}>
      <span>{displayText}</span>
      {isTyping && (
        <span className="animate-pulse ml-1 text-gray-500">|</span>
      )}
    </div>
  );
};

// Enhanced chat typing indicator with context and progress
export const EnhancedChatTypingIndicator: React.FC<{
  stage?: 'analyzing' | 'retrieving' | 'generating' | 'finalizing';
  progress?: number;
  message?: string;
}> = ({ stage = 'analyzing', progress = 0, message }) => {
  const stageConfig = {
    analyzing: {
      icon: '🔍',
      label: 'Analyzing query',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700/30'
    },
    retrieving: {
      icon: '📚',
      label: 'Retrieving documents',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/20',
      borderColor: 'border-cyan-700/30'
    },
    generating: {
      icon: '🧠',
      label: 'Generating response',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-700/30'
    },
    finalizing: {
      icon: '✨',
      label: 'Finalizing answer',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700/30'
    }
  };

  const config = stageConfig[stage];

  return (
    <div className="bubble-container">
      <div className="chat-bubble left_bubble bg-gray-800 border border-gray-700">
        <div className="space-y-3">
          {/* Stage indicator */}
          <div className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {message || 'AI is processing your request...'}
                </p>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>

          {/* Processing steps indicator */}
          <div className="space-y-2">
            {Object.entries(stageConfig).map(([key, cfg], index) => {
              const isCurrentStage = key === stage;
              const isCompleted = index < Object.keys(stageConfig).indexOf(stage);

              return (
                <div key={key} className="flex items-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    isCompleted ? 'bg-green-500' : isCurrentStage ? 'bg-cyan-500 animate-pulse' : 'bg-gray-600'
                  }`} />
                  <span className={`${
                    isCompleted ? 'text-green-400' : isCurrentStage ? 'text-cyan-400' : 'text-gray-500'
                  }`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="clear"></div>
    </div>
  );
};

// Mini progress indicator for inline use
export const MiniProgressIndicator: React.FC<{
  active?: boolean;
  message?: string;
  size?: 'sm' | 'md';
}> = ({ active = true, message = 'Processing', size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  };

  return (
    <div className="inline-flex items-center space-x-2">
      {active && (
        <svg className={`animate-spin ${sizeClasses[size]} text-cyan-500`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      <span className="text-xs text-gray-400 animate-pulse">
        {message}...
      </span>
    </div>
  );
};

export default TypingIndicator;

// Export types for use in other components
export type { TypingIndicatorProps };