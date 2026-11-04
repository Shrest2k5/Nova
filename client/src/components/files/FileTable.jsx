import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Trash2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileCode,
} from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/formatters.js';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { ProgressBar } from '../common/ProgressBar.jsx';
import { Button } from '../common/Button.jsx';
import { ConfirmationModal } from '../common/ConfirmationModal.jsx';
import { useFileStatus } from '../../hooks/useFileStatus.js';

// Row component with isolated live polling for active files
const FileTableRow = ({ file, onDownload, onDeleteClick }) => {
  // Only activate polling if file is not yet finished
  const shouldPoll = file.status === 'PENDING' || file.status === 'PROCESSING';
  const { status, progress, errorMessage } = useFileStatus(
    shouldPoll ? file.id : null,
    file
  );

  const currentStatus = shouldPoll ? status : file.status;
  const currentProgress = shouldPoll ? progress : file.progress;

  const getFileIcon = (mime = '', name = '') => {
    if (mime.startsWith('image/')) return ImageIcon;
    if (mime.includes('zip') || mime.includes('compressed')) return FileArchive;
    if (mime.includes('json') || name.endsWith('.json')) return FileCode;
    return FileText;
  };

  const Icon = getFileIcon(file.mimeType, file.originalName);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 max-w-xs">
            <Link
              to={`/files/${file.id}`}
              className="text-sm font-semibold text-slate-800 hover:text-indigo-600 truncate block"
              title={file.originalName}
            >
              {file.originalName}
            </Link>
            <span className="text-xs text-slate-400 block truncate">
              {file.mimeType}
            </span>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
        {formatBytes(file.size)}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1 max-w-[140px]">
          <StatusBadge status={currentStatus} size="sm" />
          {currentStatus === 'PROCESSING' && (
            <ProgressBar
              progress={currentProgress}
              status={currentStatus}
              showLabel={false}
              height="h-1.5"
            />
          )}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
        {formatDate(file.createdAt)}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/files/${file.id}`}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Details"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {currentStatus !== 'FAILED' && (
            <button
              type="button"
              onClick={() => onDownload(file.id, file.originalName)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onDeleteClick(file)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const FileTable = ({
  files = [],
  onDownload,
  onDelete,
  isLoading = false,
}) => {
  const [selectedFileForDelete, setSelectedFileForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!selectedFileForDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(selectedFileForDelete.id);
      setSelectedFileForDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                File Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Size
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Uploaded At
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {files.map((file) => (
              <FileTableRow
                key={file.id}
                file={file}
                onDownload={onDownload}
                onDeleteClick={(f) => setSelectedFileForDelete(f)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!selectedFileForDelete}
        title="Delete Uploaded File"
        message={`Are you sure you want to delete '${selectedFileForDelete?.originalName}'? This permanently removes the physical file from persistent storage and its PostgreSQL record.`}
        confirmText="Permanently Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setSelectedFileForDelete(null)}
      />
    </div>
  );
};

