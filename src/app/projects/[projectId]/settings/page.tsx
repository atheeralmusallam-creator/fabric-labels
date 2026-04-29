export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { AutoAdjustSection } from "@/components/ui/AutoAdjustSection";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: { annotations: { include: { user: true } } },
      },
      assignments: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

async function saveAnnotatorsAction(formData: FormData) {
  "use server";

  await requireRole(["ADMIN", "MANAGER"]);

  const projectId = String(formData.get("projectId") || "");
  const userIds = formData.getAll("userIds").map(String).filter(Boolean);

  if (!projectId) return;

  await prisma.$transaction(async (tx) => {
    await tx.projectAssignment.deleteMany({
      where: { projectId },
    });

    if (userIds.length > 0) {
      await tx.projectAssignment.createMany({
        data: userIds.map((userId) => ({ projectId, userId })),
        skipDuplicates: true,
      });
    }

    const tasks = await tx.task.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    await tx.taskAssignment.deleteMany({
      where: { task: { projectId } },
    });

    if (userIds.length > 0 && tasks.length > 0) {
      const annotatorsPerTask = Math.min(3, userIds.length);

      // Track load per annotator for balanced distribution
      const assignmentCount: Record<string, number> = {};
      userIds.forEach((id) => { assignmentCount[id] = 0; });

      // LCG shuffle for randomness per task
      const lcgShuffle = <T>(arr: T[], seed: number): T[] => {
        const a = [...arr];
        let s = seed >>> 0;
        for (let i = a.length - 1; i > 0; i--) {
          s = Math.imul(s, 1664525) + 1013904223 >>> 0;
          const j = s % (i + 1);
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      const taskAssignments: { taskId: string; userId: string }[] = [];

      tasks.forEach((task, taskIndex) => {
        // Shuffle to break ties randomly, then sort by load
        const shuffled = lcgShuffle(userIds, taskIndex * 2654435761);
        const sorted = [...shuffled].sort((a, b) => assignmentCount[a] - assignmentCount[b]);

        const picked = sorted.slice(0, annotatorsPerTask);
        picked.forEach((userId) => {
          taskAssignments.push({ taskId: task.id, userId });
          assignmentCount[userId]++;
        });
      });

      await tx.taskAssignment.createMany({
        data: taskAssignments,
        skipDuplicates: true,
      });
    }
  });

  redirect(`/projects/${projectId}/settings`);
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: { projectId: string };
}) {
  await requireRole(["ADMIN", "MANAGER"]);

  const project = await getProject(params.projectId);
  if (!project) notFound();

  const total = project.tasks.length;
  const submitted = project.tasks.filter((t) => t.status === "SUBMITTED").length;
  const skipped = project.tasks.filter((t) => t.status === "SKIPPED").length;
  const pending = project.tasks.filter((t) => t.status === "PENDING").length;

  const annotators = await prisma.user.findMany({
    where: {
      OR: [
        { role: "ANNOTATOR" },
        { roles: { has: "ANNOTATOR" } },
      ],
    },
    orderBy: { email: "asc" },
  });

  const assignedUserIds = new Set(project.assignments.map((a) => a.userId));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-white text-sm">
              Projects
            </Link>
            <span className="text-gray-700">/</span>
            <Link href={`/projects/${project.id}`} className="text-[var(--text-secondary)] hover:text-white text-sm">
              {project.name}
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm text-white">Settings</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Assign annotators first, then import tasks.
              </p>
            </div>

            <Link
              href={`/projects/${project.id}/import`}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
            >
              Continue to Import
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-xs text-[var(--text-muted)]">Total Tasks</div>
            </div>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{submitted}</div>
              <div className="text-xs text-[var(--text-muted)]">Submitted</div>
            </div>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">{skipped}</div>
              <div className="text-xs text-[var(--text-muted)]">Skipped</div>
            </div>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-400">{pending}</div>
              <div className="text-xs text-[var(--text-muted)]">Pending</div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-2">Assigned Annotators</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Select multiple annotators. Tasks will be distributed across 3 annotators per task.
          </p>

          <form action={saveAnnotatorsAction} className="space-y-4">
            <input type="hidden" name="projectId" value={project.id} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {annotators.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] hover:border-emerald-500/50 px-3 py-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="userIds"
                    value={user.id}
                    defaultChecked={assignedUserIds.has(user.id)}
                    className="accent-emerald-500"
                  />

                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {user.name || user.email}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] truncate">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all">
                Save Annotators
              </button>

              <span className="text-xs text-[var(--text-secondary)]">
                Currently assigned: {project.assignments.length}
              </span>
            </div>
          </form>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-2">Export</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Download submitted annotations or IAA report.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/projects/${project.id}/export?format=json`}
              download
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border)] hover:border-emerald-500/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
            >
              📄 Export JSON
            </a>

            <a
              href={`/api/projects/${project.id}/export?format=csv`}
              download
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border)] hover:border-emerald-500/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
            >
              📊 Export CSV
            </a>

            <a
              href={`/api/projects/${project.id}/iaa`}
              download
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 text-white text-sm rounded-lg transition-all"
            >
              📈 Export IAA Excel
            </a>
          </div>
        </div>

        {/* ── Auto-Adjust Disagreements ── */}
        <AutoAdjustSection projectId={project.id} />

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Comparison Dashboard</h2>

          <div className="space-y-4">
            {project.tasks.map((task, i) => {
              const data = task.data as any;

              return (
                <div key={task.id} className="border border-[var(--border)] rounded-lg p-4 bg-[var(--bg-primary)]">
                  <div className="text-xs text-[var(--text-secondary)] mb-2">
                    Task {i + 1} {data.id ? `• ID: ${data.id}` : ""}
                  </div>

                  <div className="text-sm text-gray-300 mb-3">
                    {data.prompt || data.question || data.text || "—"}
                  </div>

                  <div className="space-y-2">
                    {task.annotations.length === 0 ? (
                      <div className="text-xs text-[var(--text-muted)]">No annotations yet.</div>
                    ) : (
                      task.annotations.map((ann) => {
                        const r = ann.result as any;

                        return (
                          <div
                            key={ann.id}
                            className="text-xs border border-[var(--border)] rounded-md px-3 py-2 grid grid-cols-1 md:grid-cols-4 gap-2"
                          >
                            <span className="text-gray-400">
                              {ann.user?.name || ann.user?.email || "Unknown"}
                            </span>
                            <span className="text-gray-300">
                              Preference: {r?.evaluation || r?.rating || "—"}
                            </span>
                            <span className="text-gray-300">
                              Comment A: {r?.comments_response_a || "—"}
                            </span>
                            <span className="text-[var(--text-secondary)] truncate">
                              Notes: {ann.notes || "—"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
