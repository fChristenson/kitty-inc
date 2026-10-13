// the player's pistol in a fight: shots fired at points of the world, two
// wisp rounds flying from the muzzle to each and a blast where they land, the
// gun kicked back by its latest shot; and an enemy's pose through its fight
// (aiming, flashing white on each hit, toppling after the last)
import { clamp01, smoothstep } from "../../easing";
import { drawDetonation } from "../explosion";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { drawWispHead, drawWispTrail, WISP_SIZE, type Point } from "../../wisp";
import type { FpsEnemyPose } from "./enemy";
import { drawFpsGun } from "./gun";
import { fpsSight, type Fps } from "./world";

// a round's flight from the muzzle
export const FPS_ROUND_MS = 80;
const ROUNDS = 2;
// the rounds' spread at their target, in world units
const SPREAD = 0.04;
const ROUND_SIZE = 1.3;
const KICK_MS = 240;
// how long a shot's trail and blast are drawn after it lands
const LINGER_MS = 900;
const AIM_MS = 220;
const HURT_MS = 150;
const HURT_BLINK_MS = 40;
const FALL_LAG_MS = 60;
const FALL_MS = 280;

export interface FpsShot {
  ms: number;
  // the world point it hits, and its blast's size there, in world units
  x: number;
  y: number;
  z: number;
  size: number;
  // the muzzle and target on screen and the rounds' spread there (px, 0 out
  // of view), kept up to date while it's drawn
  from: Point;
  to: Point;
  spread: number;
  // each round's flight, planned once
  rounds: ((ms: number) => Point)[];
}

export function createFpsShot(
  ms: number,
  x: number,
  y: number,
  z: number,
  size: number,
): FpsShot {
  const shot: FpsShot = {
    ms,
    x,
    y,
    z,
    size,
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    spread: 0,
    rounds: [],
  };
  for (let k = 0; k < ROUNDS; k++) {
    const side = k / (ROUNDS - 1) - 0.5;
    shot.rounds.push((t) => {
      const u = clamp01((t - ms) / FPS_ROUND_MS);
      const { from, to } = shot;
      return {
        x: from.x + (to.x + side * shot.spread - from.x) * u,
        y: from.y + (to.y - from.y) * u,
      };
    });
  }
  return shot;
}

// the pistol bobbing at `bob`, `lower` 0 held up to 1 out of sight, kicked by
// the latest of shots (sorted by ms) fired by ms, and every shot's rounds and
// blast; the gun's muzzle
export function drawFpsShots(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  shots: FpsShot[],
  ms: number,
  now: number,
  bob: number,
  lower = 0,
): Point {
  let last = -Infinity;
  for (let i = 0; i < shots.length && shots[i].ms <= ms; i++)
    last = shots[i].ms;
  const since = ms - last;
  const muzzle = drawFpsGun(ctx, fps.view, {
    bob,
    recoil: Math.max(0, 1 - since / KICK_MS) ** 2,
    sinceShot: since,
    lower,
  });
  // every round's trail in one light batch, then their heads and the blasts
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (const shot of shots) {
    if (ms < shot.ms || ms > shot.ms + FPS_ROUND_MS + LINGER_MS) continue;
    const at = fpsSight(fps, shot.x, shot.y, shot.z);
    if (!at) {
      shot.spread = 0;
      continue;
    }
    shot.from.x = muzzle.x;
    shot.from.y = muzzle.y;
    shot.to.x = at.x;
    shot.to.y = at.y;
    shot.spread = SPREAD * at.s;
    for (const round of shot.rounds)
      drawWispTrail(ctx, round, ms, now, WISP_SIZE * ROUND_SIZE);
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
  for (const shot of shots) {
    if (ms < shot.ms || ms > shot.ms + FPS_ROUND_MS + LINGER_MS) continue;
    if (shot.spread === 0) continue;
    if (ms <= shot.ms + FPS_ROUND_MS)
      for (const round of shot.rounds)
        drawWispHead(ctx, round, ms, now, WISP_SIZE * ROUND_SIZE, 1);
    drawDetonation(
      ctx,
      shot.to,
      ms - shot.ms - FPS_ROUND_MS,
      (shot.size * shot.spread) / SPREAD,
      now,
    );
  }
  return muzzle;
}

// an enemy raising its aim from `aimFrom`, flashing white as each of `hits`
// (shot times) lands, toppling towards fallSide after the last
export function fpsEnemyPose(
  ms: number,
  aimFrom: number,
  hits: number[],
  fallSide: number,
): FpsEnemyPose {
  let hit = -Infinity;
  for (const h of hits) if (ms >= h + FPS_ROUND_MS) hit = h + FPS_ROUND_MS;
  const dies = hits[hits.length - 1] + FPS_ROUND_MS;
  return {
    aim: smoothstep(clamp01((ms - aimFrom) / AIM_MS)),
    sway: Math.sin(ms * 0.006) * 0.02,
    hurt:
      ms >= hit &&
      ms < hit + HURT_MS &&
      Math.floor((ms - hit) / HURT_BLINK_MS) % 2 === 0,
    down: smoothstep(clamp01((ms - dies - FALL_LAG_MS) / FALL_MS)),
    fallSide,
  };
}
