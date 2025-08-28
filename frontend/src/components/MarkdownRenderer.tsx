import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "" 
}) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Customize heading styles
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-200">
              {children}
            </h3>
          ),
          
          // Customize paragraph styles
          p: ({ children }) => (
            <p className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
              {children}
            </p>
          ),
          
          // Customize list styles
          ul: ({ children }) => (
            <ul className="mb-3 ml-4 list-disc list-inside text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-4 list-decimal list-inside text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          
          // Customize blockquote styles
          blockquote: ({ children }) => (
            <blockquote className="mb-3 pl-4 border-l-4 border-cyan-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-r-md">
              <div className="text-gray-600 dark:text-gray-400 italic">
                {children}
              </div>
            </blockquote>
          ),
          
          // Customize code styles
          code: ({ inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            return !inline ? (
              <div className="mb-3">
                <div className="bg-gray-900 rounded-t-md px-3 py-1 text-xs text-gray-300 font-mono border-b border-gray-700">
                  {language || 'code'}
                </div>
                <pre className="bg-gray-800 rounded-b-md p-3 overflow-x-auto">
                  <code className={`language-${language} text-sm text-gray-100`} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props}>
                {children}
              </code>
            );
          },
          
          // Customize table styles
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-700">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          
          // Customize link styles
          a: ({ children, href }) => (
            <a 
              href={href} 
              className="text-cyan-600 hover:text-cyan-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          
          // Customize horizontal rule
          hr: () => (
            <hr className="my-4 border-gray-300 dark:border-gray-600" />
          ),
          
          // Customize strong/bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          
          // Customize emphasis/italic text
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          )
        }}
      >
        {content}
      </ReactMarkdown>
      
      <style jsx global>{`
        .markdown-content {
          line-height: 1.6;
        }
        
        .markdown-content pre {
          font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
        }
        
        .markdown-content code {
          font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
        }
        
        /* Syntax highlighting styles */
        .hljs {
          background: #1f2937 !important;
          color: #f9fafb;
        }
        
        .hljs-keyword {
          color: #8b5cf6;
        }
        
        .hljs-string {
          color: #10b981;
        }
        
        .hljs-number {
          color: #f59e0b;
        }
        
        .hljs-comment {
          color: #6b7280;
          font-style: italic;
        }
        
        .hljs-function {
          color: #3b82f6;
        }
        
        .hljs-variable {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

export default MarkdownRenderer;

// Export types for use in other components
export type { MarkdownRendererProps };