// the Twister's funnel: coins and bills whirling round a tornado that stands
// on its tip, the bottom spinning fastest, the whole body swaying, with wind
// streaks wrapping round its front
import { COLOR } from "../../../../palette";
import {
  beginCoinBatch,
  BILL_SPIN_FRAME_COUNT,
  COIN_BILL_CHANCE,
  COIN_SPIN_FRAME_COUNT,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { WORKER_HEIGHT } from "../../../../floors/worker";

// its height (twice a worker's) and its top's radius, at scale 1
const HEIGHT = WORKER_HEIGHT * 2;
const TOP_RADIUS = HEIGHT * 0.29;
const TIP_RADIUS = HEIGHT * 0.03;
// the ellipse squash of each ring, seen from slightly above
const RING_SQUASH = 0.28;
// a coin's radius, the funnel's spin (rad/s) at its tip and top, and how
// far its body sways (px at its top)
const COIN_SIZE = HEIGHT * 0.045;
const TIP_SPIN = 22;
const TOP_SPIN = 10;
const SWAY = HEIGHT * 0.065;
const WIND_STREAKS = 6;

interface FunnelCoin extends CoinBurstSprite {
  // 0 at the tip, 1 at the top
  h: number;
  angle: number;
  spinRate: number;
}

export interface Funnel {
  coins: FunnelCoin[];
}

export function createFunnel(count: number): Funnel {
  return {
    coins: Array.from({ length: count }, () => {
      const kind = Math.random() < COIN_BILL_CHANCE ? "bill" : "coin";
      return {
        // more of them up where the funnel is wide
        h: Math.sqrt(Math.random()),
        angle: Math.random() * Math.PI * 2,
        kind,
        spinFrame:
          Math.random() *
          (kind === "bill" ? BILL_SPIN_FRAME_COUNT : COIN_SPIN_FRAME_COUNT),
        spinRate: 8 + Math.random() * 8,
        axisAngle: (Math.random() * 2 - 1) * 0.6,
      };
    }),
  };
}

// the funnel standing on (x, y), world space; shown is how many of its coins
// are in it (it fills up as it sweeps), spin speeds it up
export function drawFunnel(
  ctx: CanvasRenderingContext2D,
  funnel: Funnel,
  x: number,
  y: number,
  scale: number,
  shown: number,
  spin: number,
  now: number,
): void {
  if (scale <= 0) return;
  const t = now / 1000;
  const height = HEIGHT * scale;
  const centerX = (h: number) =>
    x + Math.sin(t * 2.4 + h * 3) * SWAY * scale * h;
  const radius = (h: number) =>
    (TIP_RADIUS + (TOP_RADIUS - TIP_RADIUS) * h ** 1.3) * scale;
  const ringY = (h: number) => y - h * height;
  const spinAt = (h: number) => (TIP_SPIN + (TOP_SPIN - TIP_SPIN) * h) * spin;

  const placed = funnel.coins.slice(0, Math.ceil(shown)).map((coin, i) => {
    const angle = coin.angle + t * spinAt(coin.h);
    const depth = Math.sin(angle);
    const r = radius(coin.h);
    // the newest coin pops in as it arrives
    const pop = Math.min(1, shown - i);
    return {
      coin,
      depth,
      x: centerX(coin.h) + Math.cos(angle) * r,
      y: ringY(coin.h) + depth * r * RING_SQUASH,
      size:
        COIN_SIZE * scale * (0.6 + 0.4 * coin.h) * (0.8 + 0.2 * depth) * pop,
    };
  });
  placed.sort((a, b) => a.depth - b.depth);

  const streaks = (front: boolean) => {
    ctx.save();
    ctx.strokeStyle = COLOR.white;
    ctx.lineCap = "round";
    for (let k = 0; k < WIND_STREAKS; k++) {
      const h = (k + 0.5) / WIND_STREAKS;
      const r = radius(h);
      const start = t * spinAt(h) + k * 1.9;
      ctx.globalAlpha = front ? 0.6 : 0.25;
      ctx.lineWidth = (4 + 6 * h) * scale;
      ctx.beginPath();
      ctx.ellipse(
        centerX(h),
        ringY(h),
        r * 1.08,
        r * RING_SQUASH * 1.08,
        0,
        start + (front ? 0 : Math.PI),
        start + (front ? 0 : Math.PI) + 1.4,
      );
      ctx.stroke();
    }
    ctx.restore();
  };

  streaks(false);
  // a faint dusty body for the coins to whirl round
  ctx.save();
  ctx.globalAlpha = 0.16 * Math.min(1, shown / 40);
  ctx.fillStyle = COLOR.wispGlitter;
  ctx.beginPath();
  for (let k = 0; k <= 12; k++) {
    const h = k / 12;
    ctx.lineTo(centerX(h) - radius(h), ringY(h));
  }
  for (let k = 12; k >= 0; k--) {
    const h = k / 12;
    ctx.lineTo(centerX(h) + radius(h), ringY(h));
  }
  ctx.fill();
  ctx.restore();
  const base = ctx.getTransform();
  beginCoinBatch(ctx);
  for (const p of placed) {
    ctx.globalAlpha = p.depth < 0 ? 0.75 : 1;
    drawCoinBurstFrame(
      ctx,
      { ...p.coin, spinFrame: p.coin.spinFrame + t * p.coin.spinRate },
      p.x,
      p.y,
      p.size,
      base,
    );
  }
  ctx.globalAlpha = 1;
  endCoinBatch(ctx);
  streaks(true);
}

// the point a sucked-in stream aims at: partway up the funnel standing on (x, y)
export function funnelBody(
  x: number,
  y: number,
  scale: number,
): { x: number; y: number } {
  return { x, y: y - HEIGHT * scale * 0.35 };
}
