# Quiet hide reuses dismiss rows with teach=false

Mismatches is one Jobs tab for everything off the ranked board, but **Mark as mismatch** teaches the ranker and **Hide from board** must not. We store both as `posting_feedback.kind = 'dismiss'` and gate rank-prompt examples with `teach` (default true) instead of adding a third Jobs category or a separate hide table. Non-teaching dismissals still skip bulk re-rank and stay sticky until **Rerank**, same as teaching mismatches.
