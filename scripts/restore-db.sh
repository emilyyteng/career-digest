#!/bin/bash
# Restore career_digest (or test DB with --test) from a pg_dump in ./backups/.
# Default: backups/latest.json pointer. Override with a dump filename or path.
# Usage: scripts/restore-db.sh [--yes] [--test] [backups/career-digest-YYYY-MM-DD_HHMMSS.dump]
set -euo pipefail
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKUPS_DIR="$ROOT/backups"
META_PATH="$BACKUPS_DIR/latest.json"
LOG="$ROOT/data/restore.log"

usage() {
  cat <<'EOF'
Restore a logical backup from backups/ into the database in .env.

  npm run restore                              # latest backup (prompts)
  npm run restore -- --yes                     # latest, no prompt
  npm run restore -- career-digest-....dump    # specific dump
  npm run restore -- --test --yes              # restore into TEST_DATABASE_URL

Stop dev servers before restoring so nothing is writing to the DB.
After restore, run npm run migrate if code has newer migrations than the dump.
EOF
}

YES=false
USE_TEST=false
DUMP_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes | -y)
      YES=true
      shift
      ;;
    --test)
      USE_TEST=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      DUMP_ARG="$1"
      shift
      ;;
  esac
done

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if "$USE_TEST"; then
  TARGET_URL="${TEST_DATABASE_URL:-}"
  TARGET_LABEL="TEST_DATABASE_URL (career_digest_test)"
else
  TARGET_URL="${DATABASE_URL:-}"
  TARGET_LABEL="DATABASE_URL (career_digest)"
fi

if [ -z "$TARGET_URL" ]; then
  echo "$TARGET_LABEL is not set. Copy .env.example to .env" >&2
  exit 1
fi

resolve_dump_path() {
  local arg="$1"
  if [ -z "$arg" ]; then
    if [ ! -f "$META_PATH" ]; then
      echo "No dump specified and $META_PATH is missing. Run npm run backup first." >&2
      exit 1
    fi
    local file
    file="$(node -e "const j=require('fs').readFileSync(process.argv[1],'utf8'); console.log(JSON.parse(j).file)" "$META_PATH")"
    if [ -z "$file" ]; then
      echo "latest.json has no file field." >&2
      exit 1
    fi
    echo "$BACKUPS_DIR/$file"
    return
  fi

  case "$arg" in
    /*) echo "$arg" ;;
    backups/*) echo "$ROOT/$arg" ;;
    *) echo "$BACKUPS_DIR/$arg" ;;
  esac
}

DUMP_PATH="$(resolve_dump_path "$DUMP_ARG")"

if [ ! -f "$DUMP_PATH" ]; then
  echo "Dump not found: $DUMP_PATH" >&2
  exit 1
fi

if [[ "$DUMP_PATH" != *.dump ]]; then
  echo "Expected a .dump file: $DUMP_PATH" >&2
  exit 1
fi

SIZE="$(stat -f%z "$DUMP_PATH" 2>/dev/null || stat -c%s "$DUMP_PATH")"
REL_DUMP="${DUMP_PATH#"$ROOT/"}"

mkdir -p "$ROOT/data"

echo "Restore target: $TARGET_LABEL"
echo "Dump: $REL_DUMP ($SIZE bytes)"

if ! "$YES"; then
  echo ""
  echo "This will DROP and recreate database objects from the dump (--clean --if-exists)."
  read -r -p "Continue? [y/N] " reply
  case "$reply" in
    y | Y | yes | YES) ;;
    *)
      echo "Aborted."
      exit 0
      ;;
  esac
fi

echo "==== $(date '+%Y-%m-%d %H:%M:%S') restore start ($REL_DUMP) ====" | tee -a "$LOG"

set +e
pg_restore --clean --if-exists --no-owner --no-acl -d "$TARGET_URL" "$DUMP_PATH"
EXIT_CODE=$?
set -e

if [ "$EXIT_CODE" -ge 2 ]; then
  echo "pg_restore failed (exit $EXIT_CODE)" | tee -a "$LOG"
  exit 1
fi

if [ "$EXIT_CODE" -eq 1 ]; then
  echo "pg_restore finished with warnings (exit 1); objects should be restored." | tee -a "$LOG"
fi

echo "Restored $REL_DUMP into $TARGET_LABEL" | tee -a "$LOG"
echo "==== $(date '+%Y-%m-%d %H:%M:%S') restore done ====" | tee -a "$LOG"
echo "If app code is ahead of this dump, run: npm run migrate"
