import React from 'react';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const StatusBadge = ({ status, showIcon = true, size = 'md' }) => {
  const normalizedStatus = (status || 'QUEUED').toUpperCase();

  const configs = {
    QUEUED: {
      label: 'Queued',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      spin: false,
    },
    PROCESSING: {
      label: 'Processing',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Loader2,
      spin: true,
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      spin: false,
    },
    FAILED: {
      label: 'Failed',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertCircle,
      spin: false,
    },
  };

  const config = configs[normalizedStatus] || configs.QUEUED;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${
        sizeClasses[size] || sizeClasses.md
      }`}
    >
      {showIcon && (
        <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      )}
      {config.label}
    </span>
  );
};

