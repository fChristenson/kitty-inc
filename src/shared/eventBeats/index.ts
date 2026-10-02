// an event's beats: moments ms into it when something lands (a hit, a slam,
// a pop). Ticked from the draw loop, so each fires on the frame its visual
// lands, never from a separate timer, and each fires exactly once
export interface Beats<T> {
  // fires every beat that's come due by ms; call once per frame
  tick(ms: number, now: number): void;
  // performance.now() each beat fired at, or null while it's still to come
  firedAt(index: number): number | null;
  // the latest beat to have fired, or null
  latest(): { index: number; at: number } | null;
  readonly items: readonly T[];
}

export function createBeats<T>(
  items: readonly T[],
  dueAt: (item: T, index: number) => number,
  fire: (item: T, index: number, now: number) => void,
): Beats<T> {
  const due = items.map(dueAt);
  // fired in order of when they're due, whatever order items come in
  const order = due.map((_, i) => i).sort((a, b) => due[a] - due[b]);
  const fired: (number | null)[] = items.map(() => null);
  let next = 0;
  let latest: { index: number; at: number } | null = null;
  return {
    items,
    tick(ms, now) {
      while (next < order.length && ms >= due[order[next]]) {
        const i = order[next++];
        fired[i] = now;
        latest = { index: i, at: now };
        fire(items[i], i, now);
      }
    },
    firedAt: (index) => fired[index],
    latest: () => latest,
  };
}
