import { NextResponse } from "next/server";
import { findSession } from "@/lib/config";
import { appendEvent } from "@/lib/logger";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "session_start",
  "session_end",
  "edit",
  "block_disposition",
  "block_jump",
  "pane_focus",
  "likert_submit"
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;
  const session = await findSession(session_id);
  if (!session) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }

  const body = (await req.json()) as {
    event_type: string;
    payload?: Record<string, unknown>;
    timestamp_ms?: number;
    reviewer_id?: string;
  };

  if (!ALLOWED_EVENT_TYPES.has(body.event_type as EventType)) {
    return NextResponse.json(
      { error: `Unknown event_type: ${body.event_type}` },
      { status: 400 }
    );
  }

  const reviewerId =
    body.reviewer_id && body.reviewer_id.trim()
      ? body.reviewer_id.trim()
      : session.reviewer_id;

  await appendEvent({
    session_id: session.session_id,
    reviewer_id: reviewerId,
    artifact_id: session.artifact_id,
    system_label: session.system_label,
    event_type: body.event_type as EventType,
    timestamp_ms: body.timestamp_ms ?? Date.now(),
    payload: body.payload ?? {}
  });

  return NextResponse.json({ ok: true });
}
