import React from 'react';
import {
  Files,
  CheckCircle2,
  Loader2,
  AlertOctagon,
  HardDrive,
  Users,
} from 'lucide-react';
import { StatCard } from '../common/StatCard.jsx';
import { formatBytes } from '../../utils/formatters.js';

export const StatsGrid = ({ stats = {}, isAdmin = false }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard
        title="Total Files"
        value={stats.total ?? 0}
        icon={Files}
        variant="indigo"
        subtitle="All stored database records"
      />

      <StatCard
        title="Completed"
        value={stats.completed ?? 0}
        icon={CheckCircle2}
        variant="emerald"
        subtitle="Processed successfully"
      />

      <StatCard
        title="Processing"
        value={stats.processing ?? 0}
        icon={Loader2}
        variant="amber"
        subtitle="Active background tasks"
      />

      <StatCard
        title="Failed Tasks"
        value={stats.failed ?? 0}
        icon={AlertOctagon}
        variant="rose"
        subtitle="Corrupted or failed files"
      />

      {isAdmin && stats.totalUsers !== undefined && (
        <StatCard
          title="Total Users"
          value={stats.totalUsers ?? 0}
          icon={Users}
          variant="slate"
          subtitle="Registered accounts"
        />
      )}

      {stats.totalStorageBytes !== undefined && (
        <StatCard
          title="Storage Volume"
          value={formatBytes(stats.totalStorageBytes)}
          icon={HardDrive}
          variant="slate"
          subtitle="Persistent disk usage"
        />
      )}
    </div>
  );
};

