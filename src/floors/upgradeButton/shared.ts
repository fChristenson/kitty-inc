// Everything the button's own geometry/press-and-hold animation AND every
// "event crit" module (sale.ts/overtime.ts/...) needs in common
// lives here — button-specific state that isn't itself a new event type
// stays in this one file instead of being duplicated per event.
import { smoothstep } from "../../shared/easing";
import { spawnCoinBurst } from "../coins";
import { type BigNumber, divide, gte } from "../../shared/bigNumber";
import { getTotalIncome } from "../../totalIncome";
import type { Floor } from "../../gameState";
import { FLOOR_W, FLOOR_H, DIVIDER_H, SIDE_WALL_WIDTH } from "../constants";
import { isCritUpgrade } from "./crit";

// button placement, bottom-right corner of each floor (mirrors the income panel on the left).
// Width cut 25% from the previous 440 (was matching the income panel 1:1); BTN_X sets its
// right edge flush against the side wall (FLOOR_W - SIDE_WALL_WIDTH), same alignment rule
// as the income bar's left edge. BTN_H exactly fills DIVIDER_H, spanning it edge-to-edge
export const BTN_W = 330;
export const BTN_H = 140;
export const BTN_X = FLOOR_W - SIDE_WALL_WIDTH - BTN_W;
// centered inside the divider band below (see outerWall/index.ts's DIVIDER_H),
// mounted on top of it since that's drawn first, nudged down 10px from dead
// center — except the bottom (ground) floor, which stays at dead center. BTN_H
// leaves just enough divider clearance for this nudge without clipping against
// the floor canvas edge
export function getBtnY(isGroundFloor: boolean): number {
  const base = FLOOR_H - DIVIDER_H / 2 - BTN_H / 2;
  return isGroundFloor ? base + 2 : base + 10;
}

function isPointOnButton(
  x: number,
  localY: number,
  isGroundFloor: boolean,
): boolean {
  const y = getBtnY(isGroundFloor);
  return x >= BTN_X && x <= BTN_X + BTN_W && localY >= y && localY <= y + BTN_H;
}

export function getButtonCenter(isGroundFloor: boolean): {
  x: number;
  y: number;
} {
  return { x: BTN_X + BTN_W / 2, y: getBtnY(isGroundFloor) + BTN_H / 2 };
}

// whether a floor-local canvas point falls on the upgrade button
export function hitTestUpgradeButton(
  x: number,
  y: number,
  isGroundFloor: boolean,
): boolean {
  return isPointOnButton(x, y, isGroundFloor);
}

// a satisfying "juicy" press animation, keyed per floor (each floor's button
// bounces independently): a quick squash inward followed by a springy overshoot
// past full size before settling, via a damped-oscillator curve rather than a
// linear tween — the single overshoot is what reads as bouncy/tactile instead of
// just "shrinks then grows back"
const pressedAt = new WeakMap<Floor, number>();
const PRESS_DURATION_MS = 450;
const PRESS_AMPLITUDE = 0.18; // how deep the initial squash-in goes (1 - this)
const PRESS_DECAY = 9; // 1/sec; higher = the bounce dies out faster
const PRESS_FREQUENCY = 26; // rad/sec; higher = a snappier/quicker bounce

// call right when a purchase actually succeeds (see floorInteractions/index.ts) —
// every subsequent draw of this floor's button picks the animation up from here
export function triggerButtonPress(floor: Floor): void {
  pressedAt.set(floor, Date.now());
}

export function pressScale(floor: Floor, now: number): number {
  const startedAt = pressedAt.get(floor);
  if (startedAt === undefined) return 1;
  const elapsedMs = now - startedAt;
  if (elapsedMs >= PRESS_DURATION_MS) return 1;
  const t = elapsedMs / 1000; // seconds, for the decay/frequency constants above
  return (
    1 -
    PRESS_AMPLITUDE * Math.exp(-PRESS_DECAY * t) * Math.cos(PRESS_FREQUENCY * t)
  );
}

// press-and-hold "pressure boiler" animation, independent of pressScale's own
// one-shot per-purchase bounce above — while the button is held down (see
// gameCanvas.ts's onPointerDown/onPointerUp calling startButtonHoldAnim/
// stopButtonHoldAnim), it swells and shakes harder over HOLD_ANIM_GROW_MS,
// then "pops" (a brief overshoot past its already-swollen size, reading as a
// distinct snap rather than just smoothly topping out), releases an
// extra-large coin burst right as the pop starts, and springily deflates back
// down, immediately looping into a fresh grow phase for as long as the hold
// keeps going. Letting go at ANY point (mid-grow, mid-pop, or mid-deflate)
// interrupts that cycle and deflates back to normal from whatever size it
// currently was, instead of snapping back instantly
const HOLD_ANIM_GROW_MS = 2000;
const HOLD_ANIM_POP_MS = 120;
const HOLD_ANIM_DEFLATE_MS = 350;
const HOLD_ANIM_RELEASE_DEFLATE_MS = 250;
const HOLD_ANIM_MAX_SCALE = 1.35; // biggest size reached by the end of a normal grow
const HOLD_ANIM_POP_SCALE = 1.55; // the brief overshoot past HOLD_ANIM_MAX_SCALE at burst time
const HOLD_ANIM_MAX_SHAKE_PX = 14;
const HOLD_ANIM_MAX_WOBBLE_RAD = Math.PI / 12; // 15 degrees to either side
const HOLD_ANIM_WOBBLE_FREQUENCY = 72;
// "extra large" burst = this many normal-sized bursts fired together,
// staggered slightly so they read as one bigger eruption, not a single frame
// spike — same spawnCoinBurst every purchase already uses, just piled up
const HOLD_ANIM_BURST_WAVES = 3;
const HOLD_ANIM_BURST_STAGGER_MS = 50;
const HOLD_ANIM_BURST_SCALE = 1.25; // each wave's own particles are also 25% bigger/faster

type HoldAnimPhase = "grow" | "pop" | "deflate" | "releasing";
interface HoldAnimState {
  phase: HoldAnimPhase;
  phaseStartedAt: number;
  // the scale "releasing" started deflating FROM — a release can happen at
  // any point mid-grow/mid-pop/mid-deflate, so this can't just always be
  // HOLD_ANIM_POP_SCALE the way the normal burst-triggered deflate can
  releaseFromScale: number;
}
const holdAnimState = new WeakMap<Floor, HoldAnimState>();

// call once right when the button's press-and-hold begins (gameCanvas.ts's
// onPointerDown) — starts a fresh grow phase
export function startButtonHoldAnim(floor: Floor): void {
  holdAnimState.set(floor, {
    phase: "grow",
    phaseStartedAt: Date.now(),
    releaseFromScale: 1,
  });
}

// pure (no mutation, no side effects) — just "how big is the button drawing
// right now", reused by both stepHoldAnim below and stopButtonHoldAnim (which
// needs to know where to start deflating FROM the instant a hold ends)
function computeHoldScale(state: HoldAnimState, now: number): number {
  const elapsed = now - state.phaseStartedAt;
  if (state.phase === "grow") {
    const t = smoothstep(Math.min(1, elapsed / HOLD_ANIM_GROW_MS));
    return 1 + (HOLD_ANIM_MAX_SCALE - 1) * t;
  }
  if (state.phase === "pop") {
    const t = Math.min(1, elapsed / HOLD_ANIM_POP_MS);
    return (
      HOLD_ANIM_MAX_SCALE + (HOLD_ANIM_POP_SCALE - HOLD_ANIM_MAX_SCALE) * t
    );
  }
  if (state.phase === "deflate") {
    const t = elapsed / 1000;
    const settle = 1 - Math.exp(-14 * t) * Math.cos(24 * t);
    return HOLD_ANIM_POP_SCALE - (HOLD_ANIM_POP_SCALE - 1) * settle;
  }
  // releasing
  const t = Math.min(1, elapsed / HOLD_ANIM_RELEASE_DEFLATE_MS);
  return state.releaseFromScale - (state.releaseFromScale - 1) * smoothstep(t);
}

// call once right when the hold ends (release/cancel/drag-away — see
// gameCanvas.ts's onPointerUp) — instead of snapping back instantly, starts a
// deflate from whatever size the button currently was
export function stopButtonHoldAnim(floor: Floor): void {
  const state = holdAnimState.get(floor);
  if (!state || state.phase === "releasing") return;
  beginReleasing(floor, state);
}

// shared by stopButtonHoldAnim above (an actual release) and stepHoldAnim
// below (the button going grey mid-hold) — both need the exact same "start
// deflating from whatever size it currently is" transition
function beginReleasing(floor: Floor, state: HoldAnimState): void {
  const now = Date.now();
  holdAnimState.set(floor, {
    phase: "releasing",
    phaseStartedAt: now,
    releaseFromScale: computeHoldScale(state, now),
  });
}

// advances the grow/pop/deflate(/releasing) state machine and returns the
// button's current extra scale + wobble + a small random shake offset —
// {scale:1,rotation:0,shakeX:0,shakeY:0} once there's no animation left to show
// at all. Reads AND
// mutates holdAnimState (same "a draw call also owns firing its own one-shot
// side effects" pattern this game's other timed animations already use) —
// cx/cy are where a burst should spawn from (the button's own center)
export function stepHoldAnim(
  floor: Floor,
  now: number,
  cx: number,
  cy: number,
): { scale: number; rotation: number; shakeX: number; shakeY: number } {
  const state = holdAnimState.get(floor);
  if (!state) return { scale: 1, rotation: 0, shakeX: 0, shakeY: 0 };

  const elapsed = now - state.phaseStartedAt;

  if (state.phase === "grow" && elapsed >= HOLD_ANIM_GROW_MS) {
    // the boiler bursts — an extra-large coin burst (both more waves AND each
    // wave itself scaled up HOLD_ANIM_BURST_SCALE, not just normal-sized
    // bursts piled up), then a brief overshoot pop before deflating
    for (let i = 0; i < HOLD_ANIM_BURST_WAVES; i++) {
      const delayMs = i * HOLD_ANIM_BURST_STAGGER_MS;
      if (delayMs === 0) {
        spawnCoinBurst(floor, cx, cy, () => {}, HOLD_ANIM_BURST_SCALE);
      } else {
        setTimeout(
          () => spawnCoinBurst(floor, cx, cy, () => {}, HOLD_ANIM_BURST_SCALE),
          delayMs,
        );
      }
    }
    state.phase = "pop";
    state.phaseStartedAt = now;
  } else if (state.phase === "pop" && elapsed >= HOLD_ANIM_POP_MS) {
    state.phase = "deflate";
    state.phaseStartedAt = now;
  } else if (state.phase === "deflate" && elapsed >= HOLD_ANIM_DEFLATE_MS) {
    // still held (state wasn't deleted/reassigned) — loop right back into a
    // fresh grow
    state.phase = "grow";
    state.phaseStartedAt = now;
  } else if (
    state.phase === "releasing" &&
    elapsed >= HOLD_ANIM_RELEASE_DEFLATE_MS
  ) {
    holdAnimState.delete(floor);
    return { scale: 1, rotation: 0, shakeX: 0, shakeY: 0 };
  }

  const scale = computeHoldScale(state, now);
  // Only vibrate and wobble while actively building pressure. A release or a
  // post-burst deflate is winding down, not building tension.
  if (state.phase !== "grow") {
    return { scale, rotation: 0, shakeX: 0, shakeY: 0 };
  }
  const growT = Math.min(1, (now - state.phaseStartedAt) / HOLD_ANIM_GROW_MS);
  const shakeMagnitude = HOLD_ANIM_MAX_SHAKE_PX * growT * growT;
  return {
    scale,
    rotation:
      Math.sin(
        ((now - state.phaseStartedAt) / 1000) * HOLD_ANIM_WOBBLE_FREQUENCY,
      ) *
      HOLD_ANIM_MAX_WOBBLE_RAD *
      growT,
    shakeX: (Math.random() - 0.5) * 2 * shakeMagnitude,
    shakeY: (Math.random() - 0.5) * 2 * shakeMagnitude,
  };
}

// ---------------------------------------------------------------------------
// "event crit" framework — the shared shape behind Sale/Overtime (and
// any future one): a temporary, per-floor window that takes over the upgrade
// button's color/label/wiggle while active. Adding a brand new one is meant
// to be:
//   1. a new file (e.g. upgradeButton/thing.ts) that owns that event's own
//      trigger/isActive state — createTimedFloorEvent below covers the
//      common "just runs for N ms once triggered" shape; an event with extra
//      per-run state or persisted-across-reload state (like Overtime's own
//      gauge) still just wraps its own isActive/trigger with the same
//      signatures.
//   2. that file calling registerEventButton once (at module-eval time) with
//      its own color/label/freeClick — nothing in drawUpgradeButton (index.ts)
//      or isUpgradeButtonEnabled below needs to change
// ---------------------------------------------------------------------------

// factory for the common "starts now, runs for a fixed duration" shape
// (Sale/Frozen's own window) — an event with extra state of its own just
// wraps this instead of hand-rolling its own WeakMap<Floor, number> +
// now-startedAt<duration check again
export interface TimedFloorEvent {
  trigger(floor: Floor): void;
  isActive(floor: Floor, now: number): boolean;
}

export function createTimedFloorEvent(durationMs: number): TimedFloorEvent {
  const startedAt = new WeakMap<Floor, number>();
  return {
    trigger(floor: Floor): void {
      startedAt.set(floor, Date.now());
    },
    isActive(floor: Floor, now: number): boolean {
      const t = startedAt.get(floor);
      return t !== undefined && now - t < durationMs;
    },
  };
}

// one event type's own registration — see registerEventButton below
export interface EventButtonDef {
  // unique per event, used only for the odd bit of debugging/logging
  key: string;
  // the button's fill color while this event is the active one
  color: string;
  // free clicks (Sale/Overtime) never dim for unaffordability and always
  // count as "clickable" for isUpgradeButtonEnabled below; an event that
  // still charges real money while active (Frozen) is false here, so the
  // button keeps its normal affordability-based dimming
  freeClick: boolean;
  isActive(floor: Floor, now: number): boolean;
  // `critMultiplier` is the landed tier's own multiplier (5/25/125) if a
  // plain crit is ALSO currently armed on this same floor, else null — lets
  // an event append its own "x5" the same way Sale/Overtime do; an event
  // whose reward never scales with tier (Frozen) can just ignore it
  label(critMultiplier: number | null): string;
}

const eventButtons: EventButtonDef[] = [];

// call once per event module, at module-eval time (see sale.ts/overtime.ts/
// frozen.ts's own bottom-of-file call) — registration order is the
// tie-break priority when (rarely) more than one event is active on the same
// floor at once, first-registered wins
export function registerEventButton(def: EventButtonDef): void {
  eventButtons.push(def);
}

// the one event (if any) currently governing this floor's button appearance
export function getActiveEventButton(
  floor: Floor,
  now: number,
): EventButtonDef | null {
  for (const def of eventButtons) {
    if (def.isActive(floor, now)) return def;
  }
  return null;
}

// whether the upgrade button is currently "enabled" (colored, clickable) —
// on a free-click event, mid-crit, or plainly affordable — as opposed to
// greyed-out. Used by floorInteractions.ts's hitTestFloorHover, gameCanvas.ts's
// pointerdown handler (must not start the hold-grow animation on a disabled
// button), and stepHoldAnim above (must deflate immediately if a
// hold-in-progress button goes disabled)
export function isUpgradeButtonEnabled(floor: Floor): boolean {
  const now = Date.now();
  return (
    eventButtons.some((def) => def.freeClick && def.isActive(floor, now)) ||
    isCritUpgrade(floor) ||
    gte(getTotalIncome(), floor.upgradeCost)
  );
}

// 1 second's worth of a floor's own current income rate — deliberately NOT added
// back into floor.incomeAmount itself (that would compound: a bigger rate next
// click, forever), just read fresh each click and credited straight to the
// player's total (see floorInteractions/index.ts and hud/boostMenu/index.ts)
export function floorIncomePerSecond(floor: Floor): BigNumber {
  return divide(floor.incomeAmount, floor.incomeIntervalSeconds);
}
