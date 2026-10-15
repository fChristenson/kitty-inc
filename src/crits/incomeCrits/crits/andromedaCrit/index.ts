// Andromeda, an income crit: a galaxy merger. The amount bursts into two
// tilted star disks spinning up either side under the total; they fall
// together and swing past each other, closer and quicker each pass, every
// pass tearing long tidal tails off them and slinging a clump of stars up
// along its heading into the readout (a share, a flash); on the last pass
// they collide into one blazing core that flings every star up into the
// total at once
import { COLOR } from "../../../../palette";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import {
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const TAU = Math.PI * 2;
// each disk: its stars in spiral arms, tilted its own way, turning its own way
const STARS = 150;
const ALL = STARS * 2;
const ARMS = 2;
const TWIST = 0.65;
const INNER = 16;
const OUTER = 170;
const SQUASH = 0.34;
const TILTS = [0.32, -0.42];
const SPINS = [1, -1];
const RIM_HZ = 0.55;
// spinning up: SPIN_RUSH times faster again by the merger
const SPIN_RUSH = 1.6;
// the pair BELOW the total, swinging SWING either side, SWING_Y of it up and
// down; KEPLER whips them through each pass and lingers out wide
const BELOW = 380;
const SWING = 250;
const SWING_Y = 0.32;
const SWING_FALL = 0.8;
const KEPLER = 0.7;
// growing in from the amount, then the passes, closer together; the last is
// the collision
const IN_MS = 240;
const GAPS = [340, 280, 220, 170, 130];
// each pass, per disk: a clump slung up into the readout, a tail torn off
const CLUMP = 8;
const TAIL = 14;
const TAIL_FROM = 0.5;
const TAIL_SPEED: [number, number] = [0.22, 0.5];
// a flung star leaves along its heading, then curves up onto the total
const HEADING_PULL = 200;
const FLY_MS = 240;
const STAGGER_MS = 80;
const JITTER_X = 110;
const JITTER_Y = 36;
const SPREAD_X = 300;
const SPREAD_Y = 35;
const STAR = 20;
const TAIL_STAR = 16;
const FLUNG = 28;
const TWINKLE = 0.012;
// glows: each disk's core, a pass's flash between them, the merger building
// and blazing, a clump landing on the readout (bigger each)
const CORE_GLOW: [number, number] = [60, 110];
const PASS_MS = 170;
const PASS_GLOW = 170;
const PASS_GROW = 0.25;
const MERGE_GLOW: [number, number] = [70, 300];
const BLAZE_MS = FLY_MS + STAGGER_MS;
const BLAZE_POP = 260;
const TREMBLE = 7;
const LAND_MS = 180;
const LAND_GLOW = 150;
const LAND_GROW = 0.3;
const LAND_STAR = 90;
// kicked on each pass, the collision hardest
const PASS_SHAKES = [0.5, 0.7, 0.9, 1.1, 2.2];
// shakes by step: a clump landing, the finale
const SHAKES = [0.9, 2.8];

const PASS_AT: number[] = [];
for (let k = 0, at = IN_MS; k < GAPS.length; k++) PASS_AT.push((at += GAPS[k]));
const PASSES = PASS_AT.length;
const MERGE_MS = PASS_AT[PASSES - 1];
const BUILD_MS = PASS_AT[PASSES - 2];
const END_MS = MERGE_MS + STAGGER_MS + FLY_MS;
const FINALE_MS = MERGE_MS + FLY_MS + STAGGER_MS / 2;

interface Merger {
  disks: Disk[];
  orbits: Orbit[];
  cx: number;
  cy: number;
  diskOf: Uint8Array;
  // a torn star's tear: when, where, and its velocity (px/ms)
  tornAt: Float32Array;
  tail: Float32Array;
  // each star's fling: when, then from, pull and landing
  flingAt: Float32Array;
  fly: Float32Array;
  spots: Point[];
}
const mergers = new WeakMap<Running, Merger>();
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.15);
const star: Point = { x: 0, y: 0 };
const coreA: Point = { x: 0, y: 0 };
const coreB: Point = { x: 0, y: 0 };

// the disks' own clocks, spinning up to the merger
function spinMs(ms: number): number {
  const x = clamp01(ms / MERGE_MS);
  return ms * (1 + SPIN_RUSH * x * x);
}

// the passes so far: -0.5 out wide at the start, k at pass k
function passesAt(ms: number): number {
  if (ms <= IN_MS) return -0.5;
  if (ms < PASS_AT[0])
    return -0.5 + (0.5 * (ms - IN_MS)) / (PASS_AT[0] - IN_MS);
  for (let k = 1; k < PASSES; k++)
    if (ms < PASS_AT[k])
      return k - 1 + (ms - PASS_AT[k - 1]) / (PASS_AT[k] - PASS_AT[k - 1]);
  return PASSES - 1;
}

// disk d's centre at ms: out from the amount, then swinging round the other
function centreAt(cx: number, cy: number, d: number, ms: number, into: Point) {
  const sign = d ? -1 : 1;
  if (ms < IN_MS) {
    const p = 1 - (1 - ms / IN_MS) ** 3;
    into.x = (cx + sign * SWING) * p;
    into.y = cy * p;
    return into;
  }
  const h = passesAt(ms);
  const phi = Math.PI / 2 + Math.PI * (h + (KEPLER * Math.sin(TAU * h)) / TAU);
  const a = SWING * (1 - (h + 0.5) / (PASSES - 0.5)) ** SWING_FALL;
  into.x = cx + sign * a * Math.cos(phi);
  into.y = cy + sign * a * SWING_Y * Math.sin(phi);
  return into;
}

function planMerger(to: Point): Merger {
  const cx = to.x;
  const cy = to.y + BELOW;
  const disks = [0, 1].map((d) =>
    planDisk(
      { x: 0, y: 0 },
      {
        inner: INNER,
        outer: OUTER,
        squash: SQUASH,
        tilt: TILTS[d],
        rimHz: RIM_HZ,
        spin: SPINS[d],
      },
    ),
  );
  const orbits = [
    ...scatterArms(disks[0], STARS, ARMS, TWIST),
    ...scatterArms(disks[1], STARS, ARMS, TWIST),
  ];
  const diskOf = new Uint8Array(ALL);
  for (let i = STARS; i < ALL; i++) diskOf[i] = 1;
  const tornAt = new Float32Array(ALL).fill(Infinity);
  const tail = new Float32Array(ALL * 4);
  const flingAt = new Float32Array(ALL).fill(Infinity);
  const fly = new Float32Array(ALL * 6);
  const spots = PASS_AT.slice(0, -1).map((_, k) => readoutSpot(to, k, 4410));
  const score = new Float32Array(ALL);
  const centre: Point = { x: 0, y: 0 };
  const setFly = (
    i: number,
    x: number,
    y: number,
    heading: number,
    tx: number,
    ty: number,
  ) => {
    fly[i * 6] = x;
    fly[i * 6 + 1] = y;
    fly[i * 6 + 2] = x + Math.cos(heading) * HEADING_PULL;
    fly[i * 6 + 3] = y + Math.sin(heading) * HEADING_PULL;
    fly[i * 6 + 4] = tx;
    fly[i * 6 + 5] = ty;
  };
  // the n free stars of disk d scoring highest
  const pick = (d: number, n: number, take: (i: number) => void) => {
    for (let j = 0; j < n; j++) {
      let best = -1;
      for (let i = d * STARS; i < (d + 1) * STARS; i++)
        if (score[i] > -Infinity && (best < 0 || score[i] > score[best]))
          best = i;
      if (best < 0) return;
      score[best] = -Infinity;
      take(best);
    }
  };
  for (let k = 0; k < PASSES - 1; k++) {
    const at = PASS_AT[k];
    const spin = spinMs(at);
    for (let d = 0; d < 2; d++) {
      const disk = disks[d];
      centreAt(cx, cy, d, at, centre);
      const free = (i: number) =>
        flingAt[i] === Infinity && tornAt[i] === Infinity;
      // the clump: stars heading up the most
      for (let i = d * STARS; i < (d + 1) * STARS; i++)
        score[i] = free(i)
          ? -Math.sin(disk.heading(orbits[i], spin))
          : -Infinity;
      pick(d, CLUMP, (i) => {
        disk.at(orbits[i], spin, star);
        flingAt[i] = at;
        setFly(
          i,
          centre.x + star.x,
          centre.y + star.y,
          disk.heading(orbits[i], spin),
          spots[k].x + (holeHash(i, 4411) - 0.5) * JITTER_X,
          spots[k].y + (holeHash(i, 4412) - 0.5) * JITTER_Y,
        );
      });
      // the tail: outer stars heading out on its own side
      const sign = d ? -1 : 1;
      for (let i = d * STARS; i < (d + 1) * STARS; i++)
        score[i] =
          free(i) && orbits[i].radius > OUTER * TAIL_FROM
            ? sign * Math.cos(disk.heading(orbits[i], spin)) * orbits[i].radius
            : -Infinity;
      pick(d, TAIL, (i) => {
        disk.at(orbits[i], spin, star);
        const heading = disk.heading(orbits[i], spin);
        const speed = lerp(TAIL_SPEED[0], TAIL_SPEED[1], holeHash(i, 4413));
        tornAt[i] = at;
        tail[i * 4] = centre.x + star.x;
        tail[i * 4 + 1] = centre.y + star.y;
        tail[i * 4 + 2] = Math.cos(heading) * speed;
        tail[i * 4 + 3] = Math.sin(heading) * speed;
      });
    }
  }
  // the merger: everything left, torn or not, flung up at once
  for (let i = 0; i < ALL; i++) {
    if (flingAt[i] !== Infinity) continue;
    const at = MERGE_MS + holeHash(i, 4414) * STAGGER_MS;
    const tx = to.x + (holeHash(i, 4415) * 2 - 1) * SPREAD_X;
    const ty = to.y + (holeHash(i, 4416) * 2 - 1) * SPREAD_Y;
    flingAt[i] = at;
    if (tornAt[i] !== Infinity) {
      const since = at - tornAt[i];
      const vx = tail[i * 4 + 2];
      const vy = tail[i * 4 + 3];
      setFly(
        i,
        tail[i * 4] + vx * since,
        tail[i * 4 + 1] + vy * since,
        Math.atan2(vy, vx),
        tx,
        ty,
      );
      continue;
    }
    const d = diskOf[i];
    const spin = spinMs(at);
    centreAt(cx, cy, d, at, centre);
    disks[d].at(orbits[i], spin, star);
    setFly(
      i,
      centre.x + star.x,
      centre.y + star.y,
      disks[d].heading(orbits[i], spin),
      tx,
      ty,
    );
  }
  return { disks, orbits, cx, cy, diskOf, tornAt, tail, flingAt, fly, spots };
}

registerFloorCrit("andromedaCrit", {
  plan(r, bars, hit) {
    mergers.set(r, planMerger(bars[0]));
    for (let k = 0; k < PASSES - 1; k++) hit(0, PASS_AT[k] + FLY_MS);
    hit(0, FINALE_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const m = mergers.get(r);
    if (!m) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < PASSES && ms >= PASS_AT[r.kicked])
      r.shake(PASS_SHAKES[r.kicked++]);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    centreAt(m.cx, m.cy, 0, ms, coreA);
    centreAt(m.cx, m.cy, 1, ms, coreB);
    const midX = (coreA.x + coreB.x) / 2;
    const midY = (coreA.y + coreB.y) / 2;
    const grow = ms < IN_MS ? 1 - (1 - ms / IN_MS) ** 3 : 1;
    // the two cores, brighter as they close
    if (ms < MERGE_MS) {
      const close = (passesAt(ms) + 0.5) / (PASSES - 0.5);
      const core = lerp(CORE_GLOW[0], CORE_GLOW[1], close) * grow;
      ctx.globalAlpha = 0.5 + 0.5 * close;
      drawGlow(ctx, GOLD, coreA.x, coreA.y, core, SQUASH * 1.6);
      drawGlow(ctx, GOLD, coreB.x, coreB.y, core, SQUASH * 1.6);
    }
    // each pass: a flash where they brush, bigger each pass
    for (let k = 0; k < PASSES - 1; k++) {
      const since = ms - PASS_AT[k];
      if (since < 0 || since >= PASS_MS) continue;
      const p = since / PASS_MS;
      ctx.globalAlpha = 1 - p;
      drawGlow(
        ctx,
        WHITE,
        midX,
        midY,
        PASS_GLOW * (1 + PASS_GROW * k) * (0.6 + 0.4 * p),
        0.6,
      );
    }
    // the merger: swelling and trembling into the last pass, then blazing
    const build = clamp01((ms - BUILD_MS) / (MERGE_MS - BUILD_MS));
    const after = ms - MERGE_MS;
    if (build > 0 && after < BLAZE_MS) {
      const blaze = after > 0 ? after / BLAZE_MS : 0;
      const shiver = TREMBLE * build * (1 - blaze);
      const x = midX + Math.sin(ms * 0.9) * shiver;
      const y = midY + Math.cos(ms * 1.3) * shiver;
      const glow =
        lerp(MERGE_GLOW[0], MERGE_GLOW[1], build * build) + BLAZE_POP * blaze;
      ctx.globalAlpha = after > 0 ? 1 - blaze : 0.4 + 0.6 * build;
      drawGlow(ctx, GOLD, x, y, glow, 0.7);
      drawGlow(ctx, WHITE, x, y, glow * 0.45, 0.8);
    }
    ctx.globalAlpha = 1;
    if (ms < END_MS) {
      const { disks, orbits, diskOf, tornAt, tail, flingAt, fly } = m;
      const spin = spinMs(ms);
      for (let i = 0; i < ALL; i++) {
        const at = flingAt[i];
        const d = diskOf[i];
        let x: number;
        let y: number;
        let size: number;
        if (ms >= at) {
          const u = (ms - at) / FLY_MS;
          if (u >= 1) continue;
          const e = u * u;
          const f = 1 - e;
          const j = i * 6;
          x = f * f * fly[j] + 2 * f * e * fly[j + 2] + e * e * fly[j + 4];
          y = f * f * fly[j + 1] + 2 * f * e * fly[j + 3] + e * e * fly[j + 5];
          size = FLUNG;
        } else if (ms >= tornAt[i]) {
          const since = ms - tornAt[i];
          x = tail[i * 4] + tail[i * 4 + 2] * since;
          y = tail[i * 4 + 1] + tail[i * 4 + 3] * since;
          size = TAIL_STAR;
        } else {
          const c = d ? coreB : coreA;
          disks[d].at(orbits[i], spin, star, grow);
          x = c.x + star.x;
          y = c.y + star.y;
          size = STAR * grow;
        }
        stampGlimmer(
          ctx,
          x,
          y,
          size,
          i + ms * TWINKLE,
          (i % 3 === 0) === (d === 0) ? COLOR.white : COLOR.heavenlyGold,
        );
      }
    }
    // each clump landing: a cheap flash on the readout, bigger each pass
    for (let k = 0; k < PASSES - 1; k++) {
      const since = ms - PASS_AT[k] - FLY_MS;
      if (since < 0 || since >= LAND_MS) continue;
      const p = since / LAND_MS;
      const big = 1 + LAND_GROW * k;
      const spot = m.spots[k];
      ctx.globalAlpha = 1 - p;
      drawGlow(
        ctx,
        GOLD,
        spot.x,
        spot.y,
        LAND_GLOW * big * (0.6 + 0.4 * p),
        0.5,
      );
      drawGlow(ctx, WHITE, spot.x, spot.y, LAND_GLOW * 0.5 * big, 0.4);
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        LAND_STAR * big * (1 - p),
        k,
        COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawFinale(ctx, to, ms - FINALE_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
