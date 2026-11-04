import React from 'react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  variant = 'indigo',
  subtitle,
}) => {
  const variantStyles = {
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'hover:border-indigo-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'hover:border-emerald-200',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'hover:border-amber-200',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'hover:border-rose-200',
    },
    slate: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'hover:border-slate-300',
    },
  };

  const style = variantStyles[variant] || variantStyles.indigo;

  return (
    <div
      className={`bg-white p-6 rounded-xl border border-slate-200 shadow-xs transition-all duration-200 ${style.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
            {value ?? 0}
          </p>
        </div>
        {Icon && (
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {subtitle && (
        <p className="mt-3 text-xs text-slate-500 flex items-center gap-1 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};

