"use client";

import { Project, Task, AnnotationResult, ProjectType } from "@/types";
import { TextClassificationRenderer } from "./TextClassificationRenderer";
import { NERRenderer } from "./NERRenderer";
import { ImageClassificationRenderer } from "./ImageClassificationRenderer";
import { BoundingBoxRenderer } from "./BoundingBoxRenderer";
import { AudioTranscriptionRenderer } from "./AudioTranscriptionRenderer";
import { QAReviewRenderer } from "./QAReviewRenderer";
import { FreeformRenderer } from "./FreeformRenderer";
import { PairwiseReviewRenderer } from "./PairwiseReviewRenderer"; // 🔥 الجديد

interface Props {
  project: Project;
  task: Task;
  result: AnnotationResult | null;
  onChange: (result: AnnotationResult) => void;
}

export function RendererRouter({ project, task, result, onChange }: Props) {
  const type = project.type as string;
  const config = project.config as any;
  const taskAny = task as any;

  const taskAnnotators =
    Array.isArray(taskAny.assignments) && taskAny.assignments.length > 0
      ? taskAny.assignments
          .map((a: any) => a.user?.name || a.user?.email)
          .filter(Boolean)
      : Array.isArray((project as any).assignments)
      ? (project as any).assignments
          .map((a: any) => a.user?.name || a.user?.email)
          .filter(Boolean)
      : [];

  const data = { ...(task.data as any), annotators: taskAnnotators };

  switch (type) {
    case "pairwise_review": // 🔥 النوع الجديد
      return (
        <PairwiseReviewRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "text_classification":
      return (
        <TextClassificationRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "ner":
      return (
        <NERRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "image_classification":
      return (
        <ImageClassificationRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "bounding_box":
      return (
        <BoundingBoxRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "audio_transcription":
      return (
        <AudioTranscriptionRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "qa_review":
    case "safety":
      return (
        <QAReviewRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    case "freeform":
      return (
        <FreeformRenderer
          data={data}
          config={config}
          result={result as any}
          onChange={onChange}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center h-32 text-gray-600">
          Unknown annotation type:{" "}
          <code className="ml-2 text-red-400">{type}</code>
        </div>
      );
  }
}
