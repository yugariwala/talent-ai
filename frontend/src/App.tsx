import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileUploadZone, type QueuedFile } from './components/FileUploadZone';
import { ProcessingView } from './components/ProcessingView';
import { IntakeView } from './components/IntakeView';
import Dashboard from './pages/Dashboard';
import CandidatesPage from './pages/CandidatesPage';
import {
  LayoutDashboard, Users, FileText, Settings,
  Briefcase, Zap
} from 'lucide-react';

function App() {
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
      <Sidebar />

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <Header />

        {/* Content */}
        <section className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs/new" element={<IntakeViewPage />} />
            <Route path="/jobs/:jobId/upload" element={<UploadPage />} />
            <Route path="/jobs/:jobId/processing" element={<ProcessingPage />} />
            <Route path="/jobs/:jobId/results" element={<CandidatesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}


// ── Sidebar Component ──────────────────────────────────────
function Sidebar() {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { to: '/jobs/new', icon: <Briefcase size={16} />, label: 'New Job' },
    { to: '/settings', icon: <Settings size={16} />, label: 'Settings' },
  ];

  return (
    <aside className="relative z-10 w-60 flex flex-col border-r border-white/[0.07] backdrop-blur-xl"
      style={{ background: 'rgba(255,255,255,0.02)' }}>

      {/* Logo */}
      <div className="p-6 pb-8">
        <Link to="/" className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <Zap size={14} className="text-black" fill="black" />
          </div>
          <span className="text-base font-bold tracking-tight">Talent AI</span>
        </Link>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={isActive} />
            );
          })}
        </nav>
      </div>

      {/* Bottom card */}
      <div className="mt-auto p-5">
        <div className="rounded-2xl p-4 border border-white/10 glow-cyan-sm"
          style={{ background: 'rgba(0,210,255,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a1] mb-1">
            AI Powered
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-white">Talent AI</p>
          <p className="text-[10px] text-[#a1a1a1] mt-2">Multi-Agent Recruitment System</p>
        </div>
      </div>
    </aside>
  );
}


// ── Header Component ───────────────────────────────────────
function Header() {
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/jobs/new') return 'AI Intake Assistant';
    if (location.pathname.includes('/upload')) return 'Resume Upload';
    if (location.pathname.includes('/processing')) return 'Processing Pipeline';
    if (location.pathname.includes('/results')) return 'Candidates';
    if (location.pathname === '/settings') return 'Settings';
    return 'Talent AI';
  };

  const getSubtitle = () => {
    if (location.pathname === '/') return 'Overview of all job posts and activity';
    if (location.pathname === '/jobs/new') return 'Define evaluation criteria with AI';
    if (location.pathname.includes('/upload')) return 'Add resumes to the processing pipeline';
    if (location.pathname.includes('/processing')) return 'Intelligent parsing & matching system';
    if (location.pathname.includes('/results')) return 'Ranked candidates with AI-generated insights';
    if (location.pathname === '/settings') return 'System configuration';
    return 'Intelligent Resume Parsing & Matching';
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-white/[0.07]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
      <div>
        <h1 className="text-lg font-bold tracking-tight leading-none">{getTitle()}</h1>
        <p className="text-xs text-[#a1a1a1] mt-0.5">{getSubtitle()}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {['N', 'D', 'A'].map((l, i) => (
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
      </div>
    </header>
  );
}


// ── NavItem Component ──────────────────────────────────────
function NavItem({ to, icon, label, active = false }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active
          ? 'text-white bg-white/8'
          : 'text-[#a1a1a1] hover:text-white hover:bg-white/5'}`}>
      {icon}
      {label}
    </Link>
  );
}


// ── IntakeView Page Wrapper ────────────────────────────────
function IntakeViewPage() {
  const navigate = useNavigate();
  // Create a new job on mount
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const createJob = async () => {
      if (creating || jobId) return;
      setCreating(true);
      try {
        const { apiFetch } = await import('./lib/api');
        const result = await apiFetch('/api/v1/jobs/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Job Post' }),
        });
        setJobId(result.job_id);
      } catch (err) {
        console.error('Failed to create job:', err);
        // Fallback to a generated ID
        setJobId(`job-${Date.now()}`);
      }
    };
    createJob();
  }, []);

  if (!jobId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 animate-pulse">
            <Briefcase size={20} className="text-[#00D2FF]" />
          </div>
          <p className="text-sm text-[#a1a1a1]">Creating job post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <IntakeView
        jobId={jobId}
        onComplete={(criteriaCard) => {
          navigate(`/jobs/${jobId}/upload`);
        }}
      />
    </div>
  );
}


// ── Upload Page ────────────────────────────────────────────
function UploadPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [processedFiles, setProcessedFiles] = React.useState<QueuedFile[]>([]);

  const handleFilesQueued = (files: QueuedFile[]) => {
    setProcessedFiles(prev => [...prev, ...files]);
  };

  return (
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
                ID: {jobId || ''}
              </span>
            </div>
            <FileUploadZone jobId={jobId || ''} onFilesQueued={handleFilesQueued} />
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

            <button
              onClick={() => navigate(`/jobs/${jobId}/processing`)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-200 transition-all duration-200"
            >
              Start Processing →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Processing Page ────────────────────────────────────────
function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  return (
    <ProcessingView
      jobId={jobId || 'unknown'}
      onComplete={() => navigate(`/jobs/${jobId}/results`)}
    />
  );
}


// ── Settings Page ──────────────────────────────────────────
function SettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-2xl p-8 space-y-6">
          <h2 className="text-lg font-bold tracking-tight">System Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <p className="text-sm font-medium">API Key Status</p>
                <p className="text-xs text-[#a1a1a1]">Groq API connection</p>
              </div>
              <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/30">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <p className="text-sm font-medium">AI Model</p>
                <p className="text-xs text-[#a1a1a1]">Current LLM model</p>
              </div>
              <span className="text-xs font-mono text-[#a1a1a1]">llama-3.3-70b-versatile</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-[#a1a1a1]">Storage backend</p>
              </div>
              <span className="text-xs font-mono text-[#a1a1a1]">SQLite (async)</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-xs text-[#a1a1a1]">Application version</p>
              </div>
              <span className="text-xs font-mono text-[#a1a1a1]">2.0 (Mark 1)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── StatusBadge Component ──────────────────────────────────
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
