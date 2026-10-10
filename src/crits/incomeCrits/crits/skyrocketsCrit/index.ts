// the skyrockets income crit: the number bursts into rocket sparks that drop
// to the bottom of the screen and shoot up one after another, quicker and
// quicker, each bursting right on the total in a ring of glitter and a
// blast; three go up together for the finale
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const DROP_MS = 200;
const ROCKETS = 10;
const GAP_MS: [number, number] = [95, 45];
const FLY_MS = 320;
const FINALE_DELAY_MS = 140;
// the finale's three: either side of the middle, launched from further out
const FINALS = [-1, 0, 1];
const FINAL_GAP = 220;
const FINAL_FROM = 380;
// the launch line: spread across this share of the screen, up from its
// bottom (as far under the middle as this share of the total's height over it)
const SPREAD = 0.35;
const BOTTOM = 0.75;
const FLOOR_UP = 90;
// each burst's ring: its sparks, how long it lasts, its radius, flattening and sag
const SPARKS = 14;
const RING_MS = 520;
const RING = 190;
const FINAL_RING = 300;
const RING_SQUASH = 0.8;
const SAG = 120;
const SPARK = 28;
const DROPPING = 30;
const TWINKLE = 0.004;
const ROCKET = WISP_SIZE * 0.8;
const FINAL_ROCKET = WISP_SIZE * 1.1;
const BURST_BLAST = 170;
// shakes by step: a burst, the finale
const SHAKES = [0.7, 2.4];

interface Rocket {
  at: number;
  burst: number;
  from: Point;
  to: Point;
  ring: number;
  path: (ms: number) => Point;
}
interface Show {
  rockets: Rocket[];
  endAt: number;
}
const shows = new WeakMap<Running, Show>();
const spark: Point = { x: 0, y: 0 };

function rocket(from: Point, to: Point, at: number, ring: number): Rocket {
  const point: Point = { x: 0, y: 0 };
  return {
    at,
    burst: at + FLY_MS,
    from,
    to,
    ring,
    path: (ms) => {
      // fastest off the pad, easing as it reaches the top
      const u = 1 - (1 - clamp01((ms - at) / FLY_MS)) ** 2;
      point.x = lerp(from.x, to.x, u);
      point.y = lerp(from.y, to.y, u);
      return point;
    },
  };
}

function planShow(to: Point, viewportWidth: number): Show {
  const floor = -to.y * BOTTOM - FLOOR_UP;
  const rockets: Rocket[] = [];
  let at = DROP_MS;
  for (let k = 0; k < ROCKETS; k++) {
    const from = {
      x: lerp(-SPREAD, SPREAD, holeHash(k, 241)) * viewportWidth,
      y: floor,
    };
    rockets.push(rocket(from, readoutSpot(to, k, 242), at, RING));
    at += lerp(GAP_MS[0], GAP_MS[1], k / (ROCKETS - 1));
  }
  const finalAt = rockets[ROCKETS - 1].at + FINALE_DELAY_MS;
  for (const s of FINALS)
    rockets.push(
      rocket(
        { x: to.x + s * FINAL_FROM, y: floor },
        { x: to.x + s * FINAL_GAP, y: to.y },
        finalAt,
        FINAL_RING,
      ),
    );
  return { rockets, endAt: finalAt + FLY_MS };
}

registerFloorCrit("skyrocketsCrit", {
  plan(r, bars, hit) {
    const show = planShow(bars[0], r.viewportWidth);
    shows.set(r, show);
    for (let k = 0; k < ROCKETS; k++) hit(0, show.rockets[k].burst);
    hit(0, show.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const show = shows.get(r);
    if (!show) return;
    const now = r.startedAt + ms;
    const { rockets } = show;
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // sparks dropping to their pads, waiting there till they go up
    const drop = clamp01(ms / DROP_MS);
    for (let k = 0; k < rockets.length; k++) {
      const rk = rockets[k];
      if (ms >= rk.at) continue;
      stampGlimmer(
        ctx,
        rk.from.x * drop,
        rk.from.y * drop * drop,
        DROPPING,
        k + ms * TWINKLE,
        COLOR.white,
      );
    }
    // each burst's ring of glitter, sagging as it fades
    for (let k = 0; k < rockets.length; k++) {
      const rk = rockets[k];
      const t = ms - rk.burst;
      if (t < 0 || t >= RING_MS) continue;
      const u = t / RING_MS;
      const e = 1 - (1 - u) ** 3;
      ctx.globalAlpha = 1 - u;
      for (let j = 0; j < SPARKS; j++) {
        const a = (j / SPARKS) * Math.PI * 2 + k;
        spark.x = rk.to.x + Math.cos(a) * rk.ring * e;
        spark.y =
          rk.to.y + Math.sin(a) * rk.ring * e * RING_SQUASH + SAG * u * u;
        stampGlimmer(
          ctx,
          spark.x,
          spark.y,
          SPARK,
          j + ms * TWINKLE,
          j % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.restore();
    for (let k = 0; k < rockets.length; k++) {
      const rk = rockets[k];
      drawWispBetween(
        ctx,
        rk.path,
        ms,
        now,
        k < ROCKETS ? ROCKET : FINAL_ROCKET,
        1,
        rk.at,
        rk.burst,
      );
      if (k < ROCKETS)
        drawDetonation(ctx, rk.to, ms - rk.burst, BURST_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - show.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
