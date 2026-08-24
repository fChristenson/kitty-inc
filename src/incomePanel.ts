import { FLOOR_H, type Floor } from "./floors";
import {
  roundRect,
  drawCartoonPanel,
  drawCartoonText,
  drawGlossHighlight,
} from "./utils";

// panel placement, bottom-left corner of each floor (mirrors the upgrade button on the right)
export const PANEL_W = 360;
export const PANEL_H = 120;
const PANEL_MARGIN = 24;
export const PANEL_X = PANEL_MARGIN;
export const PANEL_Y = FLOOR_H - PANEL_H - PANEL_MARGIN;

// when each floor's current fill cycle started, keyed by the floor itself
const cycleStart = new WeakMap<Floor, number>();
let tickerRunning = false;

export function increaseIncomeRate(floor: Floor): void {
  floor.incomeAmount += floor.rateStep;
  floor.upgradeCost *= 2;
  floor.upgradeCount += 1;
}

// advances a floor's fill cycle by however many full intervals have elapsed since it was last
// checked, returning the $ earned from those completed cycles (0 if the bar hasn't filled yet).
// shares the same clock the bar itself draws from, so a payout always lines up with the bar
// visually completing instead of money trickling in continuously underneath a stepped bar
export function collectDueIncome(floor: Floor, now: number): number {
  if (!cycleStart.has(floor)) cycleStart.set(floor, now);
  const start = cycleStart.get(floor)!;
  const intervalMs = floor.incomeIntervalSeconds * 1000;
  const cycles = Math.floor((now - start) / intervalMs);
  if (cycles <= 0) return 0;
  cycleStart.set(floor, start + cycles * intervalMs);
  return cycles * floor.incomeAmount;
}

// higher floors' intervals double repeatedly and can run well past a minute,
// so once the timer crosses a threshold we switch to the largest fitting unit
function formatIntervalLabel(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? "s" : `${seconds}s`;
  const [value, suffix]: [number, string] =
    seconds < 3600
      ? [seconds / 60, "m"]
      : seconds < 86400
        ? [seconds / 3600, "h"]
        : [seconds / 86400, "d"];
  return `${Math.round(value * 10) / 10}${suffix}`;
}

function formatIncomeRate(floor: Floor): string {
  const amount = Number.isInteger(floor.incomeAmount)
    ? floor.incomeAmount.toString()
    : floor.incomeAmount.toFixed(2);
  return `$${amount}/${formatIntervalLabel(floor.incomeIntervalSeconds)}`;
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
  offsetY: number,
): void {
  const x = PANEL_X;
  const y = PANEL_Y + offsetY;

  const barX = x + 18;
  const barW = (PANEL_W - 36) * 1.5;
  const barH = 60;
  const barY = y + PANEL_H / 2 - barH / 2;

  drawCartoonPanel(ctx, barX, barY, barW, barH, 10, "#1E293B", false);

  // locked floors don't accrue, so their bar stays empty and its cycle hasn't started yet
  let fillW = barH;
  if (floor.unlocked) {
    if (!cycleStart.has(floor)) cycleStart.set(floor, performance.now());
    const fillDurationMs = floor.incomeIntervalSeconds * 1000;
    const elapsed = performance.now() - cycleStart.get(floor)!;
    const pct = (elapsed % fillDurationMs) / fillDurationMs;
    fillW = Math.max(barH, barW * pct);
  }
  ctx.fillStyle = "#34D399";
  roundRect(ctx, barX, barY, fillW, barH, 10);
  ctx.fill();
  drawGlossHighlight(ctx, barX, barY, fillW, barH, 10);

  ctx.font = "900 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    formatIncomeRate(floor),
    barX + barW / 2,
    barY + barH / 2 + 1,
  );
}
