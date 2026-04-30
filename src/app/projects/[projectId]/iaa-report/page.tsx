export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { IAAReportClient } from "./IAAReportClient";

async function getIAAData(projectId: string, currentUserId: string, isManager: boolean) {
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

    const allAnnotations = task.annotations.map((ann) => ({
      userId:       ann.userId,
      userName:     ann.user?.name || ann.user?.email || "Unknown",
      rating:       (ann.result as any)?.rating || (ann.result as any)?.evaluation || "",
      severity:     (ann.result as any)?.severity || "",
      notes:        ann.notes || "",
      isCurrentUser: ann.userId === currentUserId,
    }));

    const ratings = allAnnotations.map((a) => a.rating).filter(Boolean);
    const agreed         = ratings.length >= 2 && new Set(ratings).size === 1;
    const hasDisagreement = ratings.length >= 2 && new Set(ratings).size > 1;

    // Annotators only see their own rating details; other annotators show as masked
    const visibleAnnotations = isManager
      ? allAnnotations
      : allAnnotations.map((ann) =>
          ann.isCurrentUser
            ? ann
            : { userId: null, userName: ann.userName, rating: "—", severity: "", notes: "", isCurrentUser: false }
        );

    return { id: String(task.id), order: task.order,
      prompt: data.prompt || data.question || data.text || String(task.id).slice(0, 20),
      risk: data.risk_category || data.risk || data.domain || "",
      allAnnotations, visibleAnnotations, agreed, hasDisagreement, ratings };
  });

  const withMultiple   = tasks.filter((t) => t.ratings.length >= 2);
  const agreedCount    = withMultiple.filter((t) => t.agreed).length;
  const disagreedCount = withMultiple.filter((t) => t.hasDisagreement).length;
  const agreementPct   = withMultiple.length > 0 ? (agreedCount / withMultiple.length) * 100 : 0;

  const ratingDist: Record<string, number> = {};
  tasks.forEach((t) => t.ratings.forEach((r) => { ratingDist[r] = (ratingDist[r] || 0) + 1; }));

  const annotatorMap: Record<string, { name: string; count: number; ratings: Record<string, number> }> = {};
  tasks.forEach((task) => {
    task.allAnnotations.forEach((ann) => {
      const key = ann.userId || ann.userName;
      if (!annotatorMap[key]) annotatorMap[key] = { name: ann.userName, count: 0, ratings: {} };
      annotatorMap[key].count++;
      if (ann.rating) annotatorMap[key].ratings[ann.rating] = (annotatorMap[key].ratings[ann.rating] || 0) + 1;
    });
  });

  const riskDisagreement: Record<string, { total: number; disagreed: number }> = {};
  tasks.forEach((t) => {
    if (!t.risk || t.ratings.length < 2) return;
    if (!riskDisagreement[t.risk]) riskDisagreement[t.risk] = { total: 0, disagreed: 0 };
    riskDisagreement[t.risk].total++;
    if (t.hasDisagreement) riskDisagreement[t.risk].disagreed++;
  });

  return {
    project: { id: project.id, name: project.name },
    isManager,
    currentUserId,
    stats: { totalTasks: tasks.length, annotatedTasks: withMultiple.length,
      agreedCount, disagreedCount, agreementPct,
      pendingTasks: tasks.filter((t) => t.ratings.length === 0).length },
    ratingDist,
    annotators: Object.values(annotatorMap),
    riskDisagreement,
    tasks: tasks.map((t) => ({
      id: t.id, order: t.order, prompt: t.prompt, risk: t.risk,
      agreed: t.agreed, hasDisagreement: t.hasDisagreement,
      annotations: t.visibleAnnotations,
      ratings: t.ratings,
    })),
  };
}

export default async function IAAReportPage({ params }: { params: { projectId: string } }) {
  const user = await requireUser();
  const roles: string[] = (user as any).roles || [(user as any).role] || [];
  const isManager = roles.some((r: string) => ["MANAGER", "ADMIN"].includes(r));
  const data = await getIAAData(params.projectId, user.id, isManager);
  if (!data) notFound();
  return <IAAReportClient data={data} />;
}
