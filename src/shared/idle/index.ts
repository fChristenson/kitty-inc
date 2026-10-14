// Runs non-urgent work (asset warm-ups, audio setup) only in the browser's
// idle time and never while the player is touching or scrolling the game, so
// it can't stutter a press or a scroll. The lazily loaded code chunks hold
// gameplay (spawns, crits, events, badges), so they never wait on the player
// or the frame rate: they load one after another whatever is going on.

import { afterStartup } from "../startupGate";
import { isScreenFrozen } from "../screenFreeze";

type IdleDeadlineLike = { timeRemaining: () => number; didTimeout?: boolean };

// a light task runs only while at least this much of the frame is left
const LIGHT_SLACK_MS = 4;
// how long after the last touch, click, scroll or key no light task runs
const INPUT_QUIET_MS = 1000;
// between one chunk landing and the next one starting
const HEAVY_GAP_MS = 500;
// a game that never goes idle still gets one light task in this often
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
let heavyTimer = false;
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
document.addEventListener("visibilitychange", () => pointersDown.clear());

// ms until the player has left the game alone long enough, 0 once they have
function inputWait(now: number): number {
  if (pointersDown.size > 0) return INPUT_QUIET_MS;
  return Math.max(0, lastInputAt + INPUT_QUIET_MS - now);
}

function pump(deadline: IdleDeadlineLike): void {
  scheduled = false;
  const now = performance.now();
  // starved: the browser never went idle, so just one task this time
  const starved = deadline.didTimeout === true;
  const wait = isScreenFrozen() ? FROZEN_RECHECK_MS : inputWait(now);
  if (wait > 0 && !starved) {
    scheduleAfter(wait);
    return;
  }
  let ran = false;
  while (
    light.length > 0 &&
    (starved ? !ran : deadline.timeRemaining() > LIGHT_SLACK_MS)
  ) {
    light.shift()!();
    ran = true;
  }
  schedule();
}

function canStartHeavy(): boolean {
  return loadsAllowed && heavy.length > 0 && !heavyRunning;
}

// the next chunk, HEAVY_GAP_MS after the last landed; an event playing only
// puts it off till it ends
function scheduleHeavy(): void {
  if (!started || heavyTimer || !canStartHeavy()) return;
  heavyTimer = true;
  const gap = Math.max(0, heavyDoneAt + HEAVY_GAP_MS - performance.now());
  window.setTimeout(() => {
    heavyTimer = false;
    if (!canStartHeavy()) return;
    if (isScreenFrozen()) {
      heavyDoneAt = performance.now() - HEAVY_GAP_MS + FROZEN_RECHECK_MS;
      scheduleHeavy();
      return;
    }
    startHeavy();
  }, gap);
}

function startHeavy(): void {
  heavyRunning = true;
  heavy.shift()!()
    .catch(() => {})
    .finally(() => {
      heavyRunning = false;
      heavyDoneAt = performance.now();
      scheduleHeavy();
    });
}

function schedule(): void {
  if (!started || scheduled || light.length === 0) return;
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
  scheduleHeavy();
  scheduleSoon();
});

export function runWhenIdle(task: () => void): void {
  light.push(task);
  schedule();
}

// warm-ups play itself draws from (coin atlases, the button and bar sprites):
// a slice each frame from startup on, held button or not, so the first long
// press after a load already runs on them instead of waiting for a pause
const SOON_SLICE_MS = 3;
const soon: (() => void)[] = [];
let soonScheduled = false;

function pumpSoon(): void {
  soonScheduled = false;
  const end = performance.now() + SOON_SLICE_MS;
  do soon.shift()!();
  while (soon.length > 0 && performance.now() < end);
  scheduleSoon();
}

function scheduleSoon(): void {
  if (!started || soonScheduled || soon.length === 0) return;
  soonScheduled = true;
  // right after a frame paints, so a slice never delays one
  requestAnimationFrame(() => window.setTimeout(pumpSoon, 0));
}

export function prepareSoon(task: () => void): void {
  soon.push(task);
  scheduleSoon();
}

// every warm-up queued so far, now (behind the splash, see shared/preheat)
export function drainSoon(): void {
  while (soon.length > 0) soon.shift()!();
}

// prepareSoon for each item, one task apiece
export function prepareEachSoon<T>(
  items: readonly T[],
  handle: (item: T) => void,
): void {
  for (const item of items) soon.push(() => handle(item));
  scheduleSoon();
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

// a lazily loaded chunk: queued behind the others (in front of them if
// urgent), each starting once the last has landed
export function loadWhenIdle(
  load: () => Promise<unknown>,
  urgent = false,
): void {
  if (urgent) heavy.unshift(load);
  else heavy.push(load);
  scheduleHeavy();
}

// the player has bought something: queued chunks may start loading
export function allowIdleLoads(): void {
  if (loadsAllowed) return;
  loadsAllowed = true;
  scheduleHeavy();
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
