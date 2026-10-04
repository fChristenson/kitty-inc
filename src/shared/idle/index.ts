// Runs non-urgent startup work (asset warm-ups, audio setup) outside the
// frames the game needs for its first paint and first interactions.

import { afterStartup } from "../startupGate";

type IdleDeadlineLike = { timeRemaining: () => number };

// no idle API (Safari): jobs run one at a time, spaced out and on a small
// time budget, so the warm-ups trickle in between frames instead of all
// landing together on the game's first frames
const FALLBACK_GAP_MS = 50;
const FALLBACK_BUDGET_MS = 6;
const fallbackQueue: ((deadline: IdleDeadlineLike) => void)[] = [];
let fallbackScheduled = false;

function pumpFallback(): void {
  fallbackScheduled = false;
  const job = fallbackQueue.shift();
  if (!job) return;
  const end = performance.now() + FALLBACK_BUDGET_MS;
  job({ timeRemaining: () => Math.max(0, end - performance.now()) });
  scheduleFallback();
}

function scheduleFallback(): void {
  if (fallbackScheduled || fallbackQueue.length === 0) return;
  fallbackScheduled = true;
  window.setTimeout(pumpFallback, FALLBACK_GAP_MS);
}

function scheduleIdle(
  callback: (deadline: IdleDeadlineLike) => void,
  timeoutMs: number,
): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(callback, { timeout: timeoutMs });
  } else {
    fallbackQueue.push(callback);
    scheduleFallback();
  }
}

export function runWhenIdle(task: () => void, timeoutMs = 2000): void {
  afterStartup(() => scheduleIdle(() => task(), timeoutMs));
}

// works through `items` a few at a time, only while the browser reports idle
// time, so a long warm-up list never lands as one blocking burst
export function processWhenIdle<T>(
  items: readonly T[],
  handle: (item: T) => void,
  { chunkSize = 8, timeoutMs = 2000 } = {},
): void {
  let index = 0;
  const step = (deadline: IdleDeadlineLike): void => {
    const end = Math.min(items.length, index + chunkSize);
    while (index < end) {
      handle(items[index++]);
      if (deadline.timeRemaining() <= 1) break;
    }
    if (index < items.length) scheduleIdle(step, timeoutMs);
  };
  afterStartup(() => scheduleIdle(step, timeoutMs));
}
