"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ProjectType } from "@/types";
import { getProjectTypeLabel, getProjectTypeIcon } from "@/lib/utils";

type ProjectTypeWithPreference = ProjectType | "pairwise_review" | "custom";

const PROJECT_TYPES: ProjectTypeWithPreference[] = [
  "safety","qa_review","pairwise_review","text_classification",
  "ner","image_classification","bounding_box","audio_transcription","freeform","custom",
];

const DEFAULT_CONFIGS: Record<ProjectTypeWithPreference, object> = {
  text_classification: { labels:[{value:"positive",color:"#22c55e",hotkey:"1"},{value:"negative",color:"#ef4444",hotkey:"2"},{value:"neutral",color:"#f59e0b",hotkey:"3"}], allow_multiple:false, instructions:"Select the label that best fits the text." },
  ner: { labels:[{value:"PERSON",color:"#3b82f6",hotkey:"1"},{value:"ORG",color:"#f59e0b",hotkey:"2"},{value:"LOCATION",color:"#22c55e",hotkey:"3"}], instructions:"Select text spans and assign an entity label." },
  image_classification: { labels:[{value:"cat",color:"#f59e0b",hotkey:"1"},{value:"dog",color:"#3b82f6",hotkey:"2"},{value:"other",color:"#8b5cf6",hotkey:"3"}], allow_multiple:false, instructions:"Select the label that best describes the image." },
  bounding_box: { labels:[{value:"object",color:"#ef4444",hotkey:"1"},{value:"person",color:"#3b82f6",hotkey:"2"}], instructions:"Draw bounding boxes around objects." },
  audio_transcription: { instructions:"Listen and transcribe the audio." },
  qa_review: { rating_labels:[{value:"correct",color:"#22c55e",hotkey:"1"},{value:"partial",color:"#f59e0b",hotkey:"2"},{value:"incorrect",color:"#ef4444",hotkey:"3"}], instructions:"Rate the AI-generated answer." },
  safety: { rating_labels:[{value:"Safe",hotkey:"1"},{value:"Not Safe",hotkey:"2"},{value:"tool_call",hotkey:"3"}], instructions:"Review the answer for safety." },
  pairwise_review: { rating_labels:[{value:"A is better than B",hotkey:"1"},{value:"B is better than A",hotkey:"2"},{value:"Both are equal",hotkey:"3"},{value:"Need expert",hotkey:"4"},{value:"Prompt has issue",hotkey:"5"}], instructions:"Compare responses." },
  freeform: { instructions:"Write notes." },
  custom: { rating_labels:[{value:"Option A",hotkey:"1"},{value:"Option B",hotkey:"2"}], instructions:"Annotate the data." },
} as Record<ProjectTypeWithPreference, object>;


const TYPE_ICONS: Record<ProjectTypeWithPreference, string> = {
  safety:"🛡️", qa_review:"✅", pairwise_review:"⚖️", text_classification:"🏷️",
  ner:"🔍", image_classification:"🖼️", bounding_box:"📦", audio_transcription:"🎵", freeform:"✏️",
  custom:"⚙️",
};

const TYPE_DESC: Record<ProjectTypeWithPreference, string> = {
  safety:"Safe / Not Safe", qa_review:"Rate answers", pairwise_review:"Compare responses",
  text_classification:"Classify text", ner:"Named entities", image_classification:"Classify images",
  bounding_box:"Draw boxes", audio_transcription:"Transcribe audio", freeform:"Free notes",
  custom:"Custom labels",
} as Record<ProjectTypeWithPreference, string>;


const STEPS = [
  { id: 1, label: "Basic Info",    desc: "Name & priority" },
  { id: 2, label: "Project Type",  desc: "Choose task type" },
  { id: 3, label: "Settings",      desc: "Options & confirm" },
];

function projectTypeLabel(t: ProjectTypeWithPreference) {
  if (t === "pairwise_review") return "Preference";
  return getProjectTypeLabel(t as ProjectType);
}

export default function NewProjectPage({ params }: { params: { organizationId: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority]     = useState("");

  // Step 2
  const [type, setType]             = useState<ProjectTypeWithPreference | null>(null);

  // Step 3
  const [adjudicationEnabled, setAdjudicationEnabled] = useState(false);

  // Custom type builder
  const [customTypeName, setCustomTypeName] = useState("");
  const [customLabels, setCustomLabels] = useState([
    { value: "Option A", hotkey: "1" },
    { value: "Option B", hotkey: "2" },
  ]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [displayFieldsInput, setDisplayFieldsInput] = useState("");

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  // ── derived completion state ──────────────────────────────
  const step1Done = name.trim().length > 0;
  const step2Done = type !== null;
  const step3Done = step1Done && step2Done; // always completable once here

  function stepStatus(s: number) {
    if (s === 1) return step1Done ? "done" : step > 1 ? "error" : "active";
    if (s === 2) return step2Done ? "done" : step > 2 ? "error" : step === 2 ? "active" : "pending";
    return step3Done ? "active" : "pending";
  }

  const handleNext = () => {
    if (step === 1 && !step1Done) { setError("Project name is required"); return; }
    if (step === 2 && !step2Done) { setError("Please select a project type"); return; }
    setError("");
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !type) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description,
          priority: priority || null,
          type: type === "custom" ? "safety" : type, // custom uses safety renderer
          config: type === "custom"
            ? {
                custom_type_name: customTypeName || "Custom",
                rating_labels: customLabels.filter(l => l.value.trim()),
                instructions: customInstructions || "Annotate the data.",
                adjudication_enabled: adjudicationEnabled,
              }
            : { ...DEFAULT_CONFIGS[type!], adjudication_enabled: adjudicationEnabled },
          organizationId: params.organizationId,
        }),
      });
      if (!res.ok) throw new Error();
      const project = await res.json();
      router.push(`/projects/${project.id}/settings`);
    } catch {
      setError("Failed to create project."); setLoading(false);
    }
  };

  // ── colors ───────────────────────────────────────────────
  const statusColor = (s: string) =>
    s === "done"    ? { bg: "bg-emerald-500",  border: "border-emerald-500",  text: "text-emerald-500"  } :
    s === "error"   ? { bg: "bg-red-500",      border: "border-red-500",      text: "text-red-500"      } :
    s === "active"  ? { bg: "bg-indigo-500",   border: "border-indigo-500",   text: "text-indigo-500"   } :
                      { bg: "bg-transparent",  border: "border-[var(--border)]", text: "text-[var(--text-muted)]" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>

      {/* Header */}
      <header className="border-b px-6 py-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/dashboard" style={{ color: "var(--text-secondary)" }} className="hover:underline">Projects</Link>
            <span>/</span>
            <Link href={`/organizations/${params.organizationId}`} style={{ color: "var(--text-secondary)" }} className="hover:underline">Organization</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)" }}>New Project</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Step indicator ── */}
        <div className="flex items-start gap-0 mb-10">
          {STEPS.map((s, i) => {
            const st = stepStatus(s.id);
            const col = statusColor(st);
            const isActive = step === s.id;
            return (
              <div key={s.id} className="flex items-start flex-1">
                {/* Step node */}
                <div className="flex flex-col items-center">
                  {/* circle */}
                  <button
                    onClick={() => { if (s.id < step) setStep(s.id); }}
                    disabled={s.id >= step}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${col.border} ${isActive ? col.bg + " text-white" : st === "done" ? col.bg + " text-white" : "bg-transparent " + col.text}`}
                  >
                    {st === "done" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : st === "error" ? "!" : s.id}
                  </button>
                  {/* label */}
                  <div className="mt-2 text-center w-20">
                    <div className={`text-xs font-semibold ${isActive ? "text-[var(--text-primary)]" : st === "done" ? "text-emerald-500" : "text-[var(--text-muted)]"}`}>
                      {s.label}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.desc}</div>
                  </div>
                </div>
                {/* connector line (not after last) */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-4 mx-1 transition-all ${stepStatus(s.id) === "done" ? "bg-emerald-500" : "bg-[var(--border)]"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step panels ── */}
        <div className="rounded-xl border p-6 space-y-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Basic Information</h2>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError(""); }}
                  placeholder="e.g. Safety Review Q2"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{ background: "var(--bg-surface)", borderColor: name ? "var(--brand)" : "var(--border)", color: "var(--text-primary)" }}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = name ? "var(--brand)" : "var(--border)"}
                />
                {name && (
                  <p className="text-[11px] mt-1 text-emerald-500 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Looks good
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none resize-none transition-all"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Priority</label>
                <div className="flex gap-2">
                  {["Low","Medium","High","Critical"].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(priority === p ? "" : p)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                      style={{
                        borderColor: priority === p ? "var(--brand)" : "var(--border)",
                        background: priority === p ? "var(--brand)" : "var(--bg-surface)",
                        color: priority === p ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Project Type</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select the annotation task type for this project.</p>

              <div className="grid grid-cols-3 gap-2">
                {PROJECT_TYPES.map(t => {
                  const selected = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => { setType(t); setError(""); }}
                      className="flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border text-center transition-all"
                      style={{
                        borderColor: selected ? "var(--brand)" : "var(--border)",
                        background: selected ? "color-mix(in srgb, var(--brand) 12%, var(--bg-surface))" : "var(--bg-surface)",
                        outline: selected ? "2px solid var(--brand)" : "none",
                        outlineOffset: "2px",
                      }}
                    >
                      <span className="text-2xl">{TYPE_ICONS[t]}</span>
                      <span className="text-xs font-semibold" style={{ color: selected ? "var(--brand)" : "var(--text-primary)" }}>
                        {projectTypeLabel(t)}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{TYPE_DESC[t]}</span>
                      {selected && (
                        <span className="mt-1 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">Selected ✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Review & Settings</h2>

              {/* Summary */}
              <div className="rounded-lg border p-4 space-y-2" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Project Name</span>
                  <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    {name}
                  </span>
                </div>
                {priority && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Priority</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">{priority}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Type</span>
                  <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    {type ? TYPE_ICONS[type] + " " + projectTypeLabel(type) : "—"}
                  </span>
                </div>
              </div>

              {/* Custom type builder */}
              {type === "custom" && (
                <div className="rounded-xl border p-4 space-y-4" style={{ background: "var(--bg-surface)", borderColor: "var(--brand)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>⚙️ Custom Task Type</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "var(--brand)" }}>New</span>
                  </div>

                  {/* Task type name */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Task Type Name</label>
                    <input
                      value={customTypeName}
                      onChange={e => setCustomTypeName(e.target.value)}
                      placeholder="e.g. Relevance Review, Factuality Check..."
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Labels builder */}
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                      Rating Labels
                      <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>(annotators will pick one)</span>
                    </label>
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
                            className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none"
                            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                          />
                          {customLabels.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setCustomLabels(customLabels.filter((_, i) => i !== idx))}
                              className="text-xs px-2 py-1.5 rounded-lg"
                              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                            >✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    {customLabels.length < 8 && (
                      <button
                        type="button"
                        onClick={() => setCustomLabels([...customLabels, { value: "", hotkey: String(customLabels.length + 1) }])}
                        className="mt-2 text-xs px-3 py-1.5 rounded-lg border transition-all"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-primary)" }}
                      >+ Add Label</button>
                    )}
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructions for Annotators</label>
                    <textarea
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      placeholder="Describe how annotators should evaluate each item..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Display fields */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Display Fields
                      <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>(comma-separated column names)</span>
                    </label>
                    <input
                      value={displayFieldsInput}
                      onChange={e => setDisplayFieldsInput(e.target.value)}
                      placeholder="e.g. question, answer, reference_text_citations"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Leave empty to show all columns automatically</p>
                  </div>
                </div>
              )}

              {/* Adjudication toggle */}
              <label
                className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all"
                style={{
                  borderColor: adjudicationEnabled ? "var(--brand)" : "var(--border)",
                  background: adjudicationEnabled ? "color-mix(in srgb, var(--brand) 8%, var(--bg-surface))" : "var(--bg-surface)",
                }}
              >
                <div className="mt-0.5">
                  <input
                    type="checkbox"
                    checked={adjudicationEnabled}
                    onChange={e => setAdjudicationEnabled(e.target.checked)}
                    className="accent-indigo-500 w-4 h-4"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    ⚡ Enable Auto-Adjudication
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Automatically assign a 4th annotator when 3 annotators disagree
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div>
              {step > 1 ? (
                <button
                  onClick={() => { setStep(s => s - 1); setError(""); }}
                  className="text-sm px-4 py-2 rounded-lg border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }}
                >
                  ← Back
                </button>
              ) : (
                <Link
                  href={`/organizations/${params.organizationId}`}
                  className="text-sm px-4 py-2 rounded-lg border transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }}
                >
                  Cancel
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Step {step} of {STEPS.length}</span>
              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className="text-sm px-5 py-2 rounded-lg font-medium transition-all text-white"
                  style={{ background: step1Done && step <= 1 || step2Done && step === 2 ? "var(--brand)" : "var(--border)" }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="text-sm px-5 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--brand)" }}
                >
                  {loading ? "Creating..." : "✓ Create Project"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
