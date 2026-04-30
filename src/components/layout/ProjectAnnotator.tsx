"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Task, Project, Annotation, AnnotationResult } from "@/types";
import { TaskSidebar } from "./TaskSidebar";
import { AnnotationPanel } from "./AnnotationPanel";
import { RendererRouter } from "../annotators/RendererRouter";
import { DeleteProjectButton } from "@/components/ui/DeleteProjectButton";
import { EditProjectButton } from "@/components/ui/EditProjectButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface ProjectWithTasks extends Project {
  priority?: string | null;
  progressStats?: {
    completedAssigned: number;
    assignedTotal: number;
    totalTasks: number;
  };
  assignments?: {
    id: string;
    userId: string;
    user?: { id: string; name?: string | null; email: string };
  }[];
  tasks: (Task & { annotations: Annotation[] })[];
}

export function ProjectAnnotator({
  project,
  currentUserId,
  currentUserRole,
}: {
  project: ProjectWithTasks;
  currentUserId?: string;
  currentUserRole?: string;
}) {
  const isManagerOrAdmin = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";
  const [tasks, setTasks] = useState(project.tasks);
  const [filter, setFilter] = useState("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tasks;

    return tasks.filter((task) => {
      const data = task.data as any;

      const haystack = [
        data?.id,
        data?.prompt,
        data?.question,
        data?.answer,
        data?.response,
        data?.text,
        data?.risk,
        data?.risk_category,
        data?.language,
        data?.lang,
        task.status,
        ...(task.annotations || []).map((a: any) => a.user?.name || a.user?.email || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [tasks, filter]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstPending = project.tasks.findIndex((t) => {
      const myAnnotation = currentUserId
        ? t.annotations?.find((a: any) => a.userId === currentUserId)
        : t.annotations?.[0];

      return t.status !== "SKIPPED" && myAnnotation?.status !== "SUBMITTED";
    });

    return firstPending >= 0 ? firstPending : 0;
  });

  const [pendingResult, setPendingResult] = useState<AnnotationResult | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [submitError, setSubmitError] = useState("");

  const loadGuard = useRef<{ taskId: string | null; skipNextAutosave: boolean }>({
    taskId: null,
    skipNextAutosave: false,
  });

  const currentTask = filteredTasks[currentIndex];

  const currentUserAnnotation =
    currentTask?.annotations?.find((ann: any) => ann.userId === currentUserId) || null;

  // Managers/admins: respect selectedAnnotationId so they can view any annotator's result
  const selectedAnnotation =
    (selectedAnnotationId
      ? currentTask?.annotations?.find((ann: any) => ann.id === selectedAnnotationId)
      : null) ||
    currentUserAnnotation ||
    currentTask?.annotations?.[0] ||
    null;

  const currentAnnotation = selectedAnnotation;

  const effectiveTaskStatus =
    currentAnnotation?.status === "SUBMITTED"
      ? "SUBMITTED"
      : currentTask?.status === "SKIPPED"
      ? "SKIPPED"
      : "PENDING";

  const completedAssigned =
    project.progressStats?.completedAssigned ??
    tasks.filter((task) => {
      const myAnnotation = currentUserId
        ? task.annotations?.find((a: any) => a.userId === currentUserId)
        : task.annotations?.[0];

      return myAnnotation?.status === "SUBMITTED";
    }).length;

  const assignedTotal = project.progressStats?.assignedTotal ?? tasks.length;
  const totalTasks = project.progressStats?.totalTasks ?? tasks.length;

  useEffect(() => {
    setCurrentIndex(0);
  }, [filter]);

  useEffect(() => {
    if (currentIndex > filteredTasks.length - 1) {
      setCurrentIndex(Math.max(filteredTasks.length - 1, 0));
    }
  }, [currentIndex, filteredTasks.length]);

  useEffect(() => {
    const myAnnotation =
      currentTask?.annotations?.find((ann: any) => ann.userId === currentUserId) ||
      currentTask?.annotations?.[0];

    setSelectedAnnotationId(myAnnotation?.id ?? null);
  }, [currentTask?.id, currentUserId]);

  useEffect(() => {
    setPendingResult(null);
    setNotes("");
    setDraftState("idle");
    setSubmitError("");

    if (currentAnnotation) {
      setPendingResult(currentAnnotation.result as AnnotationResult);
      setNotes(currentAnnotation.notes ?? "");
      setDraftState(currentAnnotation.status === "DRAFT" ? "saved" : "idle");
    }

    // Block autosave on every task switch — unblocks after first real interaction
    loadGuard.current.taskId = currentTask?.id ?? null;
    loadGuard.current.skipNextAutosave = true;
  }, [currentTask?.id, selectedAnnotationId]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, filteredTasks.length - 1));
  }, [filteredTasks.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goToFirstUnsolved = useCallback(() => {
    const index = filteredTasks.findIndex((task) => {
      const myAnnotation = currentUserId
        ? task.annotations?.find((a: any) => a.userId === currentUserId)
        : task.annotations?.[0];

      return task.status !== "SKIPPED" && myAnnotation?.status !== "SUBMITTED";
    });

    if (index >= 0) {
      setCurrentIndex(index);
      showToast("Moved to first unsolved task");
    } else {
      showToast("All visible tasks are completed");
    }
  }, [filteredTasks, currentUserId]);

  // Use refs to hold latest values — avoids recreating saveDraft on every keystroke
  const pendingResultRef = useRef(pendingResult);
  const notesRef = useRef(notes);
  const currentTaskRef = useRef(currentTask);
  const currentAnnotationRef = useRef(currentAnnotation);
  useEffect(() => { pendingResultRef.current = pendingResult; }, [pendingResult]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { currentTaskRef.current = currentTask; }, [currentTask]);
  useEffect(() => { currentAnnotationRef.current = currentAnnotation; }, [currentAnnotation]);

  const saveDraft = useCallback(async () => {
    const pr = pendingResultRef.current;
    const ct = currentTaskRef.current;
    const ca = currentAnnotationRef.current;
    const n  = notesRef.current;
    if (!pr || !ct || ca?.status === "SUBMITTED") return;

    setDraftState("saving");

    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: ct.id,
          result: pr,
          notes: n,
          status: "DRAFT",
        }),
      });

      if (!res.ok) throw new Error();

      const ann = await res.json();

      setTasks((prev) =>
        prev.map((t) =>
          t.id === ct.id
            ? {
                ...t,
                annotations: [
                  ann,
                  ...(t.annotations || []).filter((a: any) => a.userId !== ann.userId),
                ],
              }
            : t
        )
      );

      setDraftState("saved");
    } catch {
      setDraftState("error");
    }
  }, []); // stable — reads from refs

  useEffect(() => {
    if (!currentTask || !pendingResult || currentAnnotation?.status === "SUBMITTED") return;

    if (loadGuard.current.taskId === currentTask.id && loadGuard.current.skipNextAutosave) {
      loadGuard.current.skipNextAutosave = false;
      return;
    }

    const timer = window.setTimeout(() => {
      saveDraft();
    }, 1500); // increased debounce to reduce flicker

    return () => window.clearTimeout(timer);
  }, [pendingResult, notes, currentTask?.id, currentAnnotation?.status]);

  const handleSubmit = useCallback(async () => {
    if (!currentTask) return;

    if (!(pendingResult as any)?.rating && !(pendingResult as any)?.evaluation) {
      setSubmitError("evaluation is required");
      return;
    }

    setSubmitError("");
    setSaving(true);

    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentTask.id,
          result: pendingResult,
          notes,
          status: "SUBMITTED",
        }),
      });

      if (!res.ok) throw new Error();

      const ann = await res.json();

      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id
            ? {
                ...t,
                annotations: [
                  ann,
                  ...(t.annotations || []).filter((a: any) => a.userId !== ann.userId),
                ],
              }
            : t
        )
      );

      setDraftState("idle");
      showToast("Submitted ✓");
      setTimeout(() => goNext(), 300);
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }, [pendingResult, currentTask, notes, goNext]);

  const handleSkip = useCallback(async () => {
    if (!currentTask) return;

    try {
      await fetch(`/api/tasks/${currentTask.id}/skip`, {
        method: "POST",
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id ? { ...t, status: "SKIPPED" } : t
        )
      );

      showToast("Skipped");
      setTimeout(() => goNext(), 300);
    } catch {
      showToast("Failed to skip", "error");
    }
  }, [currentTask, goNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInField =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (isInField) {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSubmit();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, goNext, goPrev]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link
            href={project.organizationId ? `/organizations/${project.organizationId}` : "/dashboard"}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Projects
          </Link>

          <span className="text-[var(--text-muted)]">/</span>

          <Link
            href={`/projects/${project.id}`}
            className="text-[var(--text-primary)] font-semibold hover:text-emerald-300 truncate"
          >
            {project.name}
          </Link>

          <span className="text-[var(--text-muted)]">·</span>

          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            {completedAssigned}/{assignedTotal} assigned · {totalTasks} total
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToFirstUnsolved}
            className="text-xs bg-[var(--bg-surface)] border border-[var(--border)] hover:border-emerald-500/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 rounded-lg"
          >
            Label
          </button>

          <Link
            href={`/projects/${project.id}/iaa-report`}
            className="text-xs px-4 py-2 rounded-lg border transition-all"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }}
          >
            IAA Report
          </Link>

          {isManagerOrAdmin && (
            <>
              <EditProjectButton
                projectId={project.id}
                initialName={project.name}
                initialDescription={project.description}
                initialPriority={project.priority}
              />
              <DeleteProjectButton projectId={project.id} />
            </>
          )}

          <ThemeToggle />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <TaskSidebar
          tasks={filteredTasks}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          filter={filter}
          onFilterChange={setFilter}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {currentTask ? (
            <>
              <div className="flex-1 overflow-y-auto p-5">
                {currentTask.annotations?.length > 0 && (() => {
                  // Check for disagreement among submitted annotations
                  const submitted = currentTask.annotations.filter((a: any) => a.status === "SUBMITTED");
                  const values = submitted.map((a: any) => a.result?.evaluation || a.result?.rating || a.result?.label || "");
                  const uniqueValues = new Set(values.filter(Boolean));
                  const hasDisagreement = submitted.length >= 3 && uniqueValues.size > 1;

                  return (
                    <div className="mb-4">
                      {/* Disagreement warning for manager/admin */}
                      {isManagerOrAdmin && hasDisagreement && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.35)", color: "#ca8a04" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          Disagreement detected — a 4th annotator has been auto-assigned
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs mr-1" style={{ color: "var(--text-secondary)" }}>Annotator:</span>
                        {currentTask.annotations.map((ann: any) => {
                          const name = ann.user?.name || ann.user?.email || "Unknown";
                          const active = currentAnnotation?.id === ann.id;
                          const val = ann.result?.evaluation || ann.result?.rating || ann.result?.label || "";

                          return (
                            <button
                              key={ann.id}
                              type="button"
                              onClick={() => setSelectedAnnotationId(ann.id)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                active
                                  ? "bg-emerald-500/20 border-emerald-500"
                                  : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-emerald-500/50"
                              }`}
                              style={{ color: active ? "var(--brand)" : "var(--text-primary)" }}
                            >
                              {name}
                              {isManagerOrAdmin && val && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ background: "var(--bg-hover)", color: "var(--text-primary)", fontWeight: 600 }}>
                                  {val}
                                </span>
                              )}
                              <span
                                className="ml-1.5 text-[10px]"
                                style={{ color: "var(--text-primary)", fontWeight: active ? 700 : 500, opacity: active ? 1 : 0.7 }}
                              >
                                {ann.status}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <RendererRouter
                  project={project as any}
                  task={currentTask as any}
                  result={pendingResult}
                  onChange={(result) => {
                    setPendingResult(result);
                    if ((result as any)?.rating || (result as any)?.evaluation) {
                      setSubmitError("");
                    }
                  }}
                />
              </div>

              {submitError && (
                <div className="mx-5 mb-2 bg-red-900/40 border border-red-700 text-red-400 text-sm px-4 py-2 rounded-lg">
                  <strong>Warning!</strong> {submitError}
                </div>
              )}

              <AnnotationPanel
                notes={notes}
                onNotesChange={setNotes}
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                saving={saving}
                draftState={draftState}
                canSubmit={!!pendingResult}
                taskStatus={effectiveTaskStatus as any}
                annotationStatus={currentAnnotation?.status as any}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[var(--text-muted)]">No tasks match this filter</p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl z-50 ${
            toast.type === "success"
              ? "bg-green-900/80 border border-green-700/50 text-green-300"
              : "bg-red-900/80 border border-red-700/50 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
