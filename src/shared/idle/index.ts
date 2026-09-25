// Runs non-urgent startup work (asset warm-ups, audio setup) outside the
// frames the game needs for its first paint and first interactions.

type IdleDeadlineLike = { timeRemaining: () => number };

function scheduleIdle(
  callback: (deadline: IdleDeadlineLike) => void,
  timeoutMs: number,
): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(callback, { timeout: timeoutMs });
  } else {
    // no idle API (Safari): a short timer still yields to rendering between chunks
    window.setTimeout(() => callback({ timeRemaining: () => 8 }), 16);
  }
}

export function runWhenIdle(task: () => void, timeoutMs = 2000): void {
  scheduleIdle(() => task(), timeoutMs);
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
  scheduleIdle(step, timeoutMs);
}
