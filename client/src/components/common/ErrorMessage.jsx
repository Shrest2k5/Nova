import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

export const ErrorMessage = ({
  title = 'Error',
  message,
  onRetry,
  className = '',
}) => {
  if (!message) return null;

  return (
    <div
      className={`p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 ${className}`}
    >
      <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h4 className="text-sm font-semibold text-rose-800">{title}</h4>}
        <p className="text-sm text-rose-700 mt-0.5">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

