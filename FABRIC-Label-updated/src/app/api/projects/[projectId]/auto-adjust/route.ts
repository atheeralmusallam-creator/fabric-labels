import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// GET: returns tasks with disagreement
export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  await requireRole(["ADMIN", "MANAGER"]);

  const tasks = await prisma.task.findMany({
    where: { projectId: params.projectId },
    include: {
      annotations: {
        where: { status: "SUBMITTED" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  const disagreedTasks = tasks
    .filter((task) => {
      if (task.annotations.length < 2) return false;
      const ratings = task.annotations.map((a: any) => a.result?.rating || a.result?.evaluation || a.result?.labels?.[0]);
      const unique = new Set(ratings.filter(Boolean));
      return unique.size > 1;
    })
    .map((task) => ({
      id: task.id,
      annotations: task.annotations.map((a) => ({
        userId: a.userId,
        userName: a.user?.name || a.user?.email,
        rating: (a.result as any)?.rating || (a.result as any)?.evaluation || (a.result as any)?.labels?.[0],
      })),
      assignedUserIds: task.assignments.map((a) => a.userId),
    }));

  return NextResponse.json({ disagreedTasks });
}

// POST: auto-assign a 4th annotator to disagreed tasks
export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  await requireRole(["ADMIN", "MANAGER"]);

  const tasks = await prisma.task.findMany({
    where: { projectId: params.projectId },
    include: {
      annotations: { where: { status: "SUBMITTED" } },
      assignments: true,
    },
  });

  // Get all annotators assigned to this project
  const projectAssignments = await prisma.projectAssignment.findMany({
    where: { projectId: params.projectId },
    select: { userId: true },
  });
  const allProjectUserIds = projectAssignments.map((a) => a.userId);

  let adjustedCount = 0;
  const results: { taskId: string; newUserId: string | null; reason: string }[] = [];

  for (const task of tasks) {
    if (task.annotations.length < 2) continue;

    const ratings = task.annotations.map((a: any) => a.result?.rating || a.result?.evaluation || a.result?.labels?.[0]);
    const unique = new Set(ratings.filter(Boolean));

    if (unique.size <= 1) continue; // agreement — skip

    const currentAssignedIds = task.assignments.map((a) => a.userId);
    const alreadyAnnotatedIds = task.annotations.map((a) => a.userId).filter(Boolean);

    // Find someone from the project pool who hasn't annotated this task yet
    const candidates = allProjectUserIds.filter(
      (uid) => !alreadyAnnotatedIds.includes(uid) && !currentAssignedIds.includes(uid)
    );

    if (candidates.length === 0) {
      results.push({ taskId: task.id, newUserId: null, reason: "No available annotator" });
      continue;
    }

    // Pick the annotator with the fewest assignments on this project (tiebreak by index)
    const assignmentCounts = await prisma.taskAssignment.groupBy({
      by: ["userId"],
      where: { task: { projectId: params.projectId }, userId: { in: candidates } },
      _count: { userId: true },
    });

    const countMap: Record<string, number> = {};
    assignmentCounts.forEach((r) => { countMap[r.userId] = r._count.userId; });
    candidates.forEach((uid) => { if (!countMap[uid]) countMap[uid] = 0; });

    const chosen = candidates.sort((a, b) => countMap[a] - countMap[b])[0];

    await prisma.taskAssignment.create({
      data: { taskId: task.id, userId: chosen },
    });

    adjustedCount++;
    results.push({ taskId: task.id, newUserId: chosen, reason: "Assigned 4th annotator" });
  }

  return NextResponse.json({ adjustedCount, results });
}
