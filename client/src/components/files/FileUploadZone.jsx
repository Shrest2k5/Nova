import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  FileSearch,
  Sparkles,
  BookOpen,
  Loader2,
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

const PROCESSING_STAGES = [
  {
    key: 'VALIDATION',
    label: 'Validating PDF',
    description: 'Header, encryption & structural integrity verification',
    icon: ShieldCheck,
    minProgress: 0,
    targetProgress: 25,
  },
  {
    key: 'EXTRACTION',
    label: 'Extracting document content',
    description: 'Text layer extraction & page boundary mapping',
    icon: FileSearch,
    minProgress: 25,
    targetProgress: 50,
  },
  {
    key: 'ANALYSIS',
    label: 'Analyzing content with Gemini AI',
    description: 'Concept extraction, facts & semantic synthesis',
    icon: Sparkles,
    minProgress: 50,
    targetProgress: 75,
  },
  {
    key: 'SUMMARIZATION',
    label: 'Generating document summary',
    description: 'Structured JSON summary generation & persistence',
    icon: BookOpen,
    minProgress: 75,
    targetProgress: 100,
  },
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
    processingStage,
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

  // Helper to determine stage state
  const getStageState = (stage, index) => {
    if (isComplete) return 'completed';
    if (isFailed) {
      // If failed, see if this was the stage that failed
      if (processingStage === stage.key) return 'failed';
      const failedIdx = PROCESSING_STAGES.findIndex((s) => s.key === processingStage);
      if (failedIdx !== -1 && index < failedIdx) return 'completed';
      return 'pending';
    }

    if (!processingStage) {
      return index === 0 ? 'active' : 'pending';
    }

    const currentIdx = PROCESSING_STAGES.findIndex((s) => s.key === processingStage);
    if (currentIdx === -1) {
      return processingProgress >= stage.targetProgress ? 'completed' : 'pending';
    }

    if (index < currentIdx) return 'completed';
    if (index === currentIdx) return 'active';
    return 'pending';
  };

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
            Upload PDF documents for automatic text extraction and Gemini AI structured summarization. Also supports images, text, and data files up to 50MB.
          </p>

          <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
            <span>Production-grade TLS storage</span>
            <span>•</span>
            <span>Real 4-stage PDF extraction & Gemini pipeline</span>
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

      {/* State 3: File Uploaded -> Live 4-Stage Background Processing Tracker */}
      {uploadedRecord && (
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-6">
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

          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Overall Progress</span>
              <span className="font-mono">{processingProgress}%</span>
            </div>
            <ProgressBar
              progress={processingProgress}
              status={processingStatus}
              height="h-2.5"
            />
          </div>

          {/* 4 Discrete Processing Stages Cards */}
          <div className="space-y-2.5 pt-2">
            <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Document Processing Pipeline Stages
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROCESSING_STAGES.map((stage, idx) => {
                const state = getStageState(stage, idx);
                const Icon = stage.icon;

                return (
                  <div
                    key={stage.key}
                    className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      state === 'completed'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : state === 'active'
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-100 shadow-xs'
                        : state === 'failed'
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-white/60 border-slate-200 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          state === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : state === 'active'
                            ? 'bg-indigo-100 text-indigo-600'
                            : state === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {state === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : state === 'active' ? (
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        ) : state === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xs font-semibold ${
                              state === 'completed'
                                ? 'text-emerald-900'
                                : state === 'active'
                                ? 'text-indigo-900 font-bold'
                                : state === 'failed'
                                ? 'text-rose-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {idx + 1}. {stage.label}
                          </p>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                              state === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : state === 'active'
                                ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                                : state === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {state}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success / Failure Banner */}
          {isComplete && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-950">
                    PDF text extracted & AI summary generated successfully!
                  </p>
                  <p className="text-emerald-700 mt-0.5">
                    Structured findings and full document text are committed to PostgreSQL.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                onClick={() => {
                  window.location.href = `/files/${uploadedRecord.id}`;
                }}
              >
                View Summary
              </Button>
            </div>
          )}

          {isFailed && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-rose-950">Processing Error</p>
                  <p className="text-rose-700 mt-0.5">
                    {processingError || 'An unexpected error occurred during document processing.'}
                  </p>
                </div>
              </div>
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
                Open Document Details
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
