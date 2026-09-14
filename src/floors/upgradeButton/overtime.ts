// "Work overtime" boost: a purchasable, targeted alternative to Sale (see
// hud/boostMenu/index.ts's buyOvertimeBoost, which picks a random floor and calls
// triggerOvertimeBoost below). While active, this floor's button wiggles like a
// crit/sale and shows "Overtime" instead of its price; clicking it is free and
// adds ticks to the floor's own overtime gauge instead of paying out anything —
// incomePanel.ts's drawIncomePanel swaps its normal fill-cycle bar for a gauge
// (0..getOvertimeTickGoal(floor)) while this is active. A crit rolled during
// overtime (see floorInteractions/index.ts) scales the ticks a click adds by
// that tier's own CRIT_TIER_CONFIG[tier].multiplier instead of granting free
// upgrades/a bigger sale payout.
//
// Unlike Sale/Frozen/Snowball, this run's own state (overtimeTicks/
// overtimeStartedAt/overtimeCost) lives directly on the Floor object
// (gameState.ts), not a shared.ts createTimedFloorEvent — so it's persisted
// (survives a reload) and travels with the floor across building switches.
// The drain tail is derived purely from (overtimeTicks, overtimeStartedAt,
// now), so it correctly keeps draining across however long the app was
// actually closed, same idea as gameState.ts's idle-income catch-up.
import type { Floor } from "../../gameState";
import { type BigNumber } from "../../shared/bigNumber";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import { registerEventButton } from "./shared";

export const OVERTIME_DURATION_MS = CONFIG.overtime.durationMs;
const OVERTIME_BASE_TICK_GOAL = CONFIG.overtime.tickGoal;
const OVERTIME_TICK_GOAL_MULTIPLIER_BY_TIER =
  CONFIG.overtime.tickGoalMultiplierByTier;
// once the interactive window closes, the gauge ticks back down toward 0 at
// this fixed rate (see getOvertimeDisplayTicks below) — 1 tick per this many ms
export const OVERTIME_DRAIN_MS_PER_TICK = CONFIG.overtime.drainMsPerTick;

// a floor's own overtime gauge goal — scales up with its CURRENT permanent crit
// tier (2x on a 5x/crit floor, 3x on 25x/mega, 4x on 125x/ultra) since a higher
// tier already earns more per tick, matching CRIT_TIER_CONFIG's own progression
export function getOvertimeTickGoal(floor: Floor): number {
  const tier = floor.critMultiplierTier;
  const tierMultiplier = tier ? OVERTIME_TICK_GOAL_MULTIPLIER_BY_TIER[tier] : 1;
  return OVERTIME_BASE_TICK_GOAL * tierMultiplier;
}

// starts (or restarts) the interactive window with a given starting tick count —
// shared by a fresh paid trigger (starts at 0) and a drain-tail re-trigger (starts
// wherever the gauge currently sits, see retriggerOvertimeBoost)
function startOvertimeWindow(
  floor: Floor,
  now: number,
  startingTicks: number,
): void {
  floor.overtimeStartedAt = now;
  floor.overtimeTicks = Math.min(getOvertimeTickGoal(floor), startingTicks);
}

export function triggerOvertimeBoost(floor: Floor, cost: BigNumber): void {
  floor.overtimeCost = cost;
  startOvertimeWindow(floor, Date.now(), 0);
}

// the price hud/boostMenu.ts's buyOvertimeBoost actually spent to start this
// floor's CURRENT overtime run — ZERO if it was never triggered
export function getOvertimeCost(floor: Floor): BigNumber {
  return floor.overtimeCost;
}

// the interactive 15s window only — gates the button's wiggle/label/free-click
// eligibility. See isOvertimeGaugeVisible below for how much longer the BAR
// itself keeps showing the gauge after this goes false (the drain-down tail)
export function isOvertimeActive(floor: Floor, now: number): boolean {
  return (
    floor.overtimeStartedAt !== null &&
    now - floor.overtimeStartedAt < OVERTIME_DURATION_MS
  );
}

// ends the interactive window immediately (see floorInteractions.ts's
// goal-reached branch: filling the gauge all the way ends the event early
// instead of waiting out the rest of its own 15s) by backdating its own start
// time — ticks are left untouched, so the drain tail picks up right where the
// gauge currently sits instead of restarting it
export function endOvertimeActiveWindow(floor: Floor, now: number): void {
  if (!isOvertimeActive(floor, now)) return;
  floor.overtimeStartedAt = now - OVERTIME_DURATION_MS;
}

// call once per free overtime click — adds `count` ticks (1, or a landed crit
// tier's own multiplier), clamped so the gauge never reads past its own 100% fill
export function addOvertimeTicks(floor: Floor, count: number): void {
  floor.overtimeTicks = Math.min(
    getOvertimeTickGoal(floor),
    floor.overtimeTicks + count,
  );
}

export function getOvertimeTicks(floor: Floor): number {
  return floor.overtimeTicks;
}

// call right when a tier promotion completes (see floorInteractions.ts's
// goal-reached branch): snaps the gauge back to empty immediately instead of
// leaving it at the just-maxed value, which would otherwise read as already
// partway toward the NEXT (bigger) tier's own goal once it recolors/resizes
export function resetOvertimeTicks(floor: Floor): void {
  floor.overtimeTicks = 0;
}

// milliseconds since the interactive window closed, or null while still active/
// never triggered — the drain phase's own local clock
function overtimeDrainElapsedMs(floor: Floor, now: number): number | null {
  if (floor.overtimeStartedAt === null) return null;
  const elapsed = now - (floor.overtimeStartedAt + OVERTIME_DURATION_MS);
  return elapsed >= 0 ? elapsed : null;
}

// the gauge's own current tick count for DISPLAY purposes: the raw stored value
// while actively filling, ticking back down toward 0 at OVERTIME_DRAIN_MS_PER_TICK
// once the interactive window ends, 0 once fully drained or never triggered
export function getOvertimeDisplayTicks(floor: Floor, now: number): number {
  if (isOvertimeActive(floor, now)) return getOvertimeTicks(floor);
  const drainElapsedMs = overtimeDrainElapsedMs(floor, now);
  if (drainElapsedMs === null) return 0;
  const ticksDrained = drainElapsedMs / OVERTIME_DRAIN_MS_PER_TICK;
  return Math.max(0, getOvertimeTicks(floor) - ticksDrained);
}

// whether incomePanel.ts should still be showing the gauge at all — either
// actively filling, or past its own 15s window but still ticking back down to 0
export function isOvertimeGaugeVisible(floor: Floor, now: number): boolean {
  return (
    isOvertimeActive(floor, now) || getOvertimeDisplayTicks(floor, now) > 0
  );
}

// specifically the drain tail (past the interactive window, gauge not yet fully
// drained) — incomePanel.ts wiggles the bar and floorInteractions.ts makes it
// clickable ONLY during this narrower window, not while actively filling
export function isOvertimeDraining(floor: Floor, now: number): boolean {
  return (
    !isOvertimeActive(floor, now) && getOvertimeDisplayTicks(floor, now) > 0
  );
}

// re-trigger during the drain tail (see floorInteractions.ts's click handling):
// restarts the interactive window, but preserves the gauge's CURRENT (already
// partially-drained) value as its new starting point instead of resetting to 0 —
// repeating this enough times can chain all the way up to a fully-filled gauge.
// overtimeCost is left untouched, so a further re-trigger still charges the same
// price the original purchase did
export function retriggerOvertimeBoost(floor: Floor, now: number): void {
  startOvertimeWindow(
    floor,
    now,
    Math.round(getOvertimeDisplayTicks(floor, now)),
  );
}

// 0..1 fill fraction for incomePanel.ts's gauge — 0 once neither actively
// filling nor still draining down
export function getOvertimeFillFraction(floor: Floor, now: number): number {
  if (!isOvertimeGaugeVisible(floor, now)) return 0;
  return getOvertimeDisplayTicks(floor, now) / getOvertimeTickGoal(floor);
}

registerEventButton({
  key: "overtime",
  color: COLOR.amber,
  freeClick: true,
  isActive: isOvertimeActive,
  label: (critMultiplier) =>
    critMultiplier !== null ? `Overtime x${critMultiplier}` : "Overtime",
});
