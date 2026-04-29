// src/app/organizations/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error("Failed to create organization");
      const org = await res.json();
      router.push(`/organizations/${org.id}`);
    } catch {
      setError("Failed to create organization. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0f14]">
      <header className="border-b border-[#2a2d3e] bg-[#13151e] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors text-sm">← Organizations</Link>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-white">New Organization</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">Create New Organization</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ALLAM"
              className="w-full bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-colors resize-none"
            />
          </div>

          {error && <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
              {loading ? "Creating..." : "Create Organization"}
            </button>
            <Link href="/dashboard" className="bg-[#1a1d27] hover:bg-[#21253a] text-gray-300 text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">Cancel</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
