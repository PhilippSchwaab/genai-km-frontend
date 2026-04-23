import { NextResponse } from "next/server";
import { findSession, readSessionContent } from "@/lib/config";
import { parseBlocks } from "@/lib/blocks";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ session_id: string }> }
) {
  const { session_id } = await params;
  const session = await findSession(session_id);
  if (!session) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }
  const { draft, source } = await readSessionContent(session);
  const blocks = parseBlocks(draft);
  return NextResponse.json({
    session: {
      session_id: session.session_id,
      reviewer_id: session.reviewer_id,
      artifact_id: session.artifact_id,
      system_label: session.system_label,
      draft_path: session.draft_path,
      source_path: session.source_path
    },
    source_markdown: source,
    blocks
  });
}
