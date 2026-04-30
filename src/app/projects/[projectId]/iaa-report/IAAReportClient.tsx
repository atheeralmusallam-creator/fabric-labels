"use client";

import { useState } from "react";
import Link from "next/link";

type AnnotatorStat = { name: string; count: number; ratings: Record<string, number> };
type AnnotationView = {
  userId?: string | null; userName: string;
  rating: string; severity: string; notes: string; isCurrentUser: boolean;
};
type TaskRow = {
  id: string; order: number; prompt: string; risk: string;
  agreed: boolean; hasDisagreement: boolean;
  annotations: AnnotationView[];
  ratings: string[];
};

type IAAData = {
  project: { id: string; name: string };
  isManager: boolean;
  currentUserId: string;
  stats: { totalTasks: number; annotatedTasks: number; agreedCount: number;
           disagreedCount: number; agreementPct: number; pendingTasks: number };
  ratingDist: Record<string, number>;
  annotators: AnnotatorStat[];
  riskDisagreement: Record<string, { total: number; disagreed: number }>;
  tasks: TaskRow[];
};

const RATING_COLORS: Record<string, string> = {
  Safe: "#22c55e", "Not Safe": "#ef4444", tool_call: "#f59e0b",
  "1": "#6366f1", "2": "#8b5cf6", "3": "#f59e0b", "4": "#f97316", "5": "#ef4444",
};
const getColor = (r: string) => RATING_COLORS[r] || "#6366f1";

function DonutChart({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? value / total : 0;
  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-primary)">{Math.round(pct * 100)}%</text>
      <text x="50" y="60" textAnchor="middle" fontSize="8" fill="var(--text-muted)">{value}/{total}</text>
    </svg>
  );
}

function BarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([label, val]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs w-24 text-right truncate" style={{ color: "var(--text-secondary)" }}>{label}</span>
          <div className="flex-1 rounded-full h-5 overflow-hidden" style={{ background: "var(--bg-primary)" }}>
            <div className="h-full rounded-full flex items-center px-2 transition-all duration-700"
              style={{ width: `${(val / max) * 100}%`, background: getColor(label) }}>
              <span className="text-[10px] font-bold text-white">{val}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnotatorCard({ annotator }: { annotator: AnnotatorStat }) {
  const total = annotator.count;
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
          {annotator.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{annotator.name}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{total} annotations</div>
        </div>
      </div>
      <div className="space-y-1">
        {Object.entries(annotator.ratings).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
          <div key={r} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getColor(r) }} />
            <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{r}</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {n} <span style={{ color: "var(--text-muted)" }}>({Math.round((n / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IAAReportClient({ data }: { data: IAAData }) {
  const [tab, setTab]       = useState<"overview" | "tasks" | "annotators">("overview");
  const [filter, setFilter] = useState<"all" | "agreed" | "disagreed" | "pending">("all");
  const [search, setSearch] = useState("");
  const { stats, isManager } = data;

  const filteredTasks = data.tasks.filter((t) => {
    const matchSearch = !search || t.prompt.toLowerCase().includes(search.toLowerCase()) || t.risk.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "agreed" ? t.agreed :
      filter === "disagreed" ? t.hasDisagreement :
      filter === "pending" ? t.ratings.length === 0 : true;
    return matchSearch && matchFilter;
  });

  // Export URL — for annotators, add userId to restrict the export
  const exportUrl = isManager
    ? `/api/projects/${data.project.id}/iaa`
    : `/api/projects/${data.project.id}/iaa?userId=${data.currentUserId}`;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <header className="border-b px-6 py-4 sticky top-0 z-20"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${data.project.id}`}
              className="text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>
              ← {data.project.name}
            </Link>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>IAA Report</span>
            {!isManager && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>
                My View
              </span>
            )}
          </div>
          <a href={exportUrl}
            className="text-xs px-4 py-2 rounded-lg font-medium text-white transition-all"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
            ↓ Export Excel
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Annotator notice banner */}
        {!isManager && (
          <div className="rounded-xl border px-5 py-3 flex items-center gap-3"
            style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.25)" }}>
            <span className="text-base">🔒</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Limited view — your annotations only
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Overall stats are visible to everyone. Individual ratings from other annotators are hidden.
                Your exported file will only include your own annotation data.
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tasks",    value: stats.totalTasks,               sub: "in project",      color: "#6366f1" },
            { label: "Agreement",      value: `${stats.agreementPct.toFixed(1)}%`, sub: `${stats.agreedCount} agreed`, color: "#22c55e" },
            { label: "Disagreements",  value: stats.disagreedCount,            sub: "need review",     color: "#ef4444" },
            { label: "Pending",        value: stats.pendingTasks,              sub: "not annotated",   color: "#f59e0b" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border p-4"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <div className="text-2xl font-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{kpi.label}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-surface)" }}>
          {(["overview", "tasks", "annotators"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
              style={{
                background: tab === t ? "var(--bg-secondary)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Agreement Overview</h3>
              <div className="flex items-center gap-6">
                <DonutChart value={stats.agreedCount} total={stats.annotatedTasks} color="#22c55e" />
                <div className="space-y-2 flex-1">
                  {[
                    { label: "Agreed",     value: stats.agreedCount,    color: "#22c55e" },
                    { label: "Disagreed",  value: stats.disagreedCount, color: "#ef4444" },
                    { label: "Pending",    value: stats.pendingTasks,   color: "#f59e0b" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                      <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Rating Distribution</h3>
              {Object.keys(data.ratingDist).length > 0
                ? <BarChart data={data.ratingDist} />
                : <p className="text-xs" style={{ color: "var(--text-muted)" }}>No submissions yet</p>}
            </div>

            {Object.keys(data.riskDisagreement).length > 0 && (
              <div className="rounded-xl border p-6 md:col-span-2" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Disagreement by Risk Category</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(data.riskDisagreement).map(([risk, s]) => (
                    <div key={risk} className="rounded-lg p-3 border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
                      <div className="text-xs font-medium truncate mb-2" style={{ color: "var(--text-primary)" }}>{risk}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                          <div className="h-full rounded-full" style={{
                            width: `${(s.disagreed / s.total) * 100}%`,
                            background: s.disagreed / s.total > 0.5 ? "#ef4444" : "#f59e0b",
                          }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                          {Math.round((s.disagreed / s.total) * 100)}%
                        </span>
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{s.disagreed}/{s.total} tasks</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {tab === "tasks" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="px-3 py-2 rounded-lg border text-sm outline-none w-56"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
                {(["all", "agreed", "disagreed", "pending"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all capitalize"
                    style={{
                      background: filter === f ? "var(--bg-secondary)" : "transparent",
                      color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
                    }}>
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{filteredTasks.length} tasks</span>
            </div>

            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.id} className="rounded-xl border p-4 transition-all"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: task.hasDisagreement ? "rgba(239,68,68,0.4)" : task.agreed ? "rgba(34,197,94,0.3)" : "var(--border)",
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {task.hasDisagreement ? <span className="text-sm">⚠️</span>
                        : task.agreed ? <span className="text-sm">✅</span>
                        : <span className="text-sm">⏳</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>#{task.order + 1}</span>
                        {task.risk && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
                            {task.risk}
                          </span>
                        )}
                      </div>
                      <p className="text-sm truncate mb-2" style={{ color: "var(--text-primary)" }}>{task.prompt}</p>
                      <div className="flex flex-wrap gap-2">
                        {task.annotations.map((ann, i) => (
                          <div key={i} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${ann.isCurrentUser ? "ring-1 ring-indigo-400" : ""}`}
                            style={{ background: "var(--bg-surface)", borderColor: ann.isCurrentUser ? "rgba(99,102,241,0.5)" : "var(--border)" }}>
                            <span style={{ color: "var(--text-muted)" }}>
                              {ann.userName}
                              {ann.isCurrentUser && <span className="ml-1 text-[9px] font-bold" style={{ color: "#6366f1" }}>(you)</span>}
                            </span>
                            {ann.rating && ann.rating !== "—" ? (
                              <span className="font-semibold px-1.5 py-0.5 rounded text-white text-[10px]"
                                style={{ background: getColor(ann.rating) }}>
                                {ann.rating}
                              </span>
                            ) : ann.rating === "—" ? (
                              /* Other annotator — rating hidden */
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                                🔒
                              </span>
                            ) : null}
                          </div>
                        ))}
                        {task.ratings.length === 0 && (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No submissions</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annotators Tab */}
        {tab === "annotators" && (
          <div>
            {!isManager && (
              <p className="text-xs mb-4 px-1" style={{ color: "var(--text-muted)" }}>
                Showing aggregate statistics for all annotators. Individual task-level ratings are not visible.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.annotators.map((ann) => (
                <AnnotatorCard key={ann.name} annotator={ann} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
