import React from 'react';
import { FileUploadZone } from '../components/files/FileUploadZone.jsx';
import {
  ShieldCheck,
  FileSearch,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const UploadFiles = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Upload & Process Documents
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload supported documents for complete local text extraction.
        </p>
      </div>

      {/* Main Upload Zone */}
      <FileUploadZone />

      {/* Pipeline Architecture Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          Asynchronous 4-Stage Document Intelligence Pipeline
        </h3>
        <p className="text-xs text-slate-500">
            Uploaded documents are extracted asynchronously by a dedicated background worker:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 1 (0–25%)</span>
            </div>
            <p className="text-xs text-slate-700 font-semibold">PDF Validation</p>
            <p className="text-[11px] text-slate-500 mt-1">
              File signature check, size limit validation, encryption/password detection.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
              <FileSearch className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 2 (25–50%)</span>
            </div>
            <p className="text-xs text-slate-700 font-semibold">Text Extraction</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Page boundary parsing with pdf-parse, page count recording, scanned PDF detection.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 3 (50–75%)</span>
            </div>
            <p className="text-xs text-slate-700 font-semibold">Raw text extraction</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Token-conscious chunking, concept extraction, key facts & terminology analysis.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold">Stage 4 (75–100%)</span>
            </div>
            <p className="text-xs text-slate-700 font-semibold">Text persistence</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Complete extracted text persistence to PostgreSQL.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
