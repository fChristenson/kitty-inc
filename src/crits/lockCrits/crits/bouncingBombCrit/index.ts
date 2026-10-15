// Bouncing Bomb, a lock crit: the number drops in as a round lit bomb onto
// the far end of the bar under the dark locked floor and skips along it like
// a stone on water, every hop shorter and quicker, each landing a thud, a
// flash and a jolt; its fuse spits sparks and burns shorter, the bomb
// swelling and throbbing faster, the lock glowing as it nears; on the last
// skip it leaps up and slams into the lock, blowing the floor open in one
// big blast, and its shrapnel rains out over the new floor and down onto
// the bar below: the floor under the opened one levels up
import meta from "./meta";
import { critTarget } from "../../../critKit/target";
import {
  drawBounceSplash,
  hops,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";

const LOCK = getLockCenter();
const BOX = getIncomeBarBox(false);
// the bar under the locked floor, from the lock's middle: its top and middle
const SKIP_Y = BOX.y - LOCK.y + FLOOR_H - 4;
const BELOW: Point = {
  x: BOX.x + BOX.width / 2 - LOCK.x,
  y: BOX.y + BOX.height / 2 - LOCK.y + FLOOR_H,
};
const RIGHT = BOX.x + BOX.width - LOCK.x - 30;
const LEFT = BOX.x - LOCK.x + 40;

// the number arcing in to where the bomb drops from, high off the bar's end
const ARC_MS = 140;
const START: Point = { x: RIGHT + 150, y: -FLOOR_H * 0.75 };
// the drop and SKIPS skips right to left, each GAP of the one before,
// LEG_MS a hop (quickening) LIFT px high (lowering)
const SKIPS = 5;
const GAP = 0.72;
const LEG_MS: [number, number] = [270, 105];
const LIFT: [number, number] = [90, 28];
// the leap off the last skip up onto the lock
const LEAP_MS = 190;
const LEAP_LIFT = 170;

const spots: Point[] = [START, { x: RIGHT, y: SKIP_Y }];
{
  let total = 0;
  for (let k = 0; k < SKIPS; k++) total += GAP ** k;
  let x = RIGHT;
  for (let k = 0; k < SKIPS; k++) {
    x -= ((RIGHT - LEFT) * GAP ** k) / total;
    spots.push({ x, y: SKIP_Y });
  }
}
const SKIPPING = hops(spots, LEG_MS, LIFT, ARC_MS);
const ORIGIN: Point = { x: 0, y: 0 };
const LEAP = hops(
  [spots[spots.length - 1], ORIGIN],
  [LEAP_MS, LEAP_MS],
  [LEAP_LIFT, LEAP_LIFT],
  SKIPPING.endMs,
);
const OPEN_AT = LEAP.endMs;
const LANDINGS = SKIPPING.bounces;
const bombAt = (ms: number): Point =>
  ms < SKIPPING.endMs ? SKIPPING.at(ms) : LEAP.at(ms);

// the bomb: BOMB px, GROW bigger every landing, bulging SWELL for SWELL_MS
const BOMB = WISP_SIZE * 1.25;
const GROW = 0.09;
const SWELL = 0.45;
const SWELL_MS = 130;
const SPLASH: [number, number] = [130, 230];
// the fuse: FUSE px long burning down to a stub, SPITS sparks off its tip
// flying SPIT_REACH px over SPIT_MS
const FUSE = 46;
const FUSE_STUB = 8;
const FUSE_W = 5;
const FUSE_COLOR = "#5a3b1c";
const SPITS = 9;
const SPIT_REACH = 38;
const SPIT_MS = 180;
const SPIT_SIZE = 16;
// the lock warming as the bomb burns down
const LOCK_GLOW = 300;
const LOCK_GLOW_ALPHA = 0.5;
const GOLD = glowStops(COLOR.heavenlyGold);
const OPEN_BLAST = 500;

// the shrapnel: SHARDS bits flung up over the new floor and raining down
// onto the bar below over RAIN_MS, each up to STAGGER late
const SHARDS = 90;
const RAIN_MS = 270;
const STAGGER = 80;
const SHARD_SIZE = 22;
const LAND_AT = OPEN_AT + STAGGER + RAIN_MS;
const LAND_BLAST = 280;
const SHARD_CX = new Float32Array(SHARDS);
const SHARD_CY = new Float32Array(SHARDS);
const SHARD_X = new Float32Array(SHARDS);
const SHARD_T0 = new Float32Array(SHARDS);
for (let i = 0; i < SHARDS; i++) {
  const side = hash01(i, 5101) * 2 - 1;
  SHARD_X[i] = BELOW.x + side * BOX.width * 0.45;
  SHARD_CX[i] = side * BOX.width * 0.8;
  SHARD_CY[i] = -lerp(170, 330, hash01(i, 5102));
  SHARD_T0[i] = OPEN_AT + STAGGER * hash01(i, 5103);
}
// shakes by step: a skip landing, the lock blowing, the shrapnel landing
const SHAKES = [0.8, 3.4, 1.3];

const bomb: Point = { x: 0, y: 0 };

registerFloorCrit("bouncingBombCrit", {
  // levels on the open floor under the one it opened
  reward(t) {
    const below = t.floors[t.floors.indexOf(t.floor) - 1];
    if (!below?.unlocked) return;
    critTarget({
      floor: below,
      ownFloor: t.ownFloor,
      floors: t.floors,
      step: t.step,
      tier: t.tier,
      count: t.count,
      color: t.color,
      price: t.price,
      index: t.index,
    }).levelUp(t.count * meta.values.levels);
  },
  plan(_r, _bars, hit) {
    for (const b of LANDINGS) hit(0, b.ms, 0);
    hit(0, OPEN_AT, 1);
    hit(0, LAND_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x + START.x, p),
        lerp(0, lock.y + START.y, p),
        r.flashFont * (1 - 0.7 * p),
      );
    }
    let landed = 0;
    while (landed < LANDINGS.length && ms >= LANDINGS[landed].ms) landed++;
    const burn = clamp01((ms - ARC_MS) / (OPEN_AT - ARC_MS));

    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms >= ARC_MS && ms < OPEN_AT) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = burn * burn * LOCK_GLOW_ALPHA;
      drawGlow(ctx, GOLD, 0, 0, LOCK_GLOW * (0.6 + 0.6 * burn), 0.45);
      ctx.restore();
    }
    for (let k = 0; k < LANDINGS.length; k++) {
      const b = LANDINGS[k];
      drawBounceSplash(
        ctx,
        b,
        ms - b.ms,
        lerp(SPLASH[0], SPLASH[1], k / (LANDINGS.length - 1)),
        now,
      );
    }

    if (ms >= ARC_MS && ms < OPEN_AT) {
      const p = bombAt(ms);
      bomb.x = p.x;
      bomb.y = p.y;
      const since = landed > 0 ? ms - LANDINGS[landed - 1].ms : SWELL_MS;
      const bulge = Math.max(0, 1 - since / SWELL_MS);
      const size = BOMB * (1 + GROW * landed) * (1 + SWELL * bulge * bulge);
      drawLitFuse(ctx, bomb, burn, size * 1.7, now);
      // the fuse curling off its top, burning shorter, sparks spitting off
      const len = lerp(FUSE, FUSE_STUB, burn);
      const baseY = bomb.y - size * 0.4;
      const tipX = bomb.x + len * 0.45;
      const tipY = baseY - len;
      ctx.strokeStyle = FUSE_COLOR;
      ctx.lineWidth = FUSE_W;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bomb.x, baseY);
      ctx.quadraticCurveTo(bomb.x - len * 0.3, baseY - len * 0.6, tipX, tipY);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      const spitMs = SPIT_MS * (1 - 0.5 * burn);
      for (let i = 0; i < SPITS; i++) {
        const phase = (ms / spitMs + i / SPITS) % 1;
        const cycle = Math.floor(ms / spitMs + i / SPITS);
        const a = -Math.PI / 2 + (hash01(i, cycle) * 2 - 1) * 1.4;
        const d = SPIT_REACH * (0.5 + 0.5 * burn) * phase;
        stampGlimmer(
          ctx,
          tipX + Math.cos(a) * d,
          tipY + Math.sin(a) * d + 30 * phase * phase,
          SPIT_SIZE * (1 - phase),
          i + ms * 0.02,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawWispBetween(
      ctx,
      bombAt,
      ms,
      now,
      BOMB * (1 + GROW * landed),
      burn,
      ARC_MS,
      OPEN_AT,
    );

    // the shrapnel flung up off the blast, raining onto the bar below
    if (ms >= OPEN_AT && ms < LAND_AT) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < SHARDS; i++) {
        const s = (ms - SHARD_T0[i]) / RAIN_MS;
        if (s <= 0 || s >= 1) continue;
        const v = 1 - s;
        stampGlimmer(
          ctx,
          2 * v * s * SHARD_CX[i] + s * s * SHARD_X[i],
          2 * v * s * SHARD_CY[i] + s * s * BELOW.y,
          SHARD_SIZE * (1 - 0.4 * s),
          i + ms * 0.015,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BELOW, ms - LAND_AT, LAND_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
