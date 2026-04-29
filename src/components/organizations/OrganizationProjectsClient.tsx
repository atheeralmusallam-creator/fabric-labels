"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProjectTypeColor, getProjectTypeIcon, getProjectTypeLabel } from "@/lib/utils";
import { ProjectType } from "@/types";
import { DeleteOrganizationButton } from "@/components/ui/DeleteOrganizationButton";
import { DeleteProjectButton } from "@/components/ui/DeleteProjectButton";
import { EditProjectButton } from "@/components/ui/EditProjectButton";

type ProjectCard = {
  id: string;
  name: string;
  description?: string | null;
  priority?: string | null;
  type: string;
  stats: {
    total: number;
    submitted: number;
    skipped: number;
    pending: number;
    progress: number;
    assignedTotal?: number;
    completedAssigned?: number;
    totalTasks?: number;
  };
};

type Props = {
  organization: { id: string; name: string; description?: string | null };
  projects: ProjectCard[];
  canManage: boolean;
};

export function OrganizationProjectsClient({ organization, projects, canManage }: Props) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const filteredProjects = projects.filter((project) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      project.name.toLowerCase().includes(q) ||
      project.type.toLowerCase().includes(q) ||
      (project.description || "").toLowerCase().includes(q) ||
      (project.priority || "").toLowerCase().includes(q)
    );
  });

  const saveOrganization = async () => {
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/organizations/${organization.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) throw new Error();

      setEditing(false);
      router.refresh();
    } catch {
      setError("Failed to save organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3 max-w-xl">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500 rounded-lg px-4 py-2.5 text-white text-xl font-bold outline-none"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500 rounded-lg px-4 py-2.5 text-gray-200 text-sm outline-none resize-none"
              />

              {error && <div className="text-sm text-red-400">{error}</div>}

              <div className="flex gap-2">
                <button
                  onClick={saveOrganization}
                  disabled={saving}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600  hover:from-emerald-400 hover:to-teal-500  shadow-md shadow-emerald-500/20 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                <button
                  onClick={() => {
                    setEditing(false);
                    setName(organization.name);
                    setDescription(organization.description ?? "");
                    setError("");
                  }}
                  className="bg-[#1a1d27] hover:bg-[#21253a] text-gray-300 text-sm font-medium px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white truncate">{organization.name}</h1>

                {canManage && (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-gray-500 hover:text-white"
                    >
                      ✏️ Rename
                    </button>

                    <DeleteOrganizationButton organizationId={organization.id} />
                  </>
                )}
              </div>

              {organization.description && (
                <p className="text-gray-500 text-sm mt-1">{organization.description}</p>
              )}

              <p className="text-gray-500 text-sm mt-1">
                {filteredProjects.length}/{projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>

        {canManage && !editing && (
          <Link
            href={`/organizations/${organization.id}/new-project`}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600  hover:from-emerald-400 hover:to-teal-500  shadow-md shadow-emerald-500/20 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <span>+</span> New Project
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpenMenuId(null);
          }}
          placeholder="Search projects by name, type, description, or priority..."
          className="w-full sm:max-w-md bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none"
        />

        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-gray-500 hover:text-white"
          >
            Clear filter
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-[#2a2d3e] rounded-xl">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-gray-400 text-lg font-medium">No projects in this organization yet</p>

          {canManage && (
            <Link
              href={`/organizations/${organization.id}/new-project`}
              className="inline-block mt-6 bg-gradient-to-r from-emerald-500 to-teal-600  hover:from-emerald-400 hover:to-teal-500  shadow-md shadow-emerald-500/20 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              Create Project
            </Link>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#2a2d3e] rounded-xl">
          <p className="text-gray-400 text-lg font-medium">No projects match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const completedAssigned = project.stats.completedAssigned ?? project.stats.submitted;
            const assignedTotal = project.stats.assignedTotal ?? project.stats.total;
            const totalTasks = project.stats.totalTasks ?? project.stats.total;

            return (
              <div
                key={project.id}
                className={`relative group bg-[#13151e] border border-[#2a2d3e] hover:border-indigo-500/50 rounded-xl transition-all hover:bg-[#1a1d27] ${
                  openMenuId === project.id ? "z-50" : "z-0"
                }`}
              >
                <Link href={`/projects/${project.id}`} className="block p-5">
                  <div className="flex items-start justify-between mb-3 pr-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">
                        {getProjectTypeIcon(project.type as ProjectType)}
                      </span>
                      <h2 className="text-sm font-semibold text-white group-hover:text-indigo-300 truncate">
                        {project.name}
                      </h2>
                    </div>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getProjectTypeColor(
                        project.type as ProjectType
                      )}`}
                    >
                      {getProjectTypeLabel(project.type as ProjectType)}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {project.priority && (
                    <div className="inline-flex text-xs text-red-400 border border-red-500/40 bg-red-500/10 rounded px-2 py-1 mb-4">
                      Priority: {project.priority}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-gray-400">
                      {completedAssigned}/{assignedTotal} assigned · {totalTasks} total
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{project.stats.total} tasks</span>
                      <span>{project.stats.progress}%</span>
                    </div>

                    <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                        style={{ width: `${project.stats.progress}%` }}
                      />
                    </div>

                    <div className="flex gap-3 text-xs">
                      <span className="text-green-500">{project.stats.submitted} done</span>
                      <span className="text-yellow-500">{project.stats.skipped} skipped</span>
                      <span className="text-gray-600">{project.stats.pending} pending</span>
                    </div>
                  </div>
                </Link>

                {canManage && (
                  <div
                    className="absolute top-4 right-4 z-[9999]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="w-8 h-8 rounded-lg bg-[#1a1d27] border border-[#2a2d3e] text-gray-400 hover:text-white hover:border-indigo-500/50"
                    >
                      ...
                    </button>

                    {openMenuId === project.id && (
                      <div className="absolute right-0 mt-2 w-44 bg-[#13151e] border border-[#2a2d3e] rounded-lg shadow-2xl overflow-hidden z-[9999]">
                        <div className="px-2 py-2">
                          <EditProjectButton
                            projectId={project.id}
                            initialName={project.name}
                            initialDescription={project.description}
                            initialPriority={project.priority}
                          />
                        </div>

                        <a
                          href={`/api/projects/${project.id}/iaa`}
                          download
                          className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1d27] hover:text-white"
                        >
                          Export IAA
                        </a>

                        <DeleteProjectButton
                          projectId={project.id}
                          organizationId={organization.id}
                          variant="menu"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
