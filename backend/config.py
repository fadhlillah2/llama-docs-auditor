"""
Configuration module for High-Precision Contract Advisor RAG
Provides environment-specific configuration management
"""

import os
from typing import Dict, Any
from abc import ABC, abstractmethod


class BaseConfig(ABC):
    """Base configuration class with common settings."""
    
    # Flask settings
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-key-change-in-production')
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
    
    # Server settings
    SERVER_PORT = int(os.environ.get('SERVER_PORT', '8081'))
    SERVER_HOST = os.environ.get('SERVER_HOST', '127.0.0.1')
    
    # Ollama settings - DEPRECATED, using Groq instead
    # OLLAMA_MODEL_NAME = os.environ.get('OLLAMA_MODEL_NAME', 'llama3.2:3b-instruct-q4_0')
    # OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    # OLLAMA_TIMEOUT = int(os.environ.get('OLLAMA_TIMEOUT', '300'))
    
    # File upload settings
    MAX_UPLOAD_SIZE = int(os.environ.get('MAX_UPLOAD_SIZE', '16777216'))  # 16MB
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}
    
    # Session settings
    SESSION_TIMEOUT_MINUTES = int(os.environ.get('SESSION_TIMEOUT_MINUTES', '30'))
    SESSION_CLEANUP_INTERVAL = int(os.environ.get('SESSION_CLEANUP_INTERVAL', '10'))
    MAX_SESSIONS_PER_IP = int(os.environ.get('MAX_SESSIONS_PER_IP', '5'))
    
    # Storage paths
    VECTOR_DB_PATH = os.environ.get('VECTOR_DB_PATH', '../data/chroma_db')
    EMBEDDING_CACHE_DIR = os.environ.get('EMBEDDING_CACHE_DIR', '../cache/embeddings')
    QUERY_CACHE_DIR = os.environ.get('QUERY_CACHE_DIR', '../cache/queries')
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/app.log')
    LOG_ROTATION = os.environ.get('LOG_ROTATION', 'True').lower() == 'true'
    LOG_MAX_SIZE = int(os.environ.get('LOG_MAX_SIZE', '10'))  # MB
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', '5'))
    
    # Rate limiting
    RATE_LIMIT_UPLOAD_REQUESTS = int(os.environ.get('RATE_LIMIT_UPLOAD_REQUESTS', '5'))
    RATE_LIMIT_UPLOAD_WINDOW = int(os.environ.get('RATE_LIMIT_UPLOAD_WINDOW', '300'))
    RATE_LIMIT_QUERY_REQUESTS = int(os.environ.get('RATE_LIMIT_QUERY_REQUESTS', '30'))
    RATE_LIMIT_QUERY_WINDOW = int(os.environ.get('RATE_LIMIT_QUERY_WINDOW', '60'))
    RATE_LIMIT_GENERAL_REQUESTS = int(os.environ.get('RATE_LIMIT_GENERAL_REQUESTS', '100'))
    RATE_LIMIT_GENERAL_WINDOW = int(os.environ.get('RATE_LIMIT_GENERAL_WINDOW', '60'))
    
    @abstractmethod
    def get_upload_dir(self) -> str:
        """Get upload directory path."""

    @abstractmethod
    def get_cors_origins(self) -> list:
        """Get CORS allowed origins."""

    @abstractmethod
    def is_debug_enabled(self) -> bool:
        """Check if debug mode is enabled."""


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""
    
    # Development-specific settings
    DEBUG = True
    TESTING = False
    
    def get_upload_dir(self) -> str:
        """Development upload directory."""
        return os.environ.get('UPLOAD_DIR', '../data/uploads')
    
    def get_cors_origins(self) -> list:
        """Development CORS - allow localhost."""
        return ['http://localhost:3000', 'http://127.0.0.1:3000']
    
    def is_debug_enabled(self) -> bool:
        """Debug enabled in development."""
        return True
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask-specific configuration."""
        return {
            'SECRET_KEY': self.SECRET_KEY,
            'SESSION_TYPE': self.SESSION_TYPE,
            'SESSION_PERMANENT': self.SESSION_PERMANENT,
            'PERMANENT_SESSION_LIFETIME': self.SESSION_TIMEOUT_MINUTES * 60,
            'MAX_CONTENT_LENGTH': self.MAX_UPLOAD_SIZE,
            'DEBUG': self.DEBUG,
            'TESTING': self.TESTING
        }


class ProductionConfig(BaseConfig):
    """Production environment configuration."""
    
    # Production-specific settings
    DEBUG = False
    TESTING = False
    
    # Override server host for production
    SERVER_HOST = os.environ.get('SERVER_HOST', '0.0.0.0')
    
    # Production requires secure secret key
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY')
    
    # SSL settings
    SSL_CERT_PATH = os.environ.get('SSL_CERT_PATH', 'cert.pem')
    SSL_KEY_PATH = os.environ.get('SSL_KEY_PATH', 'key.pem')
    
    def get_upload_dir(self) -> str:
        """Production upload directory - secure location."""
        return os.environ.get('SECURE_UPLOAD_DIR', '/var/lib/contract-advisor/uploads')
    
    def get_cors_origins(self) -> list:
        """Production CORS - restrict to known domains."""
        allowed_origins = [
            'https://yourdomain.com',
            'https://www.yourdomain.com',
            'https://contract-advisor.yourdomain.com'
        ]
        
        # Allow additional origins from environment
        extra_origins = os.environ.get('ALLOWED_ORIGINS', '')
        if extra_origins:
            allowed_origins.extend([origin.strip() for origin in extra_origins.split(',')])
        
        return allowed_origins
    
    def is_debug_enabled(self) -> bool:
        """Debug disabled in production."""
        return False
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask-specific configuration."""
        if not self.SECRET_KEY:
            raise ValueError("FLASK_SECRET_KEY is required in production")
        
        return {
            'SECRET_KEY': self.SECRET_KEY,
            'SESSION_TYPE': self.SESSION_TYPE,
            'SESSION_PERMANENT': self.SESSION_PERMANENT,
            'PERMANENT_SESSION_LIFETIME': self.SESSION_TIMEOUT_MINUTES * 60,
            'MAX_CONTENT_LENGTH': self.MAX_UPLOAD_SIZE,
            'DEBUG': self.DEBUG,
            'TESTING': self.TESTING
        }
    
    def get_ssl_context(self) -> tuple:
        """Get SSL context for HTTPS."""
        if os.path.exists(self.SSL_CERT_PATH) and os.path.exists(self.SSL_KEY_PATH):
            return (self.SSL_CERT_PATH, self.SSL_KEY_PATH)
        return None


class TestingConfig(BaseConfig):
    """Testing environment configuration."""
    
    # Testing-specific settings
    DEBUG = True
    TESTING = True
    
    # Use in-memory or temporary storage for testing
    VECTOR_DB_PATH = '/tmp/test_chroma_db'
    EMBEDDING_CACHE_DIR = '/tmp/test_embeddings'
    QUERY_CACHE_DIR = '/tmp/test_queries'
    
    # Faster timeouts for testing
    SESSION_TIMEOUT_MINUTES = 5
    SESSION_CLEANUP_INTERVAL = 1
    
    # Smaller limits for testing
    MAX_UPLOAD_SIZE = 1024 * 1024  # 1MB
    
    def get_upload_dir(self) -> str:
        """Testing upload directory."""
        return '/tmp/test_uploads'
    
    def get_cors_origins(self) -> list:
        """Testing CORS - allow all."""
        return ['*']
    
    def is_debug_enabled(self) -> bool:
        """Debug enabled in testing."""
        return True
    
    def get_flask_config(self) -> Dict[str, Any]:
        """Get Flask-specific configuration for testing."""
        return {
            'SECRET_KEY': 'testing-secret-key',
            'SESSION_TYPE': 'filesystem',
            'SESSION_PERMANENT': False,
            'PERMANENT_SESSION_LIFETIME': self.SESSION_TIMEOUT_MINUTES * 60,
            'MAX_CONTENT_LENGTH': self.MAX_UPLOAD_SIZE,
            'DEBUG': self.DEBUG,
            'TESTING': self.TESTING
        }


def get_config() -> BaseConfig:
    """Get configuration based on environment."""
    env = os.environ.get('FLASK_ENV', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    elif env == 'testing':
        return TestingConfig()
    else:
        return DevelopmentConfig()


# Global configuration instance
config = get_config()