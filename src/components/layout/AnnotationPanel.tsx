// src/components/layout/AnnotationPanel.tsx
"use client";

import { TaskStatus } from "@/types";

interface Props {
  notes: string;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  saving: boolean;
  draftState: "idle" | "saving" | "saved" | "error";
  canSubmit: boolean;
  taskStatus: TaskStatus;
  annotationStatus?: "DRAFT" | "SUBMITTED";
}

export function AnnotationPanel({
  notes,
  onNotesChange,
  onSubmit,
  onSkip,
  saving,
  draftState,
  canSubmit,
  taskStatus,
  annotationStatus,
}: Props) {
  return (
    <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4">
      <div className="mb-3">
        <label className="block text-xs text-[var(--text-muted)] mb-1.5">
          Notes / Comments
          <span className="ml-2 text-gray-700">(Enter = new line · Ctrl+Enter = submit)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder="Optional notes about this annotation..."
          rows={2}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border)] focus:border-indigo-500/50 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none transition-colors resize-none placeholder:text-gray-700"
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-yellow-400 hover:border-yellow-700/50 transition-colors"
        >
          Skip
        </button>

        <div className="flex items-center gap-3">
          {draftState === "saving" && <span className="text-xs text-blue-400">Saving draft...</span>}
          {draftState === "saved" && annotationStatus !== "SUBMITTED" && <span className="text-xs text-blue-400">Draft saved</span>}
          {draftState === "error" && <span className="text-xs text-red-400">Draft failed</span>}
          {(annotationStatus === "SUBMITTED" || taskStatus === "SUBMITTED") && (
            <span className="text-xs text-green-500">✓ Submitted</span>
          )}
          <button
            onClick={onSubmit}
            disabled={saving || !canSubmit}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? "Saving..." : (annotationStatus === "SUBMITTED" || taskStatus === "SUBMITTED") ? "Update" : "Submit"}
            <span className="ml-2 text-indigo-300 text-xs hidden sm:inline">↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}
