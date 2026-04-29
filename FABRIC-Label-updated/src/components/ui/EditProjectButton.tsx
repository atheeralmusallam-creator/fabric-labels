"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Annotator = {
  id: string;
  name?: string | null;
  email: string;
};

export function EditProjectButton({
  projectId,
  initialName,
  initialDescription,
  initialPriority,
}: {
  projectId: string;
  initialName: string;
  initialDescription?: string | null;
  initialPriority?: string | null;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [priority, setPriority] = useState(initialPriority ?? "");
  const [saving, setSaving] = useState(false);

  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [selectedAnnotatorIds, setSelectedAnnotatorIds] = useState<string[]>([]);
  const [loadingAnnotators, setLoadingAnnotators] = useState(false);
  const [annotatorSearch, setAnnotatorSearch] = useState("");

  const filteredAnnotators = annotators.filter((user) => {
    const q = annotatorSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      (user.name || "").toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoadingAnnotators(true);

      try {
        const [usersRes, projectRes] = await Promise.all([
          fetch("/api/users?role=ANNOTATOR"),
          fetch(`/api/projects/${projectId}`),
        ]);

        if (!usersRes.ok || !projectRes.ok) throw new Error();

        const users = await usersRes.json();
        const project = await projectRes.json();

        setAnnotators(users);
        setSelectedAnnotatorIds(
          (project.assignments || [])
            .map((a: any) => a.userId)
            .filter(Boolean)
        );
      } catch {
        alert("Failed to load annotators");
      } finally {
        setLoadingAnnotators(false);
      }
    };

    load();
  }, [open, projectId]);

  const toggleAnnotator = (id: string) => {
    setSelectedAnnotatorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!name.trim()) {
      alert("Project name is required");
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        priority: priority || null,
        annotatorIds: selectedAnnotatorIds,
      }),
    });

    if (!res.ok) {
      alert("Failed to update project");
      setSaving(false);
      return;
    }

    setOpen(false);
    setSaving(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-4 py-2 border border-[#2a2d3e] text-gray-400 hover:text-white hover:border-indigo-500/50 rounded-lg transition-colors"
      >
        Edit Project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-[#13151e] border border-[#2a2d3e] rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Edit Project</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Project Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          >
            <option value="">No priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs text-gray-500">Annotators</label>
            <span className="text-xs text-gray-600">
              {selectedAnnotatorIds.length} selected
            </span>
          </div>

          <input
            value={annotatorSearch}
            onChange={(e) => setAnnotatorSearch(e.target.value)}
            placeholder="Search annotators by name or email..."
            className="w-full mb-2 bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />

          <div className="max-h-48 overflow-y-auto bg-[#0e0f14] border border-[#2a2d3e] rounded-lg p-2 space-y-1">
            {loadingAnnotators ? (
              <div className="text-xs text-gray-500 px-2 py-3">
                Loading annotators...
              </div>
            ) : annotators.length === 0 ? (
              <div className="text-xs text-gray-500 px-2 py-3">
                No annotators found
              </div>
            ) : filteredAnnotators.length === 0 ? (
              <div className="text-xs text-gray-500 px-2 py-3">
                No matching annotators
              </div>
            ) : (
              filteredAnnotators.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-[#1a1d27] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAnnotatorIds.includes(user.id)}
                    onChange={() => toggleAnnotator(user.id)}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {user.name || user.email}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="text-sm px-4 py-2 rounded-lg bg-[#1a1d27] text-gray-300 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
