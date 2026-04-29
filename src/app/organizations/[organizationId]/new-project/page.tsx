"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectType } from "@/types";
import { getProjectTypeLabel, getProjectTypeIcon } from "@/lib/utils";

type ProjectTypeWithPreference = ProjectType | "pairwise_review";

const PROJECT_TYPES: ProjectTypeWithPreference[] = [
  "text_classification",
  "ner",
  "image_classification",
  "bounding_box",
  "audio_transcription",
  "qa_review",
  "safety",
  "pairwise_review",
  "freeform",
];

const DEFAULT_CONFIGS: Record<ProjectTypeWithPreference, object> = {
  text_classification: {
    labels: [
      { value: "positive", color: "#22c55e", hotkey: "1" },
      { value: "negative", color: "#ef4444", hotkey: "2" },
      { value: "neutral", color: "#f59e0b", hotkey: "3" },
    ],
    allow_multiple: false,
    instructions: "Select the label that best fits the text.",
  },
  ner: {
    labels: [
      { value: "PERSON", color: "#3b82f6", hotkey: "1" },
      { value: "ORG", color: "#f59e0b", hotkey: "2" },
      { value: "LOCATION", color: "#22c55e", hotkey: "3" },
    ],
    instructions: "Select text spans and assign an entity label.",
  },
  image_classification: {
    labels: [
      { value: "cat", color: "#f59e0b", hotkey: "1" },
      { value: "dog", color: "#3b82f6", hotkey: "2" },
      { value: "other", color: "#8b5cf6", hotkey: "3" },
    ],
    allow_multiple: false,
    instructions: "Select the label that best describes the image.",
  },
  bounding_box: {
    labels: [
      { value: "object", color: "#ef4444", hotkey: "1" },
      { value: "person", color: "#3b82f6", hotkey: "2" },
    ],
    instructions: "Draw bounding boxes around objects.",
  },
  audio_transcription: {
    instructions: "Listen and transcribe the audio.",
  },
  qa_review: {
    rating_labels: [
      { value: "correct", color: "#22c55e", hotkey: "1" },
      { value: "partial", color: "#f59e0b", hotkey: "2" },
      { value: "incorrect", color: "#ef4444", hotkey: "3" },
    ],
    instructions: "Rate the AI-generated answer.",
  },
  safety: {
    rating_labels: [
      { value: "Safe", hotkey: "1" },
      { value: "Not Safe", hotkey: "2" },
      { value: "tool_call", hotkey: "3" },
    ],
    instructions: "Review the answer for safety.",
  },
  pairwise_review: {
    rating_labels: [
      { value: "A is better than B", hotkey: "1" },
      { value: "B is better than A", hotkey: "2" },
      { value: "Both are equal", hotkey: "3" },
      { value: "Need expert", hotkey: "4" },
      { value: "Prompt has issue", hotkey: "5" },
    ],
    instructions: "Compare responses.",
  },
  freeform: {
    instructions: "Write notes.",
  },
};

function projectTypeIcon(type: ProjectTypeWithPreference) {
  if (type === "pairwise_review") return "💎";
  return getProjectTypeIcon(type as ProjectType);
}

function projectTypeLabel(type: ProjectTypeWithPreference) {
  if (type === "pairwise_review") return "Preference";
  return getProjectTypeLabel(type as ProjectType);
}

export default function NewProjectPage({ params }: { params: { organizationId: string } }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState<ProjectTypeWithPreference>("safety");
  const [adjudicationEnabled, setAdjudicationEnabled] = useState(false); // 🔥 الجديد
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          priority: priority || null,
          type,
          config: {
            ...DEFAULT_CONFIGS[type],
            adjudication_enabled: adjudicationEnabled, // 🔥 المهم
          },
          organizationId: params.organizationId,
        }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      const project = await res.json();
      router.push(`/projects/${project.id}/settings`);
    } catch {
      setError("Failed to create project.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0f14]">
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-white">Create Project</h1>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className="w-full p-3 bg-[#13151e] border border-[#2a2d3e] rounded-lg text-white"
        />

        <div className="grid grid-cols-2 gap-2">
          {PROJECT_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}>
              {projectTypeLabel(t)}
            </button>
          ))}
        </div>

        {/* 🔥 checkbox الجديد */}
        <label className="flex items-start gap-3 rounded-lg bg-[#13151e] border border-[#2a2d3e] p-4">
          <input
            type="checkbox"
            checked={adjudicationEnabled}
            onChange={(e) => setAdjudicationEnabled(e.target.checked)}
            className="mt-1 accent-emerald-500"
          />
          <span>
            <div className="text-white text-sm">
              Enable Adjudication (Tie-breaker)
            </div>
            <div className="text-gray-500 text-xs">
              Assign task to 4th annotator if disagreement occurs
            </div>
          </span>
        </label>

        <button onClick={handleSubmit} className="bg-emerald-500 px-4 py-2 rounded">
          Create
        </button>
      </main>
    </div>
  );
}
