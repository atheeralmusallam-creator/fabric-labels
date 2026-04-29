// src/components/annotators/ImageClassificationRenderer.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageClassificationConfig, ImageClassificationResult, ImageTaskData } from "@/types";

interface Props {
  data: ImageTaskData;
  config: ImageClassificationConfig;
  result: ImageClassificationResult | null;
  onChange: (r: ImageClassificationResult) => void;
}

export function ImageClassificationRenderer({ data, config, result, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(result?.labels ?? []);

  useEffect(() => {
    if (result?.labels) setSelected(result.labels);
  }, [result]);

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const label = config.labels.find((l) => l.hotkey === e.key);
      if (label) toggle(label.value);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [config.labels, selected]);

  const toggle = (value: string) => {
    let next: string[];
    if (config.allow_multiple) {
      next = selected.includes(value)
        ? selected.filter((l) => l !== value)
        : [...selected, value];
    } else {
      next = selected[0] === value ? [] : [value];
    }
    setSelected(next);
    onChange({ labels: next });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 fade-in">
      {config.instructions && (
        <div className="text-xs text-gray-500 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3">
          📋 {config.instructions}
        </div>
      )}

      {/* Image */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl overflow-hidden">
        <div className="relative w-full h-72 sm:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.caption ?? "Image to classify"}
            className="w-full h-full object-contain"
          />
        </div>
        {data.caption && (
          <div className="px-4 py-2 border-t border-[#2a2d3e]">
            <p className="text-xs text-gray-500">{data.caption}</p>
          </div>
        )}
      </div>

      {/* Labels */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
          {config.allow_multiple ? "Select all that apply" : "Select one label"}
        </p>
        <div className="flex flex-wrap gap-2">
          {config.labels.map((label) => {
            const isSelected = selected.includes(label.value);
            return (
              <button
                key={label.value}
                onClick={() => toggle(label.value)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all"
                style={{
                  borderColor: isSelected ? label.color : "#2a2d3e",
                  backgroundColor: isSelected ? `${label.color}22` : "#13151e",
                  color: isSelected ? label.color : "#8b90a0",
                  boxShadow: isSelected ? `0 0 12px ${label.color}33` : "none",
                }}
              >
                {isSelected && <span>✓</span>}
                <span className="capitalize">{label.value}</span>
                {label.hotkey && (
                  <kbd className="text-[10px] opacity-50 bg-black/30 px-1 rounded">{label.hotkey}</kbd>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
