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

  // Enhanced message content detection and rendering
  const detectContractTerms = (text: string): string[] => {
    const contractTerms = [
      'payment', 'terminate', 'confidential', 'liability', 'warranty', 'indemnify',
      'governing law', 'jurisdiction', 'force majeure', 'non-compete', 'non-disclosure',
      'arbitration', 'breach', 'remedy', 'consideration', 'obligation', 'representation'
    ];

    return contractTerms.filter(term =>
      text.toLowerCase().includes(term.toLowerCase())
    );
  };

  const extractSources = (text: string): Array<{page?: string, section?: string, text: string}> => {
    const sourcePatterns = [
      /page\s*(\d+)/gi,
      /section\s*(\d+(?:\.\d+)?)/gi,
      /paragraph\s*(\d+)/gi,
      /clause\s*(\d+)/gi,
      /article\s*(\d+)/gi
    ];

    const sources: Array<{page?: string, section?: string, text: string}> = [];

    sourcePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const matchText = match.trim();
          if (matchText.toLowerCase().includes('page')) {
            const page = matchText.match(/\d+/)?.[0];
            if (page) sources.push({ page, text: matchText });
          } else if (matchText.toLowerCase().includes('section')) {
            const section = matchText.match(/\d+(?:\.\d+)?/)?.[0];
            if (section) sources.push({ section, text: matchText });
          }
        });
      }
    });

    return sources;
  };

  const renderMessageContent = (): JSX.Element => {
    const hasMarkdown = hasMarkdownContent(message);
    const contractTerms = detectContractTerms(message);
    const sources = extractSources(message);

    // Use markdown rendering for AI responses that contain markdown-like content
    if (position === "left_bubble" && hasMarkdown) {
      return (
        <div className="space-y-3">
          <MarkdownRenderer
            content={message}
            className="ai-response-markdown"
          />

          {/* Contract Terms Highlight */}
          {contractTerms.length > 0 && (
            <div className="mt-3 p-3 bg-cyan-900/20 border border-cyan-700/30 rounded-lg">
              <p className="text-xs text-cyan-400 font-medium mb-2">
                🔍 Key Terms Identified:
              </p>
              <div className="flex flex-wrap gap-1">
                {contractTerms.map((term, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-cyan-800/50 text-cyan-300 text-xs rounded-full border border-cyan-600/50"
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source Citations */}
          {sources.length > 0 && (
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <p className="text-xs text-gray-400 font-medium mb-2">
                📍 Source References:
              </p>
              <div className="space-y-1">
                {sources.map((source, index) => (
                  <div key={index} className="text-xs text-gray-300 flex items-center space-x-2">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-cyan-400">
                      {source.page ? `Page ${source.page}` : source.section ? `Section ${source.section}` : 'Reference'}
                    </span>
                    <span className="text-gray-500">
                      {source.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Score (Mock for AI responses) */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <span>Confidence:</span>
              <div className="flex space-x-1">
                {[1,2,3,4,5].map((level) => (
                  <div
                    key={level}
                    className={`w-2 h-2 rounded-full ${
                      level <= 4 ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-400">(High)</span>
            </div>
            <span>AI-powered analysis</span>
          </div>
        </div>
      );
    }

    // Enhanced plain text formatting for user messages or simple AI responses
    return (
      <div>
        {formatPlainMessage(message)}

        {/* Show contract terms even for plain text */}
        {position === "left_bubble" && contractTerms.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1">
              {contractTerms.slice(0, 3).map((term, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full border border-gray-600"
                >
                  {term}
                </span>
              ))}
              {contractTerms.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{contractTerms.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-role={dataRole}
      className={`${messageClasses.container} group`}
      data-message-id={id}
      data-timestamp={timestamp}
    >
      <div className={`${messageClasses.bubble} relative transition-all duration-200 hover:shadow-lg`}>
        {/* Message Actions (hover) */}
        {position === "left_bubble" && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex space-x-1">
              <button
                className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                title="Copy message"
                onClick={() => navigator.clipboard.writeText(message)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                title="Good response"
                onClick={() => console.log('Thumbs up')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="text_message">
          {renderMessageContent()}
        </div>

        {/* Enhanced Timestamp with Status */}
        <div className="flex items-center justify-between mt-2">
          {timestamp && (
            <div className="message-timestamp text-xs opacity-50">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}

          {/* Message status indicators */}
          {position === "right_bubble" && (
            <div className="flex items-center space-x-1 text-xs opacity-50">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
              <span>Read</span>
            </div>
          )}

          {position === "left_bubble" && (
            <div className="flex items-center space-x-1 text-xs opacity-50">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>AI</span>
            </div>
          )}
        </div>
      </div>
      <div className="clear"></div>
    </div>
  );
}

export default Message;

// Named export for better TypeScript support
export type { MessageProps };