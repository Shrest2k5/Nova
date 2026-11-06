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
  Sparkles,
  BookOpen,
  Info,
  RotateCcw,
  Layers,
  FileSearch,
  ExternalLink,
} from 'lucide-react';

export const FileDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'extracted' | 'info'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Hook for live polling status
  const {
    status,
    processingStage,
    progress,
    errorMessage,
    completedAt,
    isComplete,
    isFailed,
    refetch,
  } = useFileStatus(id, file);

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

  useEffect(() => {
    fetchFile();
  }, [id]);

  // When polling reaches complete or failed, refresh file record to obtain full text/summary
  useEffect(() => {
    if (isComplete || isFailed) {
      fetchFile();
    }
  }, [isComplete, isFailed]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyExtractedText = () => {
    if (!file?.extractedText) return;
    navigator.clipboard.writeText(file.extractedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownload = async () => {
    if (!file) return;
    try {
      await fileService.downloadFile(file.id, file.originalName);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleReprocess = async () => {
    if (!file) return;
    setIsReprocessing(true);
    try {
      await fileService.reprocessFile(file.id);
      await fetchFile();
      refetch();
    } catch (err) {
      alert(`Reprocessing failed to initiate: ${err.message}`);
    } finally {
      setIsReprocessing(false);
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
        <LoadingSpinner size="lg" message="Loading document details and AI summary..." />
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
  const currentStage = processingStage || file.processingStage;
  const currentProgress = progress !== undefined ? progress : file.progress;
  const currentError = errorMessage || file.errorMessage;
  const currentCompletedAt = completedAt || file.completedAt;

  const summary = file.summary;
  const extractedText = file.extractedText;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation and Top Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/files"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to File History
        </Link>

        <div className="flex items-center gap-2">
          {currentStatus === 'FAILED' && (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              isLoading={isReprocessing}
              onClick={handleReprocess}
            >
              Retry Processing
            </Button>
          )}

          {currentStatus !== 'FAILED' && (
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownload}
            >
              Download Original
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

      {/* Main Document Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {file.originalName}
                </h1>
                <StatusBadge status={currentStatus} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono">ID: {file.id.substring(0, 13)}...</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:text-slate-600 rounded transition-colors"
                  title="Copy UUID"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <span>•</span>
                <span>{formatBytes(file.size)}</span>
                {file.pageCount && (
                  <>
                    <span>•</span>
                    <span>{file.pageCount} page(s)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Reprocess Action */}
          <div className="flex items-center gap-2">
            {currentStatus === 'COMPLETED' && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleReprocess}
                isLoading={isReprocessing}
                title="Re-run text extraction & AI summarization"
              >
                Reprocess
              </Button>
            )}
          </div>
        </div>

        {/* Live Processing Lifecycle Banner (if running or failed) */}
        {(currentStatus === 'PROCESSING' || currentStatus === 'PENDING' || currentStatus === 'FAILED') && (
          <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-slate-600">
                Processing Status: {currentStage ? `Stage ${currentStage}` : currentStatus}
              </span>
              <span className="font-bold text-slate-800">{currentProgress}%</span>
            </div>

            <ProgressBar
              progress={currentProgress}
              status={currentStatus}
              showLabel={false}
              height="h-2.5"
            />

            {currentStatus === 'PROCESSING' && (
              <p className="text-xs text-indigo-600 font-medium animate-pulse">
                Asynchronous worker is analyzing content ({currentProgress}% complete)...
              </p>
            )}

            {currentStatus === 'FAILED' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Processing failed: {currentError || 'An error occurred during pipeline execution.'}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white text-rose-700 hover:bg-rose-50 border-rose-300"
                  icon={RotateCcw}
                  onClick={handleReprocess}
                  isLoading={isReprocessing}
                >
                  Retry Now
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tabs Navigation Bar */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'summary'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Summary
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('extracted')}
            className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'extracted'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Extracted Text
            {file.pageCount && (
              <span className="text-[11px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full">
                {file.pageCount}p
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info className="w-4 h-4 text-slate-500" />
            Document Information
          </button>
        </div>

        {/* TAB 1: AI Summary Content */}
        {activeTab === 'summary' && (
          <div className="p-6 sm:p-8 space-y-6">
            {!summary ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  {currentStatus === 'PROCESSING' || currentStatus === 'PENDING'
                    ? 'AI Summary is Generating...'
                    : currentStatus === 'FAILED'
                    ? 'AI Summary Unavailable'
                    : 'No AI Summary Available'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {currentStatus === 'PROCESSING' || currentStatus === 'PENDING'
                    ? 'Gemini AI is analyzing the document content and generating a structured summary. Please wait a few moments.'
                    : currentStatus === 'FAILED'
                    ? `Processing encountered an issue: ${currentError || 'Check document format and API key configuration.'}`
                    : 'The document summary has not been generated.'}
                </p>

                {currentStatus === 'FAILED' && (
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleReprocess}
                      isLoading={isReprocessing}
                    >
                      Retry Processing
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Document Title & Overview Banner */}
                <div className="p-6 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white rounded-2xl border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Gemini AI Executive Summary</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {summary.title || file.originalName}
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {summary.overview}
                  </p>
                </div>

                {/* Key Points */}
                {Array.isArray(summary.keyPoints) && summary.keyPoints.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Key Points & Findings
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {summary.keyPoints.map((point, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Terms & Definitions */}
                {Array.isArray(summary.importantTerms) && summary.importantTerms.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      Important Terminology
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {summary.importantTerms.map((termItem, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                        >
                          <span className="text-xs font-bold text-indigo-700 block">
                            {termItem.term}
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {termItem.definition || 'Term identified in document.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Facts & Figures */}
                {Array.isArray(summary.importantFacts) && summary.importantFacts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      Key Facts, Data & Metrics
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {summary.importantFacts.map((fact, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-lg text-xs text-amber-950 flex items-start gap-2.5"
                        >
                          <span className="text-amber-600 font-bold">•</span>
                          <span className="font-medium leading-relaxed">{fact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conclusion */}
                {summary.conclusion && (
                  <div className="p-5 bg-slate-900 text-slate-100 rounded-xl space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                      Overall Conclusion
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {summary.conclusion}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Extracted Text Content */}
        {activeTab === 'extracted' && (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Extracted Document Text
                </h3>
                <p className="text-xs text-slate-500">
                  {extractedText
                    ? `Extracted ${extractedText.length} characters across ${file.pageCount || 1} page(s).`
                    : 'No text extracted yet.'}
                </p>
              </div>

              {extractedText && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={copiedText ? Check : Copy}
                  onClick={handleCopyExtractedText}
                >
                  {copiedText ? 'Copied!' : 'Copy Text'}
                </Button>
              )}
            </div>

            {!extractedText ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {currentStatus === 'PROCESSING' || currentStatus === 'PENDING'
                  ? 'Text extraction is currently in progress...'
                  : 'No selectable text found in this file.'}
              </div>
            ) : (
              <div className="relative">
                <pre className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                  {extractedText}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Document Information Metadata */}
        {activeTab === 'info' && (
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  Storage Stored Name
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

              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Document Page Count
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {file.pageCount ? `${file.pageCount} page(s)` : 'N/A'}
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
                  Upload Date
                </span>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatDate(file.createdAt)}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Processing Completed Date
                </span>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {currentCompletedAt ? formatDate(currentCompletedAt) : 'Pending / Not completed'}
                </p>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                  Current Processing Stage
                </span>
                <p className="mt-1 text-sm font-medium text-indigo-700">
                  {currentStage || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Stored Document"
        message={`Are you sure you want to permanently delete '${file.originalName}'? The document and its extracted text and AI summaries will be permanently removed.`}
        confirmText="Yes, Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
};
