// src/app/api/projects/[projectId]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: params.projectId },
      orderBy: { order: "asc" },
      include: {
        annotations: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const { data, order } = body;

    if (!data) {
      return NextResponse.json({ error: "data is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        projectId: params.projectId,
        data,
        order: order ?? 0,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST task error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
