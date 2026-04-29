// src/components/annotators/BoundingBoxRenderer.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BoundingBoxConfig, BoundingBoxResult, BoundingBox, ImageTaskData } from "@/types";

interface Props {
  data: ImageTaskData;
  config: BoundingBoxConfig;
  result: BoundingBoxResult | null;
  onChange: (r: BoundingBoxResult) => void;
}

let boxIdCounter = 1;

export function BoundingBoxRenderer({ data, config, result, onChange }: Props) {
  const [boxes, setBoxes] = useState<BoundingBox[]>(result?.boxes ?? []);
  const [activeLabel, setActiveLabel] = useState(config.labels[0]?.value ?? "");
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<Omit<BoundingBox, "id" | "label"> | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (result?.boxes) setBoxes(result.boxes);
  }, [result]);

  useEffect(() => {
    if (boxes.length > 0 || result?.boxes?.length === 0) {
      onChange({ boxes });
    }
  }, [boxes]);

  const getLabelColor = (value: string) =>
    config.labels.find((l) => l.value === value)?.color ?? "#6366f1";

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = imgSize;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    // Draw saved boxes
    for (const box of boxes) {
      const color = getLabelColor(box.label);
      ctx.strokeStyle = color;
      ctx.lineWidth = selectedBoxId === box.id ? 3 : 2;
      ctx.setLineDash([]);
      ctx.strokeRect(box.x * w, box.y * h, box.width * w, box.height * h);

      // Fill label bg
      ctx.fillStyle = `${color}33`;
      ctx.fillRect(box.x * w, box.y * h, box.width * w, box.height * h);

      // Label text
      const fontSize = Math.max(10, Math.min(14, w * 0.025));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = color;
      const padding = 3;
      const textX = box.x * w + padding;
      const textY = box.y * h - padding - 2;
      ctx.fillText(box.label, textX, Math.max(fontSize + padding, textY));
    }

    // Draw current in-progress box
    if (currentBox && drawing) {
      const color = getLabelColor(activeLabel);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(
        currentBox.x * w,
        currentBox.y * h,
        currentBox.width * w,
        currentBox.height * h
      );
      ctx.fillStyle = `${color}22`;
      ctx.fillRect(
        currentBox.x * w,
        currentBox.y * h,
        currentBox.width * w,
        currentBox.height * h
      );
    }
  }, [boxes, currentBox, drawing, activeLabel, imgSize, selectedBoxId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getRelPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imgSize.w / rect.width;
    const scaleY = imgSize.h / rect.height;
    return {
      x: ((e.clientX - rect.left) * scaleX) / imgSize.w,
      y: ((e.clientY - rect.top) * scaleY) / imgSize.h,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const pos = getRelPos(e);
    setDrawing(pos);
    setCurrentBox(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const pos = getRelPos(e);
    setCurrentBox({
      x: Math.min(drawing.x, pos.x),
      y: Math.min(drawing.y, pos.y),
      width: Math.abs(pos.x - drawing.x),
      height: Math.abs(pos.y - drawing.y),
    });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !currentBox) { setDrawing(null); return; }
    if (currentBox.width < 0.01 || currentBox.height < 0.01) {
      setDrawing(null);
      setCurrentBox(null);
      return;
    }
    const newBox: BoundingBox = {
      id: `box_${boxIdCounter++}`,
      label: activeLabel,
      ...currentBox,
    };
    setBoxes((prev) => [...prev, newBox]);
    setDrawing(null);
    setCurrentBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all"
            style={{
              borderColor: activeLabel === label.value ? label.color : "#2a2d3e",
              backgroundColor: activeLabel === label.value ? `${label.color}22` : "#13151e",
              color: activeLabel === label.value ? label.color : "#8b90a0",
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
            {label.value}
            {label.hotkey && (
              <kbd className="text-[10px] opacity-50 bg-black/30 px-1 rounded">{label.hotkey}</kbd>
            )}
          </button>
        ))}
        {boxes.length > 0 && (
          <button
            onClick={() => setBoxes([])}
            className="ml-auto px-3 py-1.5 text-xs text-red-500 border border-red-900/50 rounded-lg hover:bg-red-900/20 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl overflow-hidden" ref={containerRef}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={data.imageUrl}
            alt={data.caption ?? ""}
            className="w-full block"
            onLoad={(e) => {
              const img = e.currentTarget;
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            draggable={false}
            style={{ userSelect: "none", pointerEvents: "none" }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: "crosshair" }}
          />
        </div>
        {data.caption && (
          <div className="px-4 py-2 border-t border-[#2a2d3e] text-xs text-gray-500">
            {data.caption}
          </div>
        )}
      </div>

      {/* Box list */}
      {boxes.length > 0 && (
        <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-4">
          <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Boxes ({boxes.length})</p>
          <div className="space-y-1.5">
            {boxes.map((box, i) => {
              const color = getLabelColor(box.label);
              return (
                <div
                  key={box.id}
                  onClick={() => setSelectedBoxId(box.id === selectedBoxId ? null : box.id)}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    backgroundColor: selectedBoxId === box.id ? `${color}22` : "#0e0f14",
                    border: `1px solid ${selectedBoxId === box.id ? color : "#2a2d3e"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span style={{ color }}>{box.label}</span>
                    <span className="text-gray-600">
                      {Math.round(box.width * 100)}% × {Math.round(box.height * 100)}%
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBox(box.id); }}
                    className="text-gray-600 hover:text-red-400 transition-colors"
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
