import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { UploadedDocument } from './DocumentManager';
import EnhancedDocumentInsights from './EnhancedDocumentInsights';

interface DocumentMetrics {
  riskScore: number;
  complianceScore: number;
  complexityScore: number;
  reviewStatus: 'pending' | 'in-progress' | 'completed';
  lastReviewed?: string;
  similarDocuments: number;
  keyClauses: number;
}

interface EnhancedDocumentManagerProps {
  className?: string;
  onDocumentSelect?: (document: UploadedDocument) => void;
  onDocumentDelete?: (documentId: string) => void;
}

const EnhancedDocumentManager: React.FC<EnhancedDocumentManagerProps> = ({
  className = "",
  onDocumentSelect,
  onDocumentDelete
}) => {
  const [documents, setDocuments] = useState<(UploadedDocument & { metrics?: DocumentMetrics })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'processed' | 'processing' | 'error'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'risk'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInsights, setShowInsights] = useState(false);

  // Load documents from localStorage
  useEffect(() => {
    const loadDocuments = () => {
      const savedDocs = localStorage.getItem('uploadedDocuments');
      if (savedDocs) {
        try {
          const parsedDocs = JSON.parse(savedDocs);
          const documentsWithMetrics = parsedDocs.map((doc: UploadedDocument) => ({
            ...doc,
            metrics: generateMockMetrics(doc)
          }));
          setDocuments(documentsWithMetrics);
        } catch (e) {
          console.error('Error loading documents:', e);
          setDocuments([]);
        }
      }
    };

    loadDocuments();
  }, []);

  // Generate mock metrics for documents
  const generateMockMetrics = (doc: UploadedDocument): DocumentMetrics => {
    return {
      riskScore: Math.floor(Math.random() * 10) + 1,
      complianceScore: Math.floor(Math.random() * 5) + 5,
      complexityScore: Math.floor(Math.random() * 10) + 1,
      reviewStatus: Math.random() > 0.7 ? 'completed' : Math.random() > 0.3 ? 'in-progress' : 'pending',
      lastReviewed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      similarDocuments: Math.floor(Math.random() * 5),
      keyClauses: Math.floor(Math.random() * 20) + 10
    };
  };

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

  const getScoreColor = (score: number, type: 'risk' | 'compliance' | 'complexity') => {
    if (type === 'risk') {
      if (score <= 3) return 'text-green-600 bg-green-100';
      if (score <= 7) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    } else {
      if (score >= 8) return 'text-green-600 bg-green-100';
      if (score >= 6) return 'text-yellow-600 bg-yellow-100';
      return 'text-red-600 bg-red-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <ClockIcon className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">PDF</div>;
      case 'docx':
      case 'doc':
        return <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">DOC</div>;
      case 'txt':
        return <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 text-sm font-bold">TXT</div>;
      default:
        return <DocumentTextIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || doc.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'date':
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        case 'size':
          return b.fileSize - a.fileSize;
        case 'risk':
          return (b.metrics?.riskScore || 0) - (a.metrics?.riskScore || 0);
        default:
          return 0;
      }
    });

  const handleDocumentClick = (document: UploadedDocument & { metrics?: DocumentMetrics }) => {
    setSelectedDocument(document);
    setShowInsights(true);
    onDocumentSelect?.(document);
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        setLoading(true);

        const updatedDocs = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocs);
        localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));

        onDocumentDelete?.(documentId);
      } catch (err) {
        setError('Failed to delete document. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (showInsights && selectedDocument) {
    return (
      <EnhancedDocumentInsights
        document={selectedDocument}
        onClose={() => setShowInsights(false)}
        onExport={() => console.log('Export analysis')}
        onShare={() => console.log('Share analysis')}
      />
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Document Manager</h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage and analyze your contract documents
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="processed">Processed</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="risk">Sort by Risk</option>
          </select>
        </div>
      </div>

      {/* Document Count */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedDocuments.length} of {documents.length} documents
          </p>

          {documents.length > 0 && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Processed: {documents.filter(d => d.status === 'processed').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Processing: {documents.filter(d => d.status === 'processing').length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Errors: {documents.filter(d => d.status === 'error').length}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {filteredAndSortedDocuments.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No documents found</h4>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started with AI-powered contract analysis.'
              }
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-4'
              }
            >
              {filteredAndSortedDocuments.map((document, index) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleDocumentClick(document)}
                  className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                    selectedDocument?.id === document.id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        {getFileIcon(document.fileName)}
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(document.status)}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                          {document.fileName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(document.fileSize)} • {formatDate(document.uploadDate)}
                        </p>
                      </div>

                      {document.metrics && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Risk</span>
                            <span className={`px-2 py-1 rounded-full font-medium ${getScoreColor(document.metrics.riskScore, 'risk')}`}>
                              {document.metrics.riskScore}/10
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Compliance</span>
                            <span className={`px-2 py-1 rounded-full font-medium ${getScoreColor(document.metrics.complianceScore, 'compliance')}`}>
                              {document.metrics.complianceScore}/10
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <TagIcon className="w-3 h-3" />
                          <span>{document.metrics?.keyClauses || 0} clauses</span>
                        </div>
                        <EyeIcon className="w-4 h-4 text-gray-400 hover:text-cyan-600" />
                      </div>
                    </div>
                  ) : (
                    /* List View */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        {getFileIcon(document.fileName)}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {document.fileName}
                            </h4>
                            {getStatusIcon(document.status)}
                          </div>

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{formatFileSize(document.fileSize)}</span>
                            <span>{formatDate(document.uploadDate)}</span>
                            {document.metrics && (
                              <>
                                <span>Risk: {document.metrics.riskScore}/10</span>
                                <span>Compliance: {document.metrics.complianceScore}/10</span>
                                <span>{document.metrics.keyClauses} clauses</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentClick(document);
                          }}
                          className="p-2 text-gray-400 hover:text-cyan-600 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentDelete(document.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default EnhancedDocumentManager;