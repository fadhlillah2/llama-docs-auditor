#!/usr/bin/env python3
"""
High-Precision Contract Advisor RAG - Development Server
Enhanced development server with hot reload, auto-restart, and development tools
"""

import os
import sys
import subprocess
import time
import signal
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pathlib import Path

class DevelopmentServerHandler(FileSystemEventHandler):
    """Handler for file system events to trigger server restart."""
    
    def __init__(self, restart_callback):
        self.restart_callback = restart_callback
        self.debounce_time = 1.0  # Debounce file changes for 1 second
        self.last_restart = 0
    
    def on_modified(self, event):
        if event.is_directory:
            return
        
        # Only restart for Python files
        if not event.src_path.endswith('.py'):
            return
        
        # Debounce rapid file changes
        current_time = time.time()
        if current_time - self.last_restart < self.debounce_time:
            return
        
        print(f"🔄 File changed: {event.src_path}")
        self.last_restart = current_time
        self.restart_callback()

class DevelopmentServer:
    """Enhanced development server with hot reload capabilities."""
    
    def __init__(self):
        self.process = None
        self.observer = None
        self.should_restart = True
        
    def start_server(self):
        """Start the Flask development server."""
        if self.process:
            self.stop_server()
        
        print("🚀 Starting development server with hot reload...")
        
        # Set development environment variables
        env = os.environ.copy()
        env.update({
            'FLASK_ENV': 'development',
            'FLASK_DEBUG': '1',
            'PYTHONUNBUFFERED': '1',  # Ensure output is not buffered
            'PYTHONDONTWRITEBYTECODE': '1',  # Prevent .pyc files
        })
        
        # Start the server process
        self.process = subprocess.Popen([
            sys.executable, 'server.py'
        ], env=env, cwd=os.path.dirname(os.path.abspath(__file__)))
        
        print(f"✓ Server started with PID: {self.process.pid}")
        return self.process.pid
    
    def stop_server(self):
        """Stop the Flask development server."""
        if self.process:
            print("🛑 Stopping development server...")
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print("⚠️ Server didn't stop gracefully, forcing termination...")
                self.process.kill()
                self.process.wait()
            
            self.process = None
            print("✓ Server stopped")
    
    def restart_server(self):
        """Restart the Flask development server."""
        if not self.should_restart:
            return
        
        print("🔄 Restarting development server...")
        self.stop_server()
        time.sleep(0.5)  # Give a moment for cleanup
        self.start_server()
        print("✅ Server restarted successfully!")
    
    def setup_file_watcher(self):
        """Set up file system watcher for hot reload."""
        handler = DevelopmentServerHandler(self.restart_server)
        self.observer = Observer()
        
        # Watch the backend directory
        backend_path = Path(__file__).parent
        self.observer.schedule(handler, str(backend_path), recursive=True)
        
        # Watch the rag directory
        rag_path = backend_path.parent / 'rag'
        if rag_path.exists():
            self.observer.schedule(handler, str(rag_path), recursive=True)
        
        self.observer.start()
        print("👀 File watcher started - server will auto-restart on changes")
    
    def run(self):
        """Run the development server with hot reload."""
        print("🔧 High-Precision Contract Advisor RAG - Development Server")
        print("=" * 60)
        
        try:
            # Start the server
            self.start_server()
            
            # Setup file watcher
            self.setup_file_watcher()
            
            print("\n📋 Development Server Features:")
            print("• Hot reload on Python file changes")
            print("• Auto-restart on crash")
            print("• Development environment variables")
            print("• Enhanced logging and debugging")
            print("\n💡 Access your application at: http://127.0.0.1:8081")
            print("🛑 Press Ctrl+C to stop the development server\n")
            
            # Keep the main thread alive
            while True:
                if self.process and self.process.poll() is not None:
                    # Server process died, restart it
                    print("⚠️ Server process died, restarting...")
                    self.restart_server()
                
                time.sleep(1)
                
        except KeyboardInterrupt:
            print("\n🛑 Shutting down development server...")
            self.should_restart = False
            
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources."""
        if self.observer:
            self.observer.stop()
            self.observer.join()
        
        self.stop_server()
        print("✓ Development server shutdown complete")

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    print(f"\n🛑 Received signal {signum}, shutting down...")
    sys.exit(0)

if __name__ == '__main__':
    # Handle shutdown signals gracefully
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check if watchdog is installed
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError:
        print("❌ watchdog not installed. Install it with: pip install watchdog")
        print("💡 For now, the server will run without auto-restart on file changes")
        print("🚀 Starting basic development server...")
        
        # Fallback to basic server
        os.environ['FLASK_ENV'] = 'development'
        os.environ['FLASK_DEBUG'] = '1'
        exec(open('server.py').read())
        sys.exit(0)
    
    # Start the enhanced development server
    dev_server = DevelopmentServer()
    dev_server.run()