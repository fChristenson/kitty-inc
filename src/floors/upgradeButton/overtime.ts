import type { Floor } from "../../gameState";
import { type BigNumber } from "../../shared/bigNumber";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import { registerEventButton } from "./shared";

export const OVERTIME_DRAIN_MS_PER_TICK = CONFIG.overtime.drainMsPerTick;
const cancellationArmed = new WeakSet<Floor>();

export function getOvertimeTickGoal(floor: Floor): number {
  const tier = floor.critMultiplierTier;
  return (
    CONFIG.overtime.tickGoal *
    (tier ? CONFIG.overtime.tickGoalMultiplierByTier[tier] : 1)
  );
}

export function getOvertimeDisplayGoal(floor: Floor): number {
  if (isOvertimeActive(floor, Date.now())) return getOvertimeTickGoal(floor);
  return floor.overtimeGoal ?? getOvertimeTickGoal(floor);
}

export function triggerOvertimeBoost(floor: Floor, cost: BigNumber): void {
  if (isOvertimeActive(floor, Date.now())) return;
  floor.overtimeCost = cost;
  floor.overtimeStartedAt = Date.now();
  floor.overtimeEndedAt = null;
  floor.overtimeGoal = getOvertimeTickGoal(floor);
  floor.overtimeTicks = 0;
  cancellationArmed.delete(floor);
}

export function getOvertimeCost(floor: Floor): BigNumber {
  return floor.overtimeCost;
}

export function isOvertimeActive(floor: Floor, _now: number): boolean {
  return floor.overtimeStartedAt !== null && floor.overtimeEndedAt == null;
}

export function endOvertimeActiveWindow(floor: Floor, now: number): void {
  if (!isOvertimeActive(floor, now)) return;
  floor.overtimeGoal ??= getOvertimeTickGoal(floor);
  floor.overtimeEndedAt = now;
  cancellationArmed.delete(floor);
}

export function canCancelOvertime(floor: Floor, now: number): boolean {
  return (
    floor.unlocked && isOvertimeActive(floor, now) && floor.overtimeTicks > 0
  );
}

export function isOvertimeCancelArmed(floor: Floor, now: number): boolean {
  return canCancelOvertime(floor, now) && cancellationArmed.has(floor);
}

export function tapOvertimeBar(floor: Floor, now: number): void {
  if (!canCancelOvertime(floor, now)) return;
  if (cancellationArmed.has(floor)) endOvertimeActiveWindow(floor, now);
  else cancellationArmed.add(floor);
}

export function addOvertimeTicks(floor: Floor, count: number): void {
  if (!isOvertimeActive(floor, Date.now())) return;
  floor.overtimeTicks = Math.min(
    getOvertimeTickGoal(floor),
    floor.overtimeTicks + count,
  );
}

export function getOvertimeTicks(floor: Floor): number {
  return floor.overtimeTicks;
}

export function getOvertimeDisplayTicks(floor: Floor, now: number): number {
  if (isOvertimeActive(floor, now)) return floor.overtimeTicks;
  if (floor.overtimeEndedAt == null) return 0;
  const elapsed = Math.max(0, now - floor.overtimeEndedAt);
  return Math.max(
    0,
    floor.overtimeTicks - elapsed / OVERTIME_DRAIN_MS_PER_TICK,
  );
}

export function isOvertimeGaugeVisible(floor: Floor, now: number): boolean {
  return (
    isOvertimeActive(floor, now) || getOvertimeDisplayTicks(floor, now) > 0
  );
}

export function isOvertimeDraining(floor: Floor, now: number): boolean {
  return (
    !isOvertimeActive(floor, now) && getOvertimeDisplayTicks(floor, now) > 0
  );
}

export function getOvertimeFillFraction(floor: Floor, now: number): number {
  if (!isOvertimeGaugeVisible(floor, now)) return 0;
  return Math.min(
    1,
    getOvertimeDisplayTicks(floor, now) / getOvertimeDisplayGoal(floor),
  );
}

registerEventButton({
  key: "overtime",
  color: COLOR.amber,
  freeClick: true,
  isActive: isOvertimeActive,
  label: (critMultiplier) =>
    critMultiplier !== null ? `Overtime x${critMultiplier}` : "Overtime",
});
