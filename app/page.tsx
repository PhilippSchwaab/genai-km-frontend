import { readSessionConfig } from "@/lib/config";
import StartClient from "./StartClient";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const sessions = await readSessionConfig();
  // Strip architecture_internal before handing to the client.
  const blinded = sessions.map(
    ({ architecture_internal: _i, draft_path: _d, source_path: _s, ...rest }) =>
      rest
  );
  return <StartClient sessions={blinded} />;
}
