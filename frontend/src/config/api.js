// API Configuration for Contract Advisor Frontend
// Centralized configuration to avoid port confusion

// Environment-based API configuration
const getApiBaseUrl = () => {
  // Check if running in production
  if (process.env.NODE_ENV === 'production') {
    // Use environment variable or default to current host
    return process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:8082`;
  }

  // Development configuration
  return process.env.REACT_APP_API_URL || 'http://127.0.0.1:8082';
};

// API configuration
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    UPLOAD_FILE: '/upload_file',
    ASK_AI: '/ask_ai',
    SESSION_INFO: '/session/info',
    SESSION_LIST: '/session/list',
    SESSION_CLEANUP: '/session/cleanup',
    FEATURES: '/features',
    HEALTH: '/'
  },
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    // Add API key if needed (from environment)
    ...(process.env.REACT_APP_API_KEY && {
      'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`
    })
  }
};

// Helper function to build full URLs
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// API endpoints for easy usage
export const API_ENDPOINTS = {
  uploadFile: () => buildApiUrl(API_CONFIG.ENDPOINTS.UPLOAD_FILE),
  askAI: () => buildApiUrl(API_CONFIG.ENDPOINTS.ASK_AI),
  sessionInfo: () => buildApiUrl(API_CONFIG.ENDPOINTS.SESSION_INFO),
  sessionList: () => buildApiUrl(API_CONFIG.ENDPOINTS.SESSION_LIST),
  sessionCleanup: () => buildApiUrl(API_CONFIG.ENDPOINTS.SESSION_CLEANUP),
  features: () => buildApiUrl(API_CONFIG.ENDPOINTS.FEATURES),
  health: () => buildApiUrl(API_CONFIG.ENDPOINTS.HEALTH)
};

// Development helper to log API configuration
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    baseUrl: API_CONFIG.BASE_URL,
    endpoints: API_ENDPOINTS
  });
}

export default API_CONFIG;