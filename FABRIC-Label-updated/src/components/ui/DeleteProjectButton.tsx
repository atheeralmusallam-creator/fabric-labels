"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({
  projectId,
  organizationId,
  variant = "default",
}: {
  projectId: string;
  organizationId?: string;
  variant?: "default" | "menu";
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [input, setInput] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    if (input !== "DELETE") {
      alert("Type DELETE to confirm");
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      router.push(organizationId ? `/organizations/${organizationId}` : "/dashboard");
      router.refresh();
    } catch {
      alert("Failed to delete project");
      setDeleting(false);
      setConfirming(false);
      setInput("");
    }
  };

  if (confirming) {
    return (
      <div className="p-3 space-y-2">
        <div className="text-xs text-red-400">
          Type <b>DELETE</b> to confirm
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="DELETE"
          className="w-full text-xs px-2 py-1 bg-[#0e0f14] border border-[#2a2d3e] rounded text-white outline-none"
        />

        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

          <button
            onClick={() => {
              setConfirming(false);
              setInput("");
            }}
            className="text-xs px-3 py-1.5 bg-[#1a1d27] border border-[#2a2d3e] text-gray-400 hover:text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300"
      >
        Delete Project
      </button>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs px-4 py-2 border border-red-900/60 text-red-500 hover:bg-red-900/20 hover:border-red-700 rounded-lg"
    >
      Delete Project
    </button>
  );
}
