// the full 360° "roll" an event's coin target (the total-income readout or a
// floor's income bar) does when that event ends, timed to span the ending sound
import type { Floor } from "../../gameState";
import { smoothstep } from "../easing";

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

function angle(
  roll: { startedAt: number; durationMs: number } | undefined | null,
  now: number,
): number {
  if (!roll) return 0;
  const t = (now - roll.startedAt) / roll.durationMs;
  if (t <= 0 || t >= 1) return 0;
  // eases in and out so the roll starts and settles with the sound
  return smoothstep(t) * Math.PI * 2;
}

export function getTotalRollAngle(now: number): number {
  return angle(totalRoll, now);
}

export function getBarRollAngle(floor: Floor, now: number): number {
  return angle(barRolls.get(floor), now);
}
