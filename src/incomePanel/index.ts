import { FLOOR_H } from "../floors";
import { countBoostedWorkers, type Floor } from "../gameState";
import { MAX_RENDERED_WORKERS } from "../worker";
import {
  roundRect,
  drawCartoonPanel,
  drawCartoonText,
  drawGlossHighlight,
  formatPrice,
  formatTime,
} from "../utils";

// panel placement, bottom-left corner of each floor (mirrors the upgrade button on the right)
export const PANEL_W = 360;
export const PANEL_H = 120;
const PANEL_MARGIN = 24;
export const PANEL_X = PANEL_MARGIN;
export const PANEL_Y = FLOOR_H - PANEL_H - PANEL_MARGIN;

// when each floor's current fill cycle started, keyed by the floor itself
const cycleStart = new WeakMap<Floor, number>();
let tickerRunning = false;

// floor on the wait-time halving so repeated /10 upgrades can't shrink it to zero
const MIN_INCOME_INTERVAL_SECONDS = 0.1;
// ceiling on the wait time so a high floor's exponentially-longer base interval never
// forces the player to wait more than this long between payouts
const MAX_INCOME_INTERVAL_SECONDS = 3600;
const UPGRADES_PER_INTERVAL_HALVING = 10;

// below this, the fill cycle repeats too fast to read as a filling bar, so the bar is
// just shown full and an orbiting dot (fixed speed, independent of the real interval)
// signals "still ticking" instead
const FAST_CYCLE_THRESHOLD_MS = 1000;
const FAST_CYCLE_LAP_MS = 900;
const FAST_CYCLE_TAIL_DOTS = 8;

export function increaseIncomeRate(floor: Floor): void {
  floor.incomeAmount += floor.rateStep;
  floor.upgradeCost *= 2;
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
// shares the same clock the bar itself draws from, so a payout always lines up with the bar
// visually completing instead of money trickling in continuously underneath a stepped bar
export function collectDueIncome(floor: Floor, now: number): number {
  if (!cycleStart.has(floor)) cycleStart.set(floor, now);
  const start = cycleStart.get(floor)!;
  const { intervalSeconds, amount } = effectiveIncomeCycle(floor, now);
  const intervalMs = intervalSeconds * 1000;
  const cycles = Math.floor((now - start) / intervalMs);
  if (cycles <= 0) return 0;
  cycleStart.set(floor, start + cycles * intervalMs);
  // keeps gameState.ts's computeIdleIncome from re-paying this same span as idle time
  // later: without this, time spent actively playing (but persisted via no other
  // action) would look identical to time the tab was closed on the next reload
  floor.lastCollectedAt = Date.now();
  return cycles * amount;
}

// seconds left until the current fill cycle completes, counting down from the full
// interval to 0 in lockstep with drawIncomePanel's own bar-fill percentage (same
// cycleStart anchor and modulo-wrap), instead of always showing the constant interval
function remainingCycleSeconds(floor: Floor, now: number): number {
  if (!cycleStart.has(floor)) cycleStart.set(floor, now);
  const intervalMs = effectiveIncomeCycle(floor, now).intervalSeconds * 1000;
  const elapsed = now - cycleStart.get(floor)!;
  return (intervalMs - (elapsed % intervalMs)) / 1000;
}

function formatIncomeRate(floor: Floor, now: number): string {
  const { intervalSeconds, amount } = effectiveIncomeCycle(floor, now);
  // matches drawIncomePanel's own fast-cycle threshold: once the bar switches to the
  // always-full orbiting-dot animation, a countdown no longer means anything readable
  const timeText =
    intervalSeconds * 1000 < FAST_CYCLE_THRESHOLD_MS
      ? "<1s"
      : formatTime(remainingCycleSeconds(floor, now));
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

// a bright dot orbiting the bar's border with a fading tail, for cycles too fast to
// show as a normal fill
function drawFastCycleBorder(
  ctx: CanvasRenderingContext2D,
  barX: number,
  barY: number,
  barW: number,
  barH: number,
  now: number,
): void {
  const headT = (now % FAST_CYCLE_LAP_MS) / FAST_CYCLE_LAP_MS;
  const tailStep = 1 / 60; // lap-fraction gap between trailing dots
  for (let i = FAST_CYCLE_TAIL_DOTS; i >= 0; i--) {
    const { x, y } = roundedRectPerimeterPoint(
      barX,
      barY,
      barW,
      barH,
      10,
      headT - i * tailStep,
    );
    const alpha = 1 - i / FAST_CYCLE_TAIL_DOTS;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
}

// starts the persistent redraw loop that animates every floor's fill bar; safe to call more than
// once. now that main.ts only ever redraws the small fixed-size visible-viewport canvas (not
// every floor), a full rAF cadence is cheap and gives a smooth-looking fill instead of visible steps
export function startIncomeTicker(onFrame: () => void): void {
  if (tickerRunning) return;
  tickerRunning = true;
  const tick = () => {
    onFrame();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function drawIncomePanel(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  const x = PANEL_X;
  const y = PANEL_Y;

  const barX = x + 18;
  const barW = (PANEL_W - 36) * 1.5;
  const barH = 60;
  const barY = y + PANEL_H / 2 - barH / 2;
  const barRadius = 10;
  // roundRect needs at least 2x its own corner radius to render a well-formed shape;
  // using barH (60px) as the old minimum made the bar look paused for a noticeable
  // slice of every short cycle before it visibly started growing
  const barMinWidth = barRadius * 2;

  drawCartoonPanel(ctx, barX, barY, barW, barH, barRadius, "#1E293B", false);

  // locked floors don't accrue, so their bar stays empty and its cycle hasn't started yet
  let fillW = barMinWidth;
  let isFastCycle = false;
  const now = performance.now();
  if (floor.unlocked) {
    if (!cycleStart.has(floor)) cycleStart.set(floor, now);
    const fillDurationMs =
      effectiveIncomeCycle(floor, now).intervalSeconds * 1000;
    if (fillDurationMs < FAST_CYCLE_THRESHOLD_MS) {
      isFastCycle = true;
      fillW = barW;
    } else {
      const elapsed = now - cycleStart.get(floor)!;
      const pct = (elapsed % fillDurationMs) / fillDurationMs;
      fillW = Math.max(barMinWidth, barW * pct);
    }
  }
  ctx.fillStyle = "#34D399";
  roundRect(ctx, barX, barY, fillW, barH, barRadius);
  ctx.fill();
  drawGlossHighlight(ctx, barX, barY, fillW, barH, barRadius);
  if (isFastCycle) drawFastCycleBorder(ctx, barX, barY, barW, barH, now);

  ctx.font = "900 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    formatIncomeRate(floor, now),
    barX + barW / 2,
    barY + barH / 2 + 1,
  );
}
