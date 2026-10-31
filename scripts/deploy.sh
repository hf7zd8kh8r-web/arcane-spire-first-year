#!/bin/bash
# Ship to Render: push main to GitHub, then ask Render to deploy that commit and wait until it is live.
# Needs GITHUB_TOKEN and RENDER_API_KEY. usage: scripts/deploy.sh [service_id]
set -e
SID=${1:-${RENDER_SERVICE_ID:-srv-dbik5atg1s2s73dfq5rg}}
cd "$(git rev-parse --show-toplevel)"
git push origin main
if [ -z "$SID" ]; then echo "RENDER_SERVICE_ID / arg not set: pushed only"; exit 0; fi
[ -n "$RENDER_API_KEY" ] || { echo "RENDER_API_KEY not set: pushed only"; exit 0; }
A=(-s -H "Authorization: Bearer $RENDER_API_KEY" -H "Accept: application/json")
DEP=$(curl "${A[@]}" -X POST -H "Content-Type: application/json" -d '{"clearCache":"do_not_clear"}' https://api.render.com/v1/services/$SID/deploys | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
echo "deploy $DEP started for $(git rev-parse --short HEAD)"
for i in $(seq 1 60); do
  S=$(curl "${A[@]}" https://api.render.com/v1/services/$SID/deploys/$DEP | python3 -c 'import json,sys;print(json.load(sys.stdin)["status"])')
  case $S in live) echo "live"; exit 0;; *failed*|canceled|deactivated) echo "deploy $S - check Render dashboard logs"; exit 1;; esac
  sleep 10
done
echo "still $S after 10 min"; exit 1
