import { FLOOR_H, DIVIDER_H, SIDE_WALL_WIDTH } from "../constants";
import { countBoostedWorkers, type Floor } from "../../gameState";
import { MAX_RENDERED_WORKERS } from "../worker";
import {
  CRIT_TIER_CONFIG,
  isOvertimeGaugeVisible,
  isOvertimeDraining,
  getOvertimeFillFraction,
  getOvertimeDisplayTicks,
  getOvertimeTickGoal,
  getOvertimeCost,
} from "../upgradeButton";
import { getWiggleRotation } from "../../shared/wiggle";
import { getTotalIncome } from "../../totalIncome";
import {
  officeUpgradeSpeedMultiplier,
  effectiveIncomeCycle as sharedEffectiveIncomeCycle,
  collectDueIncome as sharedCollectDueIncome,
  peekDueIncome as sharedPeekDueIncome,
  currentIncomeRatePerSecond as sharedCurrentIncomeRatePerSecond,
} from "../../shared/income";
import { type BigNumber, add, multiply, gte } from "../../shared/bigNumber";
import {
  drawPill,
  drawPillBorder,
  drawCartoonText,
  formatPrice,
  formatTime,
  roundRect,
} from "../../utils";
import { COLOR } from "../../palette";
import { CONFIG } from "../../config";

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
const BAR_W = (PANEL_W - 36) * 1.5;
// scaled up alongside PANEL_W; still comfortably clears the divider band's vertical bounds
const BAR_H = 92;

// center of the visible income bar, floor-local — for spawning effects (e.g. the
// "Sale" boost's floating +income text) right on top of it
export function getIncomeBarCenter(isGroundFloor: boolean): {
  x: number;
  y: number;
} {
  const barY = getPanelY(isGroundFloor) + PANEL_H / 2 - BAR_H / 2;
  return { x: PANEL_X + BAR_INSET + BAR_W / 2, y: barY + BAR_H / 2 };
}

// whether a floor-local point lands on the income bar itself — only meaningful
// while the "Work overtime" gauge's drain tail is showing it as clickable (see
// floorInteractions.ts's isOvertimeDraining-gated click handling)
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

// when each floor's current fill cycle started is floor.lastCollectedAt itself (a
// persisted, Date.now()-based timestamp) — no separate in-memory clock, so a page
// reload never resets/loses how far into its current cycle a floor already was
let tickerRunning = false;

// ceiling on a NEW floor's own starting wait, applied once at creation time (see
// floors/index.ts's buildFloor) — a high floor's exponentially-longer base interval
// would otherwise start requiring days/weeks between payouts before a single
// upgrade. Once created, a floor's interval is NOT re-clamped here on every cycle:
// upgrades halve it below this exactly like any other floor (see increaseIncomeRate)
export const MAX_INCOME_INTERVAL_SECONDS =
  CONFIG.incomePanel.maxIncomeIntervalSeconds;
const UPGRADES_PER_INTERVAL_HALVING =
  CONFIG.incomePanel.upgradesPerIntervalHalving;
// upgradeCount hitting a multiple of this is also the "next ten levels" milestone
// floorInteractions.ts celebrates with an extra coin burst at the upgrade indicator
export const UPGRADE_MILESTONE_STEP = UPGRADES_PER_INTERVAL_HALVING;
// each upgrade multiplies the NEXT upgrade's cost by this, instead of a flat x2 —
// x2 compounded against income that only grows ~linearly (+rateStep) plus a much
// smaller periodic interval-halving kicker every UPGRADES_PER_INTERVAL_HALVING
// upgrades diverges hard: the wait for each successive upgrade ballooned to hours,
// then days, by only the 20th-30th upgrade on a single floor (simulated). 1.3 keeps
// the early game snappy while still slowing into normal idle-game pacing later,
// rather than the player hitting a wall almost immediately
const UPGRADE_COST_GROWTH = CONFIG.incomePanel.upgradeCostGrowth;
// floors whose natural (uncapped) interval already exceeds MAX_INCOME_INTERVAL_SECONDS
// (see Floor.aboveCapTier, set once at creation in floors/index.ts's buildFloor)
// earn more than their level was ever meant to once upgrades push their interval
// well below the 1h cap they started pinned at — a steeper growth rate here is
// what actually offsets that, since it's specifically each upgrade's cost that
// needs to scale up faster for these floors, not their starting price
const UPGRADE_COST_GROWTH_ABOVE_CAP =
  CONFIG.incomePanel.upgradeCostGrowthAboveCap;

// once a floor's true speed exceeds what a 1s-minimum bar can show as a normal fill
// (see effectiveIncomeCycle's overspeed flag below), the bar is shown full instead,
// with this ray orbiting its border at a fixed pace to signal "still ticking"
const OVERSPEED_RAY_LAP_MS = 900;
// the ray covers this fraction of one full lap, broken into this many short
// segments so its per-segment alpha fade reads as one smooth gradient trail
const OVERSPEED_RAY_TAIL_LAP_FRACTION = 0.22;
const OVERSPEED_RAY_TAIL_SEGMENTS = 32;
const OVERSPEED_RAY_WIDTH = 8;

export function increaseIncomeRate(floor: Floor): void {
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
  floor.upgradeCost = multiply(
    floor.upgradeCost,
    floor.aboveCapTier ? UPGRADE_COST_GROWTH_ABOVE_CAP : UPGRADE_COST_GROWTH,
  );
  floor.upgradeCount += 1;
  // no MIN_INCOME_INTERVAL_SECONDS clamp here — this stores the floor's true,
  // uncapped base interval, which effectiveIncomeCycle's own clamp below already
  // folds into the overspeed payout multiplier the exact same way it does for a
  // boost/office-upgrade speedup. Clamping it at the source instead pinned every
  // sufficiently-upgraded floor's stored interval at exactly the minimum, so
  // uncappedIntervalSeconds could only ever dip below the minimum (the actual
  // overspeed/"filled bar" trigger) from a boost or office upgrade, never from
  // upgrades alone
  if (floor.upgradeCount % UPGRADES_PER_INTERVAL_HALVING === 0) {
    floor.incomeIntervalSeconds /= 2;
  }
}

// how many times faster than its own base incomeIntervalSeconds this floor is
// currently running, from the temporary worker boost and the permanent office
// upgrades combined — computed BEFORE the MIN_INCOME_INTERVAL_SECONDS clamp below
// folds any further speed into a payout multiplier instead
function currentSpeedMultiplier(floor: Floor, now: number): number {
  const boostedFraction =
    countBoostedWorkers(floor, now) / MAX_RENDERED_WORKERS;
  const boostExponent = boostedFraction * floor.workerCount;
  return 2 ** boostExponent * officeUpgradeSpeedMultiplier(floor);
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

// seconds left until the current fill cycle completes, counting down from the full
// interval to 0 in lockstep with drawIncomePanel's own bar-fill percentage (same
// lastCollectedAt anchor and modulo-wrap), instead of always showing the constant interval
function remainingCycleSeconds(floor: Floor, now: number): number {
  const intervalMs = effectiveIncomeCycle(floor, now).intervalSeconds * 1000;
  const elapsed = now - floor.lastCollectedAt;
  return (intervalMs - (elapsed % intervalMs)) / 1000;
}

function formatIncomeRate(floor: Floor, now: number): string {
  const { amount, overspeed } = effectiveIncomeCycle(floor, now);
  // once overspeed, the bar is pinned full and a live countdown against the
  // artificially-clamped 1s interval wouldn't mean anything real
  const timeText = overspeed
    ? "s"
    : // round, not floor/ceil: flooring a 1s-interval countdown showed "0" for
      // virtually the whole cycle (remaining is only ever ~1 for an instant),
      // while ceiling it showed a frozen "1" that never visibly ticked down.
      // Rounding gives an actual "1" then "0" step partway through each cycle
      formatTime(Math.round(remainingCycleSeconds(floor, now)));
  return `${formatPrice(amount)}/${timeText}`;
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
  return `${formatPrice(amount)}/${timeText}`;
}

// "Work overtime" boost's own progress readout — a plain tick count, not a $/time
// rate, since the gauge isn't paying out anything itself (see floors/upgradeButton).
// Reads the same drain-aware value/goal the bar's own fill fraction uses, so the
// number (and its own max) tick down/scale in lockstep with the bar itself
function formatOvertimeProgress(floor: Floor, now: number): string {
  return `${Math.floor(getOvertimeDisplayTicks(floor, now))}/${getOvertimeTickGoal(floor)}`;
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

function drawGaugeFill(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  barX: number,
  barY: number,
  barW: number,
  barH: number,
  radius: number,
  fillW: number,
): void {
  if (fillW <= 0) return;
  const [fromColor, toColor] = getGaugeGradientColors(floor);
  const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  gradient.addColorStop(0, fromColor);
  gradient.addColorStop(1, toColor);
  roundRect(ctx, barX, barY, fillW, barH, radius);
  ctx.fillStyle = gradient;
  ctx.fill();
}

// walks clockwise around a rounded rect's own outline; t is a 0..1 lap fraction,
// starting at the middle of the top edge
function roundedRectPerimeterPoint(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  t: number,
): { x: number; y: number } {
  const straightW = w - 2 * r;
  const straightH = h - 2 * r;
  const arcLen = (Math.PI / 2) * r;
  const total = 2 * straightW + 2 * straightH + 4 * arcLen;
  let d = (((t % 1) + 1) % 1) * total;

  if (d < straightW) return { x: x + r + d, y };
  d -= straightW;
  if (d < arcLen) {
    const a = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
    return { x: x + w - r + r * Math.cos(a), y: y + r + r * Math.sin(a) };
  }
  d -= arcLen;
  if (d < straightH) return { x: x + w, y: y + r + d };
  d -= straightH;
  if (d < arcLen) {
    const a = 0 + (d / arcLen) * (Math.PI / 2);
    return { x: x + w - r + r * Math.cos(a), y: y + h - r + r * Math.sin(a) };
  }
  d -= arcLen;
  if (d < straightW) return { x: x + w - r - d, y: y + h };
  d -= straightW;
  if (d < arcLen) {
    const a = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
    return { x: x + r + r * Math.cos(a), y: y + h - r + r * Math.sin(a) };
  }
  d -= arcLen;
  if (d < straightH) return { x, y: y + h - r - d };
  d -= straightH;
  const a = Math.PI + (d / arcLen) * (Math.PI / 2);
  return { x: x + r + r * Math.cos(a), y: y + r + r * Math.sin(a) };
}

// a bright gradient ray sweeping around the bar's border at a fixed pace, fading out
// along its own trailing length, for a floor pinned at the overspeed clamp. Drawn as
// many short stroked segments (rather than one path) since canvas strokes can't fade
// along their own length any other way — each segment's own alpha steps the fade
// from transparent at the tail up to fully opaque at the head, reading as one
// continuous ray
function drawOverspeedRay(
  ctx: CanvasRenderingContext2D,
  barX: number,
  barY: number,
  barW: number,
  barH: number,
  radius: number,
  now: number,
): void {
  const headT = (now % OVERSPEED_RAY_LAP_MS) / OVERSPEED_RAY_LAP_MS;
  ctx.lineWidth = OVERSPEED_RAY_WIDTH;
  ctx.lineCap = "round";
  for (let i = OVERSPEED_RAY_TAIL_SEGMENTS; i >= 1; i--) {
    const t0 =
      headT -
      (i / OVERSPEED_RAY_TAIL_SEGMENTS) * OVERSPEED_RAY_TAIL_LAP_FRACTION;
    const t1 =
      headT -
      ((i - 1) / OVERSPEED_RAY_TAIL_SEGMENTS) * OVERSPEED_RAY_TAIL_LAP_FRACTION;
    const p0 = roundedRectPerimeterPoint(barX, barY, barW, barH, radius, t0);
    const p1 = roundedRectPerimeterPoint(barX, barY, barW, barH, radius, t1);
    const alpha = 1 - i / OVERSPEED_RAY_TAIL_SEGMENTS;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.stroke();
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
): void {
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
  // "Work overtime" boost (see floors/upgradeButton) takes over this floor's whole
  // bar — a filling gauge instead of the normal payout-cycle fill — for its own
  // 15s duration, then keeps showing the gauge a little longer while it ticks
  // back down to 0, before this floor's bar finally reverts to normal
  const overtimeGaugeVisible =
    floor.unlocked && isOvertimeGaugeVisible(floor, now);
  // during that drain tail specifically (not the initial 15s window), the bar
  // wiggles like the overtime button itself and becomes clickable (see
  // floorInteractions.ts) to re-trigger another event on this same floor for the
  // same cost, letting several chained events fill the gauge all the way — only
  // wiggles while the player could actually act on it (affordable, and this
  // floor isn't already maxed at ultra with no further tier to reach)
  const draining =
    floor.unlocked &&
    floor.critMultiplierTier !== "ultra" &&
    isOvertimeDraining(floor, now) &&
    gte(getTotalIncome(), getOvertimeCost(floor));

  ctx.save();
  const barCenter = getIncomeBarCenter(isGroundFloor);
  ctx.translate(barCenter.x, barCenter.y);
  if (draining) ctx.rotate(getWiggleRotation(now));
  const pressScale = incomeBarPressScale(floor, now);
  ctx.scale(pressScale, pressScale);
  ctx.translate(-barCenter.x, -barCenter.y);

  drawPill(
    ctx,
    barX,
    barY,
    barW,
    barH,
    COLOR.incomeTrack,
    false,
    true,
    barRadius,
  );

  // locked floors don't accrue, so their bar stays empty and its cycle hasn't started yet
  let fillW = barMinWidth;
  let overspeed = false;
  if (overtimeGaugeVisible) {
    fillW = Math.max(barMinWidth, barW * getOvertimeFillFraction(floor, now));
  } else if (floor.unlocked) {
    const cycle = effectiveIncomeCycle(floor, now);
    overspeed = cycle.overspeed;
    if (overspeed) {
      fillW = barW;
    } else {
      const fillDurationMs = cycle.intervalSeconds * 1000;
      const elapsed = now - floor.lastCollectedAt;
      const pct = (elapsed % fillDurationMs) / fillDurationMs;
      fillW = Math.max(barMinWidth, barW * pct);
    }
  }
  // a permanently-crited floor's bar matches its own tier color instead of the
  // usual green, mirroring the upgrade button's own color choice
  const fillColor = floor.critMultiplierTier
    ? CRIT_TIER_CONFIG[floor.critMultiplierTier].color
    : COLOR.moneyGreen;
  if (overtimeGaugeVisible) {
    drawGaugeFill(ctx, floor, barX, barY, barW, barH, barRadius, fillW);
  } else {
    drawPill(ctx, barX, barY, fillW, barH, fillColor, false, true, barRadius);
  }
  // ring stroked last, on top of both fills, so it always reads as one continuous
  // black/white/dark-green border around the whole capsule regardless of fill width
  drawPillBorder(
    ctx,
    barX,
    barY,
    barW,
    barH,
    barRadius,
    overtimeGaugeVisible ? COLOR.amber : fillColor,
  );
  if (overspeed) drawOverspeedRay(ctx, barX, barY, barW, barH, barRadius, now);

  // a locked floor's cycle hasn't started (lastCollectedAt is just its creation
  // time, never advanced), so the rate text uses the static full-interval formatter
  // instead of the live countdown — still visible, just doesn't tick
  ctx.font = '900 44px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    overtimeGaugeVisible
      ? formatOvertimeProgress(floor, now)
      : floor.unlocked
        ? formatIncomeRate(floor, now)
        : formatStaticIncomeRate(floor, now),
    barX + barW / 2,
    barY + barH / 2 + 1,
  );
  ctx.restore();
}
