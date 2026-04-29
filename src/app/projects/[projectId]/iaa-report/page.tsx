export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { IAAReportClient } from "./IAAReportClient";

async function getIAAData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: {
          annotations: {
            where: { status: "SUBMITTED" },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!project) return null;

  const tasks = project.tasks.map((task) => {
    const data: any = task.data;
    const annotations = task.annotations.map((ann) => ({
      userId: ann.userId,
      userName: ann.user?.name || ann.user?.email || "Unknown",
      rating: (ann.result as any)?.rating || (ann.result as any)?.evaluation || "",
      severity: (ann.result as any)?.severity || "",
      notes: ann.notes || "",
    }));

    const ratings = annotations.map((a) => a.rating).filter(Boolean);
    const agreed = ratings.length >= 2 && new Set(ratings).size === 1;
    const hasDisagreement = ratings.length >= 2 && new Set(ratings).size > 1;

    return {
      id: String(task.id),
      order: task.order,
      prompt: data.prompt || data.question || data.text || String(task.id).slice(0, 20),
      risk: data.risk_category || data.risk || data.domain || "",
      language: data.language || data.lang || "",
      annotations,
      agreed,
      hasDisagreement,
      ratings,
    };
  });

  // Agreement stats
  const withMultiple = tasks.filter((t) => t.ratings.length >= 2);
  const agreedCount = withMultiple.filter((t) => t.agreed).length;
  const disagreedCount = withMultiple.filter((t) => t.hasDisagreement).length;
  const agreementPct = withMultiple.length > 0 ? (agreedCount / withMultiple.length) * 100 : 0;

  // Per-annotator stats
  const annotatorMap: Record<string, { name: string; count: number; ratings: Record<string, number> }> = {};
  tasks.forEach((task) => {
    task.annotations.forEach((ann) => {
      if (!annotatorMap[ann.userId || ann.userName]) {
        annotatorMap[ann.userId || ann.userName] = { name: ann.userName, count: 0, ratings: {} };
      }
      const entry = annotatorMap[ann.userId || ann.userName];
      entry.count++;
      if (ann.rating) entry.ratings[ann.rating] = (entry.ratings[ann.rating] || 0) + 1;
    });
  });

  // Rating distribution across all annotations
  const ratingDist: Record<string, number> = {};
  tasks.forEach((t) => t.ratings.forEach((r) => { ratingDist[r] = (ratingDist[r] || 0) + 1; }));

  // Disagreement by risk
  const riskDisagreement: Record<string, { total: number; disagreed: number }> = {};
  tasks.forEach((t) => {
    if (!t.risk || t.ratings.length < 2) return;
    if (!riskDisagreement[t.risk]) riskDisagreement[t.risk] = { total: 0, disagreed: 0 };
    riskDisagreement[t.risk].total++;
    if (t.hasDisagreement) riskDisagreement[t.risk].disagreed++;
  });

  return {
    project: { id: project.id, name: project.name },
    stats: {
      totalTasks: tasks.length,
      annotatedTasks: withMultiple.length,
      agreedCount,
      disagreedCount,
      agreementPct,
      pendingTasks: tasks.filter((t) => t.ratings.length === 0).length,
    },
    ratingDist,
    annotators: Object.values(annotatorMap),
    riskDisagreement,
    tasks: tasks.map((t) => ({
      id: t.id,
      order: t.order,
      prompt: t.prompt,
      risk: t.risk,
      agreed: t.agreed,
      hasDisagreement: t.hasDisagreement,
      annotations: t.annotations,
      ratings: t.ratings,
    })),
  };
}

export default async function IAAReportPage({ params }: { params: { projectId: string } }) {
  await requireUser();

  const data = await getIAAData(params.projectId);
  if (!data) notFound();

  return <IAAReportClient data={data} />;
}
