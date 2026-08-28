import { FLOOR_H, DIVIDER_H } from "../constants";
import { countBoostedWorkers, type Floor } from "../../gameState";
import { MAX_RENDERED_WORKERS } from "../worker";
import {
  drawPill,
  drawPillBorder,
  drawCartoonText,
  formatPrice,
  formatTime,
} from "../../utils";
import { COLOR } from "../../palette";

// panel placement, bottom-left corner of each floor (mirrors the upgrade button on the right)
export const PANEL_W = 360;
export const PANEL_H = 120;
const PANEL_MARGIN = 24;
export const PANEL_X = PANEL_MARGIN + 10;
// centered inside the divider band below (see outerWall/index.ts's DIVIDER_H),
// mounted on top of it since that's drawn first, nudged down 10px — except the
// ground floor, which stays 10px higher (back at the plain centered position)
function getPanelY(isGroundFloor: boolean): number {
  const base = FLOOR_H - DIVIDER_H / 2 - PANEL_H / 2;
  return isGroundFloor ? base : base + 10;
}

// when each floor's current fill cycle started is floor.lastCollectedAt itself (a
// persisted, Date.now()-based timestamp) — no separate in-memory clock, so a page
// reload never resets/loses how far into its current cycle a floor already was
let tickerRunning = false;

// floor on the wait-time halving so repeated /10 upgrades can't shrink it to zero
const MIN_INCOME_INTERVAL_SECONDS = 0.1;
// ceiling on the wait time so a high floor's exponentially-longer base interval never
// forces the player to wait more than this long between payouts
const MAX_INCOME_INTERVAL_SECONDS = 3600;
const UPGRADES_PER_INTERVAL_HALVING = 10;
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
const UPGRADE_COST_GROWTH = 1.3;

// below this, the fill cycle repeats too fast to read as a filling bar, so the bar is
// just shown full and an orbiting dot (fixed speed, independent of the real interval)
// signals "still ticking" instead
const FAST_CYCLE_THRESHOLD_MS = 1000;
const FAST_CYCLE_LAP_MS = 900;
// the ray covers this fraction of one full lap, broken into this many short
// segments so its per-segment alpha fade reads as one smooth gradient trail
const FAST_CYCLE_TAIL_LAP_FRACTION = 0.22;
const FAST_CYCLE_TAIL_SEGMENTS = 32;
const FAST_CYCLE_RAY_WIDTH = 8;

export function increaseIncomeRate(floor: Floor): void {
  floor.incomeAmount += floor.rateStep;
  floor.upgradeCost = Math.ceil(floor.upgradeCost * UPGRADE_COST_GROWTH);
  floor.upgradeCount += 1;
  if (floor.upgradeCount % UPGRADES_PER_INTERVAL_HALVING === 0) {
    floor.incomeIntervalSeconds = Math.max(
      MIN_INCOME_INTERVAL_SECONDS,
      floor.incomeIntervalSeconds / 2,
    );
  }
}

// the interval/payout actually used for filling/paying out: each boosted visual worker
// slot (of MAX_RENDERED_WORKERS) represents that fraction of the floor's real workforce,
// so the halving exponent scales with the actual workerCount behind it — boosting 1 of 3
// slots only speeds up 1/3 of the workers, while boosting all 3 means every worker is
// boosted and their doublings stack multiplicatively (cumulative), same as a global boost.
// the interval is clamped to [MIN_INCOME_INTERVAL_SECONDS, MAX_INCOME_INTERVAL_SECONDS]
// (ticking any faster isn't visually manageable; waiting any longer isn't playable) — any
// speed beyond the min is folded into a payout multiplier, and any wait beyond the max is
// folded into a payout reduction, so the player always earns the same $/sec the uncapped
// interval implies either way
function effectiveIncomeCycle(
  floor: Floor,
  now: number,
): { intervalSeconds: number; amount: number } {
  const boostedFraction =
    countBoostedWorkers(floor, now) / MAX_RENDERED_WORKERS;
  const boostExponent = boostedFraction * floor.workerCount;
  const uncappedIntervalSeconds =
    floor.incomeIntervalSeconds / 2 ** boostExponent;

  if (uncappedIntervalSeconds > MAX_INCOME_INTERVAL_SECONDS) {
    const underspeedMultiplier =
      MAX_INCOME_INTERVAL_SECONDS / uncappedIntervalSeconds;
    return {
      intervalSeconds: MAX_INCOME_INTERVAL_SECONDS,
      amount: floor.incomeAmount * underspeedMultiplier,
    };
  }
  if (uncappedIntervalSeconds >= MIN_INCOME_INTERVAL_SECONDS) {
    return {
      intervalSeconds: uncappedIntervalSeconds,
      amount: floor.incomeAmount,
    };
  }
  const overspeedMultiplier =
    MIN_INCOME_INTERVAL_SECONDS / uncappedIntervalSeconds;
  return {
    intervalSeconds: MIN_INCOME_INTERVAL_SECONDS,
    amount: floor.incomeAmount * overspeedMultiplier,
  };
}

// advances a floor's fill cycle by however many full intervals have elapsed since it was last
// checked, returning the $ earned from those completed cycles (0 if the bar hasn't filled yet).
// shares the same clock (and the same floor.lastCollectedAt anchor) the bar itself draws
// from, so a payout always lines up with the bar visually completing instead of money
// trickling in continuously underneath a stepped bar
export function collectDueIncome(floor: Floor, now: number): number {
  const { intervalSeconds, amount } = effectiveIncomeCycle(floor, now);
  const intervalMs = intervalSeconds * 1000;
  const cycles = Math.floor((now - floor.lastCollectedAt) / intervalMs);
  if (cycles <= 0) return 0;
  floor.lastCollectedAt += cycles * intervalMs;
  return cycles * amount;
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
  const { intervalSeconds, amount } = effectiveIncomeCycle(floor, now);
  // matches drawIncomePanel's own fast-cycle threshold: once the bar switches to the
  // always-full orbiting-dot animation, a countdown no longer means anything readable
  const timeText =
    intervalSeconds * 1000 < FAST_CYCLE_THRESHOLD_MS
      ? "s"
      : formatTime(remainingCycleSeconds(floor, now));
  return `${formatPrice(amount)}/${timeText}`;
}

// static (non-ticking) variant for locked floors: shows the full interval instead of
// counting down, since a locked floor's cycle hasn't actually started (lastCollectedAt
// is just its creation time) — a live countdown here would just cycle forever against
// that fixed anchor instead of ever meaning "time until payout"
function formatStaticIncomeRate(floor: Floor, now: number): string {
  const { intervalSeconds, amount } = effectiveIncomeCycle(floor, now);
  const timeText =
    intervalSeconds * 1000 < FAST_CYCLE_THRESHOLD_MS
      ? "s"
      : formatTime(intervalSeconds);
  return `${formatPrice(amount)}/${timeText}`;
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

// a bright gradient ray sweeping around the bar's border, fading out along its own
// trailing length, for cycles too fast to show as a normal fill. Drawn as many short
// stroked segments (rather than one path) since canvas strokes can't fade along their
// own length any other way — each segment's own alpha steps the fade from transparent
// at the tail up to fully opaque at the head, reading as one continuous ray
function drawFastCycleBorder(
  ctx: CanvasRenderingContext2D,
  barX: number,
  barY: number,
  barW: number,
  barH: number,
  radius: number,
  now: number,
): void {
  const headT = (now % FAST_CYCLE_LAP_MS) / FAST_CYCLE_LAP_MS;
  ctx.lineWidth = FAST_CYCLE_RAY_WIDTH;
  ctx.lineCap = "round";
  for (let i = FAST_CYCLE_TAIL_SEGMENTS; i >= 1; i--) {
    const t0 =
      headT - (i / FAST_CYCLE_TAIL_SEGMENTS) * FAST_CYCLE_TAIL_LAP_FRACTION;
    const t1 =
      headT -
      ((i - 1) / FAST_CYCLE_TAIL_SEGMENTS) * FAST_CYCLE_TAIL_LAP_FRACTION;
    const p0 = roundedRectPerimeterPoint(barX, barY, barW, barH, radius, t0);
    const p1 = roundedRectPerimeterPoint(barX, barY, barW, barH, radius, t1);
    const alpha = 1 - i / FAST_CYCLE_TAIL_SEGMENTS;
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

  const barX = x + 18;
  const barW = (PANEL_W - 36) * 1.5;
  const barH = 60;
  const barY = y + PANEL_H / 2 - barH / 2;
  // rounded RECTANGLE, same as the upgrade button — NOT a full pill/stadium
  const barRadius = barH / 3;
  // roundRect needs at least 2x its own corner radius to render a well-formed shape;
  // using barH (60px) as the old minimum made the bar look paused for a noticeable
  // slice of every short cycle before it visibly started growing
  const barMinWidth = barRadius * 2;

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
  let isFastCycle = false;
  const now = Date.now();
  if (floor.unlocked) {
    const fillDurationMs =
      effectiveIncomeCycle(floor, now).intervalSeconds * 1000;
    if (fillDurationMs < FAST_CYCLE_THRESHOLD_MS) {
      isFastCycle = true;
      fillW = barW;
    } else {
      const elapsed = now - floor.lastCollectedAt;
      const pct = (elapsed % fillDurationMs) / fillDurationMs;
      fillW = Math.max(barMinWidth, barW * pct);
    }
  }
  drawPill(
    ctx,
    barX,
    barY,
    fillW,
    barH,
    COLOR.moneyGreen,
    false,
    true,
    barRadius,
  );
  // ring stroked last, on top of both fills, so it always reads as one continuous
  // black/white/dark-green border around the whole capsule regardless of fill width
  drawPillBorder(ctx, barX, barY, barW, barH, barRadius, COLOR.moneyGreen);
  if (isFastCycle)
    drawFastCycleBorder(ctx, barX, barY, barW, barH, barRadius, now);

  // a locked floor's cycle hasn't started (lastCollectedAt is just its creation
  // time, never advanced), so the rate text uses the static full-interval formatter
  // instead of the live countdown — still visible, just doesn't tick
  ctx.font = '900 36px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    floor.unlocked
      ? formatIncomeRate(floor, now)
      : formatStaticIncomeRate(floor, now),
    barX + barW / 2,
    barY + barH / 2 + 1,
  );
}
