import { FLOOR_H, DIVIDER_H, SIDE_WALL_WIDTH } from "../constants";
import {
  countBoostedWorkers,
  isFloorMaxed,
  MAX_FLOOR_LEVEL,
  type Floor,
} from "../../gameState";
import { MAX_RENDERED_WORKERS, permaBoostSpeedMultiplier } from "../worker";
import {
  isOvertimeGaugeVisible,
  isOvertimeCancelArmed,
  getOvertimeDisplayTicks,
  getOvertimeDisplayGoal,
  getBoilHeat,
  getHoldHeat,
} from "../upgradeButton";
import {
  CRIT_TIER_CONFIG,
  isFrozenActive,
  isSpendingFreezeActive,
  isRushHourActive,
  RUSH_HOUR_INTERVAL_SECONDS,
  isRateLockActive,
  RATE_LOCK_SPEED_MULTIPLIER,
  getPriceMatchCost,
  drawPoppingCritText,
} from "../../crits";
import { getWiggleRotation } from "../../shared/wiggle";

import { drawGlow, fadeStops, type FadeStops } from "../../shared/glowSprite";
import { drawSlamTarget, getSlamPose } from "../../shared/eventEndSlam";
import {
  createAbsorbPulse,
  mergeFlashWhite,
  type AbsorbPulse,
} from "../../shared/mergeFlash";
import {
  drawTargetStream,
  getTargetTension,
  hitTargetStream,
} from "../../shared/eventFx";
import {
  officeUpgradeSpeedMultiplier,
  effectiveIncomeCycle as sharedEffectiveIncomeCycle,
  collectDueIncome as sharedCollectDueIncome,
  peekDueIncome as sharedPeekDueIncome,
  currentIncomeRatePerSecond as sharedCurrentIncomeRatePerSecond,
} from "../../shared/income";
import { type BigNumber, add, multiply } from "../../shared/bigNumber";
import {
  drawCachedCartoonText,
  formatPrice,
  formatTime,
  roundRect,
} from "../../utils";
import { drawChevronBar, prewarmChevronBar } from "../../shared/glossyWidgets";
import { launchMs, launchOffset, type BarLaunch } from "../../shared/barLaunch";
import { runWhenIdle } from "../../shared/idle";
import {
  drawBoilingBar,
  drawPressureBar,
  type PressurePose,
} from "../../shared/pressureBar";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";
import {
  upgradePriceAfter,
  upgradeSpeedMultiplier,
} from "../../shared/upgradeEconomy";

// panel placement, bottom-left corner of each floor (mirrors the upgrade button on the right).
// Scaled up from the original 360 as far as the gap to the upgrade button allows. PANEL_X is
// set so the bar's own left edge (barX below, PANEL_X + 18) lands flush against SIDE_WALL_WIDTH
export const PANEL_W = 440;
export const PANEL_H = 120;
export const PANEL_X = SIDE_WALL_WIDTH - 18;
// centered inside the divider band below (see outerWall/index.ts's DIVIDER_H),
// mounted on top of it since that's drawn first, nudged down 10px from dead
// center — except the bottom (ground) floor, which stays at dead center
function getPanelY(isGroundFloor: boolean): number {
  const base = FLOOR_H - DIVIDER_H / 2 - PANEL_H / 2;
  return isGroundFloor ? base : base + 10;
}

// the visible bar's own geometry, hoisted out of drawIncomePanel so
// getIncomeBarCenter below can share it instead of duplicating these numbers
const BAR_INSET = 18;
export const BAR_W = (PANEL_W - 36) * 1.5;
// scaled up alongside PANEL_W; still comfortably clears the divider band's vertical bounds
const BAR_H = 92;

runWhenIdle(() =>
  prewarmChevronBar(BAR_W, BAR_H, BAR_H / 3, [
    COLOR.moneyGreen,
    ...Object.values(CRIT_TIER_CONFIG).map((tier) => tier.color),
  ]),
);

// center of the visible income bar, floor-local — for spawning effects (e.g. the
// "Sale" boost's floating +income text) right on top of it
export function getIncomeBarCenter(isGroundFloor: boolean): {
  x: number;
  y: number;
} {
  const box = getIncomeBarBox(isGroundFloor);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// the visible income bar's floor-local box and corner radius
export function getIncomeBarBox(isGroundFloor: boolean): {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
} {
  return {
    x: PANEL_X + BAR_INSET,
    y: getPanelY(isGroundFloor) + PANEL_H / 2 - BAR_H / 2,
    width: BAR_W,
    height: BAR_H,
    radius: BAR_H / 3,
  };
}

// an event overlay draws this floor's bar itself (drawIncomePanel's eventFlash)
let hiddenFloors: ReadonlySet<Floor> = new Set();
export function setIncomePanelHidden(floor: Floor | null): void {
  setIncomePanelsHidden(floor ? [floor] : []);
}
export function setIncomePanelsHidden(floors: Floor[]): void {
  hiddenFloors = new Set(floors);
}

// Hit testing for the active overtime bar's two-tap cancellation control.
export function hitTestIncomeBar(
  x: number,
  y: number,
  isGroundFloor: boolean,
): boolean {
  const barY = getPanelY(isGroundFloor) + PANEL_H / 2 - BAR_H / 2;
  const barX = PANEL_X + BAR_INSET;
  return x >= barX && x <= barX + BAR_W && y >= barY && y <= barY + BAR_H;
}

// the bar's own "juicy" press bounce for the drain-tail re-trigger click (see
// floorInteractions.ts) — same squash-then-overshoot feel/constants as the
// upgrade button's own press animation (floors/upgradeButton's pressScale), but
// independent per-floor state so pressing the BAR doesn't also visibly bounce
// the (unrelated, already-reverted-to-normal) upgrade button next to it
const barPressedAt = new WeakMap<Floor, number>();
const BAR_PRESS_DURATION_MS = 450;
const BAR_PRESS_AMPLITUDE = 0.18;
const BAR_PRESS_DECAY = 9;
const BAR_PRESS_FREQUENCY = 26;

export function triggerIncomeBarPress(floor: Floor): void {
  barPressedAt.set(floor, Date.now());
}

// a rapid fire crit's characters punching the bar (critFlash's FlashPunch): each hit jolts
// it down and flashes it white; the levels it gave rise off it, and it glows
// in the crit's color for a while after
const barPunches = new WeakMap<
  Floor,
  { hitAt: number; label: string | null; labelAt: number; color: string | null }
>();
// of the bar's height
const PUNCH_JOLT = 0.45;
const PUNCH_DECAY_MS = 90;
const PUNCH_WOBBLE = 0.05;
const PUNCH_SQUASH = 0.4;
const PUNCH_SPREAD = 0.12;
const PUNCH_FLASH_MS = 300;
const PUNCH_RING_MS = 320;
// of the bar's width
const PUNCH_SLOSH = 0.15;
const PUNCH_SLOSH_MS = 900;
const PUNCH_SLOSH_DECAY_MS = 250;
const PUNCH_SLOSH_PERIOD_MS = 200;
const PUNCH_LABEL_MS = 1000;
const PUNCH_LABEL_RISE = 70;
const PUNCH_LABEL_FONT = 80;
const AFTERGLOW_MS = 1000;
const AFTERGLOW_ALPHA = 0.8;

// label: what the first hit gave ("+10 Lvl"); later hits keep it. color:
// the crit's, which the bar glows in afterwards
export function punchIncomeBar(
  floor: Floor,
  label: string | null,
  color: string | null = null,
): void {
  const now = Date.now();
  const punch = barPunches.get(floor);
  if (punch && label === null) {
    punch.hitAt = now;
    punch.color = color ?? punch.color;
  } else barPunches.set(floor, { hitAt: now, label, labelAt: now, color });
}

// a quake crit's bar leaping off its floor and crashing back down, or a
// tractor beam's hauling it up, holding it there shaking and dropping it
const barLifts = new WeakMap<
  Floor,
  { at: number; ms: number; haul: boolean }
>();
const LIFT_H = BAR_H * 2.4;
// a haul's rise and shaking hold, of its time; the rest is its drop
const HAUL_RISE = 0.68;
const HAUL_HOLD = 0.91;
const HAUL_SHAKE = 0.04;

export function liftIncomeBar(floor: Floor, ms: number, haul = false): void {
  barLifts.set(floor, { at: Date.now(), ms, haul });
}

function liftOf(floor: Floor, now: number): number {
  const lift = barLifts.get(floor);
  if (!lift) return 0;
  const u = Math.max(0, (now - lift.at) / lift.ms);
  if (u >= 1) {
    barLifts.delete(floor);
    return 0;
  }
  if (!lift.haul) return LIFT_H * Math.sin(Math.PI * u);
  if (u < HAUL_RISE) {
    const p = u / HAUL_RISE;
    return LIFT_H * p * p * (3 - 2 * p);
  }
  if (u < HAUL_HOLD) return LIFT_H * (1 + HAUL_SHAKE * Math.sin(now * 0.35));
  return LIFT_H * (1 - ((u - HAUL_HOLD) / (1 - HAUL_HOLD)) ** 2);
}

// a floor crit's bar crumbling away from its left end, gone a while, then
// rebuilt from its left end
const barCrumbles = new WeakMap<
  Floor,
  { at: number; crumbleMs: number; holdMs: number; rebuildMs: number }
>();

export function crumbleIncomeBar(
  floor: Floor,
  crumbleMs: number,
  holdMs: number,
  rebuildMs: number,
): void {
  barCrumbles.set(floor, { at: Date.now(), crumbleMs, holdMs, rebuildMs });
}

// the share of the bar still standing, as from..to of its width; null if whole
function crumbleOf(
  floor: Floor,
  now: number,
): { from: number; to: number } | null {
  const c = barCrumbles.get(floor);
  if (!c) return null;
  const t = Math.max(0, now - c.at);
  if (t < c.crumbleMs) return { from: t / c.crumbleMs, to: 1 };
  if (t < c.crumbleMs + c.holdMs) return { from: 1, to: 1 };
  const rebuilt = (t - c.crumbleMs - c.holdMs) / c.rebuildMs;
  if (rebuilt < 1) return { from: 0, to: rebuilt };
  barCrumbles.delete(floor);
  return null;
}

// a liftoff crit's bar blasting off like a rocket and back
const barLaunches = new WeakMap<Floor, { at: number; launch: BarLaunch }>();

export function launchIncomeBar(floor: Floor, launch: BarLaunch): void {
  barLaunches.set(floor, { at: Date.now(), launch });
}

// px right of its place
function launchOf(floor: Floor, now: number): number {
  const l = barLaunches.get(floor);
  if (!l) return 0;
  const ms = now - l.at;
  if (ms >= launchMs(l.launch)) {
    barLaunches.delete(floor);
    return 0;
  }
  return launchOffset(l.launch, ms) * BAR_W;
}

function punchSince(floor: Floor, now: number) {
  const punch = barPunches.get(floor);
  if (!punch) return null;
  if (
    now - punch.labelAt > PUNCH_LABEL_MS &&
    now - punch.hitAt > Math.max(PUNCH_FLASH_MS, AFTERGLOW_MS)
  ) {
    barPunches.delete(floor);
    return null;
  }
  return punch;
}

const afterglowStops = new Map<string, FadeStops>();
function afterglowStopsFor(color: string): FadeStops {
  let stops = afterglowStops.get(color);
  if (!stops) {
    stops = fadeStops(color);
    afterglowStops.set(color, stops);
  }
  return stops;
}

function incomeBarPressScale(floor: Floor, now: number): number {
  const startedAt = barPressedAt.get(floor);
  if (startedAt === undefined) return 1;
  const elapsedMs = now - startedAt;
  if (elapsedMs >= BAR_PRESS_DURATION_MS) return 1;
  const t = elapsedMs / 1000;
  return (
    1 -
    BAR_PRESS_AMPLITUDE *
      Math.exp(-BAR_PRESS_DECAY * t) *
      Math.cos(BAR_PRESS_FREQUENCY * t)
  );
}

// overtime ticks already credited but still riding coins toward the bar, so the
// readout only climbs as each coin lands (see floorInteractions' overtime click)
const pendingOvertimeTicks = new WeakMap<
  Floor,
  { ticks: number; queuedAt: number }
>();
// longer than any homing coin's flight, so an evicted coin can't pin the readout
const PENDING_OVERTIME_MAX_AGE_MS = 2500;
const overtimeFlashedAt = new WeakMap<Floor, number>();
const overtimeAbsorb = new WeakMap<Floor, AbsorbPulse>();
const OVERTIME_FLASH_MS = 700;

export function queueOvertimeTickDelivery(floor: Floor, ticks: number): void {
  const pending = pendingOvertimeTicks.get(floor)?.ticks ?? 0;
  pendingOvertimeTicks.set(floor, {
    ticks: pending + ticks,
    queuedAt: Date.now(),
  });
}

export function deliverOvertimeTicks(floor: Floor, ticks: number): void {
  const pending = pendingOvertimeTicks.get(floor);
  if (pending) pending.ticks = Math.max(0, pending.ticks - ticks);
  const now = Date.now();
  overtimeFlashedAt.set(floor, now);
  let absorb = overtimeAbsorb.get(floor);
  if (!absorb) {
    absorb = createAbsorbPulse();
    overtimeAbsorb.set(floor, absorb);
  }
  absorb.hit(now);
  hitTargetStream(floor, "bar");
}

export function clearOvertimeTickDelivery(floor: Floor): void {
  pendingOvertimeTicks.delete(floor);
}

function pendingOvertimeTicksFor(floor: Floor, now: number): number {
  const pending = pendingOvertimeTicks.get(floor);
  if (!pending) return 0;
  if (now - pending.queuedAt > PENDING_OVERTIME_MAX_AGE_MS) {
    pendingOvertimeTicks.delete(floor);
    return 0;
  }
  return pending.ticks;
}

function shownOvertimeTicks(floor: Floor, now: number): number {
  return Math.max(
    0,
    getOvertimeDisplayTicks(floor, now) - pendingOvertimeTicksFor(floor, now),
  );
}

// 1 right as a coin lands, fading to 0 — same white wiggle the total-income
// readout does when bonus coins merge into it
function overtimeFlashStrength(floor: Floor, now: number): number {
  const flashedAt = overtimeFlashedAt.get(floor);
  if (flashedAt === undefined) return 0;
  const elapsed = now - flashedAt;
  if (elapsed >= OVERTIME_FLASH_MS) {
    overtimeFlashedAt.delete(floor);
    return 0;
  }
  return 1 - elapsed / OVERTIME_FLASH_MS;
}

// when each floor's current fill cycle started is floor.lastCollectedAt itself (a
// persisted, Date.now()-based timestamp) — no separate in-memory clock, so a page
// reload never resets/loses how far into its current cycle a floor already was
let tickerRunning = false;

// upgradeCount hitting a multiple of this is also the "next ten levels" milestone
// floorInteractions.ts celebrates with an extra coin burst at the upgrade indicator
export const UPGRADE_MILESTONE_STEP = CONFIG.incomePanel.upgradeMilestoneStep;
// Cost growth stays close to income's milestone speed growth for sustained progression.

export function increaseIncomeRate(floor: Floor): void {
  if (isFloorMaxed(floor)) return;
  // a permanently-crited floor (see floorInteractions.ts's rollFloorBuyCrit)
  // multiplies every upgrade's own rate gain by that tier's multiplier, forever —
  // distinct from the temporary crit-jackpot's free stacked upgrades
  const rateMultiplier = floor.critMultiplierTier
    ? CRIT_TIER_CONFIG[floor.critMultiplierTier].multiplier
    : 1;
  floor.incomeAmount = add(
    floor.incomeAmount,
    multiply(floor.rateStep, rateMultiplier),
  );
  // "frozen crit" (see crits/floorCrits/frozen.ts's isFrozenActive): while
  // active, this floor's upgradeCost is locked — every other part of the
  // tick (rate gain, upgradeCount, interval-halving) proceeds as normal
  if (
    !isFrozenActive(floor, Date.now()) &&
    !isSpendingFreezeActive(floor, Date.now()) &&
    getPriceMatchCost(floor, Date.now()) === null
  ) {
    floor.upgradeCost = upgradePriceAfter(floor, 1);
  }
  floor.upgradeCount += 1;
  // no MIN_INCOME_INTERVAL_SECONDS clamp here — this stores the floor's true,
  // uncapped base interval, which effectiveIncomeCycle's own clamp below already
  // folds into the overspeed payout multiplier the exact same way it does for a
  // boost/office-upgrade speedup. Clamping it at the source instead pinned every
  // sufficiently-upgraded floor's stored interval at exactly the minimum, so
  // uncappedIntervalSeconds could only ever dip below the minimum (the actual
  // overspeed/"filled bar" trigger) from a boost or office upgrade, never from
  // upgrades alone
  floor.incomeIntervalSeconds *=
    upgradeSpeedMultiplier(floor.upgradeCount - 1) /
    upgradeSpeedMultiplier(floor.upgradeCount);
}

// Applies many normal upgrade-rate increases in one pass. This is used by crit
// rewards that replay an existing floor's large upgrade count; iterating once
// per historical upgrade freezes the main thread on mature floors.
export function increaseIncomeRateBy(floor: Floor, count: number): void {
  count = Math.min(count, MAX_FLOOR_LEVEL - floor.upgradeCount);
  if (count <= 0) return;
  const rateMultiplier = floor.critMultiplierTier
    ? CRIT_TIER_CONFIG[floor.critMultiplierTier].multiplier
    : 1;
  floor.incomeAmount = add(
    floor.incomeAmount,
    multiply(floor.rateStep, rateMultiplier * count),
  );
  if (
    !isFrozenActive(floor, Date.now()) &&
    !isSpendingFreezeActive(floor, Date.now()) &&
    getPriceMatchCost(floor, Date.now()) === null
  ) {
    floor.upgradeCost = upgradePriceAfter(floor, count);
  }
  const previousUpgradeCount = floor.upgradeCount;
  floor.upgradeCount += count;
  floor.incomeIntervalSeconds *=
    upgradeSpeedMultiplier(previousUpgradeCount) /
    upgradeSpeedMultiplier(floor.upgradeCount);
}

// how many times faster than its own base incomeIntervalSeconds this floor is
// currently running, from the temporary worker boost and the permanent office
// upgrades combined — computed BEFORE the MIN_INCOME_INTERVAL_SECONDS clamp below
// folds any further speed into a payout multiplier instead
function currentSpeedMultiplier(floor: Floor, now: number): number {
  const boostedFraction =
    countBoostedWorkers(floor, now) / MAX_RENDERED_WORKERS;
  const boostExponent =
    boostedFraction * (floor.workerCount + (floor.hasManager ? 1 : 0));
  const speedMultiplier =
    2 ** boostExponent *
    officeUpgradeSpeedMultiplier(floor) *
    permaBoostSpeedMultiplier(floor, now);
  let effectiveSpeedMultiplier = speedMultiplier;
  if (isRateLockActive(floor, now)) {
    effectiveSpeedMultiplier = Math.max(
      effectiveSpeedMultiplier,
      1 / RATE_LOCK_SPEED_MULTIPLIER,
    );
  }
  if (!isRushHourActive(floor, now)) return effectiveSpeedMultiplier;
  // "Rush Hour" crit (see crits/critTypes' isRushHourActive): the floor's
  // own income timer is capped at RUSH_HOUR_INTERVAL_SECONDS while active —
  // Math.max picks whichever multiplier yields the SMALLER (faster) interval,
  // so this stacks with (never undoes) whatever worker/office speed already
  // applies, and a floor already faster than the cap is left untouched
  return Math.max(
    effectiveSpeedMultiplier,
    floor.incomeIntervalSeconds / RUSH_HOUR_INTERVAL_SECONDS,
  );
}

// the interval/payout actually used for filling/paying out: each boosted visual worker
// slot (of MAX_RENDERED_WORKERS) represents that fraction of the floor's real workforce,
// so the halving exponent scales with the actual workerCount behind it — boosting 1 of 3
// slots only speeds up 1/3 of the workers, while boosting all 3 means every worker is
// boosted and their doublings stack multiplicatively (cumulative), same as a global boost.
// the interval is clamped to a MIN_INCOME_INTERVAL_SECONDS floor (ticking any faster
// isn't visually manageable) — any speed beyond that is folded into a payout
// multiplier instead, so the player always earns the same $/sec the uncapped
// interval implies either way. There is deliberately no upper clamp here anymore:
// a floor's own incomeIntervalSeconds is only ever capped once, at creation (see
// MAX_INCOME_INTERVAL_SECONDS/buildFloor) — from then on it halves via upgrades
// exactly like any other floor, with no re-imposed ceiling masking that progress.
// Thin wrapper over shared/income's pure formula — this is the ONE place that
// folds the worker-boost-aware speed multiplier in; gameState's idle catch-up
// calls the shared formula directly with just officeUpgradeSpeedMultiplier
function effectiveIncomeCycle(
  floor: Floor,
  now: number,
): { intervalSeconds: number; amount: BigNumber; overspeed: boolean } {
  return sharedEffectiveIncomeCycle(floor, currentSpeedMultiplier(floor, now));
}

// advances a floor's fill cycle by however many full intervals have elapsed since it was last
// checked, returning the $ earned from those completed cycles (ZERO if the bar hasn't filled yet).
// shares the same clock (and the same floor.lastCollectedAt anchor) the bar itself draws
// from, so a payout always lines up with the bar visually completing instead of money
// trickling in continuously underneath a stepped bar
export function collectDueIncome(floor: Floor, now: number): BigNumber {
  return sharedCollectDueIncome(floor, now, currentSpeedMultiplier(floor, now));
}

// same math as collectDueIncome, but read-only — doesn't advance
// floor.lastCollectedAt. For companies that aren't the currently active one (see
// company.ts): their floors sit dormant instead of being ticked live, so this
// lets totalIncome.ts estimate what they'd have actually earned by now anyway,
// without needing every company's buildings loaded/ticking at once
export function peekDueIncome(floor: Floor, now: number): BigNumber {
  return sharedPeekDueIncome(floor, now, currentSpeedMultiplier(floor, now));
}

// a floor's own $ amount for exactly ONE completed payout cycle at its
// current effective rate (same cycle math collectDueIncome uses), without
// advancing floor.lastCollectedAt at all — used by the "Tick Tock" crit
// (floorInteractions.ts's applyTickTockCrit), which grants floors extra
// payouts while leaving their own visible fill-cycle progress untouched
export function currentPayoutAmount(floor: Floor, now: number): BigNumber {
  return effectiveIncomeCycle(floor, now).amount;
}

// how full (0..1) the bar is through its current cycle; an overspeed bar shows full
function cycleFill(
  floor: Floor,
  cycle: { intervalSeconds: number; overspeed: boolean },
  now: number,
): number {
  if (cycle.overspeed) return 1;
  const fillDurationMs = cycle.intervalSeconds * 1000;
  return ((now - floor.lastCollectedAt) % fillDurationMs) / fillDurationMs;
}

export function incomeBarFill(floor: Floor, now: number): number {
  return cycleFill(floor, effectiveIncomeCycle(floor, now), now);
}

// a floor's own $/sec at its current effective rate — same boost-aware cycle math
// collectDueIncome/peekDueIncome use, just expressed as a flat rate instead of a
// lump sum. Worker boost state and office-upgrade multipliers are read straight off
// the floor itself, so this stays accurate even for a company that isn't the
// currently active one (see totalIncome.ts's getCompanyWealth)
export function currentIncomeRatePerSecond(
  floor: Floor,
  now: number,
): BigNumber {
  return sharedCurrentIncomeRatePerSecond(
    floor,
    currentSpeedMultiplier(floor, now),
  );
}

// one payout granted by a crit or event: CONFIG.crit.payoutSeconds of the floor's income
export function rewardPayoutAmount(floor: Floor, now: number): BigNumber {
  return multiply(
    currentIncomeRatePerSecond(floor, now),
    CONFIG.crit.payoutSeconds,
  );
}

// seconds left until the current fill cycle completes, counting down from the full
// interval to 0 in lockstep with drawIncomePanel's own bar-fill percentage (same
// lastCollectedAt anchor and modulo-wrap), instead of always showing the constant interval
function remainingCycleSeconds(
  floor: Floor,
  now: number,
  intervalSeconds: number,
): number {
  const intervalMs = intervalSeconds * 1000;
  const elapsed = now - floor.lastCollectedAt;
  return (intervalMs - (elapsed % intervalMs)) / 1000;
}

function formatIncomeRate(
  floor: Floor,
  now: number,
  cycle: ReturnType<typeof effectiveIncomeCycle>,
): string {
  const { amount, overspeed, intervalSeconds } = cycle;
  const timeText = overspeed
    ? "s"
    : // round, not floor/ceil: flooring a 1s-interval countdown showed "0" for
      // virtually the whole cycle (remaining is only ever ~1 for an instant),
      // while ceiling it showed a frozen "1" that never visibly ticked down.
      // Rounding gives an actual "1" then "0" step partway through each cycle
      formatTime(
        Math.round(remainingCycleSeconds(floor, now, intervalSeconds)),
      );
  return `${formatPrice(overspeed ? currentIncomeRatePerSecond(floor, now) : amount)}/${timeText}`;
}

// static (non-ticking) variant for locked floors: shows the full interval instead of
// counting down, since a locked floor's cycle hasn't actually started (lastCollectedAt
// is just its creation time) — a live countdown here would just cycle forever against
// that fixed anchor instead of ever meaning "time until payout"
function formatStaticIncomeRate(floor: Floor, now: number): string {
  const { intervalSeconds, amount, overspeed } = effectiveIncomeCycle(
    floor,
    now,
  );
  const timeText = overspeed ? "s" : formatTime(intervalSeconds);
  return `${formatPrice(overspeed ? currentIncomeRatePerSecond(floor, now) : amount)}/${timeText}`;
}

// "Work overtime" boost's own progress readout — a plain tick count, not a $/time
// rate, since the gauge isn't paying out anything itself (see floors/upgradeButton).
// Reads the same drain-aware value/goal the bar's own fill fraction uses, so the
// number (and its own max) tick down/scale in lockstep with the bar itself
function formatOvertimeProgress(floor: Floor, now: number): string {
  return `${Math.floor(shownOvertimeTicks(floor, now))}/${getOvertimeDisplayGoal(floor)}`;
}

// the overtime gauge's own fill look: a two-color gradient spanning the WHOLE
// bar's width, from the floor's CURRENT permanent crit tier color to the NEXT
// tier's color (null/base -> green to purple, crit -> purple to gold, mega ->
// gold to red) — same colors CRIT_TIER_CONFIG already uses everywhere else, so
// filling the bar visibly previews the tier-up reward a full gauge grants (see
// floorInteractions.ts's overtime-goal-reached branch). An already-ultra floor
// has no next tier to preview, so it's just a solid red fill instead
function getGaugeGradientColors(floor: Floor): [string, string] {
  switch (floor.critMultiplierTier) {
    case null:
      return [COLOR.moneyGreen, CRIT_TIER_CONFIG.crit.color];
    case "crit":
      return [CRIT_TIER_CONFIG.crit.color, CRIT_TIER_CONFIG.mega.color];
    case "mega":
      return [CRIT_TIER_CONFIG.mega.color, CRIT_TIER_CONFIG.ultra.color];
    case "ultra":
      return [CRIT_TIER_CONFIG.ultra.color, CRIT_TIER_CONFIG.ultra.color];
  }
}

// starts the persistent redraw loop that animates every floor's fill bar; safe to call more than
// once. now that main.ts only ever redraws the small fixed-size visible-viewport canvas (not
// every floor), a full rAF cadence is cheap and gives a smooth-looking fill instead of visible steps
export function startIncomeTicker(onFrame: () => void): void {
  if (tickerRunning) return;
  tickerRunning = true;
  const tick = () => {
    // an uncaught throw here would skip the requestAnimationFrame call below and
    // permanently freeze every animation this loop drives (redraw, fill bars, ...)
    // for the rest of the page's life — one bad frame should never end the loop
    try {
      onFrame();
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function drawIncomePanel(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  isGroundFloor: boolean,
  // an event overlay's own flashing, wiggling copy (see crits/animatedCrits/events/upgradeEvent),
  // optionally filled to `fill` (0..1) instead of the live cycle
  eventFlash?: { whiteAlpha: number; rotation: number; fill?: number },
): void {
  if (hiddenFloors.has(floor) && !eventFlash) return;
  const x = PANEL_X;
  const y = getPanelY(isGroundFloor);

  const barX = x + BAR_INSET;
  const barW = BAR_W;
  const barH = BAR_H;
  const barY = y + PANEL_H / 2 - barH / 2;
  // rounded RECTANGLE, same as the upgrade button — NOT a full pill/stadium
  const barRadius = barH / 3;
  // roundRect needs at least 2x its own corner radius to render a well-formed shape;
  // using barH (60px) as the old minimum made the bar look paused for a noticeable
  // slice of every short cycle before it visibly started growing
  const barMinWidth = barRadius * 2;

  const now = Date.now();
  const timerNow = now;
  const overtimeGaugeVisible =
    floor.unlocked && isOvertimeGaugeVisible(floor, now);
  const cancellationArmed = isOvertimeCancelArmed(floor, now);
  const flashStrength = overtimeGaugeVisible
    ? overtimeFlashStrength(floor, now)
    : 0;
  // overtime's coins build the bar up while the player keeps pressing
  const tension = overtimeGaugeVisible ? getTargetTension(floor, "bar") : null;

  const barCenter = getIncomeBarCenter(isGroundFloor);
  const punch = punchSince(floor, now);
  const sincePunch = punch ? now - punch.hitAt : Infinity;
  const punchK =
    sincePunch === Infinity ? 0 : Math.exp(-sincePunch / PUNCH_DECAY_MS);
  const punchJolt =
    punchK > 0
      ? punchK * PUNCH_JOLT * BAR_H * Math.cos(sincePunch * PUNCH_WOBBLE)
      : 0;
  const lift = liftOf(floor, now);
  const crumble = crumbleOf(floor, now);
  const launched = launchOf(floor, now);
  const slam = getSlamPose(floor, "bar", now);
  const drawBar = (): void =>
    drawSlamTarget(
      ctx,
      slam,
      { x: barX, y: barY, width: barW, height: barH },
      { radius: barRadius },
      drawBarBody,
      now,
    );
  const drawBarBody = (): void => {
    if (crumble && crumble.from >= crumble.to) return;
    ctx.save();
    ctx.translate(barCenter.x + launched, barCenter.y + punchJolt - lift);
    if (cancellationArmed) ctx.rotate(getWiggleRotation(now));
    else if (tension) ctx.rotate(tension.rotation);
    else if (flashStrength > 0)
      ctx.rotate(getWiggleRotation(now) * flashStrength);
    if (eventFlash) ctx.rotate(eventFlash.rotation);
    // a stream's fx swells and shakes the bar itself (see drawTargetStream)
    const pressScale =
      incomeBarPressScale(floor, now) *
      (overtimeGaugeVisible && !tension
        ? (overtimeAbsorb.get(floor)?.scale(now) ?? 1)
        : 1);
    ctx.scale(pressScale, pressScale);
    if (punchK > 0.01) {
      // slammed flat onto its bottom edge, springing back
      ctx.translate(0, BAR_H / 2);
      ctx.scale(1 + PUNCH_SPREAD * punchK, 1 - PUNCH_SQUASH * punchK);
      ctx.translate(0, -BAR_H / 2);
    }
    ctx.translate(-barCenter.x, -barCenter.y);
    if (crumble) {
      // only the part still standing; a whole end keeps its rounded corner
      const left = crumble.from > 0 ? barX + barW * crumble.from : barX - barH;
      const right =
        crumble.to < 1 ? barX + barW * crumble.to : barX + barW + barH;
      ctx.beginPath();
      ctx.rect(left, barY - barH, right - left, barH * 3);
      ctx.clip();
    }

    // locked floors don't accrue, so their bar stays empty and its cycle hasn't started yet
    let fillW = barMinWidth;
    let overspeed = false;
    // computed once for the bar and the rate text below
    const cycle =
      floor.unlocked && !overtimeGaugeVisible
        ? effectiveIncomeCycle(floor, timerNow)
        : null;
    if (overtimeGaugeVisible) {
      const goal = getOvertimeDisplayGoal(floor);
      fillW = Math.max(
        barMinWidth,
        barW * Math.min(1, shownOvertimeTicks(floor, now) / goal),
      );
    } else if (cycle) {
      overspeed = cycle.overspeed && eventFlash?.fill === undefined;
      fillW = Math.max(
        barMinWidth,
        barW * (eventFlash?.fill ?? cycleFill(floor, cycle, timerNow)),
      );
    }
    if (sincePunch < PUNCH_SLOSH_MS) {
      // rung like a bell, its fill sloshing back and forth as it settles
      const slosh =
        PUNCH_SLOSH *
        Math.exp(-sincePunch / PUNCH_SLOSH_DECAY_MS) *
        Math.sin((2 * Math.PI * sincePunch) / PUNCH_SLOSH_PERIOD_MS);
      fillW = Math.min(barW, Math.max(barMinWidth, fillW + barW * slosh));
    }
    // a permanently-crited floor's bar matches its own tier color instead of the
    // usual green, mirroring the upgrade button's own color choice
    const fillColor = afterglowing
      ? punch!.color!
      : floor.critMultiplierTier
        ? CRIT_TIER_CONFIG[floor.critMultiplierTier].color
        : COLOR.moneyGreen;
    let pressure: PressurePose | null = null;
    const boilHeat = getBoilHeat(floor, now);
    const holdHeat = getHoldHeat(floor, now);
    if (overtimeGaugeVisible) {
      // the gauge flows too, in its tier-preview colors, racing and
      // straining while overtime runs
      const gauge = getGaugeGradientColors(floor);
      if (boilHeat > 0) {
        pressure = drawBoilingBar(
          ctx,
          floor,
          barX,
          barY,
          barW,
          barH,
          barRadius,
          fillW,
          COLOR.amber,
          now,
          boilHeat,
          holdHeat,
          gauge,
        );
      } else {
        drawChevronBar(
          ctx,
          floor,
          barX,
          barY,
          barW,
          barH,
          barRadius,
          fillW,
          COLOR.amber,
          now,
          0,
          gauge,
        );
      }
      const whiteAlpha = Math.max(
        flashStrength > 0 ? mergeFlashWhite(flashStrength, now) : 0,
        tension?.white ?? 0,
      );
      if (whiteAlpha > 0) {
        ctx.globalAlpha = whiteAlpha;
        roundRect(ctx, barX, barY, fillW, barH, barRadius);
        ctx.fillStyle = COLOR.white;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (overspeed) {
      pressure = drawPressureBar(
        ctx,
        floor,
        barX,
        barY,
        barW,
        barH,
        barRadius,
        fillW,
        fillColor,
        now,
        boilHeat,
        holdHeat,
      );
    } else if (holdHeat > 0) {
      pressure = drawBoilingBar(
        ctx,
        floor,
        barX,
        barY,
        barW,
        barH,
        barRadius,
        fillW,
        fillColor,
        now,
        boilHeat,
        holdHeat,
      );
    } else {
      drawChevronBar(
        ctx,
        floor,
        barX,
        barY,
        barW,
        barH,
        barRadius,
        fillW,
        fillColor,
        now,
        boilHeat,
      );
    }
    if (eventFlash && eventFlash.whiteAlpha > 0) {
      ctx.globalAlpha = eventFlash.whiteAlpha;
      roundRect(ctx, barX, barY, barW, barH, barRadius);
      ctx.fillStyle = COLOR.white;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (sincePunch < PUNCH_FLASH_MS) {
      ctx.globalAlpha = 1 - sincePunch / PUNCH_FLASH_MS;
      roundRect(ctx, barX, barY, barW, barH, barRadius);
      ctx.fillStyle = COLOR.white;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // a locked floor's cycle hasn't started (lastCollectedAt is just its creation
    // time, never advanced), so the rate text uses the static full-interval formatter
    // instead of the live countdown — still visible, just doesn't tick
    ctx.font = '900 44px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // the text swells and shakes with a pressurised bar
    if (pressure) {
      ctx.translate(barX + barW / 2 + pressure.shakeX, barY + barH / 2);
      ctx.scale(pressure.textScale, pressure.textScale);
      ctx.translate(-(barX + barW / 2), -(barY + barH / 2));
    }
    drawCachedCartoonText(
      ctx,
      overtimeGaugeVisible
        ? formatOvertimeProgress(floor, now)
        : cycle
          ? formatIncomeRate(floor, now, cycle)
          : formatStaticIncomeRate(floor, now),
      barX + barW / 2,
      barY + barH / 2 + 1,
      44,
    );
    ctx.restore();
  };
  // overtime's coin stream powers the bar up like every other stream target
  // a floor crit's hit leaves it glowing in the crit's color
  const afterglowing = !!punch?.color && sincePunch < AFTERGLOW_MS;
  if (afterglowing) {
    ctx.save();
    ctx.globalAlpha = AFTERGLOW_ALPHA * (1 - sincePunch / AFTERGLOW_MS);
    drawGlow(
      ctx,
      afterglowStopsFor(punch!.color!),
      barCenter.x,
      barCenter.y,
      barW * 0.65,
      0.45,
    );
    ctx.restore();
  }
  if (!drawTargetStream(ctx, floor, "bar", barCenter.x, barCenter.y, drawBar))
    drawBar();
  if (sincePunch < PUNCH_RING_MS) {
    // the punch's impact: a white flash and a gold ring bursting off the bar
    const t = sincePunch / PUNCH_RING_MS;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.fillStyle = COLOR.white;
    ctx.beginPath();
    ctx.ellipse(
      barCenter.x,
      barCenter.y,
      barW * (0.16 * (1 - t) + 0.04),
      barH * (0.9 * (1 - t) + 0.3),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = COLOR.starYellow;
    ctx.lineWidth = 24 * (1 - t) + 4;
    ctx.beginPath();
    ctx.ellipse(
      barCenter.x,
      barCenter.y,
      barW * (0.12 + 0.48 * t),
      barH * (0.6 + 2 * t),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }
  if (punch?.label) {
    const t = (now - punch.labelAt) / PUNCH_LABEL_MS;
    if (t < 1) {
      ctx.save();
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      drawPoppingCritText(
        ctx,
        punch.label,
        barCenter.x,
        barY - PUNCH_LABEL_FONT * 0.6 - PUNCH_LABEL_RISE * (1 - (1 - t) ** 2),
        COLOR.heavenlyGold,
        punch.labelAt,
        now,
        { fontSize: PUNCH_LABEL_FONT, strokeWidth: 10 },
      );
      ctx.restore();
    }
  }
}
