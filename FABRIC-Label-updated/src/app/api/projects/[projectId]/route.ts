// src/app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessProject, requireRole } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { allowed } = await canAccessProject(params.projectId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          orderBy: { order: "asc" },
          include: {
            annotations: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const tasks = project.tasks;
    const total = tasks.length;
    const submitted = tasks.filter((t) => t.status === "SUBMITTED").length;
    const skipped = tasks.filter((t) => t.status === "SKIPPED").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;

    return NextResponse.json({
      ...project,
      stats: {
        total,
        submitted,
        skipped,
        pending,
        progress:
          total > 0 ? Math.round(((submitted + skipped) / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { allowed } = await canAccessProject(params.projectId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const {
      name,
      description,
      priority,
      type,
      config,
      organizationId,
      annotatorIds,
    } = body;

    const project = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: params.projectId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(priority !== undefined ? { priority } : {}),
          ...(type !== undefined ? { type } : {}),
          ...(config !== undefined ? { config } : {}),
          ...(organizationId !== undefined ? { organizationId } : {}),
        },
      });

      if (Array.isArray(annotatorIds)) {
        const cleanAnnotatorIds = annotatorIds
          .filter((id) => typeof id === "string" && id.trim())
          .map((id) => id.trim());

        const users = await tx.user.findMany({
          where: {
            id: { in: cleanAnnotatorIds },
            role: "ANNOTATOR",
          },
          select: { id: true },
        });

        const validAnnotatorIds = users.map((u) => u.id);

        await tx.projectAssignment.deleteMany({
          where: { projectId: params.projectId },
        });

        if (validAnnotatorIds.length > 0) {
          await tx.projectAssignment.createMany({
            data: validAnnotatorIds.map((userId) => ({
              projectId: params.projectId,
              userId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.project.findUnique({
        where: { id: params.projectId },
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);

    const { allowed } = await canAccessProject(params.projectId);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id: params.projectId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
