import { notFound } from "next/navigation";
import { findSession, readSessionContent } from "@/lib/config";
import { parseBlocks } from "@/lib/blocks";
import ReviewClient from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = await params;
  const session = await findSession(session_id);
  if (!session) notFound();
  const { draft, source } = await readSessionContent(session);
  const blocks = parseBlocks(draft);

  return (
    <ReviewClient
      session={{
        session_id: session.session_id,
        reviewer_id: session.reviewer_id,
        artifact_id: session.artifact_id,
        system_label: session.system_label
      }}
      sourceMarkdown={source}
      blocks={blocks}
    />
  );
}
