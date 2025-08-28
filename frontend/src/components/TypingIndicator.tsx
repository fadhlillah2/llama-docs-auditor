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

export default TypingIndicator;

// Export types for use in other components
export type { TypingIndicatorProps };