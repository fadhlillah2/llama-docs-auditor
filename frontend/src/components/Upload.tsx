import { useState, FormEvent } from "react";
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { DocumentProcessingLoader, UploadProgressIndicator } from "../components/LoadingSpinner";
import type { 
  UploadResponse, 
  NotificationConfig 
} from "../types/api";

interface InfoItem {
  text: string;
  count: string;
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

  const showSwalNotification = (config: NotificationConfig): void => {
    Swal.fire(config);
  };

  const processUploadQueue = async (files: File[]): Promise<void> => {
    let successfulUploads = 0;
    let failedUploads = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch("http://127.0.0.1:8081/upload_file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        return { success: false, error: `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        // Save to localStorage
        const newDocument = {
          id: data.session_id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          status: 'processed' as const,
          sessionId: data.session_id,
          fileType: file.type || 'application/octet-stream'
        };
        
        const existingDocs = localStorage.getItem('uploadedDocuments');
        const documents = existingDocs ? JSON.parse(existingDocs) : [];
        documents.push(newDocument);
        localStorage.setItem('uploadedDocuments', JSON.stringify(documents));
        
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Upload failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const handleFileSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsUploading(true);
    setUploadStatus('');
    setUploadProgress(0);
    setUploadStage('uploading');
    
    const target = e.target as HTMLFormElement;
    const formData = new FormData(target);
    const fileInput = target.file as HTMLInputElement;
    
    if (!fileInput.files || fileInput.files.length === 0) {
      showSwalNotification({
        title: "Please select a file first",
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

    // Handle multiple files if enabled
    const files = Array.from(fileInput.files);
    
    if (enableMultiUpload && files.length > 1) {
      setUploadQueue(files);
      setCurrentUploadIndex(0);
      await processUploadQueue(files);
      return;
    }

    // Single file upload (existing logic)
    const selectedFile = files[0];
    const currentFileName = selectedFile.name;
    setFileName(currentFileName);
    
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileNameLower = currentFileName.toLowerCase();
    const isValidType = allowedTypes.some(type => fileNameLower.endsWith(type));
    
    if (!isValidType) {
      showSwalNotification({
        title: "Invalid file type",
        text: "Please select a PDF, DOC, DOCX, or TXT file",
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

    // Validate file size (16MB limit from backend)
    const maxSize = 16 * 1024 * 1024; // 16MB in bytes
    if (selectedFile.size > maxSize) {
      showSwalNotification({
        title: "File too large",
        text: "Please select a file smaller than 16MB",
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
        
        // Clear the file input after a short delay
        setTimeout(() => {
          fileInput.value = '';
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

  // Example data (could be moved to props if needed)
  const info: InfoItem[] = [
    { text: "Years experience", count: "04" },
    { text: "Completed Projects", count: "24" },
    { text: "Companies Work", count: "06" },
  ];

  return (
    <div className="container-fluid pt-5 px-10">
      <section id="about" className="py-10 text-white">
        <div className="text-center mt-8">
          <h2 className="text-1xl font-semibold mb-4 px-4">
            Upload your {enableMultiUpload ? 'files' : 'file'} here 
          </h2>
          
          <div className="mb-4 px-4">
            <label className="flex items-center space-x-2 cursor-pointer">
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
          
          {uploadStatus && !isUploading && (
            <div className="mb-4 p-3 rounded-lg bg-gray-800 border border-gray-600">
              <p className="text-sm">{uploadStatus}</p>
            </div>
          )}
          
          <form encType="multipart/form-data" onSubmit={handleFileSubmit} className="max-w-lg mx-auto">
            <div className="mb-3 px-4">
              <input
                name="file"
                className="form-control w-full cursor-pointer focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                type="file"
                id="formFile"
                accept=".pdf,.doc,.docx,.txt"
                multiple={enableMultiUpload}
                disabled={isUploading}
              />
              <small className="text-gray-400 mt-2 block text-center">
                Supported formats: PDF, DOC, DOCX, TXT (Max size: 16MB each)
                {enableMultiUpload && <><br />You can select multiple files at once</>}
              </small>
            </div>
            
            <div className="px-4">
              <button  
                type="submit" 
                disabled={isUploading}
                className={`text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center w-full inline-flex items-center justify-center transition-colors duration-200 ${
                  isUploading 
                    ? 'bg-gray-600 cursor-not-allowed opacity-75' 
                    : 'bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
                }`}
                aria-label={isUploading ? `${uploadStage === 'uploading' ? 'Uploading' : 'Processing'} file` : "Submit file"}
              >
              {isUploading ? (
                <>
                  <svg 
                    aria-hidden="true" 
                    role="status" 
                    className="inline w-4 h-4 me-2 text-white animate-spin" 
                    viewBox="0 0 100 101" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                  </svg>
                  {uploadStage === 'uploading' ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                'Submit'
              )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Upload;