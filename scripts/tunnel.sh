#!/usr/bin/env bash
# Expose the local review server over a public HTTPS URL via Cloudflare Tunnel.
#
# Usage:  npm run tunnel        # assumes the server is already running on :3000
#         PORT=3001 npm run tunnel
#
# The reviewer opens the printed https://*.trycloudflare.com URL. Logs still
# land on THIS machine — the tunnel only proxies HTTP traffic.

set -euo pipefail

PORT="${PORT:-3000}"

if ! command -v cloudflared >/dev/null 2>&1; then
  cat <<EOF >&2
cloudflared is not installed. Install it once:

  macOS:    brew install cloudflared
  Linux:    https://pkg.cloudflare.com/ (apt/yum/rpm)
  Windows:  winget install --id Cloudflare.cloudflared

Alternative: ngrok works the same way — \`ngrok http ${PORT}\`.
EOF
  exit 1
fi

# Quick health check so the reviewer doesn't get a 502 on the first click.
# Don't use -f: with HITL_BASIC_AUTH enabled the server returns 401, which
# still proves it's alive. We only need to fail if curl can't connect at all.
if ! curl -sS -o /dev/null "http://localhost:${PORT}/" 2>/dev/null; then
  cat <<EOF >&2
No server responding on http://localhost:${PORT}/. Start it in another terminal:

  npm run build && npm run start
  # or, for a one-off: PORT=${PORT} npm run start -- --port ${PORT}

Then re-run: npm run tunnel
EOF
  exit 1
fi

echo "Opening a Cloudflare quick tunnel to http://localhost:${PORT} ..."
echo "  - The printed https://*.trycloudflare.com URL is the one to share."
echo "  - The URL changes each time the tunnel restarts."
echo "  - Stop the tunnel (and close the URL) with Ctrl-C."
echo

exec cloudflared tunnel --url "http://localhost:${PORT}"
