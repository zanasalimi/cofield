#!/usr/bin/env bash
# Boot both processes for a one-tab demo: the Yjs sync server (4321) in the
# background and the Next.js app (3000) in the foreground. Used by `pnpm demo`
# and auto-run in a GitHub Codespace.
set -e

# In a Codespace the browser reaches the sync server at its forwarded *.app.github.dev
# URL, not localhost, so point the client there. Outside a Codespace the app's
# default (ws://localhost:4321) is used.
if [ -n "${CODESPACE_NAME:-}" ]; then
  export NEXT_PUBLIC_WS_URL="wss://${CODESPACE_NAME}-4321.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo "Codespace detected; sync server at ${NEXT_PUBLIC_WS_URL}"
fi

echo "Starting Yjs sync server on :4321 ..."
pnpm sync >/tmp/cofield-sync.log 2>&1 &

echo "Starting web app on :3000 ..."
exec pnpm dev
