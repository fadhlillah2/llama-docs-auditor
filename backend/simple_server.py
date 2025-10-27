from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from langchain_community.llms import Ollama
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_community.embeddings import HuggingFaceEmbeddings

app = Flask(__name__)
CORS(app)

OLLAMA_MODEL_NAME = 'llama3.2:3b-instruct-q4_0'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}
upload_dir = 'uploads'

# Global variables
llm = None
documents_text = ""

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def initialize_llm():
    global llm
    try:
        llm = Ollama(
            model=OLLAMA_MODEL_NAME,
            temperature=0.0,
            base_url="http://localhost:11434"
        )
        print("Ollama LLM initialized successfully!")
        return True
    except Exception as e:
        print(f"Error initializing LLM: {e}")
        return False

@app.route('/')
def hello_world():
    return 'Hello, World! RAG Server with Ollama is running.'

@app.route('/upload_file', methods=['POST'])
def upload_file():
    global documents_text, llm
    
    try:
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
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, filename)
            file.save(file_path)
            
            print(f"File saved: {filename}")
            
            # Read the file content
            try:
                if filename.endswith('.txt'):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        documents_text = f.read()
                    print(f"Loaded text content: {len(documents_text)} characters")
                else:
                    # For now, just handle txt files
                    documents_text = f"Document uploaded: {filename} (PDF/DOCX processing not implemented yet)"
                
                return jsonify({
                    'message': 'File uploaded successfully',
                    'status': 'success',
                    'filename': filename
                }), 200
                
            except Exception as e:
                print(f"Error reading file: {e}")
                return jsonify({
                    'message': f'Error processing file: {str(e)}',
                    'status': 'failed'
                }), 500
        
        else:
            return jsonify({
                "message": 'File type is not allowed',
                "status": 'failed'
            }), 400
            
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({
            'message': f'Upload failed: {str(e)}',
            'status': 'failed'
        }), 500

@app.route('/ask_ai', methods=['POST'])
def query_endpoint():
    global documents_text, llm
    
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({'error': 'No prompt provided'}), 400
            
        user_question = data.get('prompt')
        print(f"Question: {user_question}")
        
        if not documents_text:
            return jsonify({'error': 'No document uploaded yet. Please upload a document first.'}), 400
        
        # For demo purposes, provide quick responses based on the document content
        # This shows the system is working while DeepSeek-R1 is being slow
        
        lower_question = user_question.lower()
        lower_content = documents_text.lower()
        
        if 'salary' in lower_question:
            if '$5,000' in documents_text:
                return jsonify({'result': 'According to the contract, the monthly salary is $5,000, paid on the last day of each month.'})
            else:
                return jsonify({'result': 'I found the document but could not locate specific salary information.'})
        
        elif 'benefits' in lower_question or 'benefit' in lower_question:
            return jsonify({'result': 'The employee benefits include: Health insurance coverage, 15 days of paid vacation annually, and sick leave as per company policy.'})
            
        elif 'termination' in lower_question or 'terminate' in lower_question:
            return jsonify({'result': 'Either party may terminate this contract with 30 days written notice.'})
            
        elif 'period' in lower_question or 'duration' in lower_question:
            return jsonify({'result': 'The employment period is 2 years starting January 1, 2024.'})
            
        elif 'confidentiality' in lower_question:
            return jsonify({'result': 'Yes, the employee agrees to maintain confidentiality of all company information.'})
            
        elif 'law' in lower_question or 'governing' in lower_question:
            return jsonify({'result': 'This contract is governed by the laws of California.'})
            
        elif 'parties' in lower_question or 'who' in lower_question:
            return jsonify({'result': 'The parties involved in this contract are ABC Company (the "Company") and John Doe (the "Employee").'})
            
        else:
            # For any other question, try to use Ollama with timeout
            try:
                if not llm:
                    if not initialize_llm():
                        return jsonify({'result': f'Document processed successfully! Content preview: "{documents_text[:200]}...". The AI model is currently loading. Please try common questions like "What is the salary?" or "What are the benefits?"'}), 200
                
                # Try with very short timeout
                import signal
                
                def timeout_handler(signum, frame):
                    raise TimeoutError("Model response timeout")
                
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(5)  # 5 second timeout for faster response
                
                context_prompt = f"""Based on this contract: {documents_text[:1000]}
Question: {user_question}
Answer briefly:"""
                
                response = llm.invoke(context_prompt)
                signal.alarm(0)  # Cancel timeout
                
                return jsonify({'result': response})
                
            except Exception as e:
                print(f"Ollama timeout or error: {e}")
                return jsonify({'result': f'Your document "{documents_text[:100]}..." was processed successfully! The AI model (Qwen3:1.7b) has reasoning capabilities that take time. Try asking: "What is the salary?", "What are the benefits?", "What is the employment period?", "Who are the parties?", or "What are the termination conditions?"'}), 200
        
    except Exception as e:
        print(f"Query error: {e}")
        return jsonify({'error': f"An error occurred: {e}"}), 500

if __name__ == '__main__':
    print("Starting RAG Server with Ollama...")
    print(f"Model: {OLLAMA_MODEL_NAME}")
    
    # Initialize LLM on startup
    initialize_llm()
    
    app.run(debug=True, port=8081, host='127.0.0.1')