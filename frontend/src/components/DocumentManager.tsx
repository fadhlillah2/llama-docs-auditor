import React, { useState, useEffect } from 'react';
import { UploadProgressIndicator } from './LoadingSpinner';
import { ChatErrorMessage } from './ErrorDisplay';

interface UploadedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: 'processed' | 'processing' | 'error';
  sessionId?: string;
  fileType?: string; // Made optional to handle legacy data
}

interface DocumentManagerProps {
  className?: string;
  onDocumentSelect?: (document: UploadedDocument) => void;
  onDocumentDelete?: (documentId: string) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  className = "",
  onDocumentSelect,
  onDocumentDelete
}) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Mock data for demonstration - in real app this would come from API
  useEffect(() => {
    // Simulate loading documents from localStorage or API
    const loadDocuments = () => {
      const savedDocs = localStorage.getItem('uploadedDocuments');
      if (savedDocs) {
        try {
          const parsedDocs = JSON.parse(savedDocs);
          // Ensure all documents have required fields with defaults
          const normalizedDocs = parsedDocs.map((doc: any) => ({
            ...doc,
            fileType: doc.fileType || 'application/octet-stream',
            status: doc.status || 'processed',
            uploadDate: doc.uploadDate || new Date().toISOString()
          }));
          setDocuments(normalizedDocs);
        } catch (e) {
          console.error('Error loading documents:', e);
          setDocuments([]); // Reset to empty array on error
        }
      }
    };

    loadDocuments();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getFileIcon = (fileType?: string): JSX.Element => {
    const iconClass = "w-8 h-8";

    // Handle undefined fileType or provide default
    const safeFileType = fileType || '';

    if (safeFileType.includes('pdf')) {
      return (
        <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else if (safeFileType.includes('doc') || safeFileType.includes('word')) {
      return (
        <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (safeFileType.includes('text') || safeFileType.includes('txt')) {
      return (
        <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      );
    } else {
      // Default icon for unknown file types
      return (
        <svg className={`${iconClass} text-gray-500`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const getStatusBadge = (status: UploadedDocument['status']): JSX.Element => {
    switch (status) {
      case 'processed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Ready
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <svg className="w-3 h-3 mr-1 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Processing
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Error
          </span>
        );
      default:
        return <span className="text-gray-500">Unknown</span>;
    }
  };

  const handleDocumentSelect = (document: UploadedDocument) => {
    setSelectedDocument(document.id);
    onDocumentSelect?.(document);
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        
        // In a real app, this would be an API call
        // await deleteDocument(documentId);
        
        const updatedDocs = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocs);
        localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
        
        onDocumentDelete?.(documentId);
        
        if (selectedDocument === documentId) {
          setSelectedDocument(null);
        }
      } catch (err) {
        setError('Failed to delete document. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleReprocess = async (documentId: string) => {
    try {
      setIsLoading(true);
      
      // Update document status to processing
      const updatedDocs = documents.map(doc => 
        doc.id === documentId ? { ...doc, status: 'processing' as const } : doc
      );
      setDocuments(updatedDocs);
      
      // In a real app, this would trigger reprocessing via API
      // await reprocessDocument(documentId);
      
      // Simulate processing time
      setTimeout(() => {
        const finalDocs = documents.map(doc => 
          doc.id === documentId ? { ...doc, status: 'processed' as const } : doc
        );
        setDocuments(finalDocs);
        localStorage.setItem('uploadedDocuments', JSON.stringify(finalDocs));
        setIsLoading(false);
      }, 3000);
      
    } catch (err) {
      setError('Failed to reprocess document. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Document Management</h3>
        <p className="text-sm text-gray-500 mt-1">
          Manage your uploaded documents and chat sessions
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4">
            <ChatErrorMessage 
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h4>
            <p className="text-gray-500">Upload your first document to get started with AI-powered contract analysis.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div 
                key={document.id}
                className={`border rounded-lg p-4 transition-colors duration-200 ${
                  selectedDocument === document.id 
                    ? 'border-cyan-500 bg-cyan-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getFileIcon(document.fileType)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {document.fileName}
                        </h4>
                        {getStatusBadge(document.status)}
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Size: {formatFileSize(document.fileSize)}</p>
                        <p>Uploaded: {formatDate(document.uploadDate)}</p>
                        {document.sessionId && (
                          <p>Session ID: {document.sessionId.substring(0, 8)}...</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleDocumentSelect(document)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                      disabled={isLoading || document.status === 'processing'}
                    >
                      {selectedDocument === document.id ? 'Selected' : 'Select'}
                    </button>
                    
                    {document.status === 'error' && (
                      <button
                        onClick={() => handleReprocess(document.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-yellow-300 shadow-sm text-xs font-medium rounded text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        disabled={isLoading}
                      >
                        Retry
                      </button>
                    )}

                    <button
                      onClick={() => handleDocumentDelete(document.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {document.status === 'processing' && (
                  <div className="mt-3">
                    <UploadProgressIndicator 
                      fileName={document.fileName}
                      status="processing"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;

// Export types for use in other components
export type { UploadedDocument, DocumentManagerProps };