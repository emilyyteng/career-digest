#!/bin/bash
set -euo pipefail
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$ROOT/data"
echo "==== $(date '+%Y-%m-%d %H:%M:%S') daily-board start ====" >> "$ROOT/data/cron.log"
bash "$ROOT/scripts/backup-db.sh" >> "$ROOT/data/cron.log" 2>&1
npm run board-refresh >> "$ROOT/data/cron.log" 2>&1
echo "==== $(date '+%Y-%m-%d %H:%M:%S') daily-board done ====" >> "$ROOT/data/cron.log"
