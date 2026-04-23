import { promises as fs } from "node:fs";
import path from "node:path";
import { LOGS_DIR, sessionLogPath, SUMMARY_CSV_PATH } from "./paths";
import type { LogEvent } from "./types";

async function ensureLogsDir(): Promise<void> {
  await fs.mkdir(LOGS_DIR, { recursive: true });
}

export async function appendEvent(event: LogEvent): Promise<void> {
  await ensureLogsDir();
  const line = JSON.stringify(event) + "\n";
  await fs.appendFile(sessionLogPath(event.session_id), line, "utf8");
}

export interface SummaryRow {
  session_id: string;
  reviewer_id: string;
  artifact_id: string;
  system_label: string;
  total_time_s: number;
  n_approved: number;
  n_edited: number;
  n_flagged_factual: number;
  n_flagged_missing: number;
  n_flagged_attribution: number;
  n_flagged_style: number;
  n_flagged_other: number;
  n_removed: number;
  final_edit_distance: number;
  likert_confidence: number;
  likert_effort: number;
}

const SUMMARY_COLUMNS: (keyof SummaryRow)[] = [
  "session_id",
  "reviewer_id",
  "artifact_id",
  "system_label",
  "total_time_s",
  "n_approved",
  "n_edited",
  "n_flagged_factual",
  "n_flagged_missing",
  "n_flagged_attribution",
  "n_flagged_style",
  "n_flagged_other",
  "n_removed",
  "final_edit_distance",
  "likert_confidence",
  "likert_effort"
];

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function appendSummaryRow(row: SummaryRow): Promise<void> {
  await ensureLogsDir();
  let needHeader = false;
  try {
    await fs.access(SUMMARY_CSV_PATH);
  } catch {
    needHeader = true;
  }
  const header = needHeader ? SUMMARY_COLUMNS.join(",") + "\n" : "";
  const line =
    SUMMARY_COLUMNS.map((c) => csvEscape(row[c])).join(",") + "\n";
  await fs.appendFile(SUMMARY_CSV_PATH, header + line, "utf8");
}

/** Levenshtein distance (iterative, O(mn) time, O(n) space). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

export { path };
