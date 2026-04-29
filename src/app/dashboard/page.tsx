export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { UserMenu } from "@/components/auth/UserMenu";

async function getOrganizations(user: { id: string; role: string }) {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      projects: {
        where: user.role === "ANNOTATOR" ? { assignments: { some: { userId: user.id } } } : {},
        include: { tasks: { select: { status: true } } },
      },
    },
  });

  return organizations
    .map((org) => {
      const totalProjects = org.projects.length;
      const totalTasks = org.projects.reduce((sum, p) => sum + p.tasks.length, 0);
      const submitted = org.projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "SUBMITTED").length, 0);
      const skipped = org.projects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "SKIPPED").length, 0);
      const progress = totalTasks > 0 ? Math.round(((submitted + skipped) / totalTasks) * 100) : 0;
      return { ...org, projects: undefined, stats: { totalProjects, totalTasks, submitted, skipped, pending: totalTasks - submitted - skipped, progress } };
    })
    .filter((org) => user.role !== "ANNOTATOR" || org.stats.totalProjects > 0);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const organizations = await getOrganizations(user);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
         <div className="flex items-center gap-3">
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 flex items-center justify-center text-sm font-bold">
    A
  </div>

  <div className="flex flex-col leading-tight">
    <span className="text-lg font-semibold text-white tracking-tight">
      Annotation Studio
    </span>

    <span className="text-[10px] text-emerald-400 tracking-wider uppercase opacity-80">
      Powered By <span className="font-semibold">FABRIC</span>
    </span>
  </div>
</div>
          <nav className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/dashboard" className="text-white font-medium">Organizations</Link>
            {user.role === "ADMIN" && <Link href="/admin/users" className="hover:text-white transition-colors">Users</Link>}
            <UserMenu user={user} />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Organizations</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
              {user.role === "ANNOTATOR" ? " assigned to you" : ""}
            </p>
          </div>
          {user.role !== "ANNOTATOR" && (
            <Link href="/organizations/new" className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <span>+</span> New Organization
            </Link>
          )}
        </div>

        {organizations.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-xl">
            <p className="text-4xl mb-4">🏢</p>
            <p className="text-gray-400 text-lg font-medium">No organizations yet</p>
            <p className="text-[var(--text-muted)] text-sm mt-2 mb-6">
              {user.role === "ANNOTATOR" ? "Ask a manager to assign you to a project." : "Create an organization to group your projects."}
            </p>
            {user.role !== "ANNOTATOR" && (
              <Link href="/organizations/new" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">Create Organization</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => (
              <Link key={org.id} href={`/organizations/${org.id}`} className="group block bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-indigo-500/50 rounded-xl p-5 transition-all hover:bg-[var(--bg-surface)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg">🏢</div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">{org.name}</h2>
                      {org.description && <p className="text-[var(--text-secondary)] text-xs mt-1 line-clamp-1">{org.description}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">{org.stats.progress}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>{org.stats.totalProjects} projects</span><span>{org.stats.totalTasks} tasks</span></div>
                  <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${org.stats.progress}%` }} /></div>
                  <div className="flex gap-3 text-xs"><span className="text-green-500">{org.stats.submitted} done</span><span className="text-yellow-500">{org.stats.skipped} skipped</span><span className="text-[var(--text-muted)]">{org.stats.pending} pending</span></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
