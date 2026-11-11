import React, { useState, useEffect, useCallback } from 'react';
import { fileService } from '../services/fileService.js';
import { FileTable } from '../components/files/FileTable.jsx';
import { Button } from '../components/common/Button.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ErrorMessage } from '../components/common/ErrorMessage.jsx';
import {
  Search,
  RefreshCw,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STATUS_FILTERS = [
  { label: 'All Files', value: 'ALL' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
];

export const FileHistory = () => {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchFiles = useCallback(
    async (page = 1, status = statusFilter, search = searchTerm, showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      setError(null);

      try {
        const response = await fileService.getFiles({
          page,
          limit: 10,
          status,
          search,
        });

        setFiles(response.data || []);
        if (response.meta) {
          setPagination(response.meta);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch files');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, searchTerm]
  );

  useEffect(() => {
    fetchFiles(1, statusFilter, searchTerm);
  }, [fetchFiles, statusFilter, searchTerm]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const handleDownload = async (fileId, originalName) => {
    try {
      await fileService.downloadFile(fileId, originalName);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await fileService.deleteFile(fileId);
      // Refresh list
      fetchFiles(pagination.page, statusFilter, searchTerm);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchFiles(newPage, statusFilter, searchTerm);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            File History & Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse, filter, inspect processing details, download, or delete your files.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            isLoading={isRefreshing}
            onClick={() => fetchFiles(pagination.page, statusFilter, searchTerm, true)}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={UploadCloud}
            onClick={() => {
              window.location.href = '/upload';
            }}
          >
            Upload New
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => fetchFiles(1, statusFilter, searchTerm, true)} />}

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === tab.value
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by filename..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Main Files Table */}
      {isLoading ? (
        <div className="py-20">
          <LoadingSpinner size="lg" message="Loading files from database..." />
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          title="No files match your filter"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Try resetting your search query or status filter to see other files.'
              : 'You have not uploaded any files yet. Upload a file to get started.'
          }
          actionLabel={searchTerm || statusFilter !== 'ALL' ? 'Clear Filters' : 'Upload File'}
          onAction={() => {
            if (searchTerm || statusFilter !== 'ALL') {
              setStatusFilter('ALL');
              handleClearSearch();
            } else {
              window.location.href = '/upload';
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          <FileTable
            files={files}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-3">
              <span className="text-xs text-slate-500">
                Showing Page <span className="font-semibold">{pagination.page}</span> of{' '}
                <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total} files)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

