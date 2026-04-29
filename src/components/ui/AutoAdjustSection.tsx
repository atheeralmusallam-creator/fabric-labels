"use client";

import { useState } from "react";

interface DisagreedTask {
  id: string;
  annotations: { userId: string | null; userName: string | null | undefined; rating: string }[];
  assignedUserIds: string[];
}

export function AutoAdjustSection({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<"idle" | "checking" | "adjusting" | "done">("idle");
  const [disagreedTasks, setDisagreedTasks] = useState<DisagreedTask[]>([]);
  const [adjustedCount, setAdjustedCount] = useState(0);
  const [error, setError] = useState("");

  const checkDisagreements = async () => {
    setStatus("checking");
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-adjust`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDisagreedTasks(data.disagreedTasks || []);
      setStatus("idle");
    } catch {
      setError("Failed to check disagreements");
      setStatus("idle");
    }
  };

  const runAutoAdjust = async () => {
    setStatus("adjusting");
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-adjust`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAdjustedCount(data.adjustedCount || 0);
      setDisagreedTasks([]);
      setStatus("done");
    } catch {
      setError("Auto-adjust failed");
      setStatus("idle");
    }
  };

  return (
    <div
      className="rounded-xl p-6 border"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Auto-Adjust Disagreements
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Tasks where 3 annotators disagree → assign a 4th annotator automatically
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkDisagreements}
            disabled={status === "checking" || status === "adjusting"}
            className="text-xs px-4 py-2 rounded-lg border transition-all disabled:opacity-50"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {status === "checking" ? "Checking…" : "🔍 Check"}
          </button>

          {disagreedTasks.length > 0 && (
            <button
              onClick={runAutoAdjust}
              disabled={status === "adjusting"}
              className="text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium shadow-md shadow-amber-500/20"
            >
              {status === "adjusting" ? "Adjusting…" : `⚡ Auto-Adjust (${disagreedTasks.length})`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}

      {status === "done" && (
        <div className="mt-3 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2">
          ✅ Auto-adjusted {adjustedCount} tasks — a 4th annotator was assigned to each disputed task.
        </div>
      )}

      {disagreedTasks.length > 0 && status !== "done" && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {disagreedTasks.map((task, i) => (
            <div
              key={task.id}
              className="text-xs rounded-lg px-3 py-2 border"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
            >
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                Task #{i + 1}
              </span>
              <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                {task.annotations.map((a) => `${a.userName}: ${a.rating}`).join(" · ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {disagreedTasks.length === 0 && status === "idle" && adjustedCount === 0 && (
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Click "Check" to find tasks with annotator disagreement.
        </p>
      )}
    </div>
  );
}
