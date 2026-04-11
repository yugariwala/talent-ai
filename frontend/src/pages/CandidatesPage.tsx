import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  ChevronDown, ChevronUp, User, Mail, Star,
  AlertTriangle, CheckCircle2, XCircle, ArrowLeft,
  BarChart3, Loader2
} from 'lucide-react';

type Candidate = {
  resume_id: string;
  filename: string;
  status: string;
  name: string | null;
  email: string | null;
  total_score: number | null;
  tier: string | null;
  dimension_scores: Record<string, number> | null;
  skills: Array<{ skill_name: string; proficiency: string; source?: string }>;
  red_flags: Array<{ type: string; description: string; severity: string }>;
  pros: Array<{ text: string }> | string[];
  cons: Array<{ text: string }> | string[];
  summary: string | null;
};

export default function CandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const fetchResults = async () => {
      try {
        const data = await apiFetch(`/api/v1/parse/${jobId}/results`);
        setCandidates(data.candidates || []);
      } catch (err) {
        console.error('Failed to fetch results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="text-[#00D2FF] animate-spin mx-auto" />
          <p className="text-sm text-[#a1a1a1]">Loading candidates...</p>
        </div>
      </div>
    );
  }

  const greenCandidates = candidates.filter(c => c.tier === 'green');
  const yellowCandidates = candidates.filter(c => c.tier === 'yellow');
  const redCandidates = candidates.filter(c => c.tier === 'red' || c.tier === 'rejected');

  return (
    <div className="p-8 space-y-6">

      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-[#a1a1a1] hover:text-white transition-colors">
        <ArrowLeft size={12} />
        Back to Dashboard
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <TierStat label="Shortlisted" count={greenCandidates.length} color="emerald" />
        <TierStat label="Borderline" count={yellowCandidates.length} color="yellow" />
        <TierStat label="Rejected" count={redCandidates.length} color="red" />
      </div>

      {/* Tier Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Green Tier */}
        <TierColumn
          title="Shortlisted"
          icon={<CheckCircle2 size={14} className="text-emerald-400" />}
          color="emerald"
          candidates={greenCandidates}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />

        {/* Yellow Tier */}
        <TierColumn
          title="Borderline"
          icon={<AlertTriangle size={14} className="text-yellow-400" />}
          color="yellow"
          candidates={yellowCandidates}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />

        {/* Red Tier */}
        <TierColumn
          title="Rejected"
          icon={<XCircle size={14} className="text-red-400" />}
          color="red"
          candidates={redCandidates}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
        />
      </div>

      {candidates.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <BarChart3 size={32} className="text-[#a1a1a1] mx-auto" />
          <div>
            <h3 className="text-base font-bold">No results yet</h3>
            <p className="text-sm text-[#a1a1a1] mt-1">
              Resumes are still being processed. Check the processing page for status.
            </p>
          </div>
          <Link
            to={`/jobs/${jobId}/processing`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#00D2FF] hover:text-white transition-colors"
          >
            View Processing Status →
          </Link>
        </div>
      )}
    </div>
  );
}


// ── Tier Stat ──────────────────────────────────────────────
function TierStat({ label, count, color }: { label: string; count: number; color: string }) {
  const bgMap: Record<string, string> = {
    emerald: 'rgba(16,185,129,0.08)',
    yellow: 'rgba(234,179,8,0.08)',
    red: 'rgba(239,68,68,0.08)',
  };
  const textMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <div className="glass rounded-xl p-4 text-center" style={{ background: bgMap[color] }}>
      <p className={`text-2xl font-extrabold ${textMap[color]}`}>{count}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1a1a1]">{label}</p>
    </div>
  );
}


// ── Tier Column ────────────────────────────────────────────
function TierColumn({ title, icon, color, candidates, expandedId, onToggle }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  candidates: Candidate[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const borderMap: Record<string, string> = {
    emerald: 'border-emerald-400/20',
    yellow: 'border-yellow-400/20',
    red: 'border-red-400/20',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a1]">
          {title} ({candidates.length})
        </span>
      </div>

      <div className="space-y-3">
        {candidates.map((c) => (
          <CandidateCard
            key={c.resume_id}
            candidate={c}
            borderColor={borderMap[color]}
            expanded={expandedId === c.resume_id}
            onToggle={() => onToggle(c.resume_id)}
          />
        ))}

        {candidates.length === 0 && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-xs text-[#a1a1a1]">No candidates in this tier</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Candidate Card ─────────────────────────────────────────
function CandidateCard({ candidate, borderColor, expanded, onToggle }: {
  candidate: Candidate;
  borderColor: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const c = candidate;

  const topSkills = (c.skills || []).slice(0, 3);
  const profColors: Record<string, string> = {
    Expert: 'bg-violet-400/10 text-violet-400 border-violet-400/30',
    Advanced: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
    Intermediate: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
    Beginner: 'bg-gray-400/10 text-gray-400 border-gray-400/30',
  };

  return (
    <Card className={`border-white/10 ${borderColor} bg-white/[0.03] rounded-xl overflow-hidden hover:bg-white/[0.05] transition-all duration-200`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <User size={14} className="text-[#a1a1a1]" />
            </div>
            <div>
              <p className="text-sm font-semibold">{c.name || c.filename}</p>
              {c.email && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Mail size={9} className="text-[#a1a1a1]" />
                  <span className="text-[10px] text-[#a1a1a1]">{c.email}</span>
                </div>
              )}
            </div>
          </div>
          {c.total_score != null && (
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-[#00D2FF]" />
              <span className="text-sm font-bold">{Math.round(c.total_score)}</span>
            </div>
          )}
        </div>

        {/* Top Skills */}
        {topSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((skill, i) => (
              <Badge key={i} variant="outline"
                className={`text-[9px] px-2 py-0.5 rounded-full ${profColors[skill.proficiency] || profColors.Beginner}`}>
                {skill.skill_name}
              </Badge>
            ))}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-[#a1a1a1] hover:text-white transition-colors py-1"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide Details' : 'View Detail'}
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Summary */}
            {c.summary && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1a1] mb-1">Summary</p>
                <p className="text-xs text-gray-300 leading-relaxed">{c.summary}</p>
              </div>
            )}

            {/* Pros */}
            {c.pros && c.pros.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">Strengths</p>
                <ul className="space-y-1">
                  {c.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                      <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                      {typeof pro === 'string' ? pro : pro.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cons */}
            {c.cons && c.cons.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1.5">Concerns</p>
                <ul className="space-y-1">
                  {c.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                      <XCircle size={10} className="text-red-400 mt-0.5 shrink-0" />
                      {typeof con === 'string' ? con : con.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {c.red_flags && c.red_flags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400 mb-1.5">Red Flags</p>
                <ul className="space-y-1">
                  {c.red_flags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                      <AlertTriangle size={10} className="text-yellow-400 mt-0.5 shrink-0" />
                      <span>
                        <span className={`font-semibold ${flag.severity === 'high' ? 'text-red-400' : flag.severity === 'medium' ? 'text-yellow-400' : 'text-[#a1a1a1]'}`}>
                          [{flag.severity}]
                        </span>{' '}
                        {flag.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full Skills Table */}
            {c.skills && c.skills.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1a1] mb-1.5">All Skills</p>
                <div className="space-y-1">
                  {c.skills.map((skill, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                      <span className="text-xs">{skill.skill_name}</span>
                      <Badge variant="outline"
                        className={`text-[9px] px-2 py-0 rounded-full ${profColors[skill.proficiency] || profColors.Beginner}`}>
                        {skill.proficiency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
