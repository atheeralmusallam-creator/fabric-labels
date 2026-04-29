// src/app/api/tasks/[taskId]/skip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessProject } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const existing = await prisma.task.findUnique({ where: { id: params.taskId }, select: { projectId: true } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const { allowed } = await canAccessProject(existing.projectId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const task = await prisma.task.update({
      where: { id: params.taskId },
      data: { status: "SKIPPED" },
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: "Failed to skip task" }, { status: 500 });
  }
}
