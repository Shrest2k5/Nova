import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fileService } from '../services/fileService.js';
import { useFileStatus } from '../hooks/useFileStatus.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { ProgressBar } from '../components/common/ProgressBar.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmationModal } from '../components/common/ConfirmationModal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ErrorMessage } from '../components/common/ErrorMessage.jsx';
import {
  ArrowLeft,
  Download,
  Trash2,
  FileText,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const FileDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Hook for live polling status
  const { status, progress, errorMessage, completedAt, isComplete, isFailed } =
    useFileStatus(id, file);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const data = await fileService.getFileById(id);
        setFile(data);
      } catch (err) {
        setError(err.message || 'Failed to load file details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
  }, [id]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownload = async () => {
    if (!file) return;
    try {
      await fileService.downloadFile(file.id, file.originalName);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!file) return;
    setIsDeleting(true);
    try {
      await fileService.deleteFile(file.id);
      navigate('/files');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" message="Loading file details from PostgreSQL..." />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-12">
        <ErrorMessage message={error || 'File not found'} />
        <Link to="/files">
          <Button variant="secondary" icon={ArrowLeft}>
            Back to File History
          </Button>
        </Link>
      </div>
    );
  }

  const currentStatus = status || file.status;
  const currentProgress = progress !== undefined ? progress : file.progress;
  const currentError = errorMessage || file.errorMessage;
  const currentCompletedAt = completedAt || file.completedAt;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/files"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Files
        </Link>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header banner */}
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {file.originalName}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono">ID: {file.id.substring(0, 13)}...</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:text-slate-600 rounded transition-colors"
                  title="Copy full UUID"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStatus !== 'FAILED' && (
              <Button
                variant="primary"
                size="sm"
                icon={Download}
                onClick={handleDownload}
              >
                Download
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Live Processing Status Banner */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Processing Lifecycle Status
              </span>
              <StatusBadge status={currentStatus} />
            </div>
            <span className="text-xs font-semibold text-slate-700">
              {currentProgress}%
            </span>
          </div>

          <ProgressBar
            progress={currentProgress}
            status={currentStatus}
            showLabel={false}
            height="h-3"
          />

          {currentStatus === 'PROCESSING' && (
            <p className="text-xs text-indigo-600 font-medium animate-pulse">
              Active background worker is executing discrete processing stages (~25s)...
            </p>
          )}

          {isComplete && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>File parsing, checksum scans, and database persistence verified.</span>
            </div>
          )}

          {isFailed && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Failed reason: {currentError || 'Encountered unexpected processing failure.'}</span>
            </div>
          )}
        </div>

        {/* Detailed Metadata Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Original Filename
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-800 break-all">
                {file.originalName}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Internal Stored Filename
              </span>
              <p className="mt-1 text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">
                {file.storedName}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                MIME Content Type
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {file.mimeType}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                File Size
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatBytes(file.size)} ({file.size} bytes)
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Uploaded Timestamp
              </span>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {formatDate(file.createdAt)}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Processing Completed At
              </span>
              <p className="mt-1 text-sm font-medium text-slate-800">
                {currentCompletedAt ? formatDate(currentCompletedAt) : 'Pending / Not completed'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Stored File"
        message={`Are you sure you want to permanently delete '${file.originalName}'? The file will be removed from disk and cannot be recovered.`}
        confirmText="Yes, Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

