import { NextResponse } from "next/server";
import { findSession } from "@/lib/config";
import {
  appendEvent,
  appendSummaryRow,
  editDistance
} from "@/lib/logger";
import type {
  BlockState,
  Disposition,
  FlagReason,
  LikertSubmission
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface SubmitBody {
  reviewer_id?: string;
  started_at_ms: number;
  submitted_at_ms: number;
  active_duration_ms: number;
  blocks: BlockState[];
  likert: LikertSubmission;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;
  const session = await findSession(session_id);
  if (!session) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }

  const body = (await req.json()) as SubmitBody;

  const reviewerId =
    body.reviewer_id && body.reviewer_id.trim()
      ? body.reviewer_id.trim()
      : session.reviewer_id;

  if (
    !Number.isFinite(body.likert?.confidence) ||
    !Number.isFinite(body.likert?.effort)
  ) {
    return NextResponse.json(
      { error: "Missing likert fields" },
      { status: 400 }
    );
  }

  for (const b of body.blocks) {
    if (b.disposition === "pending") {
      return NextResponse.json(
        { error: `Block ${b.id} has no disposition` },
        { status: 400 }
      );
    }
  }

  // likert_submit event (before session_end, as per spec)
  await appendEvent({
    session_id: session.session_id,
    reviewer_id: reviewerId,
    artifact_id: session.artifact_id,
    system_label: session.system_label,
    event_type: "likert_submit",
    timestamp_ms: body.submitted_at_ms,
    payload: {
      confidence: body.likert.confidence,
      effort: body.likert.effort,
      comment: body.likert.comment ?? ""
    }
  });

  // session_end event with final state snapshot
  await appendEvent({
    session_id: session.session_id,
    reviewer_id: reviewerId,
    artifact_id: session.artifact_id,
    system_label: session.system_label,
    event_type: "session_end",
    timestamp_ms: body.submitted_at_ms,
    payload: {
      started_at_ms: body.started_at_ms,
      submitted_at_ms: body.submitted_at_ms,
      active_duration_ms: body.active_duration_ms,
      blocks: body.blocks
    }
  });

  // --- summary row ---
  const tally: Record<Disposition, number> = {
    approved: 0,
    edited: 0,
    flagged: 0,
    removed: 0
  };
  const flaggedTally: Record<FlagReason, number> = {
    factual_error: 0,
    missing_information: 0,
    wrong_or_missing_attribution: 0,
    stylistic_or_formatting_only: 0,
    other: 0
  };

  const originalParts: string[] = [];
  const finalParts: string[] = [];

  for (const b of body.blocks) {
    const d = b.disposition as Disposition;
    tally[d] += 1;
    if (d === "flagged" && b.flag_reason) {
      flaggedTally[b.flag_reason] += 1;
    }
    originalParts.push(b.original_markdown);
    if (d !== "removed") finalParts.push(b.current_markdown);
  }

  const originalJoined = originalParts.join("\n\n");
  const finalJoined = finalParts.join("\n\n");
  const distance = editDistance(originalJoined, finalJoined);

  await appendSummaryRow({
    session_id: session.session_id,
    reviewer_id: reviewerId,
    artifact_id: session.artifact_id,
    system_label: session.system_label,
    total_time_s: Math.round(body.active_duration_ms / 1000),
    n_approved: tally.approved,
    n_edited: tally.edited,
    n_flagged_factual: flaggedTally.factual_error,
    n_flagged_missing: flaggedTally.missing_information,
    n_flagged_attribution: flaggedTally.wrong_or_missing_attribution,
    n_flagged_style: flaggedTally.stylistic_or_formatting_only,
    n_flagged_other: flaggedTally.other,
    n_removed: tally.removed,
    final_edit_distance: distance,
    likert_confidence: body.likert.confidence,
    likert_effort: body.likert.effort
  });

  return NextResponse.json({ ok: true });
}
