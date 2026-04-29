// src/types/index.ts

export type ProjectType =
  | "text_classification"
  | "ner"
  | "image_classification"
  | "bounding_box"
  | "audio_transcription"
  | "qa_review"
  | "safety"
  | "freeform";

export type TaskStatus = "PENDING" | "SUBMITTED" | "SKIPPED";
export type AnnotationStatus = "DRAFT" | "SUBMITTED";

export interface LabelConfig {
  value: string;
  color: string;
  hotkey?: string;
}

// ─── Project Configs ───────────────────────────────────────────────────────

export interface TextClassificationConfig {
  labels: LabelConfig[];
  allow_multiple?: boolean;
  instructions?: string;
}

export interface NERConfig {
  labels: LabelConfig[];
  instructions?: string;
}

export interface ImageClassificationConfig {
  labels: LabelConfig[];
  allow_multiple?: boolean;
  instructions?: string;
}

export interface BoundingBoxConfig {
  labels: LabelConfig[];
  instructions?: string;
}

export interface AudioTranscriptionConfig {
  instructions?: string;
  show_timestamps?: boolean;
  languages?: string[];
}

export interface QAReviewConfig {
  rating_labels: LabelConfig[];
  require_correction?: boolean;
  instructions?: string;
}

export interface FreeformConfig {
  instructions?: string;
  min_length?: number;
  tags?: string[];
}

export type ProjectConfig =
  | TextClassificationConfig
  | NERConfig
  | ImageClassificationConfig
  | BoundingBoxConfig
  | AudioTranscriptionConfig
  | QAReviewConfig
  | FreeformConfig;

// ─── Task Data ─────────────────────────────────────────────────────────────

export interface TextTaskData {
  text: string;
}

export interface ImageTaskData {
  imageUrl: string;
  caption?: string;
}

export interface AudioTaskData {
  audioUrl: string;
  duration?: number;
  description?: string;
}

export interface QATaskData {
  question: string;
  ai_answer: string;
  context?: string;
}

export interface FreeformTaskData {
  title: string;
  content: string;
}

export type TaskData =
  | TextTaskData
  | ImageTaskData
  | AudioTaskData
  | QATaskData
  | FreeformTaskData;

// ─── Annotation Results ────────────────────────────────────────────────────

export interface TextClassificationResult {
  labels: string[];
}

export interface NERSpan {
  id: string;
  start: number;
  end: number;
  text: string;
  label: string;
}

export interface NERResult {
  spans: NERSpan[];
}

export interface ImageClassificationResult {
  labels: string[];
}

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface BoundingBoxResult {
  boxes: BoundingBox[];
}

export interface AudioTranscriptionResult {
  transcript: string;
  language?: string;
}

export interface QAReviewResult {
  rating: string;
  correction?: string;
}

export interface FreeformResult {
  notes: string;
  tags?: string[];
}

export type AnnotationResult =
  | TextClassificationResult
  | NERResult
  | ImageClassificationResult
  | BoundingBoxResult
  | AudioTranscriptionResult
  | QAReviewResult
  | FreeformResult;

// ─── API Response Types ────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  organizationId?: string | null;
  organization?: Organization | null;
  name: string;
  description?: string | null;
  type: ProjectType;
  config: ProjectConfig;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  projectId: string;
  data: TaskData;
  status: TaskStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  annotations?: Annotation[];
  assignments?: TaskAssignment[];
}

export interface Annotation {
  id: string;
  taskId: string;
  userId?: string | null;
  result: AnnotationResult;
  notes?: string | null;
  status?: AnnotationStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name?: string | null; email: string };
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  createdAt: string;
  user?: { id: string; name?: string | null; email: string };
}

export interface ProjectWithStats extends Project {
  tasks: Task[];
  stats: {
    total: number;
    pending: number;
    submitted: number;
    skipped: number;
    progress: number;
  };
}
