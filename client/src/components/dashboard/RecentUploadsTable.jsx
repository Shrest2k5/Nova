import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Image as ImageIcon, FileArchive, Download } from 'lucide-react';
import { formatBytes, formatRelativeTime } from '../../utils/formatters.js';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { useFileStatus } from '../../hooks/useFileStatus.js';

const RecentRow = ({ file, onDownload }) => {
  const shouldPoll = ['QUEUED', 'PROCESSING', 'EXTRACTING'].includes(file.status);
  const { status, progress } = useFileStatus(shouldPoll ? file.id : null, file);

  const currentStatus = shouldPoll ? status : file.status;
  const currentProgress = shouldPoll ? progress : file.progress;

  const getIcon = (mime = '') => {
    if (mime.startsWith('image/')) return ImageIcon;
    if (mime.includes('zip')) return FileArchive;
    return FileText;
  };

  const Icon = getIcon(file.mimeType);

  return (
    <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 max-w-[200px] sm:max-w-xs">
          <Link
            to={`/files/${file.id}`}
            className="text-sm font-semibold text-slate-800 hover:text-indigo-600 truncate block"
          >
            {file.originalName}
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{formatBytes(file.size)}</span>
            <span>•</span>
            <span>{formatRelativeTime(file.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right min-w-[120px]">
          <StatusBadge status={currentStatus} size="sm" />
          {currentStatus === 'PROCESSING' && (
            <div className="mt-1 w-24">
              <ProgressBar
                progress={currentProgress}
                status={currentStatus}
                showLabel={false}
                height="h-1"
              />
            </div>
          )}
        </div>

        {currentStatus !== 'FAILED' && onDownload && (
          <button
            type="button"
            onClick={() => onDownload(file.id, file.originalName)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const RecentUploadsTable = ({ files = [], onDownload }) => {
  if (!files || files.length === 0) {
    return (
      <EmptyState
        title="No recent uploads"
        description="Uploaded files will appear here along with their real-time status."
        actionLabel="Upload First File"
        onAction={() => {
          window.location.href = '/upload';
        }}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          Recent Activity
        </h3>
        <Link
          to="/files"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100 mt-2">
        {files.map((file) => (
          <RecentRow key={file.id} file={file} onDownload={onDownload} />
        ))}
      </div>
    </div>
  );
};

