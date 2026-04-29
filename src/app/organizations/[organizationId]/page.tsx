export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { UserMenu } from "@/components/auth/UserMenu";
import { OrganizationProjectsClient } from "@/components/organizations/OrganizationProjectsClient";

async function getOrganization(
  organizationId: string,
  user: { id: string; role: string }
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      projects: {
        where:
          user.role === "ANNOTATOR"
            ? { assignments: { some: { userId: user.id } } }
            : {},
        orderBy: { createdAt: "desc" },
        include: {
          tasks: {
            select: {
              status: true,
              assignments: {
                select: { userId: true },
              },
              annotations: {
                where: { userId: user.id },
                select: { status: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!org) return null;

  const projects = org.projects.map((p) => {
    const total = p.tasks.length;

    const assignedTasks =
      user.role === "ANNOTATOR"
        ? p.tasks.filter(
            (t) =>
              t.assignments.length === 0 ||
              t.assignments.some((a) => a.userId === user.id)
          )
        : p.tasks;

    const assignedTotal = assignedTasks.length;

    const completedAssigned = assignedTasks.filter(
      (t) => t.annotations?.[0]?.status === "SUBMITTED"
    ).length;

    const submitted = p.tasks.filter((t) => t.status === "SUBMITTED").length;
    const skipped = p.tasks.filter((t) => t.status === "SKIPPED").length;
    const progress =
      total > 0 ? Math.round(((submitted + skipped) / total) * 100) : 0;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      priority: p.priority,
      type: p.type,
      stats: {
        total,
        submitted,
        skipped,
        pending: total - submitted - skipped,
        progress,
        assignedTotal,
        completedAssigned,
        totalTasks: total,
      },
    };
  });

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    projects,
  };
}

export default async function OrganizationPage({
  params,
}: {
  params: { organizationId: string };
}) {
  const user = await requireUser();
  const org = await getOrganization(params.organizationId, user);

  if (!org) notFound();
  if (user.role === "ANNOTATOR" && org.projects.length === 0) {
    redirect("/dashboard");
  }

  const canManage = user.role !== "ANNOTATOR";

  return (
    <div className="min-h-screen bg-[#0e0f14]">
      <header className="border-b border-[#2a2d3e] bg-[#13151e] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-white transition-colors text-sm"
            >
              ← Organizations
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm text-white truncate">{org.name}</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-gray-400">
            {user.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="hover:text-white transition-colors"
              >
                Users
              </Link>
            )}
            <UserMenu user={user} />
          </nav>
        </div>
      </header>

      <OrganizationProjectsClient
        organization={{
          id: org.id,
          name: org.name,
          description: org.description,
        }}
        projects={org.projects}
        canManage={canManage}
      />
    </div>
  );
}
