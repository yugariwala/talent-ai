import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Plus, Briefcase, Users, BarChart3,
  ChevronRight, Zap, TrendingUp, Clock
} from 'lucide-react';

type Job = {
  job_id: string;
  title: string;
  status: string;
  resume_count: number;
  created_at: string | null;
};

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await apiFetch('/api/v1/jobs/');
        setJobs(data);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const totalResumes = jobs.reduce((sum, j) => sum + j.resume_count, 0);
  const activeJobs = jobs.filter(j => j.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 animate-pulse">
            <BarChart3 size={20} className="text-[#00D2FF]" />
          </div>
          <p className="text-sm text-[#a1a1a1]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Briefcase size={18} />} label="Active Jobs" value={activeJobs} accent="cyan" />
        <StatCard icon={<Users size={18} />} label="Total Resumes" value={totalResumes} accent="emerald" />
        <StatCard icon={<TrendingUp size={18} />} label="Processed" value={jobs.filter(j => j.resume_count > 0).length} accent="violet" />
      </div>

      {/* New Job Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight">Job Posts</h2>
          <p className="text-xs text-[#a1a1a1] mt-0.5">Manage your recruitment cycles</p>
        </div>
        <Link
          to="/jobs/new"
          className="flex items-center gap-2 bg-white text-black text-xs font-semibold rounded-full px-5 py-2.5 hover:bg-gray-200 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        >
          <Plus size={14} />
          New Job Post
        </Link>
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.job_id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}


// ── Stat Card ──────────────────────────────────────────────
function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  const colors: Record<string, string> = {
    cyan: 'rgba(0,210,255,0.08)',
    emerald: 'rgba(16,185,129,0.08)',
    violet: 'rgba(139,92,246,0.08)',
  };
  const textColors: Record<string, string> = {
    cyan: 'text-[#00D2FF]',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
  };

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: colors[accent] }} />
      <div className="relative flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${textColors[accent]}`}
          style={{ background: colors[accent] }}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-extrabold tracking-tight">{value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a1]">{label}</p>
        </div>
      </div>
    </div>
  );
}


// ── Job Card ───────────────────────────────────────────────
function JobCard({ job }: { job: Job }) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' },
    paused: { label: 'Paused', cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' },
    closed: { label: 'Closed', cls: 'bg-[#a1a1a1]/10 text-[#a1a1a1] border-[#a1a1a1]/30' },
  };
  const s = statusMap[job.status] || statusMap.active;

  const createdDate = job.created_at
    ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  return (
    <Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 group rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <Briefcase size={16} className="text-[#00D2FF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight group-hover:text-white transition-colors">{job.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock size={10} className="text-[#a1a1a1]" />
                <span className="text-[10px] text-[#a1a1a1]">{createdDate}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full border ${s.cls}`}>
            {s.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-[#a1a1a1]" />
            <span className="text-xs text-[#a1a1a1]">{job.resume_count} resumes</span>
          </div>

          <div className="flex gap-2">
            {job.resume_count > 0 && (
              <Link
                to={`/jobs/${job.job_id}/results`}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#00D2FF] hover:text-white transition-colors"
              >
                View Results <ChevronRight size={10} />
              </Link>
            )}
            <Link
              to={`/jobs/${job.job_id}/upload`}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#a1a1a1] hover:text-white transition-colors"
            >
              Upload <ChevronRight size={10} />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ── Empty State ────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-20 h-20 rounded-full glow-cyan flex items-center justify-center border border-white/10"
        style={{ background: 'rgba(0,210,255,0.06)' }}>
        <Zap size={28} className="text-[#00D2FF]" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-base font-bold tracking-tight">No job posts yet</h3>
        <p className="text-sm text-[#a1a1a1] max-w-sm">
          Create your first job post to start screening candidates with AI-powered evaluation
        </p>
      </div>
      <Link
        to="/jobs/new"
        className="flex items-center gap-2 bg-white text-black text-sm font-semibold rounded-full px-6 py-3 hover:bg-gray-200 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
      >
        <Plus size={16} />
        Create Job Post
      </Link>
    </div>
  );
}
