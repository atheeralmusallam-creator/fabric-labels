import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: {
          annotations: {
            where: { status: "SUBMITTED" },
            include: { user: true },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const tasksSheet = project.tasks.map((task, i) => {
    const data: any = task.data;

    const row: any = {
      Task: i + 1,
      ID: data.id || data.task_id || data.external_id || "",
      Risk: data.risk_category || data.risk || data.domain || data.category || "",
      Language: data.language || data.lang || data.locale || "",
      Prompt: (data.prompt || data.question || data.text || "").slice(0, 200),
      Answer: (data.answer || data.ai_answer || data.response || data.output || "").slice(0, 200),
    };

    task.annotations.forEach((ann) => {
      const r: any = ann.result || {};
      const name = ann.user?.name || ann.user?.email || "Unknown";

      row[`${name} - Rating`] = r.rating || r.evaluation || "";
      row[`${name} - Severity`] = r.severity || "";
      row[`${name} - Notes`] = ann.notes || "";
    });

    return row;
  });

  let agreeCount = 0;
  let totalCompared = 0;

  // Add agreement column to tasks sheet
  project.tasks.forEach((task, i) => {
    const ratings = task.annotations
      .map((a: any) => a.result?.rating || a.result?.evaluation)
      .filter(Boolean);

    if (ratings.length >= 2) {
      totalCompared += 1;
      const first = ratings[0];
      const agreed = ratings.every((r) => r === first);
      if (agreed) agreeCount += 1;
      tasksSheet[i]["Agreement"] = agreed ? "✓ Agree" : "✗ Disagree";
      tasksSheet[i]["Unique Ratings"] = Array.from(new Set(ratings)).join(" / ");
    } else {
      tasksSheet[i]["Agreement"] = ratings.length === 0 ? "Pending" : "Only 1";
    }
  });

  const agreement = totalCompared > 0 ? (agreeCount / totalCompared) * 100 : 0;

  const agreementSheet = [
    { Metric: "Total Tasks Compared", Value: totalCompared },
    { Metric: "Agreed Tasks", Value: agreeCount },
    { Metric: "Agreement %", Value: agreement.toFixed(2) },
  ];

  const annotatorStats: Record<string, number> = {};

  project.tasks.forEach((task) => {
    task.annotations.forEach((ann) => {
      const email = ann.user?.email || "Unknown";
      annotatorStats[email] = (annotatorStats[email] || 0) + 1;
    });
  });

  const annotatorSheet = Object.entries(annotatorStats).map(([email, count]) => ({
    Annotator: email,
    Annotations: count,
  }));

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(tasksSheet),
    "Tasks"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(agreementSheet),
    "Agreement"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(annotatorSheet),
    "Annotators"
  );

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  });

  const safeProjectName = project.name.replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `${safeProjectName}_iaa.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
