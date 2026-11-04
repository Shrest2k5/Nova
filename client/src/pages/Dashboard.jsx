import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { fileService } from '../services/fileService.js';
import { StatsGrid } from '../components/dashboard/StatsGrid.jsx';
import { RecentUploadsTable } from '../components/dashboard/RecentUploadsTable.jsx';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ErrorMessage } from '../components/common/ErrorMessage.jsx';
import {
  UploadCloud,
  FolderOpen,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const [statsData, recentData] = await Promise.all([
        fileService.getDashboardStats(),
        fileService.getRecentUploads(6),
      ]);

      setStats(statsData);
      setRecentUploads(recentData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh stats every 15 seconds so active processing is reflected
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleDownload = async (fileId, originalName) => {
    try {
      await fileService.downloadFile(fileId, originalName);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" message="Loading dashboard statistics from database..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'User'}
            </h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> System Admin
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Monitoring system-wide file processing activity and database metrics.'
              : 'Overview of your uploaded documents and background processing pipeline.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            isLoading={isRefreshing}
            onClick={() => fetchDashboardData(true)}
          >
            Refresh
          </Button>

          <Link to="/upload">
            <Button variant="primary" size="sm" icon={UploadCloud}>
              Upload File
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => fetchDashboardData(true)} />}

      {/* Metrics Cards Grid */}
      {stats && <StatsGrid stats={stats} isAdmin={isAdmin} />}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads Table (2 cols) */}
        <div className="lg:col-span-2">
          <RecentUploadsTable files={recentUploads} onDownload={handleDownload} />
        </div>

        {/* Quick Actions & Processing Architecture Info Card (1 col) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">
              Quick Shortcuts
            </h3>
            <div className="space-y-2.5">
              <Link
                to="/upload"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">Upload Files</p>
                    <p className="text-xs text-slate-400">Drag & drop with live progress</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/files"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">File History</p>
                    <p className="text-xs text-slate-400">Filter, search, and download</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Engine Workflow Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Background Processing</span>
            </div>
            <h4 className="text-base font-semibold">25s Asynchronous Pipeline</h4>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              Every upload triggers a discrete 5-stage background worker. Polling continues
              smoothly even across page refreshes.
            </p>
            <div className="mt-4 pt-3 border-t border-indigo-800/60 flex items-center justify-between text-xs text-indigo-300">
              <span>Status: Operational</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

