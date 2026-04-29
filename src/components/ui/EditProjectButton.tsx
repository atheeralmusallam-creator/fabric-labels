"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Annotator = { id: string; name?: string | null; email: string };
type RatingLabel = { value: string; hotkey: string };

export function EditProjectButton({
  projectId, initialName, initialDescription, initialPriority,
}: {
  projectId: string; initialName: string;
  initialDescription?: string | null; initialPriority?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"basic" | "config">("basic");

  // Basic
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [priority, setPriority] = useState(initialPriority ?? "");
  const [saving, setSaving] = useState(false);

  // Annotators
  const [annotators, setAnnotators] = useState<Annotator[]>([]);
  const [selectedAnnotatorIds, setSelectedAnnotatorIds] = useState<string[]>([]);
  const [loadingAnnotators, setLoadingAnnotators] = useState(false);
  const [annotatorSearch, setAnnotatorSearch] = useState("");

  // Config (for custom/any type)
  const [projectConfig, setProjectConfig] = useState<any>(null);
  const [customTypeName, setCustomTypeName] = useState("");
  const [customLabels, setCustomLabels] = useState<RatingLabel[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [displayFieldsInput, setDisplayFieldsInput] = useState("");

  const filteredAnnotators = annotators.filter(u => {
    const q = annotatorSearch.trim().toLowerCase();
    return !q || (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
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
        const users = await usersRes.json();
        const project = await projectRes.json();
        setAnnotators(users);
        setSelectedAnnotatorIds((project.assignments || []).map((a: any) => a.userId).filter(Boolean));

        // Load config
        const cfg = project.config || {};
        setProjectConfig(cfg);
        setCustomTypeName(cfg.custom_type_name || "");
        setCustomLabels(cfg.rating_labels || []);
        setCustomInstructions(cfg.instructions || "");
        setDisplayFieldsInput((cfg.display_fields || []).join(", "));
      } catch { alert("Failed to load project"); }
      finally { setLoadingAnnotators(false); }
    };
    load();
  }, [open, projectId]);

  const toggleAnnotator = (id: string) =>
    setSelectedAnnotatorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = async () => {
    if (!name.trim()) { alert("Project name is required"); return; }
    setSaving(true);

    const updatedConfig = {
      ...projectConfig,
      ...(customLabels.length > 0 ? { rating_labels: customLabels.filter(l => l.value.trim()) } : {}),
      ...(customTypeName ? { custom_type_name: customTypeName } : {}),
      ...(customInstructions ? { instructions: customInstructions } : {}),
      ...(displayFieldsInput.trim()
        ? { display_fields: displayFieldsInput.split(",").map((s: string) => s.trim()).filter(Boolean) }
        : { display_fields: [] }),
    };

    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, priority: priority || null, annotatorIds: selectedAnnotatorIds, config: updatedConfig }),
    });

    if (!res.ok) { alert("Failed to update project"); setSaving(false); return; }
    setOpen(false); setSaving(false); router.refresh();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="text-xs px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-indigo-500/50 rounded-lg transition-colors">
      Edit Project
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl border p-5 space-y-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Edit Project</h2>
          <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
          {(["basic", "config"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 text-xs py-1.5 rounded-md font-medium transition-all capitalize"
              style={{
                background: tab === t ? "var(--bg-secondary)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
              }}>
              {t === "basic" ? "Basic Info" : "Labels & Config"}
            </button>
          ))}
        </div>

        {/* Basic Tab */}
        {tab === "basic" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Project Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className={inputCls + " resize-none"} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">No priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>Annotators</label>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedAnnotatorIds.length} selected</span>
              </div>
              <input value={annotatorSearch} onChange={e => setAnnotatorSearch(e.target.value)}
                placeholder="Search..." className={inputCls + " mb-2"} style={inputStyle} />
              <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
                {loadingAnnotators ? (
                  <p className="text-xs p-2" style={{ color: "var(--text-muted)" }}>Loading...</p>
                ) : filteredAnnotators.map(user => (
                  <label key={user.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer"
                    style={{ background: selectedAnnotatorIds.includes(user.id) ? "var(--bg-hover)" : "transparent" }}>
                    <input type="checkbox" checked={selectedAnnotatorIds.includes(user.id)} onChange={() => toggleAnnotator(user.id)} className="accent-indigo-500" />
                    <div>
                      <div className="text-sm" style={{ color: "var(--text-primary)" }}>{user.name || user.email}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {tab === "config" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Task Type Name <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(shown to annotators)</span></label>
              <input value={customTypeName} onChange={e => setCustomTypeName(e.target.value)}
                placeholder="e.g. Safety Review, Relevance Check..." className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>Rating Labels</label>
              <div className="space-y-2">
                {customLabels.map((label, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs w-5 text-center font-mono" style={{ color: "var(--text-muted)" }}>{idx + 1}</span>
                    <input
                      value={label.value}
                      onChange={e => {
                        const updated = [...customLabels];
                        updated[idx] = { ...updated[idx], value: e.target.value };
                        setCustomLabels(updated);
                      }}
                      placeholder={`Label ${idx + 1}`}
                      className={inputCls} style={inputStyle}
                    />
                    {customLabels.length > 1 && (
                      <button onClick={() => setCustomLabels(customLabels.filter((_, i) => i !== idx))}
                        className="text-xs px-2 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              {customLabels.length < 8 && (
                <button onClick={() => setCustomLabels([...customLabels, { value: "", hotkey: String(customLabels.length + 1) }])}
                  className="mt-2 text-xs px-3 py-1.5 rounded-lg border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-primary)" }}>
                  + Add Label
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Instructions for Annotators</label>
              <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)}
                rows={3} placeholder="Describe how to evaluate each item..."
                className={inputCls + " resize-none"} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                Display Fields
                <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>(comma-separated column names to show)</span>
              </label>
              <input
                value={displayFieldsInput}
                onChange={e => setDisplayFieldsInput(e.target.value)}
                placeholder="e.g. question, answer, reference_text_citations"
                className={inputCls} style={inputStyle}
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                Leave empty to show all columns automatically
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)}
            className="text-sm px-4 py-2 rounded-lg" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg disabled:opacity-50 text-white font-medium"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
