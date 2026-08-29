#!/bin/bash
# Logical backup of career_digest via pg_dump. Writes to ./backups/ (gitignored).
# Restore: npm run restore   (or scripts/restore-db.sh [--yes] [dump-file])
set -euo pipefail
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKUPS_DIR="$ROOT/backups"
RETENTION_DAYS=14
LOG="$ROOT/data/backup.log"

mkdir -p "$BACKUPS_DIR" "$ROOT/data"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Copy .env.example to .env" >&2
  exit 1
fi

STAMP="$(date '+%Y-%m-%d_%H%M%S')"
OUT_FILE="career-digest-${STAMP}.dump"
OUT_PATH="$BACKUPS_DIR/$OUT_FILE"

echo "==== $(date '+%Y-%m-%d %H:%M:%S') backup start ====" | tee -a "$LOG"
if ! pg_dump "$DATABASE_URL" -Fc --no-owner --no-acl -f "$OUT_PATH"; then
  echo "pg_dump failed" | tee -a "$LOG"
  rm -f "$OUT_PATH"
  exit 1
fi

SIZE="$(stat -f%z "$OUT_PATH" 2>/dev/null || stat -c%s "$OUT_PATH")"
AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf '{"at":"%s","file":"%s","sizeBytes":%s}\n' "$AT" "$OUT_FILE" "$SIZE" > "$BACKUPS_DIR/latest.json"

# Drop dumps older than retention window.
find "$BACKUPS_DIR" -maxdepth 1 -name 'career-digest-*.dump' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

echo "Backup written: backups/$OUT_FILE ($SIZE bytes)" | tee -a "$LOG"
echo "==== $(date '+%Y-%m-%d %H:%M:%S') backup done ====" | tee -a "$LOG"
