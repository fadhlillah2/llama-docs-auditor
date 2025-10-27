// TypeScript interfaces for API contracts
// High-Precision Contract Advisor RAG - Frontend API Types

// Upload API Types
export interface UploadResponse {
  status: 'success' | 'error';
  message: string;
  file_name?: string;
  session_id?: string;
  session_info?: SessionInfo;
}

export interface SessionInfo {
  session_id: string;
  file_name: string;
  created_at: string;
  last_accessed: string;
  expires_at: string;
  query_count: number;
  is_initialized: boolean;
  performance_stats: PerformanceStats;
}

export interface PerformanceStats {
  total_queries: number;
  avg_response_time: number;
  cache_hits: number;
  errors: number;
}

// Chat API Types
export interface ChatApiRequest {
  prompt: string;
  chatHistory?: string;
  session_id?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface ChatApiResponse {
  status?: 'success' | 'error';
  result?: string;
  error?: string;
  session_id?: string;
  query_time?: number;
  performance_stats?: QueryPerformanceStats;
  source_documents?: SourceDocument[];
}

export interface QueryPerformanceStats {
  query_time: number;
  total_queries: number;
  cache_hits: number;
  retrieval_time?: number;
  generation_time?: number;
}

export interface SourceDocument {
  page_content: string;
  metadata?: DocumentMetadata;
  score?: number;
}

export interface DocumentMetadata {
  source?: string;
  page?: number;
  chunk_id?: string;
  doc_type?: string;
}

// Session Management API Types
export interface SessionListResponse {
  status: string;
  sessions: Record<string, SessionSummary>;
}

export interface SessionSummary {
  file_name: string;
  created_at: string;
  query_count: number;
  is_initialized: boolean;
}

// Feature Flags API Types
export interface FeatureFlagsResponse {
  status: string;
  features: Record<string, boolean>;
}

// Configuration API Types
export interface ConfigResponse {
  status: string;
  config: {
    environment: string;
    ollama_model: string;
    vector_db_path: string;
    upload_dir: string;
    max_file_size: number;
    supported_formats: string[];
  };
}

// Error Response Types
export interface ApiError {
  status: 'error';
  message: string;
  code?: string | number;
  details?: string;
}

// Generic API Response Wrapper
export type ApiResponse<T> = T | ApiError;

// Request Configuration Types
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  baseURL?: string;
}

// WebSocket Types (for future real-time features)
export interface WebSocketMessage {
  type: 'query' | 'response' | 'error' | 'status';
  data: any;
  timestamp: string;
  session_id?: string;
}

// File Upload Types
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Component Props Types (re-export for convenience)
export interface ChatMessage {
  position: 'left_bubble' | 'right_bubble';
  message: string;
  timestamp?: string;
  id?: string;
  type?: 'user' | 'assistant' | 'system' | 'error';
}

export interface NotificationConfig {
  title: string;
  text?: string;
  icon: 'success' | 'error' | 'warning' | 'info' | 'question';
  toast: boolean;
  timer: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  timerProgressBar: boolean;
  showConfirmButton: boolean;
}