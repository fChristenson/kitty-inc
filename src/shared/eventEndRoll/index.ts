// the full 360° "roll" an event's coin target (the total-income readout or a
// floor's income bar) does when that event ends, timed to span the ending sound
import type { Floor } from "../../gameState";

export type EventEndRollTarget = "total" | "bar";

let totalRoll: { startedAt: number; durationMs: number } | null = null;
const barRolls = new WeakMap<
  Floor,
  { startedAt: number; durationMs: number }
>();

export function triggerEventEndRoll(
  floor: Floor,
  target: EventEndRollTarget,
  durationMs: number,
): void {
  const roll = { startedAt: Date.now(), durationMs };
  if (target === "total") totalRoll = roll;
  else barRolls.set(floor, roll);
}

export interface RollPose {
  angle: number;
  scaleX: number;
  scaleY: number;
}

const REST: RollPose = { angle: 0, scaleX: 1, scaleY: 1 };
const DEG = Math.PI / 180;
// phase boundaries as fractions of the roll's duration
const WINDUP_END = 0.15;
const SPIN_END = 0.58;
const WINDUP_ANGLE = -18 * DEG;
const OVERSHOOT_ANGLE = 14 * DEG;
const SQUASH = 0.1;
const SETTLE_WIGGLES = 2;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

// cartoon roll: lean back with a squash, whip through the turn fast then
// slow, stretched along the motion, overshoot and wobble back to rest
function pose(
  roll: { startedAt: number; durationMs: number } | undefined | null,
  now: number,
): RollPose {
  if (!roll) return REST;
  const t = (now - roll.startedAt) / roll.durationMs;
  if (t <= 0 || t >= 1) return REST;
  if (t < WINDUP_END) {
    const p = easeInOutSine(t / WINDUP_END);
    return {
      angle: WINDUP_ANGLE * p,
      scaleX: 1 + SQUASH * 0.6 * p,
      scaleY: 1 - SQUASH * p,
    };
  }
  if (t < SPIN_END) {
    const p = (t - WINDUP_END) / (SPIN_END - WINDUP_END);
    const eased = easeOutCubic(p);
    // stretch peaks early, while the spin is fastest
    const stretch = Math.sin(Math.PI * Math.min(1, p * 1.6));
    return {
      angle:
        WINDUP_ANGLE + (Math.PI * 2 + OVERSHOOT_ANGLE - WINDUP_ANGLE) * eased,
      scaleX: 1 + SQUASH * 0.6 * (1 - p) - SQUASH * 0.5 * stretch,
      scaleY: 1 - SQUASH * (1 - p) + SQUASH * stretch,
    };
  }
  const p = (t - SPIN_END) / (1 - SPIN_END);
  // several decaying back-and-forth wiggles from the overshoot, easing into
  // exactly one full turn
  const wobble = Math.cos(p * Math.PI * SETTLE_WIGGLES * 2) * (1 - p) ** 2.2;
  return {
    angle: Math.PI * 2 + OVERSHOOT_ANGLE * wobble,
    scaleX: 1 - SQUASH * 0.3 * wobble,
    scaleY: 1 + SQUASH * 0.3 * wobble,
  };
}

export function getTotalRollPose(now: number): RollPose {
  return pose(totalRoll, now);
}

export function getBarRollPose(floor: Floor, now: number): RollPose {
  return pose(barRolls.get(floor), now);
}
