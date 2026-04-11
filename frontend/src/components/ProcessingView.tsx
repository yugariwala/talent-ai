import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  CheckCircle2,
  FileText,
  Tag,
  Star,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { apiFetch } from "@/lib/api";

/* ── Types ──────────────────────────────────────────────────── */

interface ProcessingViewProps {
  jobId: string;
  onComplete: () => void;
}

interface StatusResponse {
  status: "pending" | "processing" | "complete" | "failed";
  total: number;
  completed: number;
  failed: number;
  queued: number;
  processing?: number;
}

interface RankingCandidate {
  candidate_id: string;
  name?: string;
  score: number;
}

interface StatusEntry {
  id: string;
  text: string;
  type: "success" | "error" | "info";
  ts: number;
}

/* ── Phase config ───────────────────────────────────────────── */

const PHASES = [
  {
    id: "parsing",
    label: "Parsing",
    icon: <FileText size={14} />,
    thresholdPct: 0,
  },
  {
    id: "taxonomy",
    label: "Taxonomy",
    icon: <Tag size={14} />,
    thresholdPct: 25,
  },
  {
    id: "scoring",
    label: "Scoring",
    icon: <Star size={14} />,
    thresholdPct: 60,
  },
  {
    id: "explaining",
    label: "Explaining",
    icon: <MessageSquare size={14} />,
    thresholdPct: 85,
  },
];

/* ── Score histogram bucket helper ─────────────────────────── */

function buildHistogram(candidates: RankingCandidate[]) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 10}`,
    min: i * 10,
    max: i * 10 + 10,
    count: 0,
  }));
  candidates.forEach(({ score }) => {
    const idx = Math.min(Math.floor(score / 10), 9);
    buckets[idx].count++;
  });
  return buckets;
}

function countTiers(
  candidates: RankingCandidate[],
  yellowThresh: number,
  greenThresh: number
) {
  let green = 0,
    yellow = 0,
    red = 0;
  candidates.forEach(({ score }) => {
    if (score >= greenThresh) green++;
    else if (score >= yellowThresh) yellow++;
    else red++;
  });
  return { green, yellow, red };
}

/* ── Custom histogram tooltip ───────────────────────────────── */

function HistoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs text-white border border-white/10"
      style={{ background: "rgba(15,15,20,0.95)" }}
    >
      <p className="font-semibold">{label}</p>
      <p className="text-[#a1a1a1]">{payload[0].value} candidates</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════ */

export function ProcessingView({ jobId, onComplete }: ProcessingViewProps) {
  /* ── Polling state ──────────────────────────────────────── */
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [showTierAdjustment, setShowTierAdjustment] = useState(false);
  const [statusFeed, setStatusFeed] = useState<StatusEntry[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  /* ── Tier adjustment state ──────────────────────────────── */
  const [rankings, setRankings] = useState<RankingCandidate[]>([]);
  const [thresholds, setThresholds] = useState<[number, number]>([60, 80]);
  const [confirming, setConfirming] = useState(false);

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const activePhaseIndex = PHASES.findIndex(
    (p, i) =>
      pct < (PHASES[i + 1]?.thresholdPct ?? 101)
  );

  /* ── Push a status message ──────────────────────────────── */
  const pushFeed = useCallback(
    (text: string, type: StatusEntry["type"] = "info") => {
      setStatusFeed((prev) => [
        ...prev.slice(-49),
        { id: `${Date.now()}-${Math.random()}`, text, type, ts: Date.now() },
      ]);
    },
    []
  );

  /* ── Auto-scroll feed ───────────────────────────────────── */
  useEffect(() => {
    if (feedRef.current)
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [statusFeed]);

  /* ── Polling ─────────────────────────────────────────────── */
  useEffect(() => {
    let prevCompleted = 0;
    let prevFailed = 0;

    const interval = setInterval(async () => {
      try {
        const data: StatusResponse = await apiFetch(
          `/api/v1/parse/${jobId}/status`
        );
        setTotal(data.total);
        setCompleted(data.completed);
        setFailed(data.failed);

        // Log processing count
        if (data.processing && data.processing > 0) {
          // Active processing is happening
        }

        // Diff-based feed entries
        if (data.completed > prevCompleted) {
          const delta = data.completed - prevCompleted;
          for (let i = 0; i < delta; i++) {
            pushFeed(
              `Resume #${prevCompleted + i + 1} processed successfully ✓`,
              "success"
            );
          }
          prevCompleted = data.completed;
        }
        if (data.failed > prevFailed) {
          const delta = data.failed - prevFailed;
          for (let i = 0; i < delta; i++) {
            pushFeed(
              `Resume #${prevCompleted + i + 1} failed to parse`,
              "error"
            );
          }
          prevFailed = data.failed;
        }

        if (data.status === "complete") {
          clearInterval(interval);
          pushFeed("All resumes processed. Loading rankings…", "info");
          setShowTierAdjustment(true);
        }
      } catch (err) {
        pushFeed(`Polling error: ${(err as Error).message}`, "error");
      }
    }, 2000);

    pushFeed(`Job ${jobId} — pipeline started`, "info");
    return () => clearInterval(interval);
  }, [jobId, pushFeed]);

  /* ── Fetch rankings when tier panel opens ───────────────── */
  useEffect(() => {
    if (!showTierAdjustment) return;
    apiFetch(`/api/v1/jobs/${jobId}/rankings`)
      .then((data: { candidates?: RankingCandidate[] } | RankingCandidate[]) => {
        const list = Array.isArray(data)
          ? data
          : (data as { candidates?: RankingCandidate[] }).candidates ?? [];
        setRankings(list);
      })
      .catch((err: Error) =>
        pushFeed(`Failed to load rankings: ${err.message}`, "error")
      );
  }, [showTierAdjustment, jobId, pushFeed]);

  /* ── Confirm thresholds ─────────────────────────────────── */
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await apiFetch(`/api/v1/jobs/${jobId}/thresholds`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yellow_threshold: thresholds[0],
          green_threshold: thresholds[1],
        }),
      });
      onComplete();
    } catch (err) {
      pushFeed(`Failed to save thresholds: ${(err as Error).message}`, "error");
      setConfirming(false);
    }
  };

  /* ── Derived ─────────────────────────────────────────────── */
  const histogram = buildHistogram(rankings);
  const tiers = countTiers(rankings, thresholds[0], thresholds[1]);

  /* ══════════════════════════════════════════════════════════
     Render
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-full flex flex-col items-center py-10 px-6">
      {/* ── Heading ─────────────────────────────────────────── */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {pct === 100 && !showTierAdjustment
              ? "Finalising…"
              : showTierAdjustment
              ? "Processing Complete ✓"
              : "Processing Resumes"}
          </h1>
          {showTierAdjustment && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 size={16} />
              100%
            </span>
          )}
        </div>
        <p className="text-sm text-[#a1a1a1]">
          {showTierAdjustment
            ? "Adjust tier boundaries before viewing results."
            : `${completed} of ${total} resumes processed${
                failed > 0 ? ` · ${failed} failed` : ""
              }`}
        </p>
      </div>

      {/* ── Progress bar card ───────────────────────────────── */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/10 p-6 mb-6"
        style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
      >
        {/* Animated progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#a1a1a1] mb-2">
            <span>Overall progress</span>
            <span className="font-mono">{pct}%</span>
          </div>
          <Progress
            value={pct}
            className="h-2 bg-white/10"
            style={
              {
                "--progress-indicator-color":
                  pct === 100 ? "#34d399" : "#00d2ff",
              } as React.CSSProperties
            }
          />
        </div>

        {/* Phase chips */}
        <div className="flex gap-2 flex-wrap mt-4">
          {PHASES.map((phase, idx) => {
            const done = pct >= (PHASES[idx + 1]?.thresholdPct ?? 101);
            const active = !done && idx === activePhaseIndex;
            return (
              <div
                key={phase.id}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  done
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : active
                    ? "border-cyan-400/40 text-cyan-300 bg-cyan-400/10 shadow-[0_0_10px_rgba(0,210,255,0.15)]"
                    : "border-white/10 text-[#555] bg-white/[0.02]"
                }`}
              >
                {done ? (
                  <CheckCheck size={12} />
                ) : active ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  phase.icon
                )}
                {phase.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status feed ─────────────────────────────────────── */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/[0.07] overflow-hidden mb-6"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1a1]">
            Pipeline Log
          </span>
          <span className="text-[10px] text-[#555] font-mono">
            {statusFeed.length} entries
          </span>
        </div>
        <div
          ref={feedRef}
          className="h-44 overflow-y-auto px-5 py-3 space-y-1.5 scrollbar-thin"
          style={{ scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
        >
          {statusFeed.length === 0 ? (
            <p className="text-xs text-[#555] italic">Awaiting events…</p>
          ) : (
            statusFeed.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 text-xs animate-fade-in"
              >
                {entry.type === "success" && (
                  <CheckCircle2
                    size={12}
                    className="text-emerald-400 mt-[1px] shrink-0"
                  />
                )}
                {entry.type === "error" && (
                  <AlertCircle
                    size={12}
                    className="text-red-400 mt-[1px] shrink-0"
                  />
                )}
                {entry.type === "info" && (
                  <span className="w-3 h-3 mt-[1px] shrink-0 rounded-full bg-cyan-400/30 border border-cyan-400/40 inline-block" />
                )}
                <span
                  className={
                    entry.type === "success"
                      ? "text-emerald-300"
                      : entry.type === "error"
                      ? "text-red-300"
                      : "text-[#a1a1a1]"
                  }
                >
                  {entry.text}
                </span>
                <span className="ml-auto text-[#444] font-mono shrink-0">
                  {new Date(entry.ts).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          Tier Boundary Adjustment (shown after complete)
      ══════════════════════════════════════════════════════ */}
      {showTierAdjustment && (
        <div
          className="w-full max-w-2xl rounded-2xl border border-white/10 p-6 space-y-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header */}
          <div>
            <h2 className="text-base font-bold tracking-tight text-white mb-0.5">
              Score Distribution
            </h2>
            <p className="text-xs text-[#a1a1a1]">
              {rankings.length} candidates scored · drag handles to set tier
              boundaries
            </p>
          </div>

          {/* Histogram */}
          <div className="h-40">
            {rankings.length === 0 ? (
              <div className="flex items-center justify-center h-full gap-2 text-xs text-[#555]">
                <Loader2 size={14} className="animate-spin" />
                Loading distribution…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={histogram}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#555", fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  />
                  <YAxis
                    tick={{ fill: "#555", fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<HistoTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {histogram.map((bucket) => {
                      const midScore = bucket.min + 5;
                      const color =
                        midScore >= thresholds[1]
                          ? "#34d399"
                          : midScore >= thresholds[0]
                          ? "#fbbf24"
                          : "#f87171";
                      return (
                        <Cell
                          key={bucket.label}
                          fill={color}
                          fillOpacity={0.7}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Slider */}
          <div>
            <div className="flex justify-between text-[10px] text-[#555] mb-3 font-mono">
              <span>0</span>
              <span className="text-amber-400 font-semibold">
                Yellow ≥ {thresholds[0]}
              </span>
              <span className="text-emerald-400 font-semibold">
                Green ≥ {thresholds[1]}
              </span>
              <span>100</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={thresholds}
              onValueChange={(vals) => {
                if (vals.length === 2) {
                  // Ensure yellow < green
                  const [y, g] = vals as [number, number];
                  setThresholds([Math.min(y, g - 1), Math.max(g, y + 1)]);
                }
              }}
              className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-amber-400 [&_[data-slot=slider-range]]:to-emerald-400 [&_[data-slot=slider-track]]:bg-red-500/30 [&_[data-slot=slider-thumb]]:w-4 [&_[data-slot=slider-thumb]]:h-4 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white/80"
            />
          </div>

          {/* Tier summary pills */}
          <div className="grid grid-cols-3 gap-3">
            <TierPill
              color="emerald"
              label={`Green ≥ ${thresholds[1]}`}
              count={tiers.green}
              sublabel="candidates"
            />
            <TierPill
              color="amber"
              label={`Yellow ${thresholds[0]}–${thresholds[1] - 1}`}
              count={tiers.yellow}
              sublabel="candidates"
            />
            <TierPill
              color="red"
              label={`Red < ${thresholds[0]}`}
              count={tiers.red}
              sublabel="candidates"
            />
          </div>

          {/* CTA */}
          <button
            id="confirm-thresholds-btn"
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-bold rounded-xl py-3 hover:scale-[1.01] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            {confirming ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                Confirm and View Results
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tier pill sub-component ────────────────────────────────── */

function TierPill({
  color,
  label,
  count,
  sublabel,
}: {
  color: "emerald" | "amber" | "red";
  label: string;
  count: number;
  sublabel: string;
}) {
  const palette = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center ${palette[color]}`}
    >
      <p className="text-2xl font-extrabold leading-none">{count}</p>
      <p className="text-[10px] font-semibold mt-1 opacity-80 truncate">
        {label}
      </p>
      <p className="text-[10px] opacity-50">{sublabel}</p>
    </div>
  );
}
