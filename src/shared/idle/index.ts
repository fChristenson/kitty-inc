// Runs non-urgent work (asset warm-ups, audio setup, the lazily loaded code
// chunks) only in the browser's idle time and never while the player is
// touching or scrolling the game, so it can't stutter a press or a scroll.
// Light tasks run while a frame has time left; chunks load one at a time.

import { afterStartup } from "../startupGate";
import { isScreenFrozen } from "../screenFreeze";

type IdleDeadlineLike = { timeRemaining: () => number; didTimeout?: boolean };

// a light task runs only while at least this much of the frame is left
const LIGHT_SLACK_MS = 4;
// a chunk evaluates in one go, so it waits for a mostly free frame
const HEAVY_SLACK_MS = 12;
// how long after the last touch, click, scroll or key nothing runs
const INPUT_QUIET_MS = 1000;
// between one chunk landing and the next one starting
const HEAVY_GAP_MS = 500;
// a game that never goes idle still gets one task in this often, if untouched
const STARVE_MS = 5000;
// how often a frozen screen (an event playing) is checked again
const FROZEN_RECHECK_MS = 200;
// no idle API (Safari): checked this often, on this budget
const FALLBACK_GAP_MS = 50;
const FALLBACK_BUDGET_MS = 6;

const light: (() => void)[] = [];
const heavy: (() => Promise<unknown>)[] = [];
let started = false;
let scheduled = false;
let heavyRunning = false;
let heavyDoneAt = -Infinity;
// chunks wait for the player's first purchase (see allowIdleLoads), so none
// lands on the first presses of a session
let loadsAllowed = false;
const pointersDown = new Set<number>();
let lastInputAt = -Infinity;

const touched = (): void => {
  lastInputAt = performance.now();
};
const listen = { capture: true, passive: true } as const;
window.addEventListener(
  "pointerdown",
  (e) => {
    pointersDown.add(e.pointerId);
    touched();
  },
  listen,
);
for (const type of ["pointerup", "pointercancel"] as const)
  window.addEventListener(
    type,
    (e) => {
      pointersDown.delete(e.pointerId);
      touched();
    },
    listen,
  );
window.addEventListener("wheel", touched, listen);
window.addEventListener("keydown", touched, listen);
// a release outside the page never reports its pointerup
window.addEventListener("blur", () => pointersDown.clear());

// ms until the player has left the game alone long enough, 0 once they have
function inputWait(now: number): number {
  if (pointersDown.size > 0) return INPUT_QUIET_MS;
  return Math.max(0, lastInputAt + INPUT_QUIET_MS - now);
}

function pump(deadline: IdleDeadlineLike): void {
  scheduled = false;
  const now = performance.now();
  const wait = isScreenFrozen() ? FROZEN_RECHECK_MS : inputWait(now);
  if (wait > 0) {
    scheduleAfter(wait);
    return;
  }
  // starved: the browser never went idle, so just one task this time
  const starved = deadline.didTimeout === true;
  let ran = false;
  while (
    light.length > 0 &&
    (starved ? !ran : deadline.timeRemaining() > LIGHT_SLACK_MS)
  ) {
    light.shift()!();
    ran = true;
  }
  if (light.length === 0 && canStartHeavy() && !ran) {
    const gap = heavyDoneAt + HEAVY_GAP_MS - now;
    if (gap > 0) {
      scheduleAfter(gap);
      return;
    }
    if (starved || deadline.timeRemaining() > HEAVY_SLACK_MS) startHeavy();
  }
  schedule();
}

function canStartHeavy(): boolean {
  return loadsAllowed && heavy.length > 0 && !heavyRunning;
}

function startHeavy(): void {
  heavyRunning = true;
  heavy.shift()!()
    .catch(() => {})
    .finally(() => {
      heavyRunning = false;
      heavyDoneAt = performance.now();
      schedule();
    });
}

function schedule(): void {
  if (!started || scheduled) return;
  if (light.length === 0 && !canStartHeavy()) return;
  scheduled = true;
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(pump, { timeout: STARVE_MS });
  } else {
    window.setTimeout(() => {
      const end = performance.now() + FALLBACK_BUDGET_MS;
      pump({ timeRemaining: () => Math.max(0, end - performance.now()) });
    }, FALLBACK_GAP_MS);
  }
}

function scheduleAfter(ms: number): void {
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    schedule();
  }, ms);
}

afterStartup(() => {
  started = true;
  schedule();
});

export function runWhenIdle(task: () => void): void {
  light.push(task);
  schedule();
}

// works through items one per idle slot, so a long warm-up list never lands
// as one blocking burst
export function processWhenIdle<T>(
  items: readonly T[],
  handle: (item: T) => void,
): void {
  for (const item of items) light.push(() => handle(item));
  schedule();
}

// a lazily loaded chunk: queued behind the others, each starting only once
// the last has landed and the game is quiet
export function loadWhenIdle(load: () => Promise<unknown>): void {
  heavy.push(load);
  schedule();
}

// the player has bought something: queued chunks may start loading
export function allowIdleLoads(): void {
  if (loadsAllowed) return;
  loadsAllowed = true;
  schedule();
}

// work that can't wait for the player to stop (saves): at idle, or after
// timeoutMs regardless
export function runWhenIdleWithin(task: () => void, timeoutMs: number): void {
  afterStartup(() => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(() => task(), { timeout: timeoutMs });
    else window.setTimeout(task, FALLBACK_GAP_MS);
  });
}
