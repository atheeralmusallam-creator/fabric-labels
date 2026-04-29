export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectAnnotator } from "@/components/layout/ProjectAnnotator";
import { canAccessProject } from "@/lib/auth";

async function getProject(projectId: string, userId: string, role: string) {
  const totalTasks = await prisma.task.count({
    where: { projectId },
  });

  const isAnnotatorOnly = role === "ANNOTATOR";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: { select: { id: true, name: true } },

      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },

      tasks: {
        where: isAnnotatorOnly
          ? {
              OR: [
                { assignments: { some: { userId } } },
                { assignments: { none: {} } },
              ],
            }
          : {},
        orderBy: { order: "asc" },
        include: {
          annotations: {
            where: isAnnotatorOnly ? { userId } : {},
            orderBy: { updatedAt: "desc" },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },

          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!project) return null;

  const assignedTotal = project.tasks.length;

  const completedAssigned = project.tasks.filter((task) => {
    if (isAnnotatorOnly) {
      return task.annotations?.some(
        (ann) => ann.userId === userId && ann.status === "SUBMITTED"
      );
    }

    return task.annotations?.some((ann) => ann.status === "SUBMITTED");
  }).length;

  return {
    ...project,
    progressStats: {
      completedAssigned,
      assignedTotal,
      totalTasks,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { user, allowed } = await canAccessProject(params.projectId);

  if (!allowed) redirect("/dashboard");

  const project = await getProject(params.projectId, user.id, user.role);

  if (!project) notFound();

  return (
    <ProjectAnnotator
      project={project as any}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  );
}
