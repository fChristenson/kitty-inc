// The ONE place "a capped array of dt-advanced, self-expiring particles" lives.
// This exact pattern (spawn into an array, advance+prune every tick, self-drive
// or get pulled by an rAF loop) was independently hand-copied into floors/coins,
// coinBurst, floors/coinFloat, and floors/incomeFloatText — and the "cap the
// array so spawn rate can never outpace decay rate" fix got missed in 2 of those
// 4 copies (see cash-clicker-rendering.md's own notes on this exact recurring
// bug: on a slow/lagging device the dt clamp below makes decay fall behind
// spawn rate, so an uncapped array grows without bound the longer you play,
// which itself makes the device slower — a feedback spiral). Every particle
// array in this codebase MUST be built on top of this module from now on —
// never hand-roll the array/cap/tick logic again in a new file.

export interface PoolParticle {
  life: number;
  maxLife: number;
}

export interface ParticlePool<T extends PoolParticle> {
  readonly list: T[];
  hasActive(): boolean;
  // current particle count — for debug/perf overlays that want to show a
  // live number, not just a boolean
  count(): number;
  // adds `item`, evicting the OLDEST particle first if already at `maxCount` —
  // this is the actual leak fix; refusing new particles instead would let a
  // high-frequency spawner (e.g. a held button) starve a rarer one out entirely
  spawn(item: T): void;
  // advances every particle via the caller's own per-particle physics, then
  // removes anything whose life has reached maxLife
  update(dt: number, advance: (item: T, dt: number) => void): void;
  // starts (no-ops if already running) a self-scheduling rAF loop: each frame
  // computes dt clamped to [0,3] "~16.67ms ticks", calls `step(dt)`, then only
  // reschedules itself while `hasActive()` is still true afterward
  ensureTicking(step: (dt: number) => void): void;
}

export function createParticlePool<T extends PoolParticle>(
  maxCount: number,
): ParticlePool<T> {
  const list: T[] = [];
  // ring-buffer eviction cursor — see spawn() below for why this exists
  // instead of Array.shift()
  let nextEvictIndex = 0;
  let animationFrameId: number | null = null;
  let lastTick = 0;

  function hasActive(): boolean {
    return list.length > 0;
  }

  return {
    list,
    hasActive,
    count() {
      return list.length;
    },
    spawn(item) {
      if (list.length < maxCount) {
        list.push(item);
        return;
      }
      // O(1) ring-buffer eviction: overwrite the oldest slot directly.
      // Array.shift() is O(n) (re-indexes every remaining element) — once a
      // sustained hold pins the pool at its cap (confirmed via the perf
      // overlay: "coin bursts (floor): 500" stuck at max with FPS at 7), a
      // single burst of 40-85 new particles was doing up to ~85 * 500
      // element shifts EVERY spawn call, dozens of times a second. This was
      // the actual mobile lag, not a leak — the array was correctly bounded,
      // just extremely expensive to maintain at that bound.
      list[nextEvictIndex] = item;
      nextEvictIndex = (nextEvictIndex + 1) % maxCount;
    },
    update(dt, advance) {
      for (const p of list) advance(p, dt);
      // single-pass in-place compaction instead of a reverse loop of
      // list.splice(i, 1) calls — splice is the same O(n)-per-removal cost
      // as shift(), just as bad here as it was in spawn() above
      let writeIndex = 0;
      for (let i = 0; i < list.length; i++) {
        if (list[i].life < list[i].maxLife) list[writeIndex++] = list[i];
      }
      list.length = writeIndex;
      // ring-buffer position only matters between compactions; harmless (and
      // necessary) to restart it clean right after one
      nextEvictIndex = 0;
    },
    ensureTicking(step) {
      if (animationFrameId !== null) return;
      lastTick = performance.now();
      const tick = (now: number) => {
        const dt = Math.max(0, Math.min((now - lastTick) / 16.67, 3));
        lastTick = now;
        step(dt);
        animationFrameId = hasActive() ? requestAnimationFrame(tick) : null;
      };
      animationFrameId = requestAnimationFrame(tick);
    },
  };
}

// same dt-clamp math as ensureTicking's own internal loop, exposed standalone
// for consumers that are PULLED by someone else's existing rAF loop (a shared
// canvas already redrawing every frame) instead of self-scheduling their own —
// they still need the identical clamped-dt formula, just driven externally
export function clampedDtSince(
  lastUpdateAt: number | null,
  now: number,
): number {
  return Math.max(0, Math.min((now - (lastUpdateAt ?? now)) / 16.67, 3));
}
