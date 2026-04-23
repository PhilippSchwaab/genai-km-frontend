import { notFound } from "next/navigation";
import { findSession } from "@/lib/config";
import DebriefClient from "./DebriefClient";

export const dynamic = "force-dynamic";

export default async function DebriefPage({
  params
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = await params;
  const session = await findSession(session_id);
  if (!session) notFound();

  return (
    <DebriefClient
      session={{
        session_id: session.session_id,
        reviewer_id: session.reviewer_id,
        artifact_id: session.artifact_id,
        system_label: session.system_label
      }}
    />
  );
}
