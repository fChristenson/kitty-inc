import {
  drawCoinBurstFrame,
  COIN_SPIN_FRAME_COUNT,
  type CoinBurstSprite,
} from "../../coinBurst";
import { randomInt } from "../../utils";

// screen-space coin rain for the purchase meter's "Shopping spree" — plain
// falling/spinning coins raining down the full viewport width for as long as
// the spree is active (see purchaseMeter's isSpreeActive), drawn in the same
// plain-viewport pass as drawTwirlText/drawCritFlash (not tied to any floor
// or world scroll). Reuses the coinBurst module's own sprite/flipbook drawing
// (drawCoinBurstFrame) — only the spawn/fall physics here are rain-specific,
// nothing that already exists for the burst effect is reimplemented

interface RainCoin extends CoinBurstSprite {
  x: number;
  y: number;
  vy: number; // px/ms, accelerates via GRAVITY every tick (falls like it has weight)
  size: number; // on-screen radius
  spinRate: number; // flipbook frames/ms
  spinDir: 1 | -1;
}

// spawns in small random-sized batches at random intervals, rather than one
// steady drip, so the rain reads as bursty/organic instead of metronomic
const MIN_SPAWN_INTERVAL_MS = 150;
const MAX_SPAWN_INTERVAL_MS = 500;
const MAX_COINS_PER_SPAWN = 3;
const MIN_FALL_SPEED = 0.15; // initial speed the instant a coin appears
const MAX_FALL_SPEED = 0.3;
// px/ms^2 — high enough that coins visibly speed up fast, reading as a heavy
// drop rather than a slow drift
const GRAVITY = 0.0022;
const MIN_SIZE = 27;
const MAX_SIZE = 51;
// slow, lazy tumble rather than a fast flipbook spin
const MIN_SPIN_RATE = 0.012;
const MAX_SPIN_RATE = 0.03;
// spawns a few px above the visible top edge so coins fade/spin into view
// instead of popping in already fully on-screen
const SPAWN_ABOVE_TOP_PX = 20;
// clamp a stray huge frame gap (e.g. a backgrounded tab) so coins can't
// suddenly teleport most of the way down the screen in one tick
const MAX_DT_MS = 100;

const coins: RainCoin[] = [];
let nextSpawnAt: number | null = null;
let lastTickAt: number | null = null;

function spawnCoin(viewportWidth: number): void {
  coins.push({
    x: Math.random() * viewportWidth,
    y: -SPAWN_ABOVE_TOP_PX - Math.random() * 20,
    vy: MIN_FALL_SPEED + Math.random() * (MAX_FALL_SPEED - MIN_FALL_SPEED),
    size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
    spinRate: MIN_SPIN_RATE + Math.random() * (MAX_SPIN_RATE - MIN_SPIN_RATE),
    spinDir: Math.random() < 0.5 ? 1 : -1,
    kind: "coin",
    spinFrame: Math.random() * COIN_SPIN_FRAME_COUNT,
    axisAngle: 0,
  });
}

// call once per frame from the plain screen-space overlay pass, passing
// Date.now()-based now (same convention as drawTwirlText/drawCritFlash).
// active: whether the spree is currently on — only gates spawning new coins;
// ones already falling keep falling (and get pruned once past the bottom)
// even the instant the spree ends, instead of snapping away
export function drawCoinRain(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  now: number,
  active: boolean,
): void {
  const dt = Math.max(0, Math.min(now - (lastTickAt ?? now), MAX_DT_MS));
  lastTickAt = now;

  if (active) {
    if (nextSpawnAt === null) nextSpawnAt = now;
    if (now >= nextSpawnAt) {
      const count = randomInt(1, MAX_COINS_PER_SPAWN);
      for (let i = 0; i < count; i++) spawnCoin(viewportWidth);
      nextSpawnAt =
        now +
        MIN_SPAWN_INTERVAL_MS +
        Math.random() * (MAX_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS);
    }
  } else {
    nextSpawnAt = null;
  }

  for (const c of coins) {
    c.vy += GRAVITY * dt;
    c.y += c.vy * dt;
    c.spinFrame += c.spinDir * c.spinRate * dt;
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    if (coins[i].y - coins[i].size > viewportHeight) coins.splice(i, 1);
  }

  for (const c of coins) {
    drawCoinBurstFrame(ctx, c, c.x, c.y, c.size);
  }
}
