// the one shared "press-and-hold auto-repeat" implementation — every hold-to-
// repeat button in this game (the floor upgrade button, corporationUpgradeMenu's
// building-upgrade buttons) uses this instead of its own copy of the same
// self-rescheduling timeout loop.
// Caller fires the action once immediately on pointerdown, then calls
// startPressAndHold to begin repeating it at a flat interval; call the returned
// controller's stop() on pointerup/pointercancel (or as soon as the action
// itself becomes invalid, e.g. no longer affordable)
export interface PressAndHoldController {
  stop: () => void;
}

// the one long-press repeat rate; every hold-to-repeat control and the
// animations that keep pace with it derive their timing from this
export const LONG_PRESS_TICK_MS = 33;
// event-click coins land this many long-press ticks after their click (~0.3s),
// so a held button's readout trails its clicks by one fixed beat
export const LONG_PRESS_COIN_ARRIVE_MS = LONG_PRESS_TICK_MS * 9;

export function startPressAndHold(
  onFire: () => void,
  intervalMs: number,
): PressAndHoldController {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  function schedule(): void {
    timeoutId = setTimeout(() => {
      onFire();
      schedule();
    }, intervalMs);
  }
  schedule();
  return {
    stop(): void {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
