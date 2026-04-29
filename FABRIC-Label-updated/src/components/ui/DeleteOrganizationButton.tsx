"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteOrganizationButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const ok = confirm(
      "Delete this organization? This will delete all projects inside it."
    );

    if (!ok) return;

    setLoading(true);

    const res = await fetch(`/api/organizations/${organizationId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete organization");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
    >
      {loading ? "Deleting..." : "Delete Organization"}
    </button>
  );
}
