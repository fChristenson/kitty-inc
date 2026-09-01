// the one shared "press-and-hold auto-repeat" implementation — every hold-to-
// repeat button in this game (the floor upgrade button, the stock-raise items)
// uses this instead of its own copy of the same self-rescheduling timeout loop.
// Caller fires the action once immediately on pointerdown, then calls
// startPressAndHold to begin repeating it at a flat interval; call the returned
// controller's stop() on pointerup/pointercancel (or as soon as the action
// itself becomes invalid, e.g. no longer affordable)
export interface PressAndHoldController {
  stop: () => void;
}

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
