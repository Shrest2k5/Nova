import React from 'react';

export const ProgressBar = ({
  progress = 0,
  status = 'PROCESSING',
  showLabel = true,
  height = 'h-2',
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const getBarColor = () => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-emerald-500';
      case 'FAILED':
        return 'bg-rose-500';
      case 'QUEUED':
        return 'bg-amber-400';
      case 'PROCESSING':
      default:
        return 'bg-indigo-600';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1">
          <span>
            {status === 'COMPLETED'
              ? 'Complete'
              : status === 'FAILED'
              ? 'Failed'
              : status === 'PROCESSING'
              ? 'Processing...'
              : 'Queued...'}
          </span>
          <span>{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${height}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor()} ${
            status === 'PROCESSING' ? 'relative overflow-hidden' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        >
          {status === 'PROCESSING' && (
            <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          )}
        </div>
      </div>
    </div>
  );
};

