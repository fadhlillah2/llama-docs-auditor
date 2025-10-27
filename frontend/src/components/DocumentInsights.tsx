import React, { useState, useEffect } from 'react';
import DocumentAnalyticsDashboard from './DocumentAnalyticsDashboard';
import EnhancedDocumentInsights from './EnhancedDocumentInsights';

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: 'processed' | 'processing' | 'error';
  fileType?: string; // Made optional to handle legacy data
}

interface DocumentInsightsProps {
  documents?: Document[];
  className?: string;
}

interface DocumentAnalysis {
  riskScore: number;
  complianceScore: number;
  complexityScore: number;
  keyClauses: Array<{
    type: string;
    count: number;
    examples: string[];
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    text: string;
    category: string;
  }>;
  summary: string;
}

const DocumentInsights: React.FC<DocumentInsightsProps> = ({ documents = [], className = '' }) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'detailed'>('dashboard');

  // Load documents from localStorage if no documents passed
  useEffect(() => {
    if (documents.length === 0) {
      const savedDocs = localStorage.getItem('uploadedDocuments');
      if (savedDocs) {
        try {
          const parsedDocs = JSON.parse(savedDocs);
          if (parsedDocs.length > 0 && !selectedDocument) {
            setSelectedDocument(parsedDocs[0]);
          }
        } catch (e) {
          console.error('Error loading documents:', e);
        }
      }
    } else if (documents.length > 0 && !selectedDocument) {
      setSelectedDocument(documents[0]);
    }
  }, [documents, selectedDocument]);

  useEffect(() => {
    if (selectedDocument) {
      loadDocumentAnalysis(selectedDocument);
    }
  }, [selectedDocument]);

  const loadDocumentAnalysis = (doc: Document) => {
    setLoading(true);
    setError(null);

    // Mock analysis data
    setTimeout(() => {
      const mockAnalysis: DocumentAnalysis = {
        riskScore: 7.2,
        complianceScore: 8.5,
        complexityScore: 6.8,
        keyClauses: [
          {
            type: 'Payment Terms',
            count: 4,
            examples: ['Payment schedule', 'Late fees', 'Method of payment', 'Currency']
          },
          {
            type: 'Termination',
            count: 3,
            examples: ['Termination for convenience', 'Termination for cause', 'Notice period']
          },
          {
            type: 'Liability',
            count: 5,
            examples: ['Limitation of liability', 'Indemnification', 'Force majeure', 'Warranty disclaimer', 'Insurance requirements']
          },
          {
            type: 'Confidentiality',
            count: 2,
            examples: ['Confidential information definition', 'Obligations of confidentiality']
          }
        ],
        recommendations: [
          {
            priority: 'high',
            text: 'Consider adding a specific force majeure clause to address unforeseen circumstances',
            category: 'Risk Management'
          },
          {
            priority: 'medium',
            text: 'Clarify payment terms to include specific due dates and late payment penalties',
            category: 'Payment Terms'
          },
          {
            priority: 'medium',
            text: 'Review liability limitations to ensure they are reasonable and enforceable',
            category: 'Legal Compliance'
          },
          {
            priority: 'low',
            text: 'Consider adding dispute resolution clause specifying mediation before litigation',
            category: 'Dispute Resolution'
          }
        ],
        summary: 'This document appears to be a standard service agreement with moderate complexity. It contains most essential clauses but could benefit from additional specificity in payment terms and risk allocation provisions.'
      };

      setAnalysis(mockAnalysis);
      setLoading(false);
    }, 1500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Low';
    if (score >= 6) return 'Medium';
    return 'High';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-900/50 border-red-700 text-red-300';
      case 'medium': return 'bg-yellow-900/50 border-yellow-700 text-yellow-300';
      case 'low': return 'bg-green-900/50 border-green-700 text-green-300';
      default: return 'bg-gray-700 border-gray-600 text-gray-300';
    }
  };

  if (documents.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No documents available for analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">📈 Document Insights</h3>

      {/* Document Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Document:
        </label>
        <select
          value={selectedDocument?.id || ''}
          onChange={(e) => {
            const doc = documents.find(d => d.id === e.target.value);
            if (doc) setSelectedDocument(doc);
          }}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-cyan-500 focus:outline-none"
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.fileName}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-400">Analyzing document...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-6">
          {/* Scores Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${getScoreColor(analysis.riskScore)}`}>
                {analysis.riskScore}/10
              </div>
              <div className="text-sm text-gray-400">Risk Level</div>
              <div className={`text-xs ${getScoreColor(analysis.riskScore)}`}>
                {getScoreLabel(analysis.riskScore)} Risk
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${getScoreColor(analysis.complianceScore)}`}>
                {analysis.complianceScore}/10
              </div>
              <div className="text-sm text-gray-400">Compliance Score</div>
              <div className={`text-xs ${getScoreColor(analysis.complianceScore)}`}>
                {getScoreLabel(analysis.complianceScore)} Issues
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${getScoreColor(analysis.complexityScore)}`}>
                {analysis.complexityScore}/10
              </div>
              <div className="text-sm text-gray-400">Complexity</div>
              <div className={`text-xs ${getScoreColor(analysis.complexityScore)}`}>
                {getScoreLabel(10 - analysis.complexityScore)} Complexity
              </div>
            </div>
          </div>

          {/* Key Clauses */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">🔍 Key Clauses Identified</h4>
            <div className="space-y-3">
              {analysis.keyClauses.map((clause, index) => (
                <div key={index} className="border-l-2 border-cyan-500 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-cyan-400">{clause.type}</span>
                    <span className="text-xs text-gray-400">{clause.count} instances</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {clause.examples.map((example, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">📝 Document Summary</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Recommendations */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">💡 Recommendations</h4>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium uppercase">{rec.priority} Priority</span>
                    <span className="text-xs opacity-75">{rec.category}</span>
                  </div>
                  <p className="text-sm">{rec.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-600">
            <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors">
              📤 Export Analysis
            </button>
            <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
              🔍 Deep Analysis
            </button>
            <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors">
              📊 Compare Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentInsights;