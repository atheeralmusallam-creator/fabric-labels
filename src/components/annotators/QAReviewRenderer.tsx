// src/components/annotators/QAReviewRenderer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { QAReviewConfig, QAReviewResult, QATaskData } from "@/types";

interface Props {
  data: QATaskData;
  config: QAReviewConfig;
  result: QAReviewResult | null;
  onChange: (r: QAReviewResult) => void;
}

export function QAReviewRenderer({ data, config, result, onChange }: Props) {
  const taskData = data as any;

  const [rating, setRating] = useState((result as any)?.rating ?? "");
  const [severity, setSeverity] = useState((result as any)?.severity ?? "");
  const [correction, setCorrection] = useState((result as any)?.correction ?? "");

  const labels = useMemo(() => {
    const taskOptions = Array.isArray(taskData.options)
      ? taskData.options.filter(Boolean)
      : [];

    if (taskOptions.length) {
      return taskOptions.map((value: string, index: number) => ({
        value,
        hotkey: String(index + 1),
      }));
    }

    return (config.rating_labels ?? []).map((label: any, index: number) => ({
      value: label.value,
      hotkey: label.hotkey ?? String(index + 1),
    }));
  }, [taskData.options, config.rating_labels]);

  const severityLabels = useMemo(() => {
  const configured = (config as any).severity_labels;

  if (Array.isArray(configured) && configured.length > 0) {
    return configured.map((label: any) => ({
      value: label.value,
    }));
  }

  return [
    { value: "Low" },
    { value: "Medium" },
    { value: "Critical" },
  ];
}, [config]);

  const taskId = taskData.id ?? taskData.task_id ?? taskData.external_id ?? "-";
  const risk = taskData.risk_category ?? taskData.risk ?? taskData.domain ?? taskData.category ?? "-";
  const language = taskData.language ?? taskData.lang ?? taskData.locale ?? "-";
  const prompt = taskData.prompt ?? taskData.question ?? taskData.input ?? taskData.text ?? "";
  const answer = taskData.answer ?? taskData.ai_answer ?? taskData.response ?? taskData.output ?? "";
  const coAnnotators: string[] = Array.isArray(taskData.annotators)
    ? taskData.annotators.filter(Boolean)
    : [];

  useEffect(() => {
    setRating((result as any)?.rating ?? "");
    setSeverity((result as any)?.severity ?? "");
    setCorrection((result as any)?.correction ?? "");
  }, [result, taskId]);

  const emitChange = (next: { rating?: string; severity?: string; correction?: string }) => {
    onChange({
      rating: next.rating ?? rating,
      severity: next.severity ?? severity,
      correction: next.correction ?? correction,
    } as any);
  };

  const selectRating = (value: string) => {
    setRating(value);
    emitChange({ rating: value });
  };

  const selectSeverity = (value: string) => {
    setSeverity(value);
    emitChange({ severity: value });
  };

  const handleCorrectionChange = (v: string) => {
    setCorrection(v);
    emitChange({ correction: v });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInField =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (isInField) return;

      const number = Number(e.key);
      if (!Number.isNaN(number) && number >= 1 && number <= labels.length) {
        e.preventDefault();
        selectRating(labels[number - 1].value);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [labels, severity, correction]);

  return (
    <div className="max-w-3xl mx-auto space-y-5 fade-in">
      {config.instructions && (
        <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-3">
          📋 {config.instructions}
        </div>
      )}

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-5">
        <div className="sticky top-0 z-10 flex flex-wrap gap-x-8 gap-y-2 text-xs text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--bg-secondary)] pb-3">
          <span><span className="text-[var(--text-muted)]">ID:</span> {taskId}</span>
          <span><span className="text-[var(--text-muted)]">Risk:</span> {risk}</span>
          <span><span className="text-[var(--text-muted)]">Language:</span> {language}</span>
          {coAnnotators.length > 0 && (
            <span><span className="text-[var(--text-muted)]">Annotators:</span> {coAnnotators.join(", ")}</span>
          )}
        </div>

        {(() => {
          // System fields to skip (shown in header or not relevant)
          const SKIP_FIELDS = new Set(["id","task_id","external_id","risk","risk_category","domain","category","language","lang","locale","annotators","context"]);

          // If config defines display_fields, use those; otherwise show all data fields
          const configFields: string[] | undefined = (config as any).display_fields;

          const dataEntries = Object.entries(taskData).filter(([key]) => !SKIP_FIELDS.has(key) && key !== "annotators");

          const fieldsToShow: [string, any][] = configFields && configFields.length > 0
            ? configFields.map(f => [f, taskData[f]]).filter(([, v]) => v !== undefined && v !== null && v !== "")
            : dataEntries;

          if (fieldsToShow.length === 0) {
            // fallback to prompt/answer
            return (
              <>
                {prompt && <div><div className="label-title">Prompt</div><div className="task-text">{prompt}</div></div>}
                {answer && <div><div className="label-title">Answer</div><div className="task-text">{answer}</div></div>}
              </>
            );
          }

          return (
            <>
              {fieldsToShow.map(([key, value]) => (
                <div key={key}>
                  <div className="label-title" style={{ textTransform: "capitalize" }}>
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="task-text">
                    {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "")}
                  </div>
                </div>
              ))}
            </>
          );
        })()}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-5">
        <div>
          <div className="evaluation-title">{(config as any).custom_type_name || "Evaluation"}</div>

          <div className="flex flex-wrap gap-2">
            {labels.map((label: any, index: number) => {
              const isSelected = rating === label.value;

              return (
                <button
                  key={label.value}
                  onClick={() => selectRating(label.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-white bg-white text-black"
                      : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-white hover:text-[var(--text-primary)]"
                  }`}
                >
                  {isSelected && <span>✓</span>}
                  <kbd className="text-[10px] opacity-60 bg-black/30 px-1.5 py-0.5 rounded">
                    {index + 1}
                  </kbd>
                  <span>{label.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        {severityLabels.length > 0 && (
          <div>
            <div className="evaluation-title">Severity <span className="text-gray-600 text-xs font-normal">(optional)</span></div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectSeverity("")}
                className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                  severity === ""
                    ? "border-white bg-white text-black"
                    : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-white hover:text-[var(--text-primary)]"
                }`}
              >
                No selection
              </button>

              {severityLabels.map((label: any) => {
                const isSelected = severity === label.value;

                return (
                  <button
                    key={label.value}
                    type="button"
                    onClick={() => selectSeverity(label.value)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      isSelected
                        ? "border-white bg-white text-black"
                        : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-white hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {label.value}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">
          Notes / Correction
          {!config.require_correction && <span className="ml-1 text-[var(--text-muted)]">(optional)</span>}
        </label>
        <textarea
          value={correction}
          onChange={(e) => handleCorrectionChange(e.target.value)}
          placeholder="Write notes or correction here..."
          rows={4}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] outline-none transition-colors resize-none"
        />
      </div>
    </div>
  );
}
