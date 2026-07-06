import { useState, FormEvent, useCallback, DragEvent } from "react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import EnhancedProgressIndicator from "./EnhancedProgressIndicator";
import { useErrorHandler, createUploadError, createValidationError } from "../services/ErrorHandlerService";
import ApiService from "../services/api";
import type { UploadResponse } from "../types/api";

interface DocumentPreview {
  file: File;
  id: string;
  name: string;
  size: string;
  type: string;
  lastModified: string;
  isValid: boolean;
  validationError?: string;
}

interface ProcessingOptions {
  extractClauses: boolean;
  identifyRisks: boolean;
  checkCompliance: boolean;
  generateSummary: boolean;
}

const EnhancedUpload: React.FC = () => {
  const router = useRouter();
  const { addError, showSuccess, showWarning } = useErrorHandler();

  // Upload states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'processing' | 'complete' | 'error'>('uploading');
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number>(0);

  // Enhanced UI states
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [documentPreviews, setDocumentPreviews] = useState<DocumentPreview[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [showEnhancedProgress, setShowEnhancedProgress] = useState<boolean>(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<File | null>(null);
  const [enableMultiUpload, setEnableMultiUpload] = useState<boolean>(false);

  // Processing options
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    extractClauses: true,
    identifyRisks: true,
    checkCompliance: true,
    generateSummary: false
  });

  // Utility functions
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

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const isValidType = allowedTypes.some(type => file.name.toLowerCase().endsWith(type));

    if (!isValidType) {
      return {
        isValid: false,
        error: `Invalid file type: ${file.name}. Please select PDF, DOC, DOCX, or TXT files.`
      };
    }

    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File too large: ${file.name} (${formatFileSize(file.size)}). Maximum size is 16MB.`
      };
    }

    if (file.size === 0) {
      return {
        isValid: false,
        error: `File is empty: ${file.name}. Please select a valid file.`
      };
    }

    return { isValid: true };
  }, []);

  const createDocumentPreview = useCallback((file: File): DocumentPreview => {
    const validation = validateFile(file);
    return {
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: getFileType(file.name),
      lastModified: new Date(file.lastModified).toLocaleDateString(),
      isValid: validation.isValid,
      validationError: validation.error
    };
  }, [validateFile]);

  // File handling functions
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const previews = Array.from(files).map(file => createDocumentPreview(file));
    const validFiles = previews.filter(preview => preview.isValid);
    const invalidFiles = previews.filter(preview => !preview.isValid);

    // Show errors for invalid files
    invalidFiles.forEach(invalidFile => {
      addError(createUploadError(invalidFile.name, invalidFile.validationError));
    });

    if (validFiles.length === 0) {
      showWarning('No valid files to upload. Please check the file requirements.');
      return;
    }

    if (!enableMultiUpload && validFiles.length > 1) {
      showWarning('Multiple file upload is disabled. Only the first valid file will be uploaded.');
      setDocumentPreviews([validFiles[0]]);
    } else {
      setDocumentPreviews(validFiles);
      showSuccess(`${validFiles.length} file${validFiles.length > 1 ? 's' : ''} ready for upload.`);
    }
  }, [enableMultiUpload, createDocumentPreview, addError, showSuccess, showWarning]);

  const removeDocument = useCallback((id: string) => {
    setDocumentPreviews(prev => prev.filter(doc => doc.id !== id));
  }, []);

  // Drag and drop handlers
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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFiles(files);
  }, [handleFiles]);

  // Upload function with enhanced error handling
  const uploadDocument = useCallback(async (file: File, index: number) => {
    try {
      setCurrentUploadIndex(index);
      setCurrentProcessingFile(file);
      setShowEnhancedProgress(true);
      setUploadStage('uploading');

      const formData = new FormData();
      formData.append('file', file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const response = await ApiService.uploadFile(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.status === 'success') {
        setUploadStage('processing');

        // Simulate processing time
        setTimeout(() => {
          setUploadStage('complete');
          showSuccess(`Document "${file.name}" uploaded and processed successfully!`);

          // Clean up after successful upload
          setTimeout(() => {
            setShowEnhancedProgress(false);
            setDocumentPreviews([]);
            setUploadProgress(0);
            setCurrentUploadIndex(0);
          }, 2000);
        }, 2000);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      setUploadStage('error');
      console.error('Upload error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addError(createUploadError(file.name, errorMessage));

      // Keep the enhanced progress visible for error handling
      setTimeout(() => {
        setShowEnhancedProgress(false);
        setUploadProgress(0);
        setCurrentUploadIndex(0);
      }, 3000);
    }
  }, [addError, showSuccess]);

  const handleUpload = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (documentPreviews.length === 0) {
      addError(createValidationError('files', 'Please select at least one file to upload.'));
      return;
    }

    const invalidFiles = documentPreviews.filter(doc => !doc.isValid);
    if (invalidFiles.length > 0) {
      addError(createValidationError('files', 'Please remove invalid files before uploading.'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload files sequentially or in parallel based on settings
      if (enableMultiUpload && documentPreviews.length > 1) {
        // Sequential upload for better error handling
        for (let i = 0; i < documentPreviews.length; i++) {
          await uploadDocument(documentPreviews[i].file, i);
        }
      } else {
        // Single file upload
        await uploadDocument(documentPreviews[0].file, 0);
      }
    } finally {
      setIsUploading(false);
    }
  }, [documentPreviews, enableMultiUpload, uploadDocument, addError]);

  const clearAllDocuments = useCallback(() => {
    setDocumentPreviews([]);
    setSelectedFiles(null);
    setUploadProgress(0);
    showInfo('All documents cleared.');
  }, []);

  const showInfo = (message: string) => {
    // Using the error handler for info messages
    addError({
      title: 'Information',
      message,
      userMessage: message,
      category: 'system',
      severity: 'low',
      timestamp: new Date(),
      actionable: false,
      autoResolve: true
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-semibold text-white mb-4">
          📁 Upload Your Documents
        </h2>
        <p className="text-gray-300 mb-6">
          Drag and drop your contract documents or click to browse.
          Supports PDF, DOCX, DOC, and TXT files up to 16MB.
        </p>

        {/* Multi-upload toggle */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <input
            type="checkbox"
            id="multi-upload"
            checked={enableMultiUpload}
            onChange={(e) => setEnableMultiUpload(e.target.checked)}
            className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500"
          />
          <label htmlFor="multi-upload" className="text-sm text-gray-300">
            Enable multi-file upload
          </label>
        </div>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${isDragOver
              ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02]'
              : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
            }
            ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            onChange={handleFileSelect}
            multiple={enableMultiUpload}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            disabled={isUploading}
          />

          <div className="space-y-4">
            <motion.div
              animate={isDragOver ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CloudArrowUpIcon className="w-12 h-12 mx-auto text-cyan-400" />
            </motion.div>

            <div>
              <p className="text-lg font-medium text-white">
                {isDragOver ? 'Drop files here' : 'Drag & drop your documents here'}
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

          <label
            htmlFor="file-upload"
            className={`
              absolute inset-0 cursor-pointer
              ${isUploading ? 'pointer-events-none' : ''}
            `}
          />
        </div>
      </motion.div>

      {/* Document Previews */}
      <AnimatePresence>
        {documentPreviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <h3 className="text-lg font-medium text-white mb-4">
              Documents to Upload ({documentPreviews.length})
            </h3>
            <div className="space-y-2">
              {documentPreviews.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center justify-between p-4 rounded-lg border
                    ${doc.isValid
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-red-900/20 border-red-700'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className={`
                      w-8 h-8
                      ${doc.isValid ? 'text-cyan-400' : 'text-red-400'}
                    `} />
                    <div>
                      <p className="text-sm font-medium text-white">{doc.name}</p>
                      <p className="text-xs text-gray-400">
                        {doc.type} • {doc.size} • {doc.lastModified}
                      </p>
                      {!doc.isValid && doc.validationError && (
                        <p className="text-xs text-red-400 mt-1">{doc.validationError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {doc.isValid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                    )}
                    <button
                      onClick={() => removeDocument(doc.id)}
                      disabled={isUploading}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={clearAllDocuments}
                disabled={isUploading}
                className="text-sm text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                Clear All
              </button>

              <button
                onClick={handleUpload}
                disabled={isUploading || documentPreviews.filter(doc => doc.isValid).length === 0}
                className={`
                  px-6 py-3 text-white font-semibold rounded-xl
                  transition-all duration-300 transform hover:scale-[1.02]
                  ${isUploading || documentPreviews.filter(doc => doc.isValid).length === 0
                    ? 'bg-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>
                      Uploading {currentUploadIndex + 1} of {documentPreviews.length}...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CloudArrowUpIcon className="w-5 h-5" />
                    <span>
                      📁 Upload {documentPreviews.length} Document{documentPreviews.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Progress Indicator */}
      <AnimatePresence>
        {showEnhancedProgress && currentProcessingFile && (
          <EnhancedProgressIndicator
            isActive={showEnhancedProgress}
            fileName={currentProcessingFile.name}
            fileType={getFileType(currentProcessingFile.name)}
            fileSize={formatFileSize(currentProcessingFile.size)}
            onComplete={() => setShowEnhancedProgress(false)}
            onCancel={() => {
              setShowEnhancedProgress(false);
              addError({
                title: 'Upload Cancelled',
                message: 'Document upload was cancelled',
                userMessage: 'The upload was cancelled. You can try again anytime.',
                category: 'upload',
                severity: 'low',
                timestamp: new Date(),
                actionable: true,
                autoResolve: true
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedUpload;