import { NextRequest, NextResponse } from "next/server";

/**
 * Opt-in HTTP basic auth. Set HITL_BASIC_AUTH="user:pass" in the environment
 * (e.g. .env.local) to require it; leave it unset for unauthenticated local
 * use. Applies to every page and API route, so a protected public tunnel
 * can't be abused to pollute logs.
 *
 * Only safe over HTTPS (which Cloudflare Tunnel provides) — basic auth over
 * plain HTTP would leak the password.
 *
 * This is the Next.js 16 "proxy" convention (the successor to middleware.ts).
 */
export function proxy(req: NextRequest) {
  // Trim to survive a trailing newline / space in .env.local; an extra whitespace
  // there causes silent auth loops (server 401s even on the "right" creds).
  const expected = process.env.HITL_BASIC_AUTH?.trim();
  if (!expected) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header && header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      if (timingSafeEqual(decoded, expected)) {
        return NextResponse.next();
      }
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="HITL Verification", charset="UTF-8"'
    }
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const config = {
  // Cover everything except static asset paths; API routes are protected.
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)"
  ]
};
