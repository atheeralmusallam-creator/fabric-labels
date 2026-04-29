// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProjectType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getProjectTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    text_classification: "Text Classification",
    ner: "Named Entity Recognition",
    image_classification: "Image Classification",
    bounding_box: "Bounding Box",
    audio_transcription: "Audio Transcription",
    qa_review: "Q&A Review",
    safety: "Safety Review",
    freeform: "Free-form Notes",
  };
  return labels[type] ?? type;
}

export function getProjectTypeIcon(type: ProjectType): string {
  const icons: Record<ProjectType, string> = {
    text_classification: "🏷️",
    ner: "🔍",
    image_classification: "🖼️",
    bounding_box: "📦",
    audio_transcription: "🎙️",
    qa_review: "💬",
    safety: "🛡️",
    freeform: "📝",
  };
  return icons[type] ?? "📋";
}

export function getProjectTypeColor(type: ProjectType): string {
  const colors: Record<ProjectType, string> = {
    text_classification: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    ner: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    image_classification: "bg-green-500/20 text-green-400 border-green-500/30",
    bounding_box: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    audio_transcription: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    qa_review: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    safety: "bg-red-500/20 text-red-400 border-red-500/30",
    freeform: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return colors[type] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}
