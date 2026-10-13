// coins flying through the first-person world: each sets off from a point at
// its time with a velocity (world units a second), falling under gravity or
// not, spinning, and is drawn in one coin batch at its size there
import {
  beginCoinBatch,
  COIN_SPIN_FRAME_COUNT,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../coinBurst";
import { hash01 } from "../../twinkle";
import { fpsSight, type Fps } from "./world";

// world units a second², the coins' radius in world units, flipbook frames a ms
const GRAVITY = 3;
const COIN_R = 0.035;
const SPIN = 0.012;
// nearer than this in front of the view a coin isn't drawn
const NEAREST = 0.15;

export interface FpsCoin {
  x: number;
  y: number;
  z: number;
  // world units a ms
  vx: number;
  vy: number;
  vz: number;
  at: number;
  spin: number;
  falls: boolean;
  sprite: CoinBurstSprite;
}

export function createFpsCoin(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  at: number,
  seed: number,
  falls: boolean,
): FpsCoin {
  return {
    x,
    y,
    z,
    vx: vx / 1000,
    vy: vy / 1000,
    vz: vz / 1000,
    at,
    spin: hash01(seed, 7411) * COIN_SPIN_FRAME_COUNT,
    falls,
    sprite: { kind: "coin", spinFrame: 0, axisAngle: 0 },
  };
}

// every coin flying at ms, a falling one for lifeMs after it sets off
export function drawFpsCoins(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  coins: FpsCoin[],
  ms: number,
  lifeMs: number,
): void {
  const base = ctx.getTransform();
  beginCoinBatch(ctx);
  for (const c of coins) {
    const t = ms - c.at;
    if (t < 0 || (c.falls && t > lifeMs)) continue;
    const z = c.z + c.vz * t;
    if (z < fps.cam.z + NEAREST) continue;
    const fall = c.falls ? (GRAVITY * t * t) / 2e6 : 0;
    const p = fpsSight(fps, c.x + c.vx * t, c.y + c.vy * t - fall, z);
    if (!p) continue;
    c.sprite.spinFrame = c.spin + ms * SPIN;
    drawCoinBurstFrame(ctx, c.sprite, p.x, p.y, COIN_R * p.s, base);
  }
  endCoinBatch(ctx);
}
