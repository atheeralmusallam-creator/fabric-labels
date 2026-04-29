// src/components/annotators/NERRenderer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { NERConfig, NERResult, NERSpan, TextTaskData } from "@/types";

interface Props {
  data: TextTaskData;
  config: NERConfig;
  result: NERResult | null;
  onChange: (r: NERResult) => void;
}

let spanIdCounter = 1;

export function NERRenderer({ data, config, result, onChange }: Props) {
  const [spans, setSpans] = useState<NERSpan[]>(result?.spans ?? []);
  const [activeLabel, setActiveLabel] = useState(config.labels[0]?.value ?? "");
  const textRef = useRef<HTMLDivElement>(null);

  // Sync external result changes
  useEffect(() => {
    if (result?.spans) setSpans(result.spans);
  }, [result]);

  useEffect(() => {
    if (spans.length > 0) onChange({ spans });
  }, [spans]);

  // Hotkeys for label selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const label = config.labels.find((l) => l.hotkey === e.key);
      if (label) setActiveLabel(label.value);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [config.labels]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) return;
    const range = selection.getRangeAt(0);

    // Make sure selection is inside our text div
    if (!textRef.current.contains(range.commonAncestorContainer)) return;

    const text = data.text;
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(textRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    const end = start + selectedText.length;

    // Remove overlapping spans
    const newSpan: NERSpan = {
      id: `span_${spanIdCounter++}`,
      start,
      end,
      text: selectedText,
      label: activeLabel,
    };

    setSpans((prev) => {
      const filtered = prev.filter((s) => !(s.start < end && s.end > start));
      return [...filtered, newSpan].sort((a, b) => a.start - b.start);
    });

    selection.removeAllRanges();
  };

  const removeSpan = (id: string) => {
    setSpans((prev) => prev.filter((s) => s.id !== id));
  };

  const getLabelColor = (value: string) =>
    config.labels.find((l) => l.value === value)?.color ?? "#6366f1";

  // Build highlighted text nodes
  const renderText = () => {
    const text = data.text;
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    const nodes: React.ReactNode[] = [];
    let cursor = 0;

    for (const span of sorted) {
      if (span.start > cursor) {
        nodes.push(<span key={`text_${cursor}`}>{text.slice(cursor, span.start)}</span>);
      }
      const color = getLabelColor(span.label);
      nodes.push(
        <mark
          key={span.id}
          className="ner-span"
          style={{ backgroundColor: `${color}33`, borderBottom: `2px solid ${color}` }}
          onClick={() => removeSpan(span.id)}
          title="Click to remove"
        >
          {text.slice(span.start, span.end)}
          <span className="ner-label-tag" style={{ backgroundColor: color, color: "#fff" }}>
            {span.label}
          </span>
        </mark>
      );
      cursor = span.end;
    }

    if (cursor < text.length) {
      nodes.push(<span key={`text_end`}>{text.slice(cursor)}</span>);
    }

    return nodes;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 fade-in">
      {config.instructions && (
        <div className="text-xs text-gray-500 bg-[#1a1d27] border border-[#2a2d3e] rounded-lg px-4 py-3">
          📋 {config.instructions}
        </div>
      )}

      {/* Label selector */}
      <div className="flex flex-wrap gap-2">
        {config.labels.map((label) => (
          <button
            key={label.value}
            onClick={() => setActiveLabel(label.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
            style={{
              borderColor: activeLabel === label.value ? label.color : "#2a2d3e",
              backgroundColor: activeLabel === label.value ? `${label.color}22` : "#13151e",
              color: activeLabel === label.value ? label.color : "#8b90a0",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.value}
            {label.hotkey && (
              <kbd className="text-[10px] opacity-50 bg-black/30 px-1 rounded">{label.hotkey}</kbd>
            )}
          </button>
        ))}
      </div>

      {/* Text area */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-5">
        <p className="text-xs text-gray-600 mb-3">
          Select text to label · Click a label to remove it
        </p>
        <div
          ref={textRef}
          onMouseUp={handleMouseUp}
          className="ner-text cursor-text select-text text-gray-200"
          style={{ userSelect: "text" }}
        >
          {renderText()}
        </div>
      </div>

      {/* Span list */}
      {spans.length > 0 && (
        <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-3 uppercase tracking-wide">Labeled Spans ({spans.length})</p>
          <div className="space-y-1.5">
            {spans.map((span) => {
              const color = getLabelColor(span.label);
              return (
                <div
                  key={span.id}
                  className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: `${color}11`, border: `1px solid ${color}33` }}
                >
                  <span style={{ color }}>
                    <span className="font-medium">[{span.label}]</span>{" "}
                    <span className="text-gray-400">&quot;{span.text}&quot;</span>
                  </span>
                  <button
                    onClick={() => removeSpan(span.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors ml-2"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
