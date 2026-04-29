// src/app/projects/[projectId]/import/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function ImportTasksPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [detectedOptions, setDetectedOptions] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState("");

  const handleImport = async () => {
    if (!file) {
      setMessage("Choose a CSV, Excel, or JSON file first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setDetectedOptions([]);
    setDetectedType("");

    const form = new FormData();
    form.append("file", file);
    form.append("replaceExisting", String(replaceExisting));

    try {
      const res = await fetch(`/api/projects/${projectId}/import`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setDetectedOptions(data.detectedOptions || []);
      setDetectedType(data.detectedType || "");
      setMessage(`Imported ${data.imported} tasks successfully.`);
    } catch (error: any) {
      setMessage(error?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0f14]">
      <header className="border-b border-[#2a2d3e] bg-[#13151e] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/projects/${projectId}/settings`} className="text-gray-500 hover:text-white transition-colors text-sm">
            ← Project Settings
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-white">Import Tasks</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Import Tasks</h1>
        <p className="text-sm text-gray-500 mb-8">
          Upload CSV, Excel, or JSON. The app will detect task fields and options automatically.
        </p>

        <div className="bg-[#13151e] border border-emerald-500/20 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Task file</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-emerald-500 file:to-teal-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:from-emerald-400 hover:file:to-teal-500"
            />
            <p className="text-xs text-gray-600 mt-2">
              Supported: .csv, .xlsx, .xls, .json
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg bg-[#0e0f14] border border-[#2a2d3e] p-4">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="mt-1 accent-emerald-500"
            />
            <span>
              <span className="block text-sm text-gray-200">Replace existing tasks</span>
              <span className="block text-xs text-gray-600 mt-1">
                This deletes current tasks and annotations in this project before importing the new file.
              </span>
            </span>
          </label>

          <div className="bg-[#0e0f14] border border-[#2a2d3e] rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-2">Auto-detection rules</h2>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Safety files are detected by columns: id, risk_category, language, prompt, answer.</li>
              <li>Safety options default to: Safe, Not Safe, tool_call.</li>
              <li>Other files can define options with an options column, or option_1 / option_2 / option_3 columns.</li>
              <li>Shortcut keys follow the option order: 1, 2, 3, etc.</li>
            </ul>
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              message.toLowerCase().includes("success")
                ? "bg-green-900/30 border border-green-700/50 text-green-300"
                : "bg-red-900/30 border border-red-700/50 text-red-300"
            }`}>
              {message}
              {detectedType && (
                <div className="mt-2 text-xs opacity-80">Detected type: {detectedType}</div>
              )}
              {detectedOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {detectedOptions.map((option, index) => (
                    <span key={`${option}-${index}`} className="rounded-full bg-[#1a1d27] border border-[#2a2d3e] px-2 py-1 text-xs text-gray-300">
                      {index + 1}. {option}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all"
            >
              {loading ? "Importing..." : "Import Tasks"}
            </button>

            <Link
              href={`/projects/${projectId}`}
              className="bg-[#1a1d27] hover:bg-[#21253a] text-gray-300 text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Open Project
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
