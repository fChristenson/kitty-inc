// The ONE place "poll every N ms while a dialog is open" lives. This exact
// `refreshInterval: ReturnType<typeof setInterval> | null` variable + guard
// was hand-copied into every hud/ dialog with a periodic affordability/render
// refresh (boostMenu, corporationBoostMenu, corporationStats,
// corporationUpgradeMenu, floorUpgradeMenu, mapMenu, upgradeMenu) — and the
// "don't leak a second stacked interval if start() fires again before stop()"
// guard got missed in several of those copies (see cash-clicker-rendering.md's
// own notes on that exact leak). Any NEW dialog needing a periodic
// re-render/affordability check while open MUST use this instead of
// hand-rolling its own refreshInterval variable.

export interface PollingLoop {
  // starts polling — idempotent: safe to call again while already running
  // (a stray double-open before stop() landed) without leaking the previous,
  // now-uncancellable interval underneath the new one
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export function createPollingLoop(
  callback: () => void,
  intervalMs: number,
): PollingLoop {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  return {
    start() {
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = setInterval(callback, intervalMs);
    },
    stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    isRunning() {
      return intervalId !== null;
    },
  };
}
