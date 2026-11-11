import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fileService } from '../services/fileService.js';
import { useFileStatus } from '../hooks/useFileStatus.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { ProgressBar } from '../components/common/ProgressBar.jsx';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ArrowLeft, Copy, FileText, RotateCcw, Trash2 } from 'lucide-react';

export const FileDetails = () => {
  const { id } = useParams(); const navigate = useNavigate(); const [file, setFile] = useState(null); const [error, setError] = useState(null); const [text, setText] = useState('');
  const load = async () => { try { const data = await fileService.getFileById(id); setFile(data); if (data.status === 'COMPLETED') setText(data.extractedText || ''); } catch (err) { setError(err.message); } };
  useEffect(() => { load(); }, [id]);
  const live = useFileStatus(id, file);
  useEffect(() => { if (live.isComplete) { load(); fileService.getExtractedText(id).then((data) => setText(data.extractedText || '')).catch(() => {}); } }, [live.isComplete, id]);
  if (!file && !error) return <LoadingSpinner size="lg" message="Loading document details..." />;
  if (error) return <div className="p-8">{error}</div>;
  const status = live.status || file.status; const progress = live.progress ?? file.progress; const processing = ['QUEUED', 'PROCESSING', 'EXTRACTING'].includes(status);
  const reprocess = async () => { await fileService.reprocessFile(id); await load(); live.refetch(); };
  const remove = async () => { await fileService.deleteFile(id); navigate('/files'); };
  return <div className="max-w-5xl mx-auto space-y-6">
    <Link to="/files" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="w-4 h-4" /> Back to files</Link>
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between gap-4"><div className="flex items-center gap-3"><FileText className="w-8 h-8 text-indigo-600" /><div><h1 className="text-xl font-bold">{file.originalName}</h1><p className="text-xs text-slate-500">{formatBytes(file.size)} · uploaded {formatDate(file.createdAt)}</p></div><StatusBadge status={status} /></div><div className="flex gap-2"><Button size="sm" variant="outline" icon={RotateCcw} onClick={reprocess}>Reprocess</Button><Button size="sm" variant="danger" icon={Trash2} onClick={remove}>Delete</Button></div></div>
      {(processing || status === 'FAILED') && <div className="p-5 bg-slate-50 border-b"><div className="flex justify-between text-xs mb-2"><span>{live.processingStage || file.processingStage || status}</span><b>{progress}%</b></div><ProgressBar progress={progress} status={status} showLabel={false} /><p className="text-xs mt-2 text-slate-600">{status === 'FAILED' ? file.errorMessage : 'Extraction is being performed by the background worker.'}</p></div>}
      <div className="p-6"><div className="flex justify-between items-center mb-3"><div><h2 className="font-bold">Complete extracted text</h2><p className="text-xs text-slate-500">{text ? `${text.length.toLocaleString()} characters` : 'No text available yet.'}</p></div>{text && <Button size="sm" variant="outline" icon={Copy} onClick={() => navigator.clipboard.writeText(text)}>Copy text</Button>}</div>{text ? <pre className="p-4 bg-slate-50 rounded-xl border whitespace-pre-wrap max-h-[650px] overflow-auto text-sm">{text}</pre> : <div className="p-12 text-center bg-slate-50 rounded-xl text-sm text-slate-500">{processing ? 'Text extraction is in progress…' : 'No extracted text was stored.'}</div>}</div>
    </div>
  </div>;
};
