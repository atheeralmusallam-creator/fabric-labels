// src/components/annotators/FreeformRenderer.tsx
"use client";

import { useEffect, useState } from "react";
import { FreeformConfig, FreeformResult, FreeformTaskData } from "@/types";

interface Props {
  data: FreeformTaskData;
  config: FreeformConfig;
  result: FreeformResult | null;
  onChange: (r: FreeformResult) => void;
}

export function FreeformRenderer({ data, config, result, onChange }: Props) {
  const [notes, setNotes] = useState(result?.notes ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(result?.tags ?? []);

  useEffect(() => {
    if (result) {
      setNotes(result.notes ?? "");
      setSelectedTags(result.tags ?? []);
    }
  }, [result]);

  const handleNotesChange = (v: string) => {
    setNotes(v);
    onChange({ notes: v, tags: selectedTags });
  };

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(next);
    onChange({ notes, tags: next });
  };

  const isValid = notes.length >= (config.min_length ?? 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5 fade-in">
      {config.instructions && (
        <div className="text-xs text-gray-500 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3">
          📋 {config.instructions}
        </div>
      )}

      {/* Content to review */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-5">
        <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">{data.title}</p>
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{data.content}</p>
      </div>

      {/* Tags */}
      {config.tags && config.tags.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {config.tags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-[#2a2d3e] bg-[#13151e] text-gray-500 hover:border-[#3a3d4e] hover:text-gray-300"
                  }`}
                >
                  {isSelected && "# "}{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes textarea */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">
          Your Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Write your review, feedback, or notes here..."
          rows={8}
          className="w-full bg-[#13151e] border border-[#2a2d3e] focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-700 outline-none transition-colors resize-none"
        />
        <div className="flex justify-between mt-1">
          <span className={`text-xs ${!isValid ? "text-yellow-600" : "text-gray-700"}`}>
            {config.min_length
              ? `${notes.length} / ${config.min_length} min characters`
              : `${notes.length} characters`}
          </span>
          {!isValid && config.min_length && (
            <span className="text-xs text-yellow-600">
              {config.min_length - notes.length} more characters needed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
