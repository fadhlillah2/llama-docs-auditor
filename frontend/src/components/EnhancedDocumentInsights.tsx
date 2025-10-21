import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserGroupIcon,
  ScaleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ChartBarIcon,
  EyeIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface ClauseAnalysis {
  id: string;
  type: string;
  title: string;
  content: string;
  riskLevel: 'low' | 'medium' | 'high';
  importance: number;
  location: string;
  suggestions: string[];
}

interface ComplianceIssue {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  location: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface FinancialTerm {
  id: string;
  type: 'payment' | 'penalty' | 'fee' | 'discount';
  amount?: string;
  currency?: string;
  frequency?: string;
  conditions: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface DocumentAnalysis {
  documentId: string;
  documentName: string;
  overallScore: number;
  riskScore: number;
  complianceScore: number;
  complexityScore: number;
  summary: string;
  keyPoints: string[];
  clauses: ClauseAnalysis[];
  complianceIssues: ComplianceIssue[];
  financialTerms: FinancialTerm[];
  parties: string[];
  effectiveDate: string;
  expirationDate?: string;
  governingLaw: string;
  jurisdiction: string;
  estimatedReviewTime: number;
  similarDocuments: string[];
}

interface EnhancedDocumentInsightsProps {
  document: any;
  onClose?: () => void;
  onExport?: () => void;
  onShare?: () => void;
}

const EnhancedDocumentInsights: React.FC<EnhancedDocumentInsightsProps> = ({
  document,
  onClose,
  onExport,
  onShare
}) => {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'clauses' | 'compliance' | 'financial' | 'timeline'>('overview');
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());

  // Mock analysis data
  useEffect(() => {
    const loadAnalysis = async () => {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockAnalysis: DocumentAnalysis = {
        documentId: document.id,
        documentName: document.fileName,
        overallScore: 85,
        riskScore: 65,
        complianceScore: 90,
        complexityScore: 75,
        summary: "This is a comprehensive service agreement between TechCorp Inc. and Global Solutions Ltd. The contract outlines software development services, payment terms, intellectual property rights, and confidentiality obligations. Key areas include project deliverables, acceptance criteria, and termination clauses.",
        keyPoints: [
          "12-month service agreement with monthly deliverables",
          "Total contract value: $250,000 paid in monthly installments",
          "Intellectual property rights remain with client upon full payment",
          "30-day termination notice period for convenience",
          "Strict confidentiality obligations with 5-year post-termination duration",
          "Governing law: State of California"
        ],
        clauses: [
          {
            id: '1',
            type: 'Payment Terms',
            title: 'Payment Schedule and Terms',
            content: 'Client shall pay Contractor $20,833.33 per month within 15 days of invoice date. Late payments shall incur 1.5% monthly interest.',
            riskLevel: 'medium',
            importance: 9,
            location: 'Section 4.1, Page 3',
            suggestions: [
              'Consider requiring advance payment for new clients',
              'Review interest rate for compliance with usury laws',
              'Add dispute resolution mechanism for payment disputes'
            ]
          },
          {
            id: '2',
            type: 'Liability',
            title: 'Limitation of Liability',
            content: 'Contractor\'s total liability under this agreement shall not exceed the total fees paid in the preceding 6 months.',
            riskLevel: 'high',
            importance: 10,
            location: 'Section 8.2, Page 7',
            suggestions: [
              'Liability cap seems reasonable but could be higher for critical services',
              'Consider excluding liability for gross negligence or willful misconduct',
              'Add requirement for professional indemnity insurance'
            ]
          },
          {
            id: '3',
            type: 'Confidentiality',
            title: 'Confidential Information',
            content: 'Both parties shall maintain confidentiality of all proprietary information for a period of 5 years after termination of this agreement.',
            riskLevel: 'low',
            importance: 7,
            location: 'Section 6.1, Page 5',
            suggestions: [
              '5-year term is reasonable and standard',
              'Consider adding specific definitions of confidential information',
              'Include provisions for return or destruction of confidential materials'
            ]
          }
        ],
        complianceIssues: [
          {
            id: '1',
            category: 'Data Protection',
            severity: 'medium',
            description: 'GDPR compliance clause lacks specific data breach notification requirements',
            recommendation: 'Add 72-hour breach notification timeline as required by GDPR',
            location: 'Section 6.3, Page 6',
            status: 'pending'
          },
          {
            id: '2',
            category: 'Tax Compliance',
            severity: 'low',
            description: 'No tax withholding provisions specified',
            recommendation: 'Consider adding tax withholding clauses for international transactions',
            location: 'Section 4.2, Page 3',
            status: 'reviewed'
          }
        ],
        financialTerms: [
          {
            id: '1',
            type: 'payment',
            amount: '$250,000',
            currency: 'USD',
            frequency: 'Monthly',
            conditions: 'Due within 15 days of invoice date',
            riskLevel: 'medium'
          },
          {
            id: '2',
            type: 'penalty',
            amount: '1.5%',
            currency: 'USD',
            frequency: 'Monthly',
            conditions: 'Applied to late payments',
            riskLevel: 'low'
          }
        ],
        parties: ['TechCorp Inc.', 'Global Solutions Ltd.'],
        effectiveDate: '2024-01-15',
        expirationDate: '2025-01-14',
        governingLaw: 'State of California',
        jurisdiction: 'California Courts',
        estimatedReviewTime: 45,
        similarDocuments: ['Service_Agreement_2023.pdf', 'Software_Contract_Q4.pdf']
      };

      setAnalysis(mockAnalysis);
      setLoading(false);
    };

    loadAnalysis();
  }, [document]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const toggleClauseExpansion = (clauseId: string) => {
    setExpandedClauses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clauseId)) {
        newSet.delete(clauseId);
      } else {
        newSet.add(clauseId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <p className="text-center text-gray-500 mt-4">Analyzing document...</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{analysis.documentName}</h2>
              <p className="text-cyan-100">AI-Powered Document Analysis</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onShare}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Share analysis"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onExport}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Export analysis"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="Close"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Score</span>
                <ChartBarIcon className="w-5 h-5" />
              </div>
              <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.overallScore).split(' ')[0]}`}>
                {analysis.overallScore}%
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Level</span>
                <ExclamationTriangleIcon className="w-5 h-5" />
              </div>
              <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.riskScore).split(' ')[0]}`}>
                {analysis.riskScore}%
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Compliance</span>
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.complianceScore).split(' ')[0]}`}>
                {analysis.complianceScore}%
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Complexity</span>
                <DocumentTextIcon className="w-5 h-5" />
              </div>
              <div className={`text-2xl font-bold mt-1 ${getScoreColor(analysis.complexityScore).split(' ')[0]}`}>
                {analysis.complexityScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
              { id: 'clauses', label: 'Clauses', icon: ScaleIcon },
              { id: 'compliance', label: 'Compliance', icon: ShieldCheckIcon },
              { id: 'financial', label: 'Financial', icon: CurrencyDollarIcon },
              { id: 'timeline', label: 'Timeline', icon: CalendarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeSection === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Summary */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Key Points */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Points</h3>
                  <ul className="space-y-2">
                    {analysis.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contract Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Contract Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Effective Date</span>
                        <span className="text-sm font-medium">{analysis.effectiveDate}</span>
                      </div>
                      {analysis.expirationDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Expiration Date</span>
                          <span className="text-sm font-medium">{analysis.expirationDate}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Governing Law</span>
                        <span className="text-sm font-medium">{analysis.governingLaw}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Jurisdiction</span>
                        <span className="text-sm font-medium">{analysis.jurisdiction}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Involved Parties</h4>
                    <div className="space-y-2">
                      {analysis.parties.map((party, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{party}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Similar Documents */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Similar Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysis.similarDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <DocumentDuplicateIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 truncate">{doc}</span>
                        <span className="text-xs text-gray-500">85% match</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'clauses' && (
              <motion.div
                key="clauses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Contract Clauses Analysis</h3>
                    <span className="text-sm text-gray-500">{analysis.clauses.length} clauses identified</span>
                  </div>

                  <div className="space-y-4">
                    {analysis.clauses.map((clause, index) => (
                      <motion.div
                        key={clause.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg overflow-hidden ${getRiskColor(clause.riskLevel)}`}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900">{clause.title}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(clause.riskLevel)}`}>
                                  {clause.riskLevel} risk
                                </span>
                                <span className="text-xs text-gray-500">
                                  Importance: {clause.importance}/10
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{clause.type}</p>
                              <p className="text-sm text-gray-500 mb-2">📍 {clause.location}</p>
                            </div>
                            <button
                              onClick={() => toggleClauseExpansion(clause.id)}
                              className="ml-4 text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                className={`w-5 h-5 transform transition-transform ${expandedClauses.has(clause.id) ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          <AnimatePresence>
                            {expandedClauses.has(clause.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t pt-3 mt-3"
                              >
                                <div className="mb-3">
                                  <p className="text-sm text-gray-700 mb-2">{clause.content}</p>
                                </div>

                                {clause.suggestions.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-900 mb-2">💡 Suggestions:</h5>
                                    <ul className="space-y-1">
                                      {clause.suggestions.map((suggestion, idx) => (
                                        <li key={idx} className="text-sm text-gray-600 flex items-start space-x-2">
                                          <LightBulbIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                          <span>{suggestion}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'compliance' && (
              <motion.div
                key="compliance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Compliance Analysis</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis.complianceScore)}`}>
                      {analysis.complianceScore}% Compliant
                    </span>
                  </div>

                  <div className="space-y-4">
                    {analysis.complianceIssues.map((issue, index) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">{issue.category}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                issue.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {issue.status}
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Recommendation:</strong> {issue.recommendation}
                            </p>
                            <p className="text-xs text-gray-500">📍 {issue.location}</p>
                          </div>

                          <div className="ml-4 flex items-center space-x-2">
                            <button className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
                              Review
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'financial' && (
              <motion.div
                key="financial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Terms</h3>

                  <div className="space-y-4">
                    {analysis.financialTerms.map((term, index) => (
                      <motion.div
                        key={term.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg p-4 ${getRiskColor(term.riskLevel)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                              <h4 className="font-medium text-gray-900 capitalize">{term.type}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(term.riskLevel)}`}>
                                {term.riskLevel} risk
                              </span>
                            </div>

                            {term.amount && (
                              <p className="text-lg font-semibold text-gray-900 mb-1">
                                {term.amount} {term.currency}
                              </p>
                            )}

                            {term.frequency && (
                              <p className="text-sm text-gray-600 mb-2">
                                Frequency: {term.frequency}
                              </p>
                            )}

                            <p className="text-sm text-gray-700">
                              <strong>Conditions:</strong> {term.conditions}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Timeline</h3>

                  <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                    <div className="space-y-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative z-10 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Effective Date</p>
                          <p className="text-sm text-gray-600">{analysis.effectiveDate}</p>
                        </div>
                      </div>

                      {analysis.expirationDate && (
                        <div className="flex items-center space-x-4">
                          <div className="relative z-10 w-4 h-4 bg-red-500 rounded-full border-4 border-white shadow"></div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Expiration Date</p>
                            <p className="text-sm text-gray-600">{analysis.expirationDate}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4">
                        <div className="relative z-10 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Review Recommended</p>
                          <p className="text-sm text-gray-600">30 days before expiration</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="relative z-10 w-4 h-4 bg-yellow-500 rounded-full border-4 border-white shadow"></div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Estimated Review Time</p>
                          <p className="text-sm text-gray-600">{analysis.estimatedReviewTime} minutes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Analysis completed in {analysis.estimatedReviewTime}s</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleString()}</span>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                <span>Open Original</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700">
                <EyeIcon className="w-4 h-4" />
                <span>View Full Report</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedDocumentInsights;