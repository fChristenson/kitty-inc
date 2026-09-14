// FX exclusively for the "special crit crit" bonus-tier celebration (see
// floors/floorInteractions/critCelebration.ts's celebrateBonusTier): 3 coins
// fly from the crit flash text up to the total-income readout while
// shrinking (as if merging into the total), and once they arrive the total
// income text itself flashes white + wiggles. Triggered from floors/
// (critCelebration.ts), drawn from background/gameCanvas (the coins), and
// read from hud/ (the total-flash strength) — living as its own top-level
// module (like screenShake.ts/coinBurst) avoids a floors->background,
// floors->hud, or hud->background module-boundary violation.
import { loadImageByName } from "../loadAssets";

let coinIcon: HTMLImageElement | null = null;
loadImageByName("coin").then((image) => {
  coinIcon = image;
});

const FLIGHT_DURATION_MS = 650;
const COIN_STAGGER_MS = 90;
// each coin fades in in place first, THEN starts flying — reads as "coins
// materialize, then get pulled in" instead of popping straight into motion.
// Held a beat past its own arrival too (the "overshoot"), so the merge
// trigger (HUD flash + cash register sound, see triggerHudTotalFlash) lands
// after arcadeSlotWin.wav's own win sound has had time to ring out, instead
// of stepping on top of it
const FADE_IN_MS = 300;
const OVERSHOOT_HOLD_MS = 500;
// the total-income flash/wiggle/sold sfx reads as landing a beat too late if
// it waits for the very last coin's overshoot hold to fully finish, so it
// fires this much earlier instead
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

interface FlyingCoin {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startedAt: number;
  startSize: number;
}

let coins: FlyingCoin[] = [];
let pendingSpawnAt: number | null = null;
let pendingArrive: (() => void) | null = null;
let arriveFired = false;

// call once, right when the bonus-tier flash text appears — the actual
// on-screen start/end points are resolved later, inside drawBonusTierCoins,
// since only background/gameCanvas's own redraw() knows those this frame
export function spawnBonusTierCoins(onArrive: () => void): void {
  pendingSpawnAt = Date.now();
  pendingArrive = onArrive;
  arriveFired = false;
}

// call every frame from gameCanvas.ts's redraw(), in the SAME plain screen
// space drawHud/drawCritFlash already use — (fromX, fromY) should be the
// crit flash text's own position, (toX, toY) the total-income readout's, and
// screenSize the same reference width drawCritFlash itself scales off of.
// Fires onArrive (see spawnBonusTierCoins) exactly once, slightly (see
// ARRIVE_LEAD_MS) before the last (staggered) coin's own overshoot hold ends
export function drawBonusTierCoins(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  screenSize: number,
  now: number,
): void {
  if (pendingSpawnAt !== null) {
    const spawnAt = pendingSpawnAt;
    const startSize = screenSize * START_SIZE_SCREEN_FRACTION;
    coins = COIN_LAYOUT.map(({ xFactor, yFactor }, i) => ({
      fromX: fromX + xFactor * startSize,
      fromY: fromY + yFactor * startSize,
      toX,
      toY,
      startedAt: spawnAt + i * COIN_STAGGER_MS,
      startSize,
    }));
    pendingSpawnAt = null;
  }
  if (coins.length === 0 || !coinIcon) return;

  const totalLifetimeMs = FADE_IN_MS + FLIGHT_DURATION_MS + OVERSHOOT_HOLD_MS;
  let allDone = true;
  for (const coin of coins) {
    const elapsed = now - coin.startedAt;
    if (elapsed < 0) {
      allDone = false;
      continue;
    }
    if (elapsed < totalLifetimeMs) allDone = false;

    if (elapsed < FADE_IN_MS) {
      // stationary, fading in — hasn't started flying yet
      const size = coin.startSize;
      ctx.globalAlpha = elapsed / FADE_IN_MS;
      ctx.drawImage(
        coinIcon,
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
    const x = coin.fromX + (coin.toX - coin.fromX) * eased;
    const y =
      coin.fromY + (coin.toY - coin.fromY) * eased - arcT * ARC_HEIGHT_PX;
    const size = coin.startSize + (END_SIZE_PX - coin.startSize) * eased;
    ctx.drawImage(coinIcon, x - size / 2, y - size / 2, size, size);
  }

  if (!arriveFired) {
    const lastCoin = coins[coins.length - 1];
    if (now - lastCoin.startedAt >= totalLifetimeMs - ARRIVE_LEAD_MS) {
      arriveFired = true;
      const cb = pendingArrive;
      pendingArrive = null;
      cb?.();
    }
  }

  if (allDone) {
    coins = [];
  }
}

// --- total-income "merged in" flash, read by hud/'s own shared readout ---

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

// 1 (just triggered) fading linearly down to 0 (back to normal) — hud/'s own
// readout blends its text color toward white and scales its wiggle by this
export function getHudTotalFlashStrength(now: number): number {
  if (hudFlashStartedAt === null) return 0;
  const elapsed = now - hudFlashStartedAt;
  if (elapsed >= HUD_FLASH_DURATION_MS) {
    hudFlashStartedAt = null;
    return 0;
  }
  return 1 - elapsed / HUD_FLASH_DURATION_MS;
}
