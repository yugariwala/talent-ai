import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useJobPolling } from "../hooks/useJobPolling";
import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Play,
  Menu,
  CheckCircle2,
  Clock,
  BarChart3,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";

/* ── Sub-components ───────────────────────────────────────────── */

function JobRoomHeader({ title, status }: { title: string; status: string }) {
  const navigate = useNavigate();
  const badgeCls =
    status === "processing"
      ? "badge-processing"
      : status === "results" || status === "completed"
      ? "badge-results"
      : "badge-intake";

  return (
    <div className="p-5 border-b border-white/8 shrink-0">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-cyan shrink-0" />
        <span className="text-xs font-semibold tracking-widest uppercase text-white/30">
          Job Room
        </span>
      </div>
      <h2 className="font-bold text-lg leading-tight tracking-tight text-white mb-3">
        {title || "Loading…"}
      </h2>
      <span className={`${badgeCls} text-xs font-semibold px-3 py-1 rounded-full capitalize`}>
        {status || "–"}
      </span>
    </div>
  );
}

function CriteriaCardPanel({
  criteria,
}: {
  criteria: Record<string, unknown>;
  onUpdate: () => void;
}) {
  const items = Object.entries(criteria ?? {});
  return (
    <div className="border-b border-white/8 p-5 overflow-auto">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30 mb-4">
        Criteria
      </h3>
      {items.length === 0 ? (
        <div className="glass-card p-4 text-center text-white/20 text-sm">
          <Menu size={18} className="mx-auto mb-2 opacity-40" />
          Criteria auto-extracted after intake
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(([key, val]) => (
            <li
              key={key}
              className="glass-card px-4 py-3 flex items-center gap-3 text-sm"
            >
              <CheckCircle2 size={14} className="text-cyan shrink-0" />
              <span className="font-medium capitalize">{key}</span>
              <span className="ml-auto text-white/40 text-xs">{String(val)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityLogPanel({ logs }: { logs: Array<{ message?: string; text?: string }> }) {
  return (
    <div className="flex-1 p-5 overflow-auto">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30 mb-4">
        Activity
      </h3>
      {(!logs || logs.length === 0) ? (
        <p className="text-white/20 text-sm italic">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/60">
              <Clock size={13} className="mt-0.5 shrink-0 text-white/20" />
              {log.message ?? log.text ?? JSON.stringify(log)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IntakeView({ jobId, onComplete }: { jobId: string; onComplete: () => void }) {
  return (
    <div className="relative h-full flex flex-col items-center justify-center p-16 text-center fade-in">
      <div className="glow-blob w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative z-10 max-w-lg space-y-8">
        <div className="bg-white/6 border border-white/10 rounded-3xl p-5 inline-flex mx-auto">
          <Play size={36} className="text-cyan" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan mb-3">
            Phase 1
          </p>
          <h2 className="heading-lg mb-4">Intake</h2>
          <p className="text-white/50 leading-relaxed">
            Upload resumes or paste a job description. AI will extract the evaluation criteria and queue candidates for processing.
          </p>
        </div>
        <button className="btn-pill text-base mx-auto" onClick={onComplete}>
          Start Processing
          <div className="bg-black text-white rounded-full p-1">
            <ChevronRight size={16} />
          </div>
        </button>
        <p className="text-white/25 text-xs">Job ID: {jobId}</p>
      </div>
    </div>
  );
}

function ProcessingView({ jobId, onComplete }: { jobId: string; onComplete: () => void }) {
  const steps = [
    "Parsing resume content…",
    "Extracting skills & experience…",
    "Scoring against criteria…",
    "Ranking candidates…",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-full flex flex-col items-center justify-center p-16 text-center fade-in">
      <div className="glow-blob w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70" />
      <div className="relative z-10 max-w-lg space-y-8">
        <div className="relative inline-flex mx-auto">
          <div className="w-20 h-20 border-2 border-white/10 border-t-[#00d2ff] rounded-full animate-spin" />
          <Loader2 size={28} className="absolute inset-0 m-auto text-cyan animate-spin" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-cyan mb-3">
            Phase 2
          </p>
          <h2 className="heading-lg mb-4">Processing</h2>
          <p className="text-white/50 leading-relaxed min-h-[1.6em] transition-all">
            {steps[step]}
          </p>
        </div>
        <button className="btn-ghost text-sm mx-auto" onClick={onComplete}>
          Skip to Results (Dev)
        </button>
        <p className="text-white/25 text-xs">Job ID: {jobId}</p>
      </div>
    </div>
  );
}

interface Candidate {
  id?: string;
  name: string;
  role?: string;
  score: number;
  summary?: string;
}

function ResultsView({
  jobId,
  onCandidateClick,
}: {
  jobId: string;
  onCandidateClick: (c: Candidate) => void;
}) {
  // Mock data for UI preview — replace with real API call
  const candidates: Candidate[] = [
    { id: "1", name: "Alex Rivera",  role: "Software Engineer",      score: 96, summary: "Strong match on all key criteria." },
    { id: "2", name: "Jordan Patel", role: "Full-Stack Developer",   score: 88, summary: "Excellent frontend & solid backend." },
    { id: "3", name: "Sam Chen",     role: "Backend Engineer",       score: 81, summary: "Deep expertise in distributed systems." },
    { id: "4", name: "Morgan Lee",   role: "React Specialist",       score: 74, summary: "Great UI skills, less backend exposure." },
    { id: "5", name: "Taylor Kim",   role: "DevOps Engineer",        score: 67, summary: "Strong infra but limited product dev." },
    { id: "6", name: "Casey Wong",   role: "Junior Developer",       score: 52, summary: "Promising but needs more experience." },
  ];

  const topTier = candidates.filter((c) => c.score >= 85);
  const midTier = candidates.filter((c) => c.score >= 65 && c.score < 85);
  const lowTier = candidates.filter((c) => c.score < 65);

  const ScoreBar = ({ score }: { score: number }) => (
    <div className="h-1 rounded-full bg-white/8 overflow-hidden w-full">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${score}%`,
          background:
            score >= 85
              ? "#00d2ff"
              : score >= 65
              ? "rgba(255,200,0,0.9)"
              : "rgba(255,80,80,0.7)",
        }}
      />
    </div>
  );

  const CandidateCard = ({ c }: { c: Candidate }) => (
    <div
      className="glass-card p-5 cursor-pointer flex flex-col gap-4"
      onClick={() => onCandidateClick(c)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg"
            style={{ background: "rgba(0,210,255,0.12)", color: "#00d2ff" }}
          >
            {c.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold leading-tight">{c.name}</div>
            <div className="text-xs text-white/40">{c.role}</div>
          </div>
        </div>
        <div className="text-2xl font-black text-cyan tabular-nums">{c.score}%</div>
      </div>
      <ScoreBar score={c.score} />
      {c.summary && <p className="text-xs text-white/40 leading-relaxed">{c.summary}</p>}
    </div>
  );

  return (
    <div className="p-10 fade-in">
      <div className="flex items-center gap-3 mb-10">
        <BarChart3 size={24} className="text-cyan" />
        <h2 className="heading-lg text-3xl">Results</h2>
        <span className="ml-auto text-white/30 text-sm">{candidates.length} candidates ranked</span>
      </div>

      {topTier.length > 0 && (
        <section className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00d2ff] mb-4">
            Top Matches
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 fade-in-children">
            {topTier.map((c) => <CandidateCard key={c.id} c={c} />)}
          </div>
        </section>
      )}
      {midTier.length > 0 && (
        <section className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-yellow-400/70 mb-4">
            Possible Fits
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 fade-in-children">
            {midTier.map((c) => <CandidateCard key={c.id} c={c} />)}
          </div>
        </section>
      )}
      {lowTier.length > 0 && (
        <section>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/25 mb-4">
            Lower Matches
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 fade-in-children">
            {lowTier.map((c) => <CandidateCard key={c.id} c={c} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function CandidateDrawer({
  candidate,
  open,
  onClose,
}: {
  candidate: Candidate | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`drawer-panel fixed inset-y-0 right-0 w-80 md:w-96 z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-white/8 flex items-center justify-between sticky top-0 bg-[#050505]/95 backdrop-blur-md z-10">
          <h3 className="font-bold text-lg tracking-tight">Candidate Profile</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {candidate && (
          <div className="p-6 space-y-8 fade-in">
            {/* Avatar + Name */}
            <div className="text-center pt-4">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-5 border border-white/10"
                style={{ background: "rgba(0,210,255,0.08)", color: "#00d2ff" }}
              >
                {candidate.name.charAt(0)}
              </div>
              <h4 className="text-2xl font-bold tracking-tight">{candidate.name}</h4>
              {candidate.role && (
                <p className="text-white/40 text-sm mt-1">{candidate.role}</p>
              )}
            </div>

            {/* Score ring */}
            <div className="glass-card p-6 text-center">
              <div className="text-5xl font-black text-cyan mb-2">{candidate.score}%</div>
              <div className="text-white/40 text-sm">AI Match Score</div>
              <div className="mt-4 h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${candidate.score}%`,
                    background: "linear-gradient(90deg, #00d2ff, #00ffa0)",
                    transition: "width 1s ease",
                  }}
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                AI Evaluation
              </h5>
              <div className="glass-card p-4">
                <p className="text-sm text-white/70 leading-relaxed">
                  {candidate.summary ||
                    "This candidate has been evaluated against the job criteria. Detailed breakdown will appear here once processing is complete."}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3 pb-6">
              <button className="btn-pill w-full justify-center">
                Schedule Interview
                <div className="bg-black text-white rounded-full p-1">
                  <ChevronRight size={14} />
                </div>
              </button>
              <button className="btn-ghost w-full justify-center text-sm">
                Download Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main JobRoom Component ──────────────────────────────────── */

export default function JobRoom() {
  const { jobId } = useParams<{ jobId: string }>();

  const [phase, setPhase] = useState<"intake" | "processing" | "results">(() => {
    const saved = localStorage.getItem(`job_phase_${jobId}`);
    return (saved as "intake" | "processing" | "results") || "intake";
  });

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { job } = useJobPolling(jobId!, phase === "results" ? 0 : 5000);

  useEffect(() => {
    localStorage.setItem(`job_phase_${jobId}`, phase);
  }, [phase, jobId]);

  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setDrawerOpen(true);
  };

  const jobTitle = job?.title || localStorage.getItem(`job_title_${jobId}`) || "Untitled Role";
  const jobStatus = phase;
  const criteriaCard = job?.criteria || {};
  const activityLogs = job?.logs || [];

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">

      {/* ── Left Sidebar ─────────────────────────── */}
      <aside className="w-64 sidebar-panel flex flex-col shrink-0 relative">
        <div className="glow-blob w-[300px] h-[300px] top-[-100px] left-[-100px] opacity-30" />
        <div className="relative z-10 flex flex-col h-full">
          <JobRoomHeader title={jobTitle} status={jobStatus} />
          <CriteriaCardPanel criteria={criteriaCard} onUpdate={() => {}} />
          <ActivityLogPanel logs={activityLogs} />
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <main className="flex-1 overflow-auto relative bg-black">
        {/* Phase tab bar */}
        <div className="flex items-center gap-1 px-6 pt-5 pb-0 border-b border-white/8">
          {(["intake", "processing", "results"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`px-4 py-2 text-sm font-semibold capitalize rounded-t-lg border-b-2 transition-colors ${
                phase === p
                  ? "border-[#00d2ff] text-white"
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {phase === "intake" && (
          <IntakeView jobId={jobId!} onComplete={() => setPhase("processing")} />
        )}
        {phase === "processing" && (
          <ProcessingView jobId={jobId!} onComplete={() => setPhase("results")} />
        )}
        {phase === "results" && (
          <ResultsView jobId={jobId!} onCandidateClick={handleCandidateClick} />
        )}
      </main>

      {/* ── Right Drawer ─────────────────────────── */}
      <CandidateDrawer
        candidate={selectedCandidate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
