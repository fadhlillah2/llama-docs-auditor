import { useState, FormEvent, useCallback, DragEvent } from "react";
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { DocumentProcessingLoader, UploadProgressIndicator } from "../components/LoadingSpinner";
import ApiService from "../services/api";
import type {
  UploadResponse,
  NotificationConfig
} from "../types/api";


interface DocumentPreview {
  file: File;
  id: string;
  name: string;
  size: string;
  type: string;
  lastModified: string;
}

interface ProcessingOptions {
  extractClauses: boolean;
  identifyRisks: boolean;
  checkCompliance: boolean;
  generateSummary: boolean;
}

function Upload(): JSX.Element {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'processing' | 'complete' | 'error'>('uploading');
  const [fileName, setFileName] = useState<string>('');
  const [enableMultiUpload, setEnableMultiUpload] = useState<boolean>(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number>(0);

  // Enhanced upload states
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [documentPreviews, setDocumentPreviews] = useState<DocumentPreview[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    extractClauses: true,
    identifyRisks: true,
    checkCompliance: true,
    generateSummary: false
  });

  const showSwalNotification = (config: NotificationConfig): void => {
    Swal.fire(config);
  };

  // Enhanced upload functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return 'PDF Document';
      case 'doc':
      case 'docx': return 'Word Document';
      case 'txt': return 'Text Document';
      default: return 'Unknown Document';
    }
  };

  const createDocumentPreview = (file: File): DocumentPreview => {
    return {
      file,
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.name),
      lastModified: new Date(file.lastModified).toLocaleDateString()
    };
  };

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const isValidType = allowedTypes.some(type => file.name.toLowerCase().endsWith(type));

    if (!isValidType) {
      return { isValid: false, error: 'Invalid file type. Please select PDF, DOC, DOCX, or TXT files.' };
    }

    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      return { isValid: false, error: 'File too large. Maximum size is 16MB.' };
    }

    return { isValid: true };
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => validateFile(file).isValid);

    if (validFiles.length === 0) {
      showSwalNotification({
        title: "No valid files",
        text: "Please select only PDF, DOC, DOCX, or TXT files under 16MB.",
        icon: "warning",
        toast: true,
        timer: 3000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    const previews = validFiles.map(createDocumentPreview);
    setDocumentPreviews(previews);

    // Create a new FileList object for valid files
    const dt = new DataTransfer();
    validFiles.forEach(file => dt.items.add(file));
    setSelectedFiles(dt.files);

    if (validFiles.length !== files.length) {
      const invalidCount = files.length - validFiles.length;
      showSwalNotification({
        title: "Some files were skipped",
        text: `${invalidCount} file(s) were invalid and not added.`,
        icon: "info",
        toast: true,
        timer: 3000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => validateFile(file).isValid);

    if (validFiles.length === 0) {
      showSwalNotification({
        title: "No valid files",
        text: "Please select only PDF, DOC, DOCX, or TXT files under 16MB.",
        icon: "warning",
        toast: true,
        timer: 3000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    const previews = validFiles.map(createDocumentPreview);
    setDocumentPreviews(previews);
    setSelectedFiles(files);
  }, []);

  const removeDocumentPreview = useCallback((id: string) => {
    setDocumentPreviews(prev => prev.filter(preview => preview.id !== id));

    // Update selected files
    if (selectedFiles) {
      const dt = new DataTransfer();
      const remainingPreviews = documentPreviews.filter(preview => preview.id !== id);
      remainingPreviews.forEach(preview => dt.items.add(preview.file));
      setSelectedFiles(dt.files);
    }
  }, [selectedFiles, documentPreviews]);

  const clearAllPreviews = useCallback(() => {
    setDocumentPreviews([]);
    setSelectedFiles(null);
    // Clear file input
    const fileInput = document.getElementById('formFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, []);

  const processUploadQueue = async (files: File[]): Promise<void> => {
    let successfulUploads = 0;
    let failedUploads = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      setCurrentUploadIndex(i);
      setFileName(file.name);

      // Update overall progress
      const overallProgress = ((i + 1) / files.length) * 100;
      setUploadProgress(overallProgress);

      try {
        const result = await uploadSingleFile(file);
        if (result.success) {
          successfulUploads++;
        } else {
          failedUploads++;
        }
      } catch (error) {
        failedUploads++;
      }

      // Brief pause between uploads
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Show summary notification
    const totalFiles = files.length;
    if (successfulUploads === totalFiles) {
      showSwalNotification({
        title: "All files uploaded successfully!",
        text: `Successfully uploaded ${successfulUploads} of ${totalFiles} files.`,
        icon: "success",
        toast: true,
        timer: 5000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
      setUploadStatus(`✅ All ${totalFiles} files uploaded successfully!`);
    } else if (successfulUploads > 0) {
      setUploadStatus(`⚠️ ${successfulUploads}/${totalFiles} files uploaded successfully`);
    } else {
      setUploadStatus(`❌ Failed to upload all ${totalFiles} files`);
    }

    setUploadStage('complete');
    
    // Reset after delay
    setTimeout(() => {
      setUploadQueue([]);
      setCurrentUploadIndex(0);
      setUploadProgress(0);
      setUploadStage('uploading');
      setFileName('');
    }, 3000);
  };

  const uploadSingleFile = async (file: File): Promise<{success: boolean, error?: string}> => {
    try {
      const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
      const isValidType = allowedTypes.some(type => file.name.toLowerCase().endsWith(type));

      if (!isValidType) return { success: false, error: 'Invalid file type' };

      const maxSize = 16 * 1024 * 1024;
      if (file.size > maxSize) return { success: false, error: 'File too large' };

      // Use ApiService for upload with progress monitoring
      const result = await ApiService.uploadAndProcess(file, (progress) => {
        setUploadProgress(progress.progress);
        setUploadStage(progress.stage === 'completed' ? 'complete' :
                     progress.stage === 'error' ? 'error' : 'processing');
      });

      if (result.success && result.session_id) {
        // Save to localStorage
        const newDocument = {
          id: result.session_id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          status: 'processed' as const,
          sessionId: result.session_id,
          fileType: file.type || 'application/octet-stream'
        };

        const existingDocs = localStorage.getItem('uploadedDocuments');
        const documents = existingDocs ? JSON.parse(existingDocs) : [];
        documents.push(newDocument);
        localStorage.setItem('uploadedDocuments', JSON.stringify(documents));

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Upload failed' };
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      return { success: false, error: error.message || 'Upload failed' };
    }
  };

  const handleFileSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsUploading(true);
    setUploadStatus('');
    setUploadProgress(0);
    setUploadStage('uploading');

    // Use selected files from our enhanced interface
    const files = selectedFiles ? Array.from(selectedFiles) : [];

    if (files.length === 0) {
      showSwalNotification({
        title: "Please select files first",
        text: "Drag and drop files or click to browse",
        icon: "warning",
        toast: true,
        timer: 3000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
      setIsUploading(false);
      setUploadStage('error');
      return;
    }

    // Handle multiple files
    if (files.length > 1) {
      setUploadQueue(files);
      setCurrentUploadIndex(0);
      await processUploadQueue(files);
      return;
    }

    // Single file upload
    const selectedFile = files[0];
    if (!selectedFile) return;

    const currentFileName = selectedFile.name;
    setFileName(currentFileName);

    // Additional validation is already done during file selection
    const validation = validateFile(selectedFile);
    if (!validation.isValid) {
      showSwalNotification({
        title: "Validation Error",
        text: validation.error || "Invalid file",
        icon: "warning",
        toast: true,
        timer: 3000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
      setIsUploading(false);
      setUploadStage('error');
      return;
    }

    // Start upload progress simulation
    setUploadProgress(10);

    try {
      // Create FormData with processing options
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('processingOptions', JSON.stringify(processingOptions));

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 60) return prev + 10;
          return prev;
        });
      }, 200);

      const response = await fetch("http://127.0.0.1:8081/upload_file", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(70);
      setUploadStage('processing');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      setUploadProgress(95);

      const data: UploadResponse = await response.json();
      console.log("Upload response:", data);

      if (data.status === 'success') {
        setUploadProgress(100);
        setUploadStage('complete');

        const successMessage = `✅ File uploaded successfully! Session ID: ${data.session_id?.substring(0, 8)}...`;
        setUploadStatus(successMessage);

        // Save to localStorage for DocumentManager
        const newDocument = {
          id: data.session_id || `doc-${Date.now()}`,
          fileName: currentFileName,
          fileSize: selectedFile.size,
          uploadDate: new Date().toISOString(),
          status: 'processed' as const,
          sessionId: data.session_id,
          fileType: selectedFile.type || 'application/octet-stream'
        };

        const existingDocs = localStorage.getItem('uploadedDocuments');
        const documents = existingDocs ? JSON.parse(existingDocs) : [];
        documents.push(newDocument);
        localStorage.setItem('uploadedDocuments', JSON.stringify(documents));

        showSwalNotification({
          title: "File uploaded successfully!",
          text: "You can now chat with your document using the chat interface.",
          icon: "success",
          toast: true,
          timer: 5000,
          position: 'top-right',
          timerProgressBar: true,
          showConfirmButton: false,
        });

        // Clear previews and reset after a short delay
        setTimeout(() => {
          clearAllPreviews();
          setUploadProgress(0);
          setUploadStage('uploading');
          setFileName('');
        }, 2000);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error uploading the file:", error);

      setUploadStage('error');
      setUploadStatus('❌ Upload failed: ' + errorMessage);

      showSwalNotification({
        title: "Upload failed",
        text: errorMessage,
        icon: "error",
        toast: true,
        timer: 5000,
        position: 'top-right',
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container-fluid pt-5 px-10">
      <section id="about" className="py-10 text-white">
        <div className="text-center mt-8">
          <h2 className="text-2xl font-semibold mb-4 px-4">
            📁 Upload Your Documents
          </h2>
          <p className="text-gray-300 mb-6 px-4">
            Drag and drop your contract documents or click to browse.
            Supports PDF, DOCX, DOC, and TXT files up to 16MB.
          </p>

          <div className="mb-6 px-4">
            <label className="flex items-center justify-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableMultiUpload}
                onChange={(e) => setEnableMultiUpload(e.target.checked)}
                className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500"
                disabled={isUploading}
              />
              <span className="text-sm text-gray-300">
                Enable multi-file upload
              </span>
            </label>
          </div>
          
          {isUploading && (
            <div className="mb-6">
              {uploadQueue.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-300 text-center">
                    Uploading file {currentUploadIndex + 1} of {uploadQueue.length}
                  </div>
                  <UploadProgressIndicator 
                    fileName={fileName}
                    progress={uploadProgress}
                    status={uploadStage}
                  />
                </div>
              ) : (
                <UploadProgressIndicator 
                  fileName={fileName}
                  progress={uploadProgress}
                  status={uploadStage}
                />
              )}
            </div>
          )}

          {/* Enhanced Document Preview Area */}
          {documentPreviews.length > 0 && !isUploading && (
            <div className="mb-6 px-4 max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-lg border border-gray-600 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-white">
                    Selected Documents ({documentPreviews.length})
                  </h3>
                  <button
                    onClick={clearAllPreviews}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    disabled={isUploading}
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid gap-3 max-h-60 overflow-y-auto">
                  {documentPreviews.map((preview) => (
                    <div key={preview.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-cyan-400">
                          {preview.type.includes('PDF') ? '📄' : preview.type.includes('Word') ? '📝' : '📃'}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium truncate max-w-xs">
                            {preview.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {preview.size} • {preview.type} • {preview.lastModified}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocumentPreview(preview.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        disabled={isUploading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Processing Options */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <h4 className="text-sm font-medium text-white mb-3">Processing Options:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={processingOptions.extractClauses}
                        onChange={(e) => setProcessingOptions(prev => ({ ...prev, extractClauses: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                        disabled={isUploading}
                      />
                      <span className="text-xs text-gray-300">Extract Clauses</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={processingOptions.identifyRisks}
                        onChange={(e) => setProcessingOptions(prev => ({ ...prev, identifyRisks: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                        disabled={isUploading}
                      />
                      <span className="text-xs text-gray-300">Identify Risks</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={processingOptions.checkCompliance}
                        onChange={(e) => setProcessingOptions(prev => ({ ...prev, checkCompliance: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                        disabled={isUploading}
                      />
                      <span className="text-xs text-gray-300">Check Compliance</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={processingOptions.generateSummary}
                        onChange={(e) => setProcessingOptions(prev => ({ ...prev, generateSummary: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                        disabled={isUploading}
                      />
                      <span className="text-xs text-gray-300">Generate Summary</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadStatus && !isUploading && (
            <div className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-600">
              <p className="text-sm">{uploadStatus}</p>
            </div>
          )}

          {/* Enhanced Drag & Drop Area */}
          <form encType="multipart/form-data" onSubmit={handleFileSubmit} className="max-w-4xl mx-auto">
            <div className="mb-3 px-4">
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-900/20 bg-opacity-50'
                    : 'border-gray-600 bg-gray-800/50 bg-opacity-50 hover:border-gray-500'
                } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('formFile')?.click()}
              >
                <div className="space-y-4">
                  <div className="text-cyan-400 mx-auto">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {isDragOver ? 'Drop your files here' : 'Drag & drop your documents here'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      or click to browse from your computer
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      PDF
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      DOCX
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                      DOC
                    </span>
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
                      TXT
                    </span>
                    <span>• Max 16MB</span>
                  </div>
                </div>
                <input
                  name="file"
                  className="hidden"
                  type="file"
                  id="formFile"
                  accept=".pdf,.doc,.docx,.txt"
                  multiple={enableMultiUpload}
                  disabled={isUploading}
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            
            <div className="px-4">
              <button
                type="submit"
                disabled={isUploading || documentPreviews.length === 0}
                className={`text-white font-semibold rounded-xl text-base px-8 py-3.5 w-full inline-flex items-center justify-center transition-all duration-300 transform hover:scale-[1.02] ${
                  isUploading
                    ? 'bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 focus:ring-4 focus:ring-cyan-300 shadow-lg hover:shadow-xl'
                } ${documentPreviews.length === 0 && !isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={isUploading ? `${uploadStage === 'uploading' ? 'Uploading' : 'Processing'} files` : "Upload and analyze documents"}
              >
              {isUploading ? (
                <>
                  <svg
                    aria-hidden="true"
                    role="status"
                    className="inline w-5 h-5 mr-2 text-white animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {uploadStage === 'uploading' ? '🚀 Uploading Documents...' : '🔄 Processing Documents...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {documentPreviews.length === 0 ? '📁 Select Documents to Upload' : `📤 Upload ${documentPreviews.length} Document${documentPreviews.length > 1 ? 's' : ''}`}
                </>
              )}
              </button>

              {documentPreviews.length > 0 && !isUploading && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={clearAllPreviews}
                    className="text-xs text-gray-400 hover:text-gray-300 transition-colors underline"
                  >
                    Clear selected documents
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Upload;