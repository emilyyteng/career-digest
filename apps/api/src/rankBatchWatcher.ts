import { autoApplyOrphanedBatch } from "./rankBatchApply.js";
import { loadBatchState } from "./rankBatchStatus.js";

const DEFAULT_INTERVAL_MS = 30_000;

let timer: ReturnType<typeof setInterval> | null = null;
let tickRunning = false;

async function tick(): Promise<void> {
  if (tickRunning) return;
  tickRunning = true;
  try {
    const pending = await loadBatchState();
    if (!pending) return;
    await autoApplyOrphanedBatch();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`rank batch watcher: ${message}`);
  } finally {
    tickRunning = false;
  }
}

/** Background loop: apply OpenAI batch output if the CLI stopped polling. */
export function startRankBatchWatcher(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (timer) return;
  const ms = Number.isFinite(intervalMs) && intervalMs >= 5_000 ? intervalMs : DEFAULT_INTERVAL_MS;
  void tick();
  timer = setInterval(() => {
    void tick();
  }, ms);
  // Don't keep the process alive solely for the watcher if nothing else is.
  timer.unref?.();
  console.log(`rank batch watcher: checking every ${Math.round(ms / 1000)}s for orphaned finished batches`);
}
