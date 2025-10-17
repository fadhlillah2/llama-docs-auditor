import time
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import os
import re
import html
import secrets
from typing import Dict, Any, Optional
from collections import defaultdict, deque
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv, find_dotenv
import sys
sys.path.append('../rag')

from session_manager import session_manager

# Load environment variables first
load_dotenv(find_dotenv())

# Configuration validation system
class ConfigValidator:
    """Validates environment configuration on startup."""
    
    def __init__(self):
        self.config_schema = {
            # Required in production
            'production_required': {
                'FLASK_SECRET_KEY': {
                    'required_in_prod': True,
                    'default': 'dev-key-change-in-production',
                    'validator': self._validate_secret_key
                },
                'API_KEYS': {
                    'required_in_prod': True,
                    'default': '',
                    'validator': self._validate_api_keys
                }
            },
            # Optional with defaults
            'optional': {
                'FLASK_ENV': {
                    'default': 'development',
                    'allowed_values': ['development', 'production', 'testing'],
                    'validator': self._validate_env_mode
                },
                'SERVER_PORT': {
                    'default': '8081',
                    'validator': self._validate_port
                },
                # Ollama settings - DEPRECATED, using Groq instead
                # 'OLLAMA_MODEL_NAME': {
                #     'default': 'llama3.2:3b-instruct-q4_0',
                #     'validator': self._validate_model_name
                # },
                # 'OLLAMA_BASE_URL': {
                #     'default': 'http://localhost:11434',
                #     'validator': self._validate_url
                # },
                'GROQ_API_KEY': {
                    'default': '',
                    'validator': self._validate_api_key
                },
                'GROQ_MODEL_NAME': {
                    'default': 'llama-3.3-70b-versatile',
                    'validator': self._validate_model_name
                },
                'GROQ_TIMEOUT': {
                    'default': '300',
                    'validator': self._validate_timeout
                },
                'MAX_UPLOAD_SIZE': {
                    'default': '16777216',
                    'validator': self._validate_file_size
                },
                'SESSION_TIMEOUT_MINUTES': {
                    'default': '30',
                    'validator': self._validate_timeout
                },
                'LOG_LEVEL': {
                    'default': 'INFO',
                    'allowed_values': ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                    'validator': self._validate_log_level
                }
            }
        }
        self.config = {}
        self.errors = []
        self.warnings = []
    
    def validate_all(self) -> Dict[str, Any]:
        """Validate all configuration and return processed config."""
        environment = os.environ.get('FLASK_ENV', 'development')
        is_production = environment == 'production'
        
        print("🔧 Validating configuration...")
        
        # Validate production-required configs
        for key, config in self.config_schema['production_required'].items():
            value = os.environ.get(key, config['default'])
            
            if is_production and config.get('required_in_prod', False):
                if not value or value == config['default']:
                    self.errors.append(f"❌ {key} is required in production but not set or using default value")
                    continue
            
            if config.get('validator'):
                is_valid, message = config['validator'](value)
                if not is_valid:
                    self.errors.append(f"❌ {key}: {message}")
                    continue
            
            self.config[key] = value
        
        # Validate optional configs
        for key, config in self.config_schema['optional'].items():
            value = os.environ.get(key, config['default'])
            
            # Check allowed values
            if config.get('allowed_values') and value not in config['allowed_values']:
                self.errors.append(f"❌ {key}: Invalid value '{value}'. Allowed: {config['allowed_values']}")
                continue
            
            # Run validator if present
            if config.get('validator'):
                is_valid, message = config['validator'](value)
                if not is_valid:
                    self.errors.append(f"❌ {key}: {message}")
                    continue
            
            self.config[key] = value
        
        # Validate file paths
        self._validate_paths()
        
        # Validate configuration dependencies
        self._validate_configuration_dependencies()
        
        # Print validation results
        if self.errors:
            print("❌ Configuration validation failed:")
            for error in self.errors:
                print(f"   {error}")
            print("💡 Check .env.example for configuration reference")
            return None
        
        if self.warnings:
            print("⚠️ Configuration warnings:")
            for warning in self.warnings:
                print(f"   {warning}")
        
        print("✅ Configuration validation passed")
        return self.config
    
    def _validate_secret_key(self, value: str) -> tuple[bool, str]:
        """Validate Flask secret key."""
        if not value:
            return False, "Secret key cannot be empty"
        if len(value) < 16:
            return False, "Secret key should be at least 16 characters long"
        if value == 'dev-key-change-in-production':
            self.warnings.append("⚠️ Using default secret key - change for production")
        return True, "Valid"
    
    def _validate_api_keys(self, value: str) -> tuple[bool, str]:
        """Validate API keys."""
        if not value:
            return True, "No API keys configured (development mode)"
        
        keys = [k.strip() for k in value.split(',')]
        for key in keys:
            if len(key) < 20:
                return False, f"API key '{key[:8]}...' is too short (minimum 20 characters)"
        
        return True, f"Valid ({len(keys)} key(s) configured)"

    def _validate_api_key(self, value: str) -> tuple[bool, str]:
        """Validate a single API key."""
        if not value:
            return False, "API key is required"

        # Check if it's a placeholder value
        if value in ['your-groq-api-key-here', 'gsk_your-groq-api-key-here', 'your-api-key-here']:
            return False, "Please replace placeholder API key with actual key"

        # Basic validation for Groq API keys (they start with 'gsk_')
        if not value.startswith('gsk_'):
            return False, "Groq API key should start with 'gsk_'"

        if len(value) < 40:
            return False, "API key is too short (minimum 40 characters)"

        return True, "API key format is valid"

    def _validate_env_mode(self, value: str) -> tuple[bool, str]:
        """Validate environment mode."""
        return True, f"Environment mode: {value}"
    
    def _validate_port(self, value: str) -> tuple[bool, str]:
        """Validate port number."""
        try:
            port = int(value)
            if not (1024 <= port <= 65535):
                return False, f"Port {port} should be between 1024 and 65535"
            return True, f"Port: {port}"
        except ValueError:
            return False, f"Invalid port number: {value}"
    
    def _validate_model_name(self, value: str) -> tuple[bool, str]:
        """Validate model name (Groq or others)."""
        valid_groq_models = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
        if value not in valid_groq_models:
            self.warnings.append(f"⚠️ Model '{value}' not in common Groq list. Ensure it's available in Groq")
        return True, f"Model: {value}"
    
    def _validate_url(self, value: str) -> tuple[bool, str]:
        """Validate URL format."""
        if not value.startswith(('http://', 'https://')):
            return False, "URL must start with http:// or https://"
        return True, f"URL: {value}"
    
    def _validate_file_size(self, value: str) -> tuple[bool, str]:
        """Validate file size limit."""
        try:
            size = int(value)
            if size <= 0:
                return False, "File size must be positive"
            if size > 100 * 1024 * 1024:  # 100MB
                self.warnings.append(f"⚠️ Large file size limit: {size / (1024*1024):.1f}MB")
            return True, f"Max upload: {size / (1024*1024):.1f}MB"
        except ValueError:
            return False, f"Invalid file size: {value}"
    
    def _validate_timeout(self, value: str) -> tuple[bool, str]:
        """Validate timeout value."""
        try:
            timeout = int(value)
            if timeout <= 0:
                return False, "Timeout must be positive"
            if timeout < 5:
                self.warnings.append(f"⚠️ Very short timeout: {timeout} minutes")
            return True, f"Timeout: {timeout}min"
        except ValueError:
            return False, f"Invalid timeout: {value}"
    
    def _validate_log_level(self, value: str) -> tuple[bool, str]:
        """Validate log level."""
        return True, f"Log level: {value}"
    
    def _validate_paths(self):
        """Validate file paths exist or can be created."""
        paths_to_check = [
            ('VECTOR_DB_PATH', os.environ.get('VECTOR_DB_PATH', '../data/chroma_db')),
            ('EMBEDDING_CACHE_DIR', os.environ.get('EMBEDDING_CACHE_DIR', '../cache/embeddings')),
            ('QUERY_CACHE_DIR', os.environ.get('QUERY_CACHE_DIR', '../cache/queries')),
            ('LOG_FILE', os.environ.get('LOG_FILE', 'logs/app.log')),
        ]
        
        for path_name, path_value in paths_to_check:
            try:
                if path_name == 'LOG_FILE':
                    # For log file, create parent directory
                    os.makedirs(os.path.dirname(path_value), exist_ok=True)
                else:
                    # For other paths, create the directory itself
                    os.makedirs(path_value, exist_ok=True)
            except Exception as e:
                self.warnings.append(f"⚠️ Cannot create directory {path_name}: {path_value} - {e}")
    
    def _validate_configuration_dependencies(self):
        """Validate configuration dependencies and conflicts."""
        environment = os.environ.get('FLASK_ENV', 'development')
        
        # Check SSL configuration
        if environment == 'production':
            ssl_cert = os.environ.get('SSL_CERT_PATH', 'cert.pem')
            ssl_key = os.environ.get('SSL_KEY_PATH', 'key.pem')
            
            if ssl_cert != 'cert.pem' or ssl_key != 'key.pem':
                if not os.path.exists(ssl_cert):
                    self.warnings.append(f"⚠️ SSL certificate not found: {ssl_cert}")
                if not os.path.exists(ssl_key):
                    self.warnings.append(f"⚠️ SSL private key not found: {ssl_key}")
        
        # Check rate limiting configuration
        upload_requests = int(os.environ.get('RATE_LIMIT_UPLOAD_REQUESTS', '5'))
        upload_window = int(os.environ.get('RATE_LIMIT_UPLOAD_WINDOW', '300'))
        
        if upload_requests > 100:
            self.warnings.append("⚠️ Upload rate limit seems high - consider security implications")
        
        if upload_window < 60:
            self.warnings.append("⚠️ Upload rate window is very short - may cause user frustration")
        
        # Check session configuration
        session_timeout = int(os.environ.get('SESSION_TIMEOUT_MINUTES', '30'))
        cleanup_interval = int(os.environ.get('SESSION_CLEANUP_INTERVAL', '10'))
        
        if cleanup_interval >= session_timeout:
            self.errors.append("❌ Session cleanup interval should be less than session timeout")
        
        # Check upload size vs available disk space
        max_upload = int(os.environ.get('MAX_UPLOAD_SIZE', '16777216'))
        if max_upload > 100 * 1024 * 1024:  # 100MB
            self.warnings.append("⚠️ Large upload limit - ensure adequate disk space")
        
        # Skip feature flag validation during initial startup (circular dependency)
        try:
            if 'feature_flags' in globals() and not feature_flags.is_enabled('query_caching') and feature_flags.is_enabled('performance_monitoring'):
                self.warnings.append("⚠️ Performance monitoring enabled without query caching may show inconsistent metrics")
        except NameError:
            pass  # feature_flags not initialized yet
    
    def export_config_summary(self) -> dict:
        """Export configuration summary for debugging."""
        environment = os.environ.get('FLASK_ENV', 'development')
        return {
            'environment': environment,
            'server': {
                'port': self.config.get('SERVER_PORT', '8081'),
                'host': '0.0.0.0' if environment == 'production' else '127.0.0.1',
                'debug': environment != 'production'
            },
            'security': {
                'authentication_enabled': auth_system.enabled if 'auth_system' in globals() else False,
                'cors_origins': 'restricted' if environment == 'production' else 'development',
                'ssl_enabled': bool(os.environ.get('SSL_CERT_PATH')),
                'rate_limiting_enabled': True
            },
            'features': feature_flags.get_all() if 'feature_flags' in globals() else {},
            'storage': {
                'upload_dir': upload_dir if 'upload_dir' in globals() else 'not_configured',
                'vector_db': vector_db_path if 'vector_db_path' in globals() else 'not_configured',
                'max_upload_size_mb': int(self.config.get('MAX_UPLOAD_SIZE', '16777216')) / (1024*1024)
            },
            # Ollama config - DEPRECATED, using Groq instead
            # 'ollama': {
            #     'model': self.config.get('OLLAMA_MODEL_NAME', 'llama3.2:3b-instruct-q4_0'),
            #     'base_url': self.config.get('OLLAMA_BASE_URL', 'http://localhost:11434')
            # },
            'groq': {
                'model': self.config.get('GROQ_MODEL_NAME', 'llama-3.3-70b-versatile'),
                'api_key_configured': bool(self.config.get('GROQ_API_KEY'))
            },
            'session': {
                'timeout_minutes': int(self.config.get('SESSION_TIMEOUT_MINUTES', '30')),
                'cleanup_interval_minutes': int(os.environ.get('SESSION_CLEANUP_INTERVAL', '10'))
            }
        }

# Validate configuration on startup
config_validator = ConfigValidator()
validated_config = config_validator.validate_all()

if validated_config is None:
    print("❌ Configuration validation failed. Exiting...")
    exit(1)

# 🎯 SECTION SEARCH FUNCTION: Direct text search for section references
def search_section_directly(question: str, documents: list) -> Optional[str]:
    """Search for section references directly in documents."""
    print(f"🔍 DIRECT SECTION SEARCH: Searching for '{question}' in {len(documents)} documents")

    # Normalize question to extract section references
    question_lower = question.lower()

    # Check for specific section references
    section_patterns = {
        'iv.15': ['iv.15', 'section iv.15', 'section iv15'],
        'iv.14': ['iv.14', 'section iv.14', 'section iv14'],
        'iv.13': ['iv.13', 'section iv.13', 'section iv13'],
        'iv.12': ['iv.12', 'section iv.12', 'section iv12'],
        'iv.': ['iv.', 'section iv'],
        'article': ['article'],
    }

    # Find which section pattern the user is asking about
    target_section = None
    for section, patterns in section_patterns.items():
        if any(pattern in question_lower for pattern in patterns):
            target_section = section
            break

    if not target_section:
        return None

    print(f"🎯 TARGET SECTION: {target_section}")

    # Search through documents for the section
    for doc in documents:
        if hasattr(doc, 'page_content'):
            content = doc.page_content.lower()
            content_original = doc.page_content

            # Check if this document contains the target section
            if target_section == 'iv.15':
                # Look for Section IV.15 with more flexible pattern matching
                section_patterns = ['section iv.15', 'iv.15', 'section iv15', 'iv.15', 'iv15']
                found_section = False

                for pattern in section_patterns:
                    if pattern in content:
                        found_section = True
                        break

                if found_section:
                    # Found Section IV.15, extract relevant context
                    print(f"✅ FOUND Section IV.15 in document!")

                    # Find the exact location and extract context
                    lines = content_original.split('\n')
                    section_lines = []
                    capturing = False

                    for i, line in enumerate(lines):
                        line_lower = line.lower()
                        if any(pattern in line_lower for pattern in section_patterns):
                            capturing = True
                            section_lines.append(line)
                        elif capturing and line.strip() and not line.startswith(' '):
                            # Stop when we hit the next section or major heading
                            if any(x in line_lower for x in ['iv.16', 'iv.14', 'section iv', 'article']):
                                break
                            section_lines.append(line)
                        elif capturing:
                            section_lines.append(line)

                    if section_lines:
                        context = '\n'.join(section_lines[:10])  # Limit to first 10 lines
                        return f"Yes, I found Section IV.15 in the document:\n\n{context}\n\nThis is the complete information available about Section IV.15 in the uploaded document."

            elif target_section == 'iv.14' and ('iv.14' in content or 'section iv.14' in content):
                # Similar logic for IV.14
                lines = content_original.split('\n')
                section_lines = []
                capturing = False

                for i, line in enumerate(lines):
                    if 'iv.14' in line.lower() or 'section iv.14' in line.lower():
                        capturing = True
                        section_lines.append(line)
                    elif capturing and line.strip() and not line.startswith(' '):
                        if any(x in line.lower() for x in ['iv.15', 'iv.13', 'section', 'article']):
                            break
                        section_lines.append(line)
                    elif capturing:
                        section_lines.append(line)

                if section_lines:
                    context = '\n'.join(section_lines[:10])
                    return f"Yes, I found Section IV.14 in the document:\n\n{context}\n\nThis is the complete information available about Section IV.14 in the uploaded document."

            elif target_section == 'iv.13':
                # Look for Section IV.13 with more flexible pattern matching
                section_patterns = ['section iv.13', 'iv.13', 'section iv13', 'iv.13', 'iv13']
                found_section = False

                for pattern in section_patterns:
                    if pattern in content:
                        found_section = True
                        break

                if found_section:
                    # Found Section IV.13, extract relevant context
                    print(f"✅ FOUND Section IV.13 in document!")

                    # Find the exact location and extract context
                    lines = content_original.split('\n')
                    section_lines = []
                    capturing = False

                    for i, line in enumerate(lines):
                        line_lower = line.lower()
                        if any(pattern in line_lower for pattern in section_patterns):
                            capturing = True
                            section_lines.append(line)
                        elif capturing and line.strip() and not line.startswith(' '):
                            # Stop when we hit the next section or major heading
                            if any(x in line_lower for x in ['iv.14', 'iv.12', 'section iv', 'article']):
                                break
                            section_lines.append(line)
                        elif capturing:
                            section_lines.append(line)

                    if section_lines:
                        context = '\n'.join(section_lines[:10])  # Limit to first 10 lines
                        return f"Yes, I found Section IV.13 in the document:\n\n{context}\n\nThis is the complete information available about Section IV.13 in the uploaded document."

            elif target_section in content:
                # Generic section search
                lines = content_original.split('\n')
                section_lines = []
                capturing = False

                for i, line in enumerate(lines):
                    if target_section in line.lower():
                        capturing = True
                        section_lines.append(line)
                    elif capturing and line.strip() and not line.startswith(' '):
                        section_lines.append(line)
                        break
                    elif capturing:
                        section_lines.append(line)

                if section_lines:
                    context = '\n'.join(section_lines[:5])
                    return f"Yes, I found information about {target_section.upper()} in the document:\n\n{context}"

    print(f"❌ Section {target_section} not found in documents")
    return None

app = Flask(__name__)

# Rate limiting configuration
class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self):
        self.requests = defaultdict(deque)  # IP -> deque of request timestamps
        self.limits = {
            'upload': {'requests': 5, 'window': 300},    # 5 uploads per 5 minutes
            'query': {'requests': 30, 'window': 60},     # 30 queries per minute
            'general': {'requests': 100, 'window': 60}   # 100 general requests per minute
        }
    
    def is_allowed(self, client_ip: str, endpoint_type: str = 'general') -> tuple[bool, dict]:
        """Check if request is within rate limits."""
        now = datetime.now()
        window_start = now - timedelta(seconds=self.limits[endpoint_type]['window'])
        
        # Clean old requests outside window
        client_requests = self.requests[client_ip]
        while client_requests and client_requests[0] < window_start:
            client_requests.popleft()
        
        # Check if limit exceeded
        request_count = len(client_requests)
        limit = self.limits[endpoint_type]['requests']
        
        if request_count >= limit:
            return False, {
                'requests_made': request_count,
                'limit': limit,
                'window_seconds': self.limits[endpoint_type]['window'],
                'reset_time': (client_requests[0] + timedelta(seconds=self.limits[endpoint_type]['window'])).isoformat()
            }
        
        # Add current request
        client_requests.append(now)
        
        return True, {
            'requests_made': request_count + 1,
            'limit': limit,
            'window_seconds': self.limits[endpoint_type]['window']
        }

# Initialize rate limiter
rate_limiter = RateLimiter()

def rate_limit(endpoint_type: str = 'general'):
    """Decorator to apply rate limiting to endpoints."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP (handle proxies)
            client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', 
                                          request.environ.get('HTTP_X_REAL_IP', 
                                                            request.remote_addr))
            if ',' in client_ip:
                client_ip = client_ip.split(',')[0].strip()
            
            # Check rate limit
            allowed, limit_info = rate_limiter.is_allowed(client_ip, endpoint_type)
            
            if not allowed:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many {endpoint_type} requests. Try again later.',
                    'rate_limit_info': limit_info
                }), 429
            
            # Add rate limit headers to response
            response = f(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Limit'] = str(limit_info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(limit_info['limit'] - limit_info['requests_made'])
                response.headers['X-RateLimit-Window'] = str(limit_info['window_seconds'])
            
            return response
            
        return decorated_function
    return decorator

# Configure environment and authentication using validated config
ENVIRONMENT = validated_config.get('FLASK_ENV', 'development')

# Authentication configuration
class BasicAuth:
    """Simple API key-based authentication system."""
    
    def __init__(self):
        self.enabled = ENVIRONMENT == 'production'
        self.api_keys = self._load_api_keys()
        
        if self.enabled and not self.api_keys:
            print("⚠️ WARNING: Production mode enabled but no API keys configured!")
            print("Set API_KEYS environment variable with comma-separated keys")
    
    def _load_api_keys(self) -> set:
        """Load API keys from environment."""
        if not self.enabled:
            return set()
        
        api_keys_str = os.environ.get('API_KEYS', '')
        if not api_keys_str:
            # Generate a default key for first-time setup
            default_key = secrets.token_urlsafe(32)
            print(f"🔑 Generated default API key for production: {default_key}")
            print("💡 Set API_KEYS environment variable for custom keys")
            return {default_key}
        
        return {key.strip() for key in api_keys_str.split(',') if key.strip()}
    
    def is_valid_key(self, api_key: str) -> bool:
        """Check if provided API key is valid."""
        if not self.enabled:
            return True  # No auth in development
        
        if not api_key:
            return False
        
        return api_key in self.api_keys
    
    def get_api_key_from_request(self) -> str:
        """Extract API key from request headers or query params."""
        # Try Authorization header first
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        
        # Try X-API-Key header
        api_key = request.headers.get('X-API-Key', '')
        if api_key:
            return api_key
        
        # Try query parameter (less secure, for development)
        return request.args.get('api_key', '')

# Initialize authentication
auth_system = BasicAuth()

def require_auth():
    """Decorator to require authentication for endpoints."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not auth_system.enabled:
                return f(*args, **kwargs)
            
            api_key = auth_system.get_api_key_from_request()
            
            if not auth_system.is_valid_key(api_key):
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Invalid or missing API key. Include valid API key in Authorization header.',
                    'status': 'unauthorized'
                }), 401
            
            return f(*args, **kwargs)
            
        return decorated_function
    return decorator
if ENVIRONMENT == 'production':
    # Production CORS - restrict to known domains
    allowed_origins = [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://contract-advisor.yourdomain.com'
    ]
    # Allow additional origins from environment variable
    extra_origins = os.environ.get('ALLOWED_ORIGINS', '')
    if extra_origins:
        allowed_origins.extend([origin.strip() for origin in extra_origins.split(',')])
    
    CORS(app, 
         origins=allowed_origins,
         methods=['GET', 'POST', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Session-ID', 'X-User-ID'],
         supports_credentials=True,
         max_age=600)  # Cache preflight for 10 minutes
    print(f"✓ Production CORS configured for origins: {allowed_origins}")
else:
    # Development CORS - allow all origins for development
    CORS(app,
         origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
         methods=['GET', 'POST', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Session-ID', 'X-User-ID'],
         supports_credentials=True)
    print("✓ Development CORS configured for localhost")

# Configure secure upload directory outside web root
if ENVIRONMENT == 'production':
    # Production: Use secure directory outside web root
    upload_dir = os.environ.get('SECURE_UPLOAD_DIR', '/var/lib/contract-advisor/uploads')
else:
    # Development: Use uploads directory in project
    upload_dir = '../data/uploads'  # Move outside backend directory

# Configure Flask sessions using validated config
app.config['SECRET_KEY'] = validated_config.get('FLASK_SECRET_KEY', 'dev-key-change-in-production')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
session_timeout_minutes = int(validated_config.get('SESSION_TIMEOUT_MINUTES', '30'))
app.config['PERMANENT_SESSION_LIFETIME'] = session_timeout_minutes * 60  # Convert to seconds

# Configure file upload limits using validated config
max_upload_size = int(validated_config.get('MAX_UPLOAD_SIZE', '16777216'))
app.config['MAX_CONTENT_LENGTH'] = max_upload_size
app.config['UPLOAD_FOLDER'] = upload_dir

# Use validated configuration values
# OLLAMA_MODEL_NAME = validated_config.get('OLLAMA_MODEL_NAME', 'llama3.2:3b-instruct-q4_0')  # DEPRECATED
GROQ_MODEL_NAME = validated_config.get('GROQ_MODEL_NAME', 'llama-3.3-70b-versatile')
vector_db_path = os.environ.get('VECTOR_DB_PATH', '../data/chroma_db/')

# Feature flags system
class FeatureFlags:
    """Manages feature flags for experimental and optional features."""
    
    def __init__(self):
        self.flags = {
            # RAG Pipeline Features
            'hybrid_search': self._get_bool_env('FEATURE_HYBRID_SEARCH', True),
            'query_caching': self._get_bool_env('FEATURE_QUERY_CACHING', True),
            'batch_processing': self._get_bool_env('FEATURE_BATCH_PROCESSING', True),
            'async_embeddings': self._get_bool_env('FEATURE_ASYNC_EMBEDDINGS', True),
            
            # Analytics and Monitoring
            'performance_monitoring': self._get_bool_env('FEATURE_PERFORMANCE_MONITORING', True),
            'usage_analytics': self._get_bool_env('FEATURE_USAGE_ANALYTICS', False),
            
            # Debug Features (development only)
            'debug_logging': self._get_bool_env('FEATURE_DEBUG_LOGGING', False),
            'verbose_errors': self._get_bool_env('FEATURE_VERBOSE_ERRORS', False),
            
            # Experimental Features
            'auto_retry_failed_queries': self._get_bool_env('FEATURE_AUTO_RETRY', False),
            'smart_chunk_sizing': self._get_bool_env('FEATURE_SMART_CHUNKING', False),
            'multi_model_fallback': self._get_bool_env('FEATURE_MULTI_MODEL', False),
        }
        
        # Disable debug features in production
        if ENVIRONMENT == 'production':
            self.flags['debug_logging'] = False
            self.flags['verbose_errors'] = False
        
        # Log enabled features
        enabled_features = [name for name, enabled in self.flags.items() if enabled]
        if enabled_features:
            print(f"🎛️ Feature flags enabled: {', '.join(enabled_features)}")
        
        disabled_features = [name for name, enabled in self.flags.items() if not enabled]
        if disabled_features and ENVIRONMENT == 'development':
            print(f"🎛️ Feature flags disabled: {', '.join(disabled_features)}")
    
    def _get_bool_env(self, key: str, default: bool) -> bool:
        """Parse boolean environment variable."""
        value = os.environ.get(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on', 'enabled')
    
    def is_enabled(self, feature: str) -> bool:
        """Check if a feature flag is enabled."""
        return self.flags.get(feature, False)
    
    def enable(self, feature: str):
        """Enable a feature flag at runtime."""
        if feature in self.flags:
            self.flags[feature] = True
            print(f"✅ Enabled feature: {feature}")
    
    def disable(self, feature: str):
        """Disable a feature flag at runtime."""
        if feature in self.flags:
            self.flags[feature] = False
            print(f"❌ Disabled feature: {feature}")
    
    def get_all(self) -> dict:
        """Get all feature flags."""
        return self.flags.copy()

# Initialize feature flags
feature_flags = FeatureFlags()

ALLOWED_EXTENSIONS = set(['txt', 'pdf', 'docx', 'doc'])

vector_store_db = '../data/chroma_db'

# Remove global qa_chain - now managed by SessionManager
print("✓ Server configured with session-based state management")
print(f"📁 Upload directory: {upload_dir}")

# Ensure upload directory exists with proper permissions
try:
    os.makedirs(upload_dir, exist_ok=True)
    # Set restrictive permissions in production
    if ENVIRONMENT == 'production':
        os.chmod(upload_dir, 0o750)  # rwxr-x---
    print(f"✓ Upload directory configured: {upload_dir}")
except Exception as e:
    print(f"⚠️ Upload directory setup warning: {e}")

@app.errorhandler(RequestEntityTooLarge)
def handle_file_size_error(error):
    return jsonify({
        'message': 'File size exceeds maximum limit (16MB). Please upload a smaller file.',
        'status': 'failed',
        'error': 'file_too_large'
    }), 413
 
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_user_input(user_input: str, max_length: int = 1000) -> str:
    """Sanitize user input to prevent injection attacks."""
    if not user_input or not isinstance(user_input, str):
        return ""
    
    # Limit input length
    user_input = user_input[:max_length]
    
    # Remove/escape HTML tags
    user_input = html.escape(user_input)
    
    # Remove potential script injections (basic protection)
    dangerous_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'vbscript:',
        r'onload=',
        r'onerror=',
        r'onclick=',
        r'onmouseover='
    ]
    
    for pattern in dangerous_patterns:
        user_input = re.sub(pattern, '', user_input, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove excessive whitespace
    user_input = re.sub(r'\s+', ' ', user_input).strip()
    
    return user_input

def validate_prompt(prompt: str) -> tuple[bool, str]:
    """Validate and sanitize user prompt."""
    if not prompt:
        return False, "Empty prompt provided"
    
    # Check for minimum meaningful length
    if len(prompt.strip()) < 2:
        return False, "Prompt too short. Please provide a meaningful question."
    
    # Check for maximum length
    if len(prompt) > 2000:
        return False, "Prompt too long. Please limit to 2000 characters."
    
    # Check for suspicious patterns
    suspicious_patterns = [
        r'(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)',  # SQL injection
        r'(\beval\b|\bexec\b|\b__import__\b)',  # Code execution
        r'(\bfile://\b|\bftp://\b)',  # File access
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, prompt, re.IGNORECASE):
            return False, "Prompt contains potentially unsafe content. Please rephrase your question."
    
    return True, "Valid"

def sanitize_response_data(data: dict) -> dict:
    """Sanitize response data to prevent XSS attacks."""
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, value in data.items():
        if key == 'result' or key == 'content':
            # Don't escape AI responses and document content - they're safe from our RAG system
            sanitized[key] = value
        elif key == 'source_documents' and isinstance(value, list):
            # Don't escape source document content
            sanitized[key] = value
        elif isinstance(value, str):
            # Escape HTML in other string values (like error messages)
            sanitized[key] = html.escape(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_response_data(value)
        elif isinstance(value, list):
            sanitized[key] = [sanitize_response_data(item) if isinstance(item, dict)
                             else html.escape(str(item)) if isinstance(item, str)
                             else item for item in value]
        else:
            sanitized[key] = value

    return sanitized

def validate_file_content(file_path: str, filename: str) -> bool:
    """Validate that uploaded file content matches its extension."""
    try:
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        # Read first few bytes to check file signatures
        with open(file_path, 'rb') as f:
            header = f.read(1024)  # Read first 1KB
        
        # PDF files
        if file_ext == 'pdf':
            return header.startswith(b'%PDF-')
        
        # DOCX/DOC files (Microsoft Office)
        elif file_ext in ['docx', 'doc']:
            # DOCX files are ZIP archives with specific signatures
            if file_ext == 'docx':
                return (header.startswith(b'PK\x03\x04') or 
                       header.startswith(b'PK\x05\x06') or 
                       header.startswith(b'PK\x07\x08'))
            # DOC files have compound document header
            else:
                return (header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1') or
                       header.startswith(b'\x0d\x44\x4f\x43'))
        
        # TXT files - should be readable text (allow UTF-8, ASCII)
        elif file_ext == 'txt':
            try:
                # Try to decode as UTF-8
                with open(file_path, 'r', encoding='utf-8') as f:
                    f.read(512)  # Try reading some content
                return True
            except UnicodeDecodeError:
                try:
                    # Try ASCII as fallback
                    with open(file_path, 'r', encoding='ascii') as f:
                        f.read(512)
                    return True
                except UnicodeDecodeError:
                    return False
        
        return False
        
    except Exception as e:
        print(f"⚠️ File validation error: {e}")
        return False

    
@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/upload_file', methods=['POST'])
@rate_limit('upload')
def upload_file():
    """Upload file and create session-based QA chain."""
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({
                "message": 'No file part in the request',
                "status": 'failed'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                "message": 'No selected file',
                "status": 'failed'
            }), 400
        
        if not file or not allowed_file(file.filename):
            return jsonify({
                "message": 'File type is not allowed. Supported: PDF, DOC, DOCX, TXT',
                "status": 'failed'
            }), 400
        
        # Secure file handling with additional sanitization
        raw_filename = file.filename
        filename = secure_filename(raw_filename)
        
        # Additional filename validation
        if not filename or filename != raw_filename:
            print(f"⚠️ Filename sanitized: '{raw_filename}' -> '{filename}'")
        
        file_path = os.path.join(upload_dir, filename)
        
        print(f"📁 Uploading file: {filename}")
        file.save(file_path)
        
        # Validate file content matches extension
        if not validate_file_content(file_path, filename):
            # Clean up uploaded file
            try:
                os.remove(file_path)
            except OSError:
                pass
            return jsonify({
                "message": f'File content validation failed. The file does not appear to be a valid {filename.rsplit(".", 1)[1].upper()} document.',
                "status": 'failed',
                "error": 'invalid_file_content'
            }), 400
        
        print(f"✓ File content validated: {filename}")
        
        # Create session for this file
        raw_user_id = request.headers.get('X-User-ID', 'anonymous')
        user_id = sanitize_user_input(raw_user_id, max_length=50) or 'anonymous'  # Optional user identification
        session_id = session_manager.create_session(file_path, user_id)
        print(f"🎯 DEBUG: Session created successfully: {session_id[:8]}...")

        # Store session ID in Flask session
        session['rag_session_id'] = session_id
        print(f"🎯 DEBUG: Session stored in Flask session")
        
        # Return success immediately, process QA chain asynchronously
        import threading
        import sys

        def async_initialize():
            """Initialize QA chain in background thread."""
            # CRITICAL: Ensure stdout/stderr are flushed in background thread
            sys.stdout.flush()
            sys.stderr.flush()

            print(f"\n🚀 Background thread STARTED for session: {session_id[:8]}...", flush=True)
            print(f"📁 Processing file: {file_path}", flush=True)

            try:
                print(f"🔍 Checking session exists...", flush=True)
                session_obj = session_manager.sessions.get(session_id)
                if not session_obj:
                    raise Exception(f"Session {session_id[:8]}... not found!")

                print(f"✓ Session found with file: {session_obj.file_path}", flush=True)

                print(f"🔄 Initializing QA chain...", flush=True)
                success = session_manager.initialize_qa_chain(session_id)

                if success:
                    print(f"✅ Background processing COMPLETED for session: {session_id[:8]}...", flush=True)
                else:
                    print(f"❌ QA chain initialization returned False for session: {session_id[:8]}...", flush=True)

            except Exception as e:
                print(f"❌ Background processing FAILED for session {session_id[:8]}...", flush=True)
                print(f"Error: {e}", flush=True)
                import traceback
                print("Traceback:", flush=True)
                traceback.print_exc(file=sys.stdout)

        # Start background processing
        print(f"🧵 Starting background thread for session: {session_id[:8]}...", flush=True)
        thread = threading.Thread(target=async_initialize, daemon=False)  # CHANGED: daemon=False to ensure thread completes
        thread.start()
        print(f"✅ Background thread launched (non-daemon) for session: {session_id[:8]}...", flush=True)
        
        # Return immediate success
        return jsonify({
            'message': 'File uploaded successfully. Processing in background.',
            'status': 'success',
            'session_id': session_id[:8] + '...',
            'file_name': filename,
            'processing_status': 'in_progress'
        }), 201
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return jsonify({
            "message": f"Upload failed: {str(e)}",
            "status": 'failed'
        }), 500

@app.route('/status', methods=['GET'])
def get_status():
    """Get processing status for current session."""
    try:
        session_id = session.get('rag_session_id')
        if not session_id:
            return jsonify({
                'status': 'no_session',
                'message': 'No active session found'
            }), 404
        
        session_info = session_manager.get_session_info(session_id)
        if not session_info:
            return jsonify({
                'status': 'session_expired',
                'message': 'Session not found or expired'
            }), 404
        
        # Check if QA chain is ready
        with session_manager.lock:
            session_obj = session_manager.sessions.get(session_id)
            is_ready = session_obj and session_obj.qa_chain is not None
        
        return jsonify({
            'status': 'ready' if is_ready else 'processing',
            'message': 'QA system ready' if is_ready else 'Still processing document...',
            'session_info': session_info
        }), 200
        
    except Exception as e:
        print(f"❌ Status check error: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Status check failed: {str(e)}'
        }), 500

@app.route('/ask_ai', methods=['POST'])
@rate_limit('query')
def query_endpoint():
    """Process question using session-based QA chain."""
    print("🔍 DEBUG: Query endpoint accessed")
    start_time = time.time()

    try:
        print("🔍 DEBUG: Starting request validation")
        # Validate request
        data = request.get_json()
        if not data or 'prompt' not in data:
            print("🔍 DEBUG: No prompt provided, returning 400")
            return jsonify({
                'error': 'No prompt provided in request'
            }), 400
        
        raw_prompt = data.get('prompt', '').strip()
        
        # Validate and sanitize user input
        is_valid, validation_message = validate_prompt(raw_prompt)
        if not is_valid:
            return jsonify({
                'error': validation_message
            }), 400
        
        # Sanitize the input
        user_question = sanitize_user_input(raw_prompt, max_length=2000)
        
        print(f"❓ Question: {user_question}")
        
        # Get session ID from Flask session or request header
        session_id = session.get('rag_session_id') or request.headers.get('X-Session-ID')
        
        # Fallback: Use the most recent active session if none specified
        if not session_id:
            active_session_ids = session_manager.get_active_session_ids()
            if active_session_ids:
                # Get the most recently created session (first in sorted list)
                session_id = active_session_ids[0]
                print(f"🔄 Using most recent session: {session_id[:8]}...")
            else:
                return jsonify({
                    'error': 'No active session. Please upload a document first.',
                    'status': 'no_session'
                }), 400
        
        # Get QA chain from session
        qa_chain = session_manager.get_qa_chain(session_id)
        
        if not qa_chain:
            # Check if session exists but QA chain is still processing
            session_info = session_manager.get_session_info(session_id)
            if session_info:
                return jsonify({
                    'error': 'Document is still being processed. Please wait a moment and try again.',
                    'status': 'processing'
                }), 202  # Accepted but not yet processed
            else:
                return jsonify({
                    'error': 'Session expired or not found. Please re-upload your document.',
                    'status': 'session_expired'
                }), 400
        
        # Process question
        print(f"🤖 Processing question for session: {session_id[:8]}...")

        # Get chat history from request or use empty list
        chat_history = data.get('chat_history', [])

        # 🎯 SECTION SEARCH FALLBACK: Check for section references and do direct search
        section_response = None
        if any(pattern in user_question.lower() for pattern in ['section', 'iv.15', 'iv.14', 'iv.13', 'iv.12', 'iv.', 'article']):
            print(f"🔍 SECTION REFERENCE DETECTED: '{user_question}'")
            # Get documents from session to search directly
            session_documents = session_manager.get_session_documents(session_id)
            if session_documents:
                section_response = search_section_directly(user_question, session_documents)
                if section_response:
                    print(f"✅ Found section directly: {section_response[:100]}...")

        # Invoke QA chain
        response_node = qa_chain.invoke({
            "question": user_question,
            "chat_history": chat_history
        })

        # Override with section response if found
        if section_response:
            response_node['answer'] = section_response
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Update session statistics
        session_manager.update_session_stats(session_id, response_time, had_error=False)
        
        # Get session info for response
        session_info = session_manager.get_session_info(session_id)
        
        print(f"✅ Response generated in {response_time:.2f}s for session: {session_id[:8]}...")
        
        # Prepare response data
        response_data = {
            'result': response_node.get('answer', 'No answer generated'),
            'response_time': round(response_time, 2),
            'session_info': {
                'session_id': session_id[:8] + '...',
                'query_count': session_info.get('query_count', 0) if session_info else 0
            },
            'source_documents': [
                {
                    'content': doc.page_content[:200] + '...' if len(doc.page_content) > 200 else doc.page_content,
                    'metadata': getattr(doc, 'metadata', {})
                } 
                for doc in response_node.get('source_documents', [])
            ] if 'source_documents' in response_node else []
        }
        
        # Sanitize response data to prevent XSS attacks
        sanitized_response = sanitize_response_data(response_data)
        
        return jsonify(sanitized_response)

    except Exception as e:
        response_time = time.time() - start_time
        
        # Update session with error if session exists
        session_id = session.get('rag_session_id')
        if session_id:
            session_manager.update_session_stats(session_id, response_time, had_error=True)
        
        print(f"❌ Query error: {e}")
        
        return jsonify({
            'error': f"An error occurred while processing your question: {str(e)}",
            'response_time': round(response_time, 2)
        }), 500


@app.route('/session/info', methods=['GET'])
@rate_limit('general')
def get_session_info():
    """Get information about the current session."""
    try:
        session_id = session.get('rag_session_id')
        if not session_id:
            return jsonify({
                'error': 'No active session',
                'status': 'no_session'
            }), 404
        
        session_info = session_manager.get_session_info(session_id)
        if not session_info:
            return jsonify({
                'error': 'Session not found or expired',
                'status': 'session_expired'
            }), 404
        
        return jsonify({
            'session_info': session_info,
            'status': 'active'
        })
        
    except Exception as e:
        return jsonify({
            'error': f"Failed to get session info: {str(e)}"
        }), 500


@app.route('/session/list', methods=['GET'])
@require_auth()
@rate_limit('general')
def list_sessions():
    """List all active sessions (for debugging/monitoring)."""
    try:
        active_sessions = session_manager.list_active_sessions()
        return jsonify({
            'active_sessions': active_sessions,
            'total_count': len(active_sessions)
        })
    except Exception as e:
        return jsonify({
            'error': f"Failed to list sessions: {str(e)}"
        }), 500


@app.route('/session/cleanup', methods=['POST'])
@require_auth()
@rate_limit('general')
def cleanup_sessions():
    """Manually trigger session cleanup."""
    try:
        cleaned_count = session_manager.cleanup_all_sessions()
        return jsonify({
            'message': f'Cleaned up {cleaned_count} expired sessions',
            'cleaned_count': cleaned_count
        })
    except Exception as e:
        return jsonify({
            'error': f"Failed to cleanup sessions: {str(e)}"
        }), 500


@app.route('/features', methods=['GET'])
@rate_limit('general')
def get_feature_flags():
    """Get current feature flag status."""
    try:
        return jsonify({
            'feature_flags': feature_flags.get_all(),
            'environment': ENVIRONMENT,
            'message': 'Feature flags retrieved successfully'
        })
    except Exception as e:
        return jsonify({
            'error': f"Failed to get feature flags: {str(e)}"
        }), 500


@app.route('/features/<feature_name>', methods=['POST'])
@require_auth()
@rate_limit('general')
def toggle_feature_flag(feature_name):
    """Toggle a feature flag (development only)."""
    try:
        if ENVIRONMENT == 'production':
            return jsonify({
                'error': 'Feature flag modification not allowed in production',
                'message': 'Use environment variables to configure features in production'
            }), 403
        
        data = request.get_json() or {}
        action = data.get('action', 'toggle').lower()
        
        current_status = feature_flags.is_enabled(feature_name)
        
        if action == 'enable':
            feature_flags.enable(feature_name)
            new_status = True
        elif action == 'disable':
            feature_flags.disable(feature_name)
            new_status = False
        elif action == 'toggle':
            if current_status:
                feature_flags.disable(feature_name)
                new_status = False
            else:
                feature_flags.enable(feature_name)
                new_status = True
        else:
            return jsonify({
                'error': 'Invalid action. Use: enable, disable, or toggle'
            }), 400
        
        return jsonify({
            'feature': feature_name,
            'previous_status': current_status,
            'current_status': new_status,
            'message': f'Feature {feature_name} {"enabled" if new_status else "disabled"}'
        })
        
    except Exception as e:
        return jsonify({
            'error': f"Failed to toggle feature flag: {str(e)}"
        }), 500


@app.route('/config', methods=['GET'])
@require_auth()
@rate_limit('general')
def get_configuration():
    """Get current configuration summary (debugging/monitoring)."""
    try:
        if ENVIRONMENT == 'production':
            # In production, only show safe configuration details
            return jsonify({
                'environment': ENVIRONMENT,
                'server_port': validated_config.get('SERVER_PORT', '8081'),
                'authentication_enabled': auth_system.enabled,
                'ssl_enabled': bool(os.environ.get('SSL_CERT_PATH')),
                'features_enabled': len([f for f, enabled in feature_flags.get_all().items() if enabled]),
                'message': 'Limited configuration info in production'
            })
        else:
            # In development, show full configuration
            config_summary = config_validator.export_config_summary()
            return jsonify({
                'configuration': config_summary,
                'validation_warnings': config_validator.warnings,
                'message': 'Full configuration details (development mode)'
            })
            
    except Exception as e:
        return jsonify({
            'error': f"Failed to get configuration: {str(e)}"
        }), 500


@app.route('/config/reload', methods=['POST'])
@require_auth()
@rate_limit('general')
def reload_configuration():
    """Reload configuration without restarting (development only)."""
    try:
        if ENVIRONMENT == 'production':
            return jsonify({
                'error': 'Configuration reload not allowed in production',
                'message': 'Restart the server to apply configuration changes in production'
            }), 403
        
        # Reload environment variables
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        # Re-initialize components that can be hot-reloaded
        reloaded_components = []
        
        # Reload feature flags
        global feature_flags
        old_flags = feature_flags.get_all()
        feature_flags = FeatureFlags()
        new_flags = feature_flags.get_all()
        
        if old_flags != new_flags:
            reloaded_components.append('feature_flags')
        
        # Reload rate limiter settings
        global rate_limiter
        old_limits = rate_limiter.limits
        rate_limiter = RateLimiter()
        
        if old_limits != rate_limiter.limits:
            reloaded_components.append('rate_limiter')
        
        # Reload auth system
        global auth_system
        old_api_keys = len(auth_system.api_keys) if hasattr(auth_system, 'api_keys') else 0
        auth_system = BasicAuth()
        new_api_keys = len(auth_system.api_keys) if hasattr(auth_system, 'api_keys') else 0
        
        if old_api_keys != new_api_keys:
            reloaded_components.append('authentication')
        
        # Validate new configuration
        global config_validator, validated_config
        config_validator = ConfigValidator()
        new_validated_config = config_validator.validate_all()
        
        if new_validated_config is None:
            return jsonify({
                'error': 'Configuration validation failed after reload',
                'validation_errors': config_validator.errors,
                'message': 'Configuration not applied due to validation errors'
            }), 400
        
        validated_config = new_validated_config
        reloaded_components.append('configuration_validation')
        
        return jsonify({
            'message': 'Configuration reloaded successfully',
            'reloaded_components': reloaded_components,
            'timestamp': datetime.now().isoformat(),
            'warnings': config_validator.warnings if config_validator.warnings else None
        })
        
    except Exception as e:
        return jsonify({
            'error': f"Failed to reload configuration: {str(e)}",
            'message': 'Configuration may be in an inconsistent state. Consider restarting the server.'
        }), 500


if __name__ == '__main__':
    print("🚀 Starting Flask server with session management...")
    print(f"🔧 Environment: {ENVIRONMENT}")
    print(f"🔐 Authentication: {'Enabled' if auth_system.enabled else 'Disabled (Development)'}")
    if auth_system.enabled:
        print(f"🔑 API Keys configured: {len(auth_system.api_keys)} key(s)")
    print("📊 Available endpoints:")
    print("  POST /upload_file - Upload document and create session")
    print("  POST /ask_ai - Query document using session-based QA chain")
    print("  GET /session/info - Get current session information")
    print("  GET /session/list - List all active sessions (auth required)")
    print("  POST /session/cleanup - Cleanup expired sessions (auth required)")
    print("  GET /features - Get current feature flag status")
    if ENVIRONMENT == 'development':
        print("  POST /features/<name> - Toggle feature flags (development only)")
    print("  GET /config - Get configuration summary (auth required)")
    if ENVIRONMENT == 'development':
        print("  POST /config/reload - Reload configuration (development only, auth required)")
    print("🔒 Security features: CORS, Rate limiting, Input sanitization, File validation")
    
    # Configure HTTPS for production using validated config
    server_port = int(validated_config.get('SERVER_PORT', '8081'))
    
    if ENVIRONMENT == 'production':
        ssl_cert = os.environ.get('SSL_CERT_PATH', 'cert.pem')
        ssl_key = os.environ.get('SSL_KEY_PATH', 'key.pem')
        
        if os.path.exists(ssl_cert) and os.path.exists(ssl_key):
            print(f"🔐 Starting server with HTTPS on port {server_port}...")
            app.run(host='0.0.0.0', port=server_port, ssl_context=(ssl_cert, ssl_key), debug=False)
        else:
            print("⚠️ SSL certificates not found. Starting without HTTPS.")
            print("💡 To enable HTTPS:")
            print("   - Set SSL_CERT_PATH environment variable to certificate file path")
            print("   - Set SSL_KEY_PATH environment variable to private key file path")
            print("   - Or use a reverse proxy like nginx for SSL termination")
            app.run(host='0.0.0.0', port=server_port, debug=False)
    else:
        # Development server without SSL
        app.run(debug=True, port=server_port)