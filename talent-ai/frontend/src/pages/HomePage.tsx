import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Briefcase, Calendar, Users, ChevronRight, Sparkles } from "lucide-react";

interface Job {
  id: string;
  title: string;
  status: string;
  created_at: string;
  resume_count: number;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "processing"
      ? "badge-processing"
      : status === "results" || status === "completed"
      ? "badge-results"
      : "badge-intake";
  return (
    <span
      className={`${cls} text-xs font-semibold px-3 py-1 rounded-full capitalize`}
    >
      {status}
    </span>
  );
}

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/v1/jobs/");
      if (res.ok) setJobs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setCreateError("Please enter a job title.");
      return;
    }
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/v1/jobs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setDialogOpen(false);
        setNewTitle("");
        navigate(`/jobs/${data.id}`);
        return;
      }

      // Backend returned an error — fall through to local fallback
      console.warn("API error", res.status);
    } catch (e) {
      console.warn("Backend unreachable, using local fallback:", e);
    } finally {
      setCreating(false);
    }

    // ── Local fallback: create a demo job stored in localStorage ──
    const localId = `local-${crypto.randomUUID()}`;
    localStorage.setItem(`job_title_${localId}`, trimmed);
    localStorage.setItem(`job_phase_${localId}`, "intake");
    setDialogOpen(false);
    setNewTitle("");
    navigate(`/jobs/${localId}`);
  };


  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="glow-blob w-[600px] h-[600px] top-[-200px] left-[-200px] opacity-60" />
      <div className="glow-blob w-[500px] h-[500px] bottom-[-150px] right-[-150px] opacity-40" style={{ animationDelay: "6s" }} />
      <div className="vignette" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:px-12 fade-in">
        {/* ── Nav ────────────────────────────────── */}
        <nav className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-cyan" />
            <span className="font-extrabold tracking-tight text-white text-xl">Talent AI</span>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="btn-pill text-sm">
                New Job Post
                <div className="bg-black text-white rounded-full p-1">
                  <ChevronRight size={14} />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="glass-card bg-black/80 border-white/10 text-white max-w-sm">
              <DialogHeader>
                <DialogTitle className="heading-lg text-2xl mb-1">New Job Post</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-job-title" className="text-muted-foreground text-sm">
                    Job Title
                  </Label>
                  <Input
                    id="new-job-title"
                    value={newTitle}
                    onChange={(e) => { setNewTitle(e.target.value); setCreateError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && !creating && handleCreateJob()}
                    placeholder="e.g. Senior Frontend Engineer"
                    disabled={creating}
                    autoFocus
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[#00d2ff] rounded-xl"
                  />
                  {createError && (
                    <p className="text-red-400 text-xs mt-1">{createError}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <button
                  id="create-job-btn"
                  className="btn-pill w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCreateJob}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      Create &amp; Open
                      <div className="bg-black text-white rounded-full p-1">
                        <ChevronRight size={14} />
                      </div>
                    </>
                  )}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </nav>

        {/* ── Hero ───────────────────────────────── */}
        <header className="mb-16 space-y-6">
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-cyan">
            AI-Powered Hiring
          </p>
          <h1 className="heading-xl">
            Find the right<br />talent, faster.
          </h1>
          <p className="text-white/50 text-lg max-w-xl leading-relaxed">
            Post a role, upload resumes, and let AI rank candidates against your exact criteria — in minutes.
          </p>
        </header>

        {/* ── Job Cards ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-lg text-2xl">Active Job Posts</h2>
            <span className="text-muted-foreground text-sm">{jobs.length} total</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24">
              <div className="w-10 h-10 border-2 border-[#00d2ff]/40 border-t-[#00d2ff] rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="glass-card p-16 text-center text-white/30">
              <Briefcase size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">No job posts yet.</p>
              <p className="text-sm mt-2">Click <strong className="text-white/60">New Job Post</strong> to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in-children">
              {jobs.map((job) => (
                <Link to={`/jobs/${job.id}`} key={job.id} className="block group">
                  <div className="glass-card p-6 h-full flex flex-col gap-4">
                    {/* Icon + Badge */}
                    <div className="flex items-start justify-between">
                      <div className="bg-white/8 border border-white/10 p-3 rounded-2xl">
                        <Briefcase size={20} className="text-cyan" />
                      </div>
                      <StatusBadge status={job.status} />
                    </div>

                    {/* Title */}
                    <div className="flex-1">
                      <h3 className="font-bold text-xl tracking-tight text-white leading-snug">
                        {job.title}
                      </h3>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-white/40 mt-auto pt-4 border-t border-white/8">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        {new Date(job.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={13} />
                        {job.resume_count} resumes
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
