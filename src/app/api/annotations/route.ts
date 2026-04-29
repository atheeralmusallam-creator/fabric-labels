// src/app/api/annotations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/auth";

function getEvaluationValue(result: any) {
  return result?.evaluation || result?.rating || result?.label || "";
}

function hasMajority(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.values()).some((count) => count >= 2);
}

async function maybeAssignAdjudicator(taskId: string, projectId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          assignments: {
            orderBy: { createdAt: "asc" },
            select: { userId: true },
          },
        },
      },
      assignments: {
        select: { userId: true },
      },
      annotations: {
        where: { status: "SUBMITTED" },
        orderBy: { createdAt: "asc" },
        select: {
          userId: true,
          result: true,
        },
      },
    },
  });

  if (!task) return;

  const config = task.project.config as any;

  if (!config?.adjudication_enabled) return;

  const submitted = task.annotations.filter((a) => a.userId);

  if (submitted.length !== 3) return;

  const values = submitted.map((a) => getEvaluationValue(a.result));

  if (hasMajority(values)) return;

  const alreadyAssignedUserIds = new Set(task.assignments.map((a) => a.userId));
  const alreadySubmittedUserIds = new Set(submitted.map((a) => a.userId).filter(Boolean));

  const nextAnnotator = task.project.assignments.find(
    (assignment) =>
      !alreadyAssignedUserIds.has(assignment.userId) &&
      !alreadySubmittedUserIds.has(assignment.userId)
  );

  if (!nextAnnotator) return;

  await prisma.taskAssignment.create({
    data: {
      taskId,
      userId: nextAnnotator.userId,
    },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "PENDING" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, result, notes, status } = body;
    const annotationStatus = status === "DRAFT" ? "DRAFT" : "SUBMITTED";

    if (!taskId || !result) {
      return NextResponse.json(
        { error: "taskId and result are required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { user, allowed } = await canAccessProject(task.projectId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const annotation = await prisma.annotation.upsert({
      where: {
        taskId_userId: {
          taskId,
          userId: user.id,
        },
      },
      update: {
        result,
        notes,
        status: annotationStatus,
      },
      create: {
        taskId,
        result,
        notes,
        userId: user.id,
        status: annotationStatus,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (annotationStatus === "SUBMITTED") {
      await maybeAssignAdjudicator(taskId, task.projectId);

      const assignedCount = await prisma.taskAssignment.count({
        where: { taskId },
      });

      if (assignedCount === 0) {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "SUBMITTED" },
        });
      } else {
        const submittedCount = await prisma.annotation.count({
          where: {
            taskId,
            status: "SUBMITTED",
          },
        });

        if (submittedCount >= assignedCount) {
          await prisma.task.update({
            where: { id: taskId },
            data: { status: "SUBMITTED" },
          });
        } else {
          await prisma.task.update({
            where: { id: taskId },
            data: { status: "PENDING" },
          });
        }
      }
    }

    return NextResponse.json(annotation, {
      status: annotationStatus === "DRAFT" ? 200 : 201,
    });
  } catch (error) {
    console.error("POST /api/annotations error:", error);
    return NextResponse.json(
      { error: "Failed to save annotation" },
      { status: 500 }
    );
  }
}
