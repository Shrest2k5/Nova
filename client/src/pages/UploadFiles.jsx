import React from 'react';
import { FileUploadZone } from '../components/files/FileUploadZone.jsx';
import {
  UploadCloud,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
} from 'lucide-react';

export const UploadFiles = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Upload & Process Files
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload documents, spreadsheets, or archives. The asynchronous processing
          pipeline initiates automatically.
        </p>
      </div>

      {/* Main Upload Zone */}
      <FileUploadZone />

      {/* Pipeline Architecture Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          Asynchronous 5-Stage Processing Engine
        </h3>
        <p className="text-xs text-slate-500">
          Once your file upload completes, our background worker processes the payload
          over ~25 seconds with real-time database-backed status tracking:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 1 (25%)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Virus & Checksum</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Integrity verification</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 2 (50%)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Metadata Extract</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Header & MIME inspection</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Cpu className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 3 (75%)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Deep Indexing</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Content structure parsing</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <Database className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 4 (90%)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Optimization</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Preview & summary build</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 5 (100%)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Completed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Committed to PostgreSQL</p>
          </div>
        </div>
      </div>
    </div>
  );
};

