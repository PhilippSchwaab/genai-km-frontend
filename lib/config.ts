import { promises as fs } from "node:fs";
import {
  SESSION_CONFIG_PATH,
  resolveFromProjectRoot
} from "./paths";
import type { SessionConfig } from "./types";

export async function readSessionConfig(): Promise<SessionConfig[]> {
  const raw = await fs.readFile(SESSION_CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as SessionConfig[];
  return parsed;
}

export async function findSession(
  sessionId: string
): Promise<SessionConfig | undefined> {
  const cfg = await readSessionConfig();
  return cfg.find((s) => s.session_id === sessionId);
}

export async function readSessionContent(session: SessionConfig): Promise<{
  draft: string;
  source: string;
}> {
  const [draft, source] = await Promise.all([
    fs.readFile(resolveFromProjectRoot(session.draft_path), "utf8"),
    fs.readFile(resolveFromProjectRoot(session.source_path), "utf8")
  ]);
  return { draft, source };
}
