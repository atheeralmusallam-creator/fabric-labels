// src/components/annotators/TextClassificationRenderer.tsx
"use client";

import { useEffect } from "react";
import { TextClassificationConfig, TextClassificationResult, TextTaskData } from "@/types";

interface Props {
  data: TextTaskData;
  config: TextClassificationConfig;
  result: TextClassificationResult | null;
  onChange: (r: TextClassificationResult) => void;
}

export function TextClassificationRenderer({ data, config, result, onChange }: Props) {
  const selected = result?.labels ?? [];

  const toggle = (value: string) => {
    if (config.allow_multiple) {
      const next = selected.includes(value)
        ? selected.filter((l) => l !== value)
        : [...selected, value];
      onChange({ labels: next });
    } else {
      onChange({ labels: selected[0] === value ? [] : [value] });
    }
  };

  // Hotkey support
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      {config.instructions && (
        <div className="text-xs text-gray-500 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3">
          📋 {config.instructions}
        </div>
      )}

      {/* Text to classify */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-5">
        <p className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wide">Text</p>
        <p className="text-base text-gray-100 leading-relaxed">{data.text}</p>
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
                  <kbd className="text-[10px] opacity-50 bg-black/30 px-1 rounded">
                    {label.hotkey}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
