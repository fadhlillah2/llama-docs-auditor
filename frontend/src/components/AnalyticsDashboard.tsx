import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  totalDocuments: number;
  totalQuestions: number;
  averageResponseTime: number;
  documentTypes: Record<string, number>;
  questionCategories: Record<string, number>;
  riskAssessments: {
    high: number;
    medium: number;
    low: number;
  };
  usageStats: {
    uploadsToday: number;
    queriesToday: number;
    activeSessions: number;
  };
  trends: {
    daily: Array<{ date: string; uploads: number; queries: number }>;
    weekly: Array<{ week: string; documents: number; questions: number }>;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
  compact?: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '', compact = false }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  // Mock data for demonstration
  useEffect(() => {
    const loadAnalyticsData = () => {
      setLoading(true);
      setError(null);

      setTimeout(() => {
        const mockData: AnalyticsData = {
          totalDocuments: 24,
          totalQuestions: 156,
          averageResponseTime: 8.5,
          documentTypes: {
            'PDF': 18,
            'DOCX': 4,
            'TXT': 2
          },
          questionCategories: {
            'Payment Terms': 35,
            'Termination': 28,
            'Liability': 22,
            'Compliance': 19,
            'Obligations': 32,
            'Other': 20
          },
          riskAssessments: {
            high: 6,
            medium: 12,
            low: 6
          },
          usageStats: {
            uploadsToday: 3,
            queriesToday: 24,
            activeSessions: 5
          },
          trends: {
            daily: [
              { date: 'Mon', uploads: 2, queries: 18 },
              { date: 'Tue', uploads: 4, queries: 32 },
              { date: 'Wed', uploads: 3, queries: 28 },
              { date: 'Thu', uploads: 5, queries: 42 },
              { date: 'Fri', uploads: 3, queries: 24 },
              { date: 'Sat', uploads: 1, queries: 12 },
              { date: 'Sun', uploads: 0, queries: 8 }
            ],
            weekly: [
              { week: 'W1', documents: 8, questions: 52 },
              { week: 'W2', documents: 12, questions: 78 },
              { week: 'W3', documents: 6, questions: 41 },
              { week: 'W4', documents: 9, questions: 63 }
            ]
          }
        };

        setAnalyticsData(mockData);
        setLoading(false);
      }, 1000);
    };

    loadAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
        <div className="text-center text-red-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Error loading analytics: {error}</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  const { totalDocuments, totalQuestions, averageResponseTime, documentTypes, questionCategories, riskAssessments, usageStats } = analyticsData;

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">📊 Analytics Dashboard</h3>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            className="bg-gray-700 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-cyan-500 focus:outline-none"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {!compact && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Documents"
              value={totalDocuments}
              change={usageStats.uploadsToday}
              changeType="increase"
              icon="📄"
              color="text-blue-400"
            />
            <MetricCard
              title="Total Questions"
              value={totalQuestions}
              change={usageStats.queriesToday}
              changeType="increase"
              icon="💬"
              color="text-green-400"
            />
            <MetricCard
              title="Avg Response Time"
              value={`${averageResponseTime}s`}
              change="-0.5s"
              changeType="improvement"
              icon="⚡"
              color="text-yellow-400"
            />
            <MetricCard
              title="Active Sessions"
              value={usageStats.activeSessions}
              change={2}
              changeType="increase"
              icon="👥"
              color="text-purple-400"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Document Types Chart */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Document Types</h4>
              <div className="space-y-2">
                {Object.entries(documentTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${(count / totalDocuments) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Assessment Chart */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Risk Assessment Results</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-400">High Risk</span>
                  <span className="text-sm text-gray-300 font-medium">{riskAssessments.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-yellow-400">Medium Risk</span>
                  <span className="text-sm text-gray-300 font-medium">{riskAssessments.medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-400">Low Risk</span>
                  <span className="text-sm text-gray-300 font-medium">{riskAssessments.low}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Trends */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Usage Trends</h4>
            <div className="space-y-4">
              {analyticsData.trends.daily.slice(0, 7).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 w-8">{day.date}</span>
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 w-12">Uploads</span>
                      <div className="w-20 bg-gray-600 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${(day.uploads / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4">{day.uploads}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400 w-12">Queries</span>
                      <div className="w-20 bg-gray-600 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${(day.queries / 50) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4">{day.queries}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Compact View */}
      {compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{totalDocuments}</div>
            <div className="text-xs text-gray-400">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{totalQuestions}</div>
            <div className="text-xs text-gray-400">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{averageResponseTime}s</div>
            <div className="text-xs text-gray-400">Avg Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{usageStats.activeSessions}</div>
            <div className="text-xs text-gray-400">Sessions</div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'improvement';
  icon: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon, color }) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'increase': return 'text-green-400';
      case 'decrease': return 'text-red-400';
      case 'improvement': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase': return '↑';
      case 'decrease': return '↓';
      case 'improvement': return '✓';
      default: return '→';
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs ${getChangeColor()} flex items-center`}>
          {getChangeIcon()} {change > 0 ? '+' : ''}{change}
        </span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{title}</div>
    </div>
  );
};

export default AnalyticsDashboard;