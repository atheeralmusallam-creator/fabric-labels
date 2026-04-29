// src/app/api/projects/[projectId]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessProject, requireRole } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { allowed } = await canAccessProject(params.projectId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: {
            annotations: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const exportData = {
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        config: project.config,
        exportedAt: new Date().toISOString(),
      },
      tasks: project.tasks.map((task) => ({
        id: task.id,
        status: task.status,
        data: task.data,
        annotation: task.annotations[0]
          ? {
              result: task.annotations[0].result,
              notes: task.annotations[0].notes,
              createdAt: task.annotations[0].createdAt,
            }
          : null,
      })),
      stats: {
        total: project.tasks.length,
        submitted: project.tasks.filter((t) => t.status === "SUBMITTED").length,
        skipped: project.tasks.filter((t) => t.status === "SKIPPED").length,
        pending: project.tasks.filter((t) => t.status === "PENDING").length,
      },
    };

    if (format === "csv") {
      // Simple CSV export - flat structure
      const rows = [
        ["task_id", "status", "task_data", "annotation_result", "notes", "annotated_at"],
        ...exportData.tasks.map((t) => [
          t.id,
          t.status,
          JSON.stringify(t.data),
          t.annotation ? JSON.stringify(t.annotation.result) : "",
          t.annotation?.notes ?? "",
          t.annotation?.createdAt ? new Date(t.annotation.createdAt).toISOString() : "",
        ]),
      ];

      const csv = rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${project.name.replace(/\s+/g, "_")}_export.csv"`,
        },
      });
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${project.name.replace(/\s+/g, "_")}_export.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
