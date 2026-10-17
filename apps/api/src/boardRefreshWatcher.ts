import { maybeCatchUpInterruptedBoardRefresh } from "./boardRefresh.js";

const DEFAULT_INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
let tickRunning = false;

async function tick(): Promise<void> {
  if (tickRunning) return;
  tickRunning = true;
  try {
    await maybeCatchUpInterruptedBoardRefresh();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`board refresh watcher: ${message}`);
  } finally {
    tickRunning = false;
  }
}

/**
 * Background loop: mark dead runners as interrupted and catch up the daily
 * board refresh when today's scheduled time has passed without a success.
 */
export function startBoardRefreshWatcher(intervalMs = DEFAULT_INTERVAL_MS): void {
  if (timer) return;
  const ms = Number.isFinite(intervalMs) && intervalMs >= 5_000 ? intervalMs : DEFAULT_INTERVAL_MS;
  void tick();
  timer = setInterval(() => {
    void tick();
  }, ms);
  timer.unref?.();
  console.log(
    `board refresh watcher: checking every ${Math.round(ms / 1000)}s for interrupted runs`,
  );
}
