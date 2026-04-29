// src/components/layout/TaskSidebar.tsx
"use client";

import { Task } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  currentIndex: number;
  onSelect: (i: number) => void;
  filter: string;
  onFilterChange: (value: string) => void;
}

export function TaskSidebar({ tasks, currentIndex, onSelect, filter, onFilterChange }: Props) {
  const stats = {
    submitted: tasks.filter((t) => t.annotations?.[0]?.status === "SUBMITTED" || t.status === "SUBMITTED").length,
    skipped: tasks.filter((t) => t.status === "SKIPPED").length,
    draft: tasks.filter((t) => t.annotations?.[0]?.status === "DRAFT").length,
    pending: tasks.filter((t) => t.status === "PENDING" && !t.annotations?.[0]?.status).length,
  };

  const query = filter.trim().toLowerCase();
  const filteredTasks = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task, index }) => !query || getSearchText(task, index).includes(query));

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border)] overflow-hidden">
      <div className="flex-shrink-0 px-3 py-3 border-b border-[var(--border)] grid grid-cols-4 gap-1 text-center">
        <div>
          <div className="text-green-400 text-sm font-bold">{stats.submitted}</div>
          <div className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide">Done</div>
        </div>
        <div>
          <div className="text-blue-400 text-sm font-bold">{stats.draft}</div>
          <div className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide">Draft</div>
        </div>
        <div>
          <div className="text-yellow-400 text-sm font-bold">{stats.skipped}</div>
          <div className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide">Skip</div>
        </div>
        <div>
          <div className="text-gray-400 text-sm font-bold">{stats.pending}</div>
          <div className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide">Left</div>
        </div>
      </div>

      <div className="flex-shrink-0 p-3 border-b border-[var(--border)]">
        <input
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="Filter ID, question, answer, annotator..."
          className="w-full rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] px-3 py-2 text-xs text-gray-300 placeholder:text-gray-700 outline-none focus:border-indigo-500/60"
        />
        {query && (
          <div className="mt-2 text-[10px] text-[var(--text-muted)]">
            {filteredTasks.length} of {tasks.length} tasks
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filteredTasks.length === 0 ? (
          <div className="px-3 py-6 text-xs text-[var(--text-muted)] text-center">No matching tasks</div>
        ) : filteredTasks.map(({ task, index }) => {
          const annotationStatus = task.annotations?.[0]?.status;
          return (
            <button
              key={task.id}
              onClick={() => onSelect(index)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group",
                index === currentIndex
                  ? "bg-indigo-500/15 border-r-2 border-indigo-500"
                  : "hover:bg-[var(--bg-surface)] border-r-2 border-transparent"
              )}
            >
              <span className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                annotationStatus === "SUBMITTED" || task.status === "SUBMITTED" ? "bg-green-500" :
                task.status === "SKIPPED"   ? "bg-yellow-500" :
                annotationStatus === "DRAFT" ? "bg-blue-500" :
                "bg-gray-600"
              )} />

              <div className="min-w-0 flex-1">
                <div className={cn(
                  "text-xs font-medium flex items-center gap-1.5",
                  index === currentIndex ? "text-white" : "text-gray-400 group-hover:text-white"
                )}>
                  <span>#{index + 1}</span>
                  {annotationStatus === "DRAFT" && task.status !== "SUBMITTED" && (
                    <span className="text-[9px] text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded">draft</span>
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
                  {getTaskSnippet(task)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function getTaskSnippet(task: Task): string {
  const data = task.data as any;
  const value = data.prompt ?? data.question ?? data.answer ?? data.ai_answer ?? data.text ?? data.caption ?? data.description ?? data.title;
  return value ? String(value).slice(0, 50) : "Task";
}

function getSearchText(task: Task, index: number): string {
  const data = task.data as any;
  const annotation = task.annotations?.[0] as any;
  const assignmentNames = ((task as any).assignments ?? [])
    .map((a: any) => `${a.user?.name ?? ""} ${a.user?.email ?? ""}`)
    .join(" ");

  return [
    index + 1,
    task.id,
    task.status,
    annotation?.status,
    annotation?.notes,
    JSON.stringify(annotation?.result ?? {}),
    data.id,
    data.task_id,
    data.risk_category,
    data.language,
    data.prompt,
    data.question,
    data.answer,
    data.ai_answer,
    data.text,
    data.title,
    assignmentNames,
  ].join(" ").toLowerCase();
}
