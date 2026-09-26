// coins that fly into the total-income readout while shrinking (as if merging
// into the total); once they arrive the readout flashes white + wiggles.
// Triggered from floors/ (bonus-tier crits) and src/mouse (taps), drawn from
// background/gameCanvas, and read by shared/totalIncomeReadout.
import type { Floor } from "../../gameState";
import { loadImageByName } from "../../loadAssets";
import { createAbsorbPulse, mergeFlashWhite } from "../mergeFlash";

let coinIcon: HTMLImageElement | null = null;
loadImageByName("coin").then((image) => {
  coinIcon = image;
});

const FLIGHT_DURATION_MS = 650;
const COIN_STAGGER_MS = 90;
// each coin fades in in place first, THEN starts flying — reads as "coins
// materialize, then get pulled in" instead of popping straight into motion.
// Held a beat past its own arrival too (the "overshoot"), so the merge
// trigger (HUD flash + cash register sound) lands after magicCoin.wav has had
// time to ring out, instead of stepping on top of it
const FADE_IN_MS = 300;
const OVERSHOOT_HOLD_MS = 500;
// the arrival reads as landing a beat too late if it waits for the very last
// coin's overshoot hold to fully finish, so it fires this much earlier instead
const ARRIVE_LEAD_MS = 800;
// coins appear big (a quarter of the screen) and shrink down to a tiny icon
// as they merge into the total, so the "size drop" itself reads as the coin
// flying far away into the readout
const START_SIZE_SCREEN_FRACTION = 0.25;
const END_SIZE_PX = 12;
// evenly spaced left/middle/right (as fractions of their own start size, so
// the layout scales with screen size instead of being fixed pixels), with
// the middle coin appearing slightly lower than its neighbors
const COIN_LAYOUT = [
  { xFactor: -1.1, yFactor: 0 },
  { xFactor: 0, yFactor: 0.35 },
  { xFactor: 1.1, yFactor: 0 },
];
const ARC_HEIGHT_PX = 60;

// a floor-local start point; omitted means the screen center (the crit flash)
export interface TotalIncomeCoinOrigin {
  floor: Floor;
  x: number;
  y: number;
}

export type OriginResolver = (
  origin: TotalIncomeCoinOrigin,
) => { x: number; y: number } | null;

interface FlyingCoin {
  fromX: number;
  fromY: number;
  startedAt: number;
  startSize: number;
}

interface CoinBatch {
  spawnedAt: number;
  origin: TotalIncomeCoinOrigin | undefined;
  onArrive: () => void;
  arrived: boolean;
  coins: FlyingCoin[] | null; // laid out on the first frame it's drawn
}

let batches: CoinBatch[] = [];

// the actual on-screen start/end points are resolved later, inside
// drawTotalIncomeCoins, since only background/gameCanvas's own redraw() knows
// those this frame
export function spawnTotalIncomeCoins(
  onArrive: () => void,
  origin?: TotalIncomeCoinOrigin,
): void {
  batches.push({
    spawnedAt: Date.now(),
    origin,
    onArrive,
    arrived: false,
    coins: null,
  });
}

// call every frame from gameCanvas.ts's redraw(), in the SAME plain screen
// space drawHud/drawCritFlash already use — (centerX, centerY) is the crit
// flash text's own position, (toX, toY) the total-income readout's, and
// screenSize the same reference width drawCritFlash itself scales off of.
// Fires each batch's onArrive exactly once, slightly (see ARRIVE_LEAD_MS)
// before its last (staggered) coin's own overshoot hold ends
export function drawTotalIncomeCoins(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  toX: number,
  toY: number,
  screenSize: number,
  resolveOrigin: OriginResolver,
  now: number,
): void {
  if (batches.length === 0) return;
  const totalLifetimeMs = FADE_IN_MS + FLIGHT_DURATION_MS + OVERSHOOT_HOLD_MS;
  const lastCoinStart = (COIN_LAYOUT.length - 1) * COIN_STAGGER_MS;
  for (const batch of batches) {
    if (!batch.coins) {
      const from = batch.origin
        ? (resolveOrigin(batch.origin) ?? { x: centerX, y: centerY })
        : { x: centerX, y: centerY };
      const startSize = screenSize * START_SIZE_SCREEN_FRACTION;
      batch.coins = COIN_LAYOUT.map(({ xFactor, yFactor }, i) => ({
        fromX: from.x + xFactor * startSize,
        fromY: from.y + yFactor * startSize,
        startedAt: batch.spawnedAt + i * COIN_STAGGER_MS,
        startSize,
      }));
    }
    if (coinIcon) drawBatch(ctx, batch.coins, toX, toY, now);
    if (
      !batch.arrived &&
      now - batch.spawnedAt >= lastCoinStart + totalLifetimeMs - ARRIVE_LEAD_MS
    ) {
      batch.arrived = true;
      batch.onArrive();
    }
  }
  batches = batches.filter(
    (batch) => now - batch.spawnedAt < lastCoinStart + totalLifetimeMs,
  );
}

function drawBatch(
  ctx: CanvasRenderingContext2D,
  coins: FlyingCoin[],
  toX: number,
  toY: number,
  now: number,
): void {
  const icon = coinIcon!;
  for (const coin of coins) {
    const elapsed = now - coin.startedAt;
    if (elapsed < 0) continue;
    if (elapsed < FADE_IN_MS) {
      // stationary, fading in — hasn't started flying yet
      const size = coin.startSize;
      ctx.globalAlpha = elapsed / FADE_IN_MS;
      ctx.drawImage(
        icon,
        coin.fromX - size / 2,
        coin.fromY - size / 2,
        size,
        size,
      );
      ctx.globalAlpha = 1;
      continue;
    }
    const t = Math.min(1, (elapsed - FADE_IN_MS) / FLIGHT_DURATION_MS);
    // eases IN (accelerates toward the target) — reads as being pulled into
    // the total rather than drifting at a constant speed the whole way
    const eased = t * t;
    const arcT = Math.sin(t * Math.PI);
    const x = coin.fromX + (toX - coin.fromX) * eased;
    const y = coin.fromY + (toY - coin.fromY) * eased - arcT * ARC_HEIGHT_PX;
    const size = coin.startSize + (END_SIZE_PX - coin.startSize) * eased;
    ctx.drawImage(icon, x - size / 2, y - size / 2, size, size);
  }
}

// --- total-income "merged in" flash, read by shared/totalIncomeReadout ---

let hudFlashStartedAt: number | null = null;
// sold.mp3 is ~3.19s total and playSold() skips its first 0.5s lead-in (see
// sound/index.ts), so this must last at least that ~2.69s remainder — otherwise
// the wiggle/flash visibly ends while the cash register sound is still playing.
// Cut 0.2s short of that per explicit request, so the wiggle settles a beat
// before the sound's own very last, already-quiet tail
const HUD_FLASH_DURATION_MS = 2300;

// call once the flying coins above have fully arrived
export function triggerHudTotalFlash(): void {
  hudFlashStartedAt = Date.now();
}

let hudPulseAt: number | null = null;
const HUD_PULSE_FADE_MS = 700;
const hudAbsorb = createAbsorbPulse();

// call per coin landing in the total (e.g. sale clicks) — keeps the flash
// alive while coins stream in, fading shortly after the last one
export function pulseHudTotalFlash(): void {
  hudPulseAt = Date.now();
  hudAbsorb.hit(hudPulseAt);
}

// the readout's size bump as coins are absorbed into it
export function getHudTotalAbsorbScale(now: number): number {
  return hudAbsorb.scale(now);
}

// 1 (just triggered) fading linearly down to 0 (back to normal) — the
// readout scales its wiggle by this
export function getHudTotalFlashStrength(now: number): number {
  let strength = 0;
  if (hudFlashStartedAt !== null) {
    const elapsed = now - hudFlashStartedAt;
    if (elapsed >= HUD_FLASH_DURATION_MS) hudFlashStartedAt = null;
    else strength = 1 - elapsed / HUD_FLASH_DURATION_MS;
  }
  if (hudPulseAt !== null) {
    const elapsed = now - hudPulseAt;
    if (elapsed >= HUD_PULSE_FADE_MS) hudPulseAt = null;
    else strength = Math.max(strength, 1 - elapsed / HUD_PULSE_FADE_MS);
  }
  return strength;
}

// how far the readout's text blends toward white right now
export function getHudTotalWhiteMix(now: number): number {
  return mergeFlashWhite(getHudTotalFlashStrength(now), now);
}
