# Local runtime data

This directory holds machine-local state for Career Digest. It is **not** committed to git.

Typical contents:

| Path | Purpose |
|------|---------|
| `uploads/` | Application document uploads |
| `openai-rate.json` | OpenAI rate-limit gate state |
| `rank-batch.json` | In-flight OpenAI batch rank job |
| `rank-status.json` | Rank batch progress snapshot |
| `board-refresh.json` | Last board refresh run metadata |
| `backup-job.json` | Backup cron job status |
| `*.log` | Cron and ingest recovery logs |

Files are created automatically when you run ingest, rank, board refresh, or backups.
