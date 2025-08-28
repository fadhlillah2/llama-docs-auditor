import React from "react";
import MarkdownRenderer from "./MarkdownRenderer";

// TypeScript interface for Message component props
interface MessageProps {
  position: 'left_bubble' | 'right_bubble';
  message: string;
  timestamp?: string;
  id?: string;
  className?: string;
}

// TypeScript interface for styling
interface MessageClasses {
  container: string;
  bubble: string;
}

function Message({ 
  position, 
  message, 
  timestamp, 
  id, 
  className = "" 
}: MessageProps): JSX.Element {
  
  // Determine the data role based on position
  const dataRole: 'ASSISTANT' | 'USER' = position === "left_bubble" ? "ASSISTANT" : "USER";
  
  // Build CSS classes
  const messageClasses: MessageClasses = {
    container: `bubble-container ${className}`.trim(),
    bubble: `chat-bubble ${position}`
  };

  // Sanitize message by removing HTML tags (basic XSS prevention)
  const sanitizeMessage = (text: string): string => {
    return text.replace(/<\/?[^>]+(>|$)/g, "");
  };

  // Format message with proper line breaks for user messages
  const formatPlainMessage = (text: string): JSX.Element => {
    const sanitized = sanitizeMessage(text);
    const lines = sanitized.split('\n');
    
    if (lines.length === 1) {
      return <>{sanitized}</>;
    }
    
    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  };

  // Check if message contains markdown-like content
  const hasMarkdownContent = (text: string): boolean => {
    const markdownPatterns = [
      /#{1,6}\s/,           // Headers
      /\*\*.*?\*\*/,        // Bold
      /\*.*?\*/,            // Italic
      /`.*?`/,              // Inline code
      /```[\s\S]*?```/,     // Code blocks
      /^\s*[-*+]\s/m,       // Unordered lists
      /^\s*\d+\.\s/m,       // Ordered lists
      /\[.*?\]\(.*?\)/,     // Links
      /^\s*>/m,             // Blockquotes
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  };

  // Render message content based on position and content type
  const renderMessageContent = (): JSX.Element => {
    // Use markdown rendering for AI responses that contain markdown-like content
    if (position === "left_bubble" && hasMarkdownContent(message)) {
      return (
        <MarkdownRenderer 
          content={message}
          className="ai-response-markdown"
        />
      );
    }
    
    // Use plain text formatting for user messages or simple AI responses
    return <>{formatPlainMessage(message)}</>;
  };

  return (
    <div 
      data-role={dataRole} 
      className={messageClasses.container}
      data-message-id={id}
      data-timestamp={timestamp}
    >
      <div className={messageClasses.bubble}>
        <div className="text_message">
          {renderMessageContent()}
        </div>
        {timestamp && (
          <div className="message-timestamp text-xs opacity-50 mt-1">
            {new Date(timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        )}
      </div>
      <div className="clear"></div>
    </div>
  );
}

export default Message;

// Named export for better TypeScript support
export type { MessageProps };