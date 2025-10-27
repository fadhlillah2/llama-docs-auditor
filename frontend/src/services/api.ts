import axios, { AxiosResponse } from 'axios';

// Base API configuration
const API_BASE_URL = 'http://127.0.0.1:8081';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for RAG processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add session ID if available
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('rag_session_id');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

// Response interceptor to handle session ID
api.interceptors.response.use((response) => {
  // Store session ID if provided
  if (response.data?.session_id) {
    localStorage.setItem('rag_session_id', response.data.session_id);
  }
  return response;
});

// Types for API responses
export interface UploadResponse {
  message: string;
  status: string;
  session_id: string;
  file_name: string;
  processing_status: string;
}

export interface BatchUploadResponse {
  message: string;
  status: string;
  session_id: string;
  file_info: Array<{
    filename: string;
    size: number;
    type: string;
  }>;
  batch_results: {
    total_files: number;
    files_processed: number;
    failed_files: string[];
    document_count: number;
    processing_time: number;
    processing_results: { [key: string]: any };
  };
}

export interface ChatResponse {
  result: string;
  error?: string;
  session_id?: string;
  sources?: string[];
  confidence?: number;
}

export interface AnalyticsData {
  total_documents: number;
  processed_documents: number;
  processing_documents: number;
  high_risk_documents: number;
  total_clauses: number;
  compliance_score: number;
  avg_processing_time: number;
  documents_by_type: { [key: string]: number };
  risk_distribution: {
    high: number;
    medium: number;
    low: number;
  };
  clause_categories: { [key: string]: number };
  monthly_activity: Array<{
    month: string;
    uploads: number;
    queries: number;
  }>;
  recent_documents: Array<{
    id: string;
    fileName: string;
    uploadDate: string;
    status: string;
    fileSize: number;
    fileType: string;
  }>;
}

export interface DocumentAnalysis {
  risk_score: number;
  compliance_score: number;
  complexity_score: number;
  total_clauses: number;
  clause_categories: { [key: string]: number };
  key_points: string[];
  insights: Array<{
    id: string;
    documentId: string;
    documentName: string;
    type: string;
    title: string;
    description: string;
    severity: string;
    confidence: number;
    location: string;
    suggestion: string;
    timestamp: string;
  }>;
  summary: string;
  overall_score: number;
}

export interface SessionInfo {
  session_id: string;
  file_path: string;
  created_at: string;
  last_accessed: string;
  query_count: number;
  is_ready: boolean;
  processing_status: string;
}

// API Service Functions
export class ApiService {
  /**
   * Upload a document for RAG processing
   */
  static async uploadDocument(file: File): Promise<AxiosResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/upload_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Upload multiple documents for batch RAG processing
   */
  static async uploadBatchDocuments(files: File[]): Promise<AxiosResponse<BatchUploadResponse>> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return api.post('/upload_batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes for batch processing
    });
  }

  /**
   * Query the RAG system with a question
   */
  static async askQuestion(question: string, chatHistory?: string): Promise<AxiosResponse<ChatResponse>> {
    return api.post('/ask_ai', {
      prompt: question,
      chat_history: chatHistory || JSON.stringify([]),
    });
  }

  /**
   * Get analytics data for dashboard
   */
  static async getAnalyticsData(): Promise<AxiosResponse<{ analytics: AnalyticsData }>> {
    return api.get('/analytics_data');
  }

  /**
   * Get detailed document analysis
   */
  static async getDocumentAnalysis(sessionId?: string): Promise<AxiosResponse<{
    status: string;
    analysis: DocumentAnalysis;
    session_info: SessionInfo;
  }>> {
    const url = sessionId ? `/document_analysis?session_id=${sessionId}` : '/document_analysis';
    return api.get(url);
  }

  /**
   * Get session information
   */
  static async getSessionInfo(): Promise<AxiosResponse<{
    status: string;
    session_info: SessionInfo;
  }>> {
    return api.get('/session/info');
  }

  /**
   * Check processing status
   */
  static async getStatus(): Promise<AxiosResponse<{
    status: string;
    message: string;
    processing_complete?: boolean;
    session_info?: SessionInfo;
  }>> {
    return api.get('/status');
  }

  /**
   * Get available features
   */
  static async getFeatures(): Promise<AxiosResponse<{
    status: string;
    features: { [key: string]: boolean };
    message: string;
  }>> {
    return api.get('/features');
  }

  /**
   * Get server configuration
   */
  static async getConfig(): Promise<AxiosResponse<{
    status: string;
    config: any;
    message: string;
  }>> {
    return api.get('/config');
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<AxiosResponse<{ message: string }>> {
    return api.get('/');
  }

  /**
   * Clear current session
   */
  static clearSession(): void {
    localStorage.removeItem('rag_session_id');
  }

  /**
   * Get current session ID
   */
  static getCurrentSessionId(): string | null {
    return localStorage.getItem('rag_session_id');
  }

  /**
   * Set current session ID
   */
  static setCurrentSessionId(sessionId: string): void {
    localStorage.setItem('rag_session_id', sessionId);
  }

  /**
   * Check if we have an active session
   */
  static hasActiveSession(): boolean {
    return !!localStorage.getItem('rag_session_id');
  }

  /**
   * Monitor processing status with polling
   */
  static async pollProcessingStatus(
    onProgress?: (status: string, message: string) => void,
    interval: number = 2000,
    maxAttempts: number = 60
  ): Promise<{ status: string; session_info?: SessionInfo }> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.getStatus();
        const { status, message, processing_complete, session_info } = response.data;

        if (onProgress) {
          onProgress(status, message);
        }

        if (processing_complete || status === 'ready') {
          return { status: 'completed', session_info };
        }

        if (status === 'error' || status === 'session_expired') {
          return { status: 'error' };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        console.error('Error polling status:', error);
        attempts++;

        if (attempts >= maxAttempts) {
          throw new Error('Failed to check processing status');
        }

        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('Processing timeout - please try again');
  }

  /**
   * Upload and process document with progress monitoring
   */
  static async uploadAndProcess(
    file: File,
    onProgress?: (progress: { stage: string; message: string; progress: number }) => void
  ): Promise<{ success: boolean; session_id?: string; error?: string }> {
    try {
      if (onProgress) {
        onProgress({ stage: 'uploading', message: 'Uploading document...', progress: 10 });
      }

      // Upload document
      const uploadResponse = await this.uploadDocument(file);
      const { session_id, status, processing_status } = uploadResponse.data;

      if (status !== 'success') {
        return { success: false, error: 'Upload failed' };
      }

      if (onProgress) {
        onProgress({ stage: 'processing', message: 'Processing document...', progress: 30 });
      }

      // Monitor processing
      await this.pollProcessingStatus((status, message) => {
        if (onProgress) {
          const progress = status === 'ready' ? 90 :
                         status === 'processing' ? 60 :
                         status === 'in_progress' ? 40 : 30;
          onProgress({ stage: status, message, progress });
        }
      });

      if (onProgress) {
        onProgress({ stage: 'completed', message: 'Document processed successfully', progress: 100 });
      }

      return { success: true, session_id };

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Processing failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload and process multiple documents with progress monitoring
   */
  static async uploadBatchAndProcess(
    files: File[],
    onProgress?: (progress: {
      stage: string;
      message: string;
      progress: number;
      currentFile?: string;
      completedFiles?: number;
      totalFiles?: number;
      qualityInfo?: any;
    }) => void
  ): Promise<{
    success: boolean;
    session_id?: string;
    error?: string;
    batch_results?: any;
  }> {
    try {
      if (onProgress) {
        onProgress({
          stage: 'uploading',
          message: `Uploading ${files.length} files...`,
          progress: 5,
          totalFiles: files.length,
          completedFiles: 0
        });
      }

      // Upload documents in batch
      const uploadResponse = await this.uploadBatchDocuments(files);
      const { session_id, status, batch_results } = uploadResponse.data;

      if (status !== 'success') {
        return { success: false, error: 'Batch upload failed' };
      }

      if (onProgress) {
        const successRate = (batch_results.files_processed / batch_results.total_files) * 100;
        onProgress({
          stage: 'processing',
          message: `Processing ${batch_results.files_processed} of ${batch_results.total_files} files...`,
          progress: 30,
          totalFiles: batch_results.total_files,
          completedFiles: batch_results.files_processed
        });
      }

      // Monitor processing
      await this.pollProcessingStatus((status, message) => {
        if (onProgress) {
          const progress = status === 'ready' ? 95 :
                         status === 'processing' ? 70 :
                         status === 'in_progress' ? 50 : 40;
          onProgress({
            stage: status,
            message: `Batch processing: ${message}`,
            progress,
            totalFiles: batch_results.total_files,
            completedFiles: batch_results.files_processed
          });
        }
      });

      if (onProgress) {
        const successRate = (batch_results.files_processed / batch_results.total_files) * 100;
        onProgress({
          stage: 'completed',
          message: `Batch processing complete: ${batch_results.files_processed}/${batch_results.total_files} files processed successfully`,
          progress: 100,
          totalFiles: batch_results.total_files,
          completedFiles: batch_results.files_processed,
          qualityInfo: batch_results.processing_results
        });
      }

      return {
        success: true,
        session_id,
        batch_results
      };

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Batch processing failed';
      return { success: false, error: errorMessage };
    }
  }
}

export default ApiService;