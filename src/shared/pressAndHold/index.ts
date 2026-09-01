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

// the one shared "press-and-hold button with tap-vs-drag disambiguation" state
// machine — every hold-to-repeat button that also needs to ignore a swipe/
// scroll gesture starting on top of it (the floor upgrade button, hud/
// corporationBoostMenu's stock-raise items) uses this instead of its own copy
// of the same pending-target/confirm-timer/commit dance. Callers still own
// their own hit-testing and their own "did this turn into a drag" check (a
// canvas pan gesture and a DOM list scroll detect that differently) — they
// just call down()/cancel()/up() at the right moments.
export interface TapHoldGesture<T> {
  // call on pointerdown once you've hit-tested a valid target — arms the
  // confirmMs timer. Safe to call without first calling cancel()/up(): it
  // always resets any previous pending/committed target first
  down(target: T): void;
  // call the moment your own drag-threshold check trips, however you detect
  // it — cancels a still-pending press before it ever fires, and also stops
  // an already-committed hold-repeat if the drag happened mid-hold
  cancel(): void;
  // call on pointerup/pointercancel. Returns true if this gesture handled the
  // release itself (it had already committed and this just stopped repeating,
  // or it was still pending and this fires it now as a quick tap) — false
  // means nothing was pending/committed, so the caller should run its own
  // fallback (e.g. gameCanvas's generic click-elsewhere hit test)
  up(): boolean;
}

export interface TapHoldGestureOptions<T> {
  confirmMs: number; // how long a press must be held before committing to a real press
  holdIntervalMs: number; // auto-repeat interval once committed
  // called once per press — both on commit (still held past confirmMs) and on
  // a quick tap (released before confirmMs elapsed, no drag)
  onFire: (target: T) => void;
  // called for every subsequent auto-repeat tick after the first onFire;
  // defaults to onFire itself when the repeat action is identical
  onRepeat?: (target: T) => void;
}

export function createTapHoldGesture<T>(
  options: TapHoldGestureOptions<T>,
): TapHoldGesture<T> {
  const { confirmMs, holdIntervalMs, onFire } = options;
  const onRepeat = options.onRepeat ?? onFire;
  let pending: T | null = null;
  let committed: T | null = null;
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;
  let holdController: PressAndHoldController | null = null;

  function clearConfirmTimer(): void {
    if (confirmTimer !== null) clearTimeout(confirmTimer);
    confirmTimer = null;
  }

  function commit(target: T): void {
    pending = null;
    clearConfirmTimer();
    committed = target;
    onFire(target);
    holdController = startPressAndHold(() => onRepeat(target), holdIntervalMs);
  }

  return {
    down(target: T): void {
      clearConfirmTimer();
      holdController?.stop();
      holdController = null;
      committed = null;
      pending = target;
      confirmTimer = setTimeout(() => {
        confirmTimer = null;
        if (pending !== null) commit(pending);
      }, confirmMs);
    },
    cancel(): void {
      clearConfirmTimer();
      pending = null;
      holdController?.stop();
      holdController = null;
      committed = null;
    },
    up(): boolean {
      clearConfirmTimer();
      if (committed !== null) {
        holdController?.stop();
        holdController = null;
        committed = null;
        return true;
      }
      if (pending !== null) {
        const target = pending;
        pending = null;
        onFire(target);
        return true;
      }
      return false;
    },
  };
}
