import { NextResponse } from "next/server";
import { readSessionConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cfg = await readSessionConfig();
    // Strip the architecture_internal field so it never reaches the browser.
    const blinded = cfg.map(
      ({ architecture_internal: _internal, ...rest }) => rest
    );
    return NextResponse.json({ sessions: blinded });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
