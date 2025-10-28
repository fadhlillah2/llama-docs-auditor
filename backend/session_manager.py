"""
Session Management System for RAG Pipeline
Replaces global state with secure session-based state management
"""

import os
import time
import hashlib
import threading
from typing import Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import sys

# Fix import path for RAG pipeline
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rag_path = os.path.join(project_root, 'rag')
if rag_path not in sys.path:
    sys.path.insert(0, rag_path)

try:
    # Try to import enhanced RAG pipeline first
    from rag.enhanced_rag_pipeline import EnhancedRAGPipeline
    RAGPipeline = EnhancedRAGPipeline  # Alias for compatibility
    print("✅ Session Manager using Enhanced RAG Pipeline")
    ENHANCED_RAG_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Enhanced RAG Pipeline not available in session manager: {e}")
    try:
        from rag_pipeline import RAGPipeline
        ENHANCED_RAG_AVAILABLE = False
        print("✅ Session Manager using original RAG Pipeline")
    except ImportError as e2:
        print(f"⚠️ Warning: Could not import any RAGPipeline: {e2}")
        # Fallback - will be handled later
        RAGPipeline = None
        ENHANCED_RAG_AVAILABLE = False

@dataclass
class SessionData:
    """Data structure for session information."""
    session_id: str
    qa_chain: Optional[Any]
    file_path: str
    created_at: datetime
    last_accessed: datetime
    query_count: int = 0
    performance_stats: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.performance_stats is None:
            self.performance_stats = {
                'total_queries': 0,
                'avg_response_time': 0.0,
                'cache_hits': 0,
                'errors': 0
            }

class SessionManager:
    """Thread-safe session manager for RAG pipeline state."""
    
    def __init__(self, session_timeout_minutes: int = 30, cleanup_interval_minutes: int = 10):
        self.sessions: Dict[str, SessionData] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        self.cleanup_interval = timedelta(minutes=cleanup_interval_minutes)
        self.lock = threading.RLock()  # Reentrant lock for thread safety
        self.vector_db_path = "../data/chroma_db"
        
        # Start cleanup thread
        self._start_cleanup_thread()
        print(f"✓ SessionManager initialized with {session_timeout_minutes}min timeout")
    
    def create_session(self, file_path: str, user_identifier: str = None) -> str:
        """Create a new session for document processing."""
        with self.lock:
            try:
                # Generate session ID
                session_id = self._generate_session_id(file_path, user_identifier)
                
                # Check if session already exists and is still valid
                if session_id in self.sessions:
                    existing_session = self.sessions[session_id]
                    if self._is_session_valid(existing_session):
                        existing_session.last_accessed = datetime.now()
                        print(f"✓ Reusing existing session: {session_id[:8]}...")
                        return session_id
                    else:
                        # Clean up expired session
                        self._cleanup_session(session_id)
                
                # Create new session
                session_data = SessionData(
                    session_id=session_id,
                    qa_chain=None,
                    file_path=file_path,
                    created_at=datetime.now(),
                    last_accessed=datetime.now()
                )
                
                self.sessions[session_id] = session_data
                print(f"✓ Created new session: {session_id[:8]}... for file: {os.path.basename(file_path)}")
                
                return session_id
                
            except Exception as e:
                print(f"❌ Failed to create session: {e}")
                raise e
    
    def initialize_qa_chain(self, session_id: str) -> bool:
        """Initialize QA chain for a session."""
        with self.lock:
            try:
                session = self.sessions.get(session_id)
                if not session:
                    print(f"❌ Session not found: {session_id[:8]}...")
                    return False

                if not self._is_session_valid(session):
                    print(f"❌ Session expired: {session_id[:8]}...")
                    self._cleanup_session(session_id)
                    return False

                # Check if QA chain already exists
                if session.qa_chain is not None:
                    session.last_accessed = datetime.now()
                    print(f"✓ QA chain already initialized for session: {session_id[:8]}...")
                    return True

                # Verify file exists before processing
                if not os.path.exists(session.file_path):
                    print(f"❌ File not found: {session.file_path}")
                    return False

                print(f"📁 Using file path: {session.file_path}")

                # Initialize RAG pipeline with FULL FILE PATH
                print(f"🚀 Initializing QA chain for session: {session_id[:8]}...")
                rag_pipeline = RAGPipeline(
                    uploaded_file=session.file_path,  # FIXED: Pass full path, not just filename
                    vector_db_path=self.vector_db_path
                )

                qa_chain = rag_pipeline.qa_chain()
                if qa_chain is None:
                    print(f"❌ Failed to create QA chain for session: {session_id[:8]}...")
                    return False

                # Store QA chain in session
                session.qa_chain = qa_chain
                session.last_accessed = datetime.now()

                print(f"✓ QA chain initialized successfully for session: {session_id[:8]}...")
                return True

            except Exception as e:
                print(f"❌ Failed to initialize QA chain for session {session_id[:8]}...: {e}")
                import traceback
                traceback.print_exc()  # Print full traceback for debugging
                return False
    
    def get_qa_chain(self, session_id: str) -> Optional[Any]:
        """Get QA chain for a session."""
        with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                print(f"❌ Session not found: {session_id[:8]}...")
                return None
            
            if not self._is_session_valid(session):
                print(f"❌ Session expired: {session_id[:8]}...")
                self._cleanup_session(session_id)
                return None
            
            # Update access time
            session.last_accessed = datetime.now()
            return session.qa_chain
    
    def update_session_stats(self, session_id: str, query_time: float, had_error: bool = False) -> None:
        """Update session performance statistics."""
        with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                return
            
            session.query_count += 1
            session.performance_stats['total_queries'] += 1
            
            if had_error:
                session.performance_stats['errors'] += 1
            else:
                # Update average response time
                current_avg = session.performance_stats['avg_response_time']
                total_queries = session.performance_stats['total_queries']
                new_avg = ((current_avg * (total_queries - 1)) + query_time) / total_queries
                session.performance_stats['avg_response_time'] = new_avg
            
            session.last_accessed = datetime.now()
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information and statistics."""
        with self.lock:
            session = self.sessions.get(session_id)
            if not session or not self._is_session_valid(session):
                return None
            
            return {
                'session_id': session_id[:8] + '...',
                'file_name': os.path.basename(session.file_path),
                'created_at': session.created_at.isoformat(),
                'last_accessed': session.last_accessed.isoformat(),
                'query_count': session.query_count,
                'performance_stats': session.performance_stats.copy(),
                'is_initialized': session.qa_chain is not None,
                'expires_at': (session.last_accessed + self.session_timeout).isoformat()
            }
    
    def list_active_sessions(self) -> Dict[str, Dict[str, Any]]:
        """List all active sessions."""
        with self.lock:
            active_sessions = {}
            for session_id, session in self.sessions.items():
                if self._is_session_valid(session):
                    active_sessions[session_id[:8] + '...'] = {
                        'file_name': os.path.basename(session.file_path),
                        'created_at': session.created_at.isoformat(),
                        'query_count': session.query_count,
                        'is_initialized': session.qa_chain is not None
                    }
            
            return active_sessions
    
    def get_active_session_ids(self) -> list:
        """Get list of active session IDs (full IDs)."""
        with self.lock:
            active_ids = []
            for session_id, session in self.sessions.items():
                if self._is_session_valid(session):
                    active_ids.append(session_id)
            # Sort by creation time (most recent first)
            active_ids.sort(key=lambda sid: self.sessions[sid].created_at, reverse=True)
            return active_ids

    def get_all_sessions(self) -> list:
        """Get all session data (including inactive for analytics)."""
        with self.lock:
            all_sessions = []
            for session_id, session in self.sessions.items():
                all_sessions.append(session)
            # Sort by creation time (most recent first)
            all_sessions.sort(key=lambda s: s.created_at, reverse=True)
            return all_sessions
    
    def cleanup_session(self, session_id: str) -> bool:
        """Manually cleanup a specific session."""
        with self.lock:
            return self._cleanup_session(session_id)

    def get_session_documents(self, session_id: str) -> Optional[list]:
        """Get documents from session for direct search."""
        with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                return None

            try:
                # Try to get documents from the QA chain or RAG pipeline
                if session.qa_chain and hasattr(session.qa_chain, 'retriever'):
                    # If the QA chain has a retriever, try to get documents from it
                    retriever = session.qa_chain.retriever
                    if hasattr(retriever, '_chunks'):
                        return retriever._chunks
                    elif hasattr(retriever, 'docstore') and retriever.docstore:
                        # Try to get from docstore
                        docs = list(retriever.docstore.docs.values())
                        return docs

                # Fallback: Try to load documents from file path
                if session.file_path:
                    from data_loader import LoadDocuments
                    loader = LoadDocuments()
                    documents = loader.load_document(session.file_path)
                    if documents:
                        return documents

                return None

            except Exception as e:
                print(f"⚠️ Error getting session documents: {e}")
                return None

    def cleanup_all_sessions(self) -> int:
        """Cleanup all expired sessions."""
        with self.lock:
            expired_sessions = []
            for session_id, session in self.sessions.items():
                if not self._is_session_valid(session):
                    expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                self._cleanup_session(session_id)
            
            if expired_sessions:
                print(f"🧹 Cleaned up {len(expired_sessions)} expired sessions")
            
            return len(expired_sessions)
    
    def _generate_session_id(self, file_path: str, user_identifier: str = None) -> str:
        """Generate unique session ID based on file and user."""
        # Use file path, size, and modification time for uniqueness
        try:
            file_stat = os.stat(file_path)
            base_string = f"{file_path}_{file_stat.st_size}_{file_stat.st_mtime}"
            if user_identifier:
                base_string += f"_{user_identifier}"
        except OSError:
            # Fallback if file doesn't exist yet
            base_string = f"{file_path}_{time.time()}"
            if user_identifier:
                base_string += f"_{user_identifier}"
        
        return hashlib.sha256(base_string.encode()).hexdigest()
    
    def _is_session_valid(self, session: SessionData) -> bool:
        """Check if session is still valid (not expired)."""
        return datetime.now() - session.last_accessed < self.session_timeout
    
    def _cleanup_session(self, session_id: str) -> bool:
        """Internal method to cleanup a session."""
        try:
            session = self.sessions.get(session_id)
            if session:
                # Cleanup QA chain resources if needed
                if session.qa_chain:
                    # The QA chain should handle its own cleanup
                    session.qa_chain = None
                
                del self.sessions[session_id]
                print(f"🧹 Cleaned up session: {session_id[:8]}...")
                return True
            return False
        except Exception as e:
            print(f"⚠️ Error cleaning up session {session_id[:8]}...: {e}")
            return False
    
    def _cleanup_expired_sessions(self):
        """Background task to cleanup expired sessions."""
        try:
            self.cleanup_all_sessions()
        except Exception as e:
            print(f"⚠️ Error in session cleanup: {e}")
    
    def _start_cleanup_thread(self):
        """Start background thread for session cleanup."""
        def cleanup_worker():
            while True:
                try:
                    time.sleep(self.cleanup_interval.total_seconds())
                    self._cleanup_expired_sessions()
                except Exception as e:
                    print(f"⚠️ Session cleanup thread error: {e}")
                    time.sleep(60)  # Wait a minute before retrying
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        print("✓ Session cleanup thread started")


# Global session manager instance
session_manager = SessionManager()