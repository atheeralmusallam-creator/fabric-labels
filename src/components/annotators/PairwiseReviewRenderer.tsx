"use client";

import { useEffect } from "react";
import { AnnotationResult } from "@/types";

type Props = {
  data: any;
  config: any;
  result: AnnotationResult | null;
  onChange: (result: AnnotationResult) => void;
};

const OPTIONS = [
  { value: "A is better than B", hotkey: "1" },
  { value: "B is better than A", hotkey: "2" },
  { value: "Both are equal", hotkey: "3" },
  { value: "Need expert", hotkey: "4" },
  { value: "Prompt has issue", hotkey: "5" },
];

function TextBlock({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-4">
      <div className="text-xs font-semibold text-emerald-400 mb-2">
        {title}
      </div>
      <div className="task-text whitespace-pre-wrap">{value}</div>
    </div>
  );
}

export function PairwiseReviewRenderer({ data, result, onChange }: Props) {
  const current = (result as any) || {};

  const update = (patch: any) => {
    onChange({
      ...current,
      ...patch,
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      const option = OPTIONS.find((o) => o.hotkey === e.key);
      if (option) {
        e.preventDefault();
        update({ evaluation: option.value });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current]);

  const history =
    typeof data.history === "string" && data.history.trim().startsWith("[")
      ? data.history
      : data.history || "";

  return (
    <div className="space-y-5">
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-4">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {data.id && (
            <span>
              ID: <span className="text-gray-300">{data.id}</span>
            </span>
          )}
          {data.dataset && (
            <span>
              Dataset: <span className="text-gray-300">{data.dataset}</span>
            </span>
          )}
        </div>
      </div>

      <TextBlock title="History" value={history} />
      <TextBlock title="Prompt" value={data.prompt} />
      <TextBlock title="Golden Answer" value={data.golden_answer} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TextBlock title="LLM Response A" value={data.model_a} />
        <TextBlock title="LLM Response B" value={data.model_b} />
      </div>

      {/* 🔥 Preference بدل Evaluation */}
      <div className="bg-[#13151e] border border-[#2a2d3e] rounded-xl p-4">
        <div className="text-sm font-semibold text-emerald-400 mb-3 tracking-wide">
          Preference
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {OPTIONS.map((option) => {
            const active = current.evaluation === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ evaluation: option.value })}
                className={`text-left rounded-lg border px-4 py-3 text-sm transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-[#2a2d3e] bg-[#0e0f14] text-gray-300 hover:border-emerald-500/50"
                }`}
              >
                <span className="font-medium">{option.value}</span>
                <span className="ml-2 text-xs text-gray-500">
                  [{option.hotkey}]
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Comments - Response A
          </label>
          <textarea
            value={current.comments_response_a || ""}
            onChange={(e) =>
              update({ comments_response_a: e.target.value })
            }
            rows={4}
            className="w-full bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Comments - Response B
          </label>
          <textarea
            value={current.comments_response_b || ""}
            onChange={(e) =>
              update({ comments_response_b: e.target.value })
            }
            rows={4}
            className="w-full bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Comments - Question
          </label>
          <textarea
            value={current.comments_question || ""}
            onChange={(e) =>
              update({ comments_question: e.target.value })
            }
            rows={4}
            className="w-full bg-[#0e0f14] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
