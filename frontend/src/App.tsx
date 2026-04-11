import React, { useState } from 'react';
import { FileUploadZone, type QueuedFile } from './components/FileUploadZone';
<<<<<<< HEAD
import { ProcessingView } from './components/ProcessingView';
import {
  LayoutDashboard, Users, FileText, Settings,
  Briefcase, Plus, ChevronRight, Zap, Cpu
} from 'lucide-react';

type View = 'upload' | 'processing';
=======
import {
  LayoutDashboard, Users, FileText, Settings,
  Briefcase, Plus, ChevronRight, Zap
} from 'lucide-react';
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93

function App() {
  const [jobId] = useState('job-123');
  const [processedFiles, setProcessedFiles] = useState<QueuedFile[]>([]);
<<<<<<< HEAD
  const [view, setView] = useState<View>('upload');
=======
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93

  const handleFilesQueued = (files: QueuedFile[]) => {
    setProcessedFiles(prev => [...prev, ...files]);
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">

      {/* ── Ambient background glows ─────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,210,255,0.06) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,210,255,0.04) 0%, transparent 70%)' }} />
      </div>

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="relative z-10 w-60 flex flex-col border-r border-white/[0.07] backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.02)' }}>

        {/* Logo */}
        <div className="p-6 pb-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <Zap size={14} className="text-black" fill="black" />
            </div>
            <span className="text-base font-bold tracking-tight">Talent AI</span>
          </div>

          <nav className="space-y-0.5">
            <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard" active />
            <NavItem icon={<Briefcase size={16} />} label="Jobs" />
            <NavItem icon={<Users size={16} />} label="Candidates" />
            <NavItem icon={<FileText size={16} />} label="Reports" />
            <NavItem icon={<Settings size={16} />} label="Settings" />
          </nav>
        </div>

        {/* Bottom card */}
        <div className="mt-auto p-5">
          <div className="rounded-2xl p-4 border border-white/10 glow-cyan-sm"
            style={{ background: 'rgba(0,210,255,0.05)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a1] mb-1">
              Total Savings
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-white">$12,450</p>
            <p className="text-[10px] text-[#a1a1a1] mt-2">Based on automated processing</p>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/[0.07]"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
          <div>
<<<<<<< HEAD
            <h1 className="text-lg font-bold tracking-tight leading-none">
              {view === 'upload' ? 'Resume Upload' : 'Processing Pipeline'}
            </h1>
            <p className="text-xs text-[#a1a1a1] mt-0.5">Intelligent parsing &amp; matching system</p>
          </div>

          <div className="flex items-center gap-3">
=======
            <h1 className="text-lg font-bold tracking-tight leading-none">Resume Processing</h1>
            <p className="text-xs text-[#a1a1a1] mt-0.5">Intelligent parsing &amp; matching system</p>
          </div>

          <div className="flex items-center gap-4">
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {['N','D','A'].map((l, i) => (
                <div key={i}
                  className="w-7 h-7 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {l}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border border-black bg-white flex items-center justify-center text-[9px] font-bold text-black">
                +12
              </div>
            </div>

<<<<<<< HEAD
            {/* View toggle tabs */}
            <div className="flex items-center gap-1 rounded-full border border-white/10 p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => setView('upload')}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-1.5 transition-all duration-200 ${
                  view === 'upload' ? 'bg-white text-black' : 'text-[#a1a1a1] hover:text-white'
                }`}
              >
                <Plus size={12} /> Upload
              </button>
              <button
                onClick={() => setView('processing')}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-1.5 transition-all duration-200 ${
                  view === 'processing' ? 'bg-white text-black' : 'text-[#a1a1a1] hover:text-white'
                }`}
              >
                <Cpu size={12} /> Processing
              </button>
            </div>

            <button className="flex items-center gap-1 bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-full px-4 py-2 hover:bg-white/10 transition-all duration-200">
              <ChevronRight size={12} />
              New Batch
=======
            {/* Primary Pill CTA — micro1 style */}
            <button
              className="flex items-center gap-2 bg-white text-black text-sm font-semibold rounded-full px-5 py-2 hover:scale-[1.03] transition-transform duration-200"
            >
              <Plus size={14} />
              New Batch
              <span className="bg-black text-white rounded-full p-0.5 ml-1">
                <ChevronRight size={10} />
              </span>
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
            </button>
          </div>
        </header>

        {/* Content */}
<<<<<<< HEAD
        <section className="flex-1 overflow-y-auto">
          {view === 'upload' ? (
            <div className="p-8">
              <div className="max-w-3xl mx-auto space-y-8">

                {/* Upload card */}
                <div className="rounded-2xl p-px glow-cyan"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="rounded-2xl p-6"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-base font-bold tracking-tight">Upload Resume Pipeline</h2>
                        <p className="text-xs text-[#a1a1a1] mt-1">
                          Add candidates to the current active job cycle
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-3 py-1 rounded-full border border-white/10 text-[#a1a1a1]"
                        style={{ background: 'rgba(0,210,255,0.06)' }}>
                        ID: {jobId}
                      </span>
                    </div>
                    <FileUploadZone jobId={jobId} onFilesQueued={handleFilesQueued} />
                  </div>
                </div>

                {/* Queue History */}
                {processedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a1] px-1">
                      Processing Queue
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {processedFiles.map((file, idx) => (
                        <div key={idx}
                          className="glass rounded-xl px-4 py-3 flex items-center justify-between hover:border-white/20 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase
                              ${file.format === 'pdf' ? 'bg-red-500/10 text-red-400' :
                                file.format === 'docx' ? 'bg-cyan-500/10 text-cyan-400' :
                                'bg-white/6 text-[#a1a1a1]'}`}>
                              {file.format}
                            </div>
                            <p className="text-sm font-medium truncate">{file.name}</p>
                          </div>
                          <StatusBadge status={file.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ProcessingView
              jobId={jobId}
              onComplete={() => alert('✅ Results phase — wire up your ResultsView here!')}
            />
          )}
=======
        <section className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Upload card */}
            <div className="rounded-2xl p-px glow-cyan"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="rounded-2xl p-6"
                style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-base font-bold tracking-tight">Upload Resume Pipeline</h2>
                    <p className="text-xs text-[#a1a1a1] mt-1">
                      Add candidates to the current active job cycle
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full border border-white/10 text-[#a1a1a1]"
                    style={{ background: 'rgba(0,210,255,0.06)' }}>
                    ID: {jobId}
                  </span>
                </div>
                <FileUploadZone jobId={jobId} onFilesQueued={handleFilesQueued} />
              </div>
            </div>

            {/* Queue History */}
            {processedFiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a1] px-1">
                  Processing Queue
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {processedFiles.map((file, idx) => (
                    <div key={idx}
                      className="glass rounded-xl px-4 py-3 flex items-center justify-between hover:border-white/20 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase
                          ${file.format === 'pdf' ? 'bg-red-500/10 text-red-400' :
                            file.format === 'docx' ? 'bg-cyan-500/10 text-cyan-400' :
                            'bg-white/6 text-[#a1a1a1]'}`}>
                          {file.format}
                        </div>
                        <p className="text-sm font-medium truncate">{file.name}</p>
                      </div>
                      <StatusBadge status={file.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
        </section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a href="#"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active
          ? 'text-white bg-white/8'
          : 'text-[#a1a1a1] hover:text-white hover:bg-white/5'}`}>
      {icon}
      {label}
    </a>
  );
}

function StatusBadge({ status }: { status: QueuedFile['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued:    { label: 'queued',    cls: 'text-[#a1a1a1] border-white/10'          },
    uploading: { label: 'uploading', cls: 'text-cyan-400 border-cyan-400/30'        },
    done:      { label: 'done',      cls: 'text-emerald-400 border-emerald-400/30'  },
    error:     { label: 'error',     cls: 'text-red-400 border-red-400/30'          },
  };
  const m = map[status] ?? map.queued;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${m.cls} flex-shrink-0`}
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      {m.label}
    </span>
  );
}

export default App;
