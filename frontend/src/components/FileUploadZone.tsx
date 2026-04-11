import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';

export interface FileUploadZoneProps {
  jobId: string;
  onFilesQueued: (files: QueuedFile[]) => void;
}

export interface QueuedFile {
  name: string;
  size: number;
  format: 'pdf' | 'docx' | 'txt';
  status: 'queued' | 'uploading' | 'done' | 'error';
}

interface LocalFile extends QueuedFile {
  rawFile: File;
  errorMessage?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const getFormat = (filename: string, mime: string): 'pdf' | 'docx' | 'txt' | null => {
  const n = filename.toLowerCase();
  if (n.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  if (n.match(/\.docx?$/) || mime.includes('word')) return 'docx';
  if (n.endsWith('.txt') || mime === 'text/plain') return 'txt';
  return null;
};

const FORMAT_STYLE: Record<string, string> = {
  pdf:  'text-red-400',
  docx: 'text-[#00d2ff]',
  txt:  'text-[#a1a1a1]',
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({ jobId, onFilesQueued }) => {
  const [files, setFiles]       = useState<LocalFile[]>([]);
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX = 10 * 1024 * 1024;

  const ingest = (fileList: FileList | null) => {
    if (!fileList) return;
    const next: LocalFile[] = Array.from(fileList).map(f => {
      const format = getFormat(f.name, f.type);
      if (!format)        return { rawFile: f, name: f.name, size: f.size, format: 'txt' as const, status: 'error' as const, errorMessage: 'Unsupported type' };
      if (f.size > MAX)   return { rawFile: f, name: f.name, size: f.size, format, status: 'error' as const, errorMessage: 'Exceeds 10 MB' };
      return { rawFile: f, name: f.name, size: f.size, format, status: 'queued' as const };
    });
    setFiles(prev => [...prev, ...next]);
  };

  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const onDrop      = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); ingest(e.dataTransfer.files); };
  const onChange    = (e: React.ChangeEvent<HTMLInputElement>) => { ingest(e.target.files); e.target.value = ''; };

  const uploadFiles = async () => {
    const valid = files.filter(f => f.status === 'queued');
    if (!valid.length) return;

    setFiles(prev => prev.map(f => f.status === 'queued' ? { ...f, status: 'uploading' } : f));

    const API_BASE = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ?? 'http://localhost:8000';
    const API_KEY  = (import.meta as { env?: Record<string, string> }).env?.VITE_API_KEY  ?? 'dev-key-12345';

    const form = new FormData();
    valid.forEach(f => form.append('files', f.rawFile));
    form.append('job_post_id', jobId);

    try {
      const res = await fetch(`${API_BASE}/api/v1/parse/batch`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data: QueuedFile[] = await res.json();
      setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'done' } : f));
      onFilesQueued(data);
    } catch {
      setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'error', errorMessage: 'Upload failed' } : f));
    }
  };

  const queued = files.filter(f => f.status === 'queued').length;

  return (
    <div className="w-full space-y-4">

      {/* ── Drop Zone ── */}
      <div
        className={`upload-zone rounded-2xl p-10 text-center cursor-pointer select-none ${isDragging ? 'drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10"
            style={{ background: isDragging ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.05)' }}>
            <UploadCloud size={22} className={isDragging ? 'text-[#00d2ff]' : 'text-[#a1a1a1]'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Drop resumes here or <span className="text-[#00d2ff]">click to browse</span>
            </p>
            <p className="text-xs text-[#a1a1a1] mt-1">PDF, DOCX, TXT — up to 10 MB each</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={onChange}
        />
      </div>

      {/* ── File List ── */}
      {files.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-white/10"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <ul className="divide-y divide-white/[0.06] max-h-64 overflow-y-auto">
            {files.map((file, idx) => (
              <li key={`${file.name}-${idx}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-3 overflow-hidden pr-4 min-w-0">
                  <FileText size={16} className={`flex-shrink-0 ${FORMAT_STYLE[file.format] ?? 'text-[#a1a1a1]'}`} />
                  <span className="text-sm font-medium text-white truncate" title={file.name}>{file.name}</span>
                  <span className="text-xs text-[#a1a1a1] whitespace-nowrap flex-shrink-0">{formatBytes(file.size)}</span>
                </div>
                <StatusIcon file={file} />
              </li>
            ))}
          </ul>

          {/* Upload button */}
          <div className="px-4 py-3 flex justify-end border-t border-white/[0.06]"
            style={{ background: 'rgba(0,0,0,0.3)' }}>
            <button
              onClick={e => { e.stopPropagation(); uploadFiles(); }}
              disabled={queued === 0}
              className="flex items-center gap-2 bg-white text-black text-sm font-semibold rounded-full px-5 py-2 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.03] transition-transform duration-200"
            >
              Upload {queued > 0 ? `${queued} file${queued !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function StatusIcon({ file }: { file: LocalFile }) {
  if (file.status === 'uploading') return <Loader2 size={16} className="text-[#00d2ff] animate-spin flex-shrink-0" />;
  if (file.status === 'done')      return <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />;
  if (file.status === 'error') return (
    <div className="flex items-center gap-1.5 text-red-400 flex-shrink-0">
      <XCircle size={16} />
      <span className="text-[10px] max-w-[90px] truncate">{file.errorMessage}</span>
    </div>
  );
  return (
    <span className="text-[10px] text-[#a1a1a1] border border-white/10 px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      queued
    </span>
  );
}

export default FileUploadZone;
