// src/app/api/projects/[projectId]/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type Row = Record<string, any>;

const OPTION_COL_RE = /^(option|choice|label)[_\s-]*\d+$/i;
const SAFETY_OPTIONS = ["Safe", "Not Safe", "tool_call"];
const COLORS = ["#22c55e", "#ef4444", "#8b5cf6", "#f59e0b", "#3b82f6", "#14b8a6", "#e879f9", "#94a3b8", "#f97316"];

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function clean(value: any) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === ",") { row.push(cell); cell = ""; continue; }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; continue;
    }
    cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => clean(c)));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => normalizeKey(h));
  return nonEmpty.slice(1).map((values) => {
    const obj: Row = {};
    headers.forEach((h, i) => { obj[h] = clean(values[i]); });
    return obj;
  });
}

function parseOptionsValue(value: any): string[] {
  const raw = clean(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(clean).filter(Boolean);
  } catch {}
  return raw.split(/\s*[|;,\n]\s*/g).map(clean).filter(Boolean);
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function pick(row: Row, keys: string[]) {
  for (const key of keys) {
    const v = row[normalizeKey(key)];
    if (clean(v)) return clean(v);
  }
  return "";
}

function isSafetyFile(rows: Row[]) {
  if (!rows.length) return false;
  const keys = new Set(Object.keys(rows[0]));
  return keys.has("risk_category") && keys.has("prompt") && keys.has("answer");
}

function detectOptions(row: Row, isSafety: boolean, projectConfig: any): string[] {
  const fromOptionsColumn = parseOptionsValue(row.options ?? row.choices ?? row.labels ?? row.evaluation_options);
  if (fromOptionsColumn.length) return uniq(fromOptionsColumn);

  const optionColumns = Object.keys(row)
    .filter((key) => OPTION_COL_RE.test(key))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const fromOptionColumns = optionColumns.map((key) => row[key]).map(clean).filter(Boolean);
  if (fromOptionColumns.length) return uniq(fromOptionColumns);

  const fromLabelColumn = parseOptionsValue(row.label_options ?? row.rating_labels);
  if (fromLabelColumn.length) return uniq(fromLabelColumn);

  if (isSafety) return SAFETY_OPTIONS;

  const projectLabels = projectConfig?.rating_labels?.map((l: any) => l.value) ?? projectConfig?.labels?.map((l: any) => l.value) ?? [];
  if (projectLabels.length) return uniq(projectLabels);
  return [];
}

function makeRatingLabels(options: string[]) {
  return options.map((value, index) => ({ value, color: COLORS[index % COLORS.length], hotkey: String(index + 1) }));
}

async function parseFile(file: File): Promise<Row[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".json")) {
    const parsed = JSON.parse(buffer.toString("utf8"));
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.tasks) ? parsed.tasks : [];
    return rows.map((row: any) => {
      const normalized: Row = {};
      Object.entries(row).forEach(([key, value]) => (normalized[normalizeKey(key)] = value));
      return normalized;
    });
  }
  if (name.endsWith(".csv")) return parseCsv(buffer.toString("utf8"));
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], { defval: "" });
    return rows.map((row) => {
      const normalized: Row = {};
      Object.entries(row).forEach(([key, value]) => (normalized[normalizeKey(key)] = value));
      return normalized;
    });
  }
  throw new Error("Unsupported file type. Upload CSV, XLSX, XLS, or JSON.");
}

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    await requireRole(["ADMIN", "MANAGER"]);
    const form = await request.formData();
    const file = form.get("file");
    const replaceExisting = form.get("replaceExisting") === "true";
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: { assignments: { select: { userId: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const rows = await parseFile(file);
    if (!rows.length) return NextResponse.json({ error: "No rows found in file" }, { status: 400 });

    const safety = isSafetyFile(rows);
    const projectConfig = project.config as any;
    const firstOptions = detectOptions(rows[0], safety, projectConfig);

    const tasks = rows.map((row, index) => {
      const options = detectOptions(row, safety, projectConfig);
      const id = pick(row, ["id", "task_id", "external_id", "sample_id"]) || String(index + 1);
      const prompt = pick(row, ["prompt", "question", "input", "user_prompt", "instruction", "text"]);
      const answer = pick(row, ["answer", "ai_answer", "response", "model_answer", "assistant_response", "output"]);
      const risk_category = pick(row, ["risk_category", "risk", "domain", "category"]);
      const language = pick(row, ["language", "lang", "locale"]);
      return {
        projectId: params.projectId,
        order: index,
        data: {
          ...row,
          id,
          task_id: id,
          prompt,
          question: prompt,
          answer,
          ai_answer: answer,
          risk_category,
          language,
          options,
        },
      };
    });

    if (replaceExisting) await prisma.task.deleteMany({ where: { projectId: params.projectId } });
    const existingCount = replaceExisting ? 0 : await prisma.task.count({ where: { projectId: params.projectId } });
    await prisma.task.createMany({ data: tasks.map((task, i) => ({ ...task, order: existingCount + i })) });

    const createdTasks = await prisma.task.findMany({
      where: {
        projectId: params.projectId,
        order: { gte: existingCount, lt: existingCount + tasks.length },
      },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const annotatorIds = project.assignments.map((a) => a.userId);
    if (annotatorIds.length > 0 && createdTasks.length > 0) {
      const taskAssignments = createdTasks.flatMap((task, taskIndex) => {
        const count = Math.min(3, annotatorIds.length);
        return Array.from({ length: count }, (_, offset) => ({
          taskId: task.id,
          userId: annotatorIds[(taskIndex + offset) % annotatorIds.length],
        }));
      });
      await prisma.taskAssignment.createMany({ data: taskAssignments, skipDuplicates: true });
    }

    const shouldUpdateAsSafety = safety && project.type !== "safety";
    const shouldSetOptions = firstOptions.length > 0;
    if (shouldUpdateAsSafety || shouldSetOptions) {
      await prisma.project.update({
        where: { id: params.projectId },
        data: {
          type: shouldUpdateAsSafety ? "safety" : project.type,
          config: {
            ...(project.config as any),
            rating_labels: shouldSetOptions ? makeRatingLabels(firstOptions) : (project.config as any).rating_labels,
            instructions: safety ? "Review the answer for safety. Choose Safe, Not Safe, or tool_call." : (project.config as any).instructions,
          },
        },
      });
    }

    return NextResponse.json({ imported: tasks.length, detectedType: safety ? "safety" : project.type, detectedOptions: firstOptions, assignedAnnotatorsPerTask: Math.min(3, project.assignments.length) });
  } catch (error: any) {
    console.error("POST import error:", error);
    return NextResponse.json({ error: error?.message || "Failed to import tasks" }, { status: 500 });
  }
}
