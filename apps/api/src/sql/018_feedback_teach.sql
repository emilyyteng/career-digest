-- Quiet Hide from board vs teaching Mark as mismatch.
-- teach=false dismissals stay off Ranked (same as dismiss) but are omitted from rank prompts.
ALTER TABLE posting_feedback
  ADD COLUMN IF NOT EXISTS teach boolean NOT NULL DEFAULT true;
