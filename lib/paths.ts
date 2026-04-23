import path from "node:path";

export const PROJECT_ROOT = process.cwd();
export const DATA_DIR = path.join(PROJECT_ROOT, "data");
export const LOGS_DIR = path.join(PROJECT_ROOT, "logs");
export const SESSION_CONFIG_PATH = path.join(DATA_DIR, "session_config.json");

/**
 * Resolve a path from session_config (which stores paths relative to the
 * project root like "data/drafts/draft_CS-01_A.md"). Guard against escape
 * attempts so a bad config cannot read outside the project directory.
 */
export function resolveFromProjectRoot(rel: string): string {
  const resolved = path.resolve(PROJECT_ROOT, rel);
  const rootWithSep = PROJECT_ROOT.endsWith(path.sep)
    ? PROJECT_ROOT
    : PROJECT_ROOT + path.sep;
  if (!resolved.startsWith(rootWithSep)) {
    throw new Error(`Path escapes project root: ${rel}`);
  }
  return resolved;
}

export function sessionLogPath(sessionId: string): string {
  if (!/^[A-Za-z0-9_.-]+$/.test(sessionId)) {
    throw new Error(`Invalid session_id: ${sessionId}`);
  }
  return path.join(LOGS_DIR, `${sessionId}.jsonl`);
}

export const SUMMARY_CSV_PATH = path.join(LOGS_DIR, "sessions_summary.csv");
