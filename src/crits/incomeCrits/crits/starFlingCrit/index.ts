// the star fling income crit: the number bursts into a spinning galaxy of
// glitter stars round a bright core, inner stars whipping round fastest;
// knots of stars are slung off it one after another, quicker each time, each
// streaking up into the total in a blast; then the core shoots up in the
// huge blast
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/galaxy";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash, quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const STARS = 260;
const KNOTS = 8;
const SPREAD_MS = 200;
const FLY_MS = 230;
const FIRST_MS = SPREAD_MS + 120;
const GAP_MS: [number, number] = [130, 55];
const CORE_DELAY_MS = 140;
const CORE_MS = 160;
// the disk: over the flash's spot, seen tilted, arms winding out
const UP = 60;
const INNER = 70;
const OUTER = 430;
const SQUASH = 0.38;
const RIM_HZ = 0.9;
const ARMS = 3;
// a flung star leaves along its heading, then curves up onto the total
const HEADING_PULL = 220;
const JITTER_X = 120;
const JITTER_Y = 40;
const STAR = 24;
const FLUNG = 30;
const TWINKLE = 0.012;
const CORE = WISP_SIZE * 1.6;
const OPEN_BLAST = 260;
const KNOT_BLAST = 190;
const RELEASE_SHAKE = 0.5;
// shakes by step: a knot landing, the core
const SHAKES = [0.8, 2.4];

interface Fling {
  disk: Disk;
  stars: Orbit[];
  knot: Uint8Array;
  // each star's start and end once it's flung, and its curve's pull
  from: Float32Array;
  pull: Float32Array;
  to: Float32Array;
  releaseAt: number[];
  knots: Point[];
  coreAt: number;
  endAt: number;
  core: (ms: number) => Point;
}
const flings = new WeakMap<Running, Fling>();
const star: Point = { x: 0, y: 0 };
const curve: Point = { x: 0, y: 0 };
const landing: Point = { x: 0, y: 0 };

function planFling(to: Point): Fling {
  const centre = { x: 0, y: -UP };
  const disk = planDisk(centre, {
    inner: INNER,
    outer: OUTER,
    squash: SQUASH,
    rimHz: RIM_HZ,
  });
  const stars = scatterArms(disk, STARS, ARMS);
  const releaseAt = [FIRST_MS];
  for (let k = 1; k < KNOTS; k++)
    releaseAt.push(
      releaseAt[k - 1] + lerp(GAP_MS[0], GAP_MS[1], k / (KNOTS - 1)),
    );
  const knots = releaseAt.map((_, k) => readoutSpot(to, k, 131));
  const knot = new Uint8Array(STARS);
  const from = new Float32Array(STARS * 2);
  const pull = new Float32Array(STARS * 2);
  const ends = new Float32Array(STARS * 2);
  for (let i = 0; i < STARS; i++) {
    const k = Math.floor(holeHash(i, 132) * KNOTS);
    knot[i] = k;
    const at = releaseAt[k];
    disk.at(stars[i], at, star);
    const heading = disk.heading(stars[i], at);
    from[i * 2] = star.x;
    from[i * 2 + 1] = star.y;
    pull[i * 2] = star.x + Math.cos(heading) * HEADING_PULL;
    pull[i * 2 + 1] = star.y + Math.sin(heading) * HEADING_PULL;
    ends[i * 2] = knots[k].x + (holeHash(i, 133) - 0.5) * JITTER_X;
    ends[i * 2 + 1] = knots[k].y + (holeHash(i, 134) - 0.5) * JITTER_Y;
  }
  const coreAt = releaseAt[KNOTS - 1] + CORE_DELAY_MS;
  const endAt = coreAt + CORE_MS;
  const spot: Point = { x: 0, y: 0 };
  return {
    disk,
    stars,
    knot,
    from,
    pull,
    to: ends,
    releaseAt,
    knots,
    coreAt,
    endAt,
    core: (ms) => {
      const u = clamp01((ms - coreAt) / CORE_MS) ** 2;
      spot.x = lerp(centre.x, to.x, u);
      spot.y = lerp(centre.y, to.y, u);
      return spot;
    },
  };
}

registerFloorCrit("starFlingCrit", {
  plan(r, bars, hit) {
    const fling = planFling(bars[0]);
    flings.set(r, fling);
    for (const at of fling.releaseAt) hit(0, at + FLY_MS);
    hit(0, fling.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const fling = flings.get(r);
    if (!fling) return;
    const now = r.startedAt + ms;
    const { disk, stars, knot, from, pull, to, releaseAt } = fling;
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, disk.center, ms, OPEN_BLAST, now);
    while (r.kicked < releaseAt.length && ms >= releaseAt[r.kicked]) {
      r.kicked++;
      r.shake(RELEASE_SHAKE);
    }
    if (ms < fling.endAt) {
      const grow = 1 - (1 - clamp01(ms / SPREAD_MS)) ** 3;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < STARS; i++) {
        const release = releaseAt[knot[i]];
        let p: Point;
        let size = STAR;
        if (ms < release) p = disk.at(stars[i], ms, star, grow);
        else {
          const u = (ms - release) / FLY_MS;
          if (u >= 1) continue;
          curve.x = from[i * 2];
          curve.y = from[i * 2 + 1];
          star.x = pull[i * 2];
          star.y = pull[i * 2 + 1];
          landing.x = to[i * 2];
          landing.y = to[i * 2 + 1];
          p = quadratic(curve, star, landing, u * u);
          size = FLUNG;
        }
        stampGlimmer(
          ctx,
          p.x,
          p.y,
          size,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.restore();
    }
    drawWispBetween(ctx, fling.core, ms, now, CORE, 1, 0, fling.endAt);
    const { knots } = fling;
    for (let k = 0; k < knots.length; k++)
      drawDetonation(
        ctx,
        knots[k],
        ms - releaseAt[k] - FLY_MS,
        KNOT_BLAST,
        now,
      );
    drawFinale(ctx, bars[0], ms - fling.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
