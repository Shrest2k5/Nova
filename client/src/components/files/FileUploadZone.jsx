import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  FileArchive,
} from 'lucide-react';
import { fileService } from '../../services/fileService.js';
import { formatBytes } from '../../utils/formatters.js';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { Button } from '../common/Button.jsx';
import { useFileStatus } from '../../hooks/useFileStatus.js';

// Max file size: 50MB
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.zip', '.txt', '.json', '.csv',
  '.docx', '.xlsx',
];

export const FileUploadZone = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedRecord, setUploadedRecord] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Poll status once file record exists
  const {
    status: processingStatus,
    progress: processingProgress,
    errorMessage: processingError,
    isComplete,
    isFailed,
  } = useFileStatus(uploadedRecord?.id, uploadedRecord);

  const validateFile = (file) => {
    if (!file) return 'No file selected';

    if (file.size > MAX_SIZE_BYTES) {
      return `File exceeds maximum allowed size of 50MB (${formatBytes(file.size)})`;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return `Unsupported file format '${ext}'. Allowed: ${ALLOWED_EXTS.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (file) => {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      setSelectedFile(null);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setUploadProgress(0);
    setUploadedRecord(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      const record = await fileService.uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedRecord(record);
      setIsUploading(false);
      if (onUploadSuccess) {
        onUploadSuccess(record);
      }
    } catch (err) {
      setIsUploading(false);
      setUploadError(err.message || 'File upload failed');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    setUploadedRecord(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (filename = '') => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return ImageIcon;
    if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return FileArchive;
    return FileText;
  };

  const FileTypeIcon = getFileIcon(selectedFile?.name);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* State 1: Dropzone (No file selected) */}
      {!selectedFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/70'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h4 className="text-base font-semibold text-slate-800">
            Drag and drop your file here, or{' '}
            <span className="text-indigo-600 hover:underline">browse</span>
          </h4>
          <p className="mt-1.5 text-xs text-slate-500 max-w-md text-center">
            Supports PDF, DOCX, XLSX, Images (PNG, JPG, WebP), ZIP, TXT, JSON, and CSV up to 50MB.
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
            <span>Secure TLS transfer</span>
            <span>•</span>
            <span>Automated 25s processing pipeline</span>
          </div>
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="flex-1">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* State 2: Selected File Details & Actions */}
      {selectedFile && !uploadedRecord && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FileTypeIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                </p>
              </div>
            </div>

            {!isUploading && (
              <button
                type="button"
                onClick={resetUpload}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Upload Progress Indicator */}
          {isUploading && (
            <div className="space-y-1.5 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <div className="flex justify-between text-xs font-semibold text-indigo-700">
                <span>Uploading to server...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={resetUpload}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpload}
              isLoading={isUploading}
              icon={UploadCloud}
            >
              Start Upload & Processing
            </Button>
          </div>
        </div>
      )}

      {/* State 3: File Uploaded -> Live Background Processing Tracker */}
      {uploadedRecord && (
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FileTypeIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {uploadedRecord.originalName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(uploadedRecord.size)} • Uploaded successfully
                </p>
              </div>
            </div>

            <StatusBadge status={processingStatus} />
          </div>

          {/* Processing Progress Bar */}
          <div className="space-y-1.5">
            <ProgressBar
              progress={processingProgress}
              status={processingStatus}
              height="h-2.5"
            />
            <p className="text-xs text-slate-500 italic">
              {processingStatus === 'PENDING' && 'Waiting in job queue...'}
              {processingStatus === 'PROCESSING' &&
                `Background worker is verifying and indexing (${processingProgress}% complete)...`}
              {isComplete && 'File processing completed! Ready for analysis and download.'}
              {isFailed && `Processing failed: ${processingError || 'Unknown error'}`}
            </p>
          </div>

          {/* Success / Failure Banner */}
          {isComplete && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All verification checks passed. File record is committed to PostgreSQL database.
              </span>
            </div>
          )}

          {isFailed && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Error during processing: {processingError || 'Failed to complete task.'}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={resetUpload}
            >
              Upload Another File
            </Button>

            {isComplete && (
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                onClick={() => {
                  window.location.href = `/files/${uploadedRecord.id}`;
                }}
              >
                View File Details
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

