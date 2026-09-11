// The ONE place "animate a value from 0 to 1 over a fixed duration via rAF,
// canceling any previous in-flight run of the same kind first" lives. This
// exact shape (capture a start timestamp, `t = min(1, (now-start)/durationMs)`
// each frame, recurse via requestAnimationFrame until t reaches 1, cancel a
// stored anim id before starting a new one) was independently hand-copied
// into background/cityMap's corpBarrel (`rollToPosition`) and speedLines
// (`playSpeedLines`/`playVerticalSpeedLines` — duplicated even within that
// one file). Any NEW one-shot tween/sweep animation in this codebase MUST be
// built on top of this instead of writing a fourth copy of the same loop.
// Callers apply their own easing curve to `t` inside `onStep` (e.g.
// shared/easing's smoothstep) — this module only owns the timing, not the
// curve.

export interface TweenHandle {
  // stops the tween early; harmless if it already finished or was already canceled
  cancel(): void;
}

export function startTween(
  durationMs: number,
  onStep: (t: number) => void,
  onDone?: () => void,
): TweenHandle {
  let rafId: number | null = null;
  const start = performance.now();
  function frame(now: number): void {
    const t = Math.min(1, (now - start) / durationMs);
    onStep(t);
    if (t < 1) {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = null;
      onDone?.();
    }
  }
  rafId = requestAnimationFrame(frame);
  return {
    cancel() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}
