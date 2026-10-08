// the "Tidal Tails" event (galaxy; worker perma tiers): it covers its crit,
// whose click freezes the screen while two little spiral galaxies of glitter
// swirl up on either side of it, turning opposite ways, and swing in past
// each other; at their closest the shake hits and each tears the other's
// outer stars away in long streaming tails of glitter flung out along their
// orbits, every few torn loose a pop; as the galaxies sail apart the tails
// rain down onto the workers, each climbing a perma tier as its stars land,
// the last in a big blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawStars,
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/galaxy";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "tidalTails";
const MAX_WORKERS = 6;
const STARS = 150;
const STAR = 9;
const CORE = WISP_SIZE * 0.9;
// each galaxy: this big, seen this tilted, two arms
const OUTER = 150;
const INNER = 18;
const SQUASH = 0.55;
// the pass: each sweeps SWEEP px across, closest PASS px off the middle at
// the pass's midpoint, curving CURVE px
const SWEEP = 420;
const PASS = 80;
const CURVE = 160;
// the outer share of each galaxy is torn off round the closest approach,
// over this share of the pass either side of it
const TORN = 0.45;
const TEAR: [number, number] = [-0.08, 0.18];
const BOW = 160;
const POP_EVERY = 10;
const POP_SHAKE = 0.2;
const PASS_SHAKE = 1;
const LAND_SHAKE = 0.6;
const SOUND_GAP_MS = 70;

interface Torn {
  orbit: Orbit;
  galaxy: number;
  tearAt: number;
  from: Point;
  vx: number;
  vy: number;
  worker: RewardWorker;
  leaves: number;
  lands: number;
  rain: Point;
  bow: Point;
}

export const forceTidalTailsEvent = registerWispEvent(
  KEY,
  "Tidal Tails",
  () => CONFIG.tidalTailsEvent.chance,
  (floor, context, area) => {
    const { growMs, passMs, gapMs, dropMs, holdMs, mergeMs } =
      CONFIG.tidalTailsEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.38),
    };
    // galaxy 0 sweeps left to right above the middle, galaxy 1 mirrors it
    const centreAt = (g: number, ms: number, into: Point): Point => {
      const s = (ms - growMs) / passMs;
      const k = 1 - 2 * Math.max(-0.15, Math.min(1.3, s));
      const side = g === 0 ? 1 : -1;
      into.x = mid.x - side * SWEEP * k;
      into.y = mid.y - side * (PASS + CURVE * k * k);
      return into;
    };
    const centres: Point[] = [0, 1].map((g) => centreAt(g, 0, { x: 0, y: 0 }));
    const disks: Disk[] = centres.map((c, g) =>
      planDisk(c, {
        inner: INNER,
        outer: OUTER,
        squash: SQUASH,
        tilt: g === 0 ? 0.3 : -0.4,
        rimHz: 0.8,
        spin: g === 0 ? 1 : -1,
      }),
    );
    const stars = disks.map((d, g) => scatterArms(d, STARS, 2, 0.5 + 0.2 * g));
    const closest = growMs + passMs / 2;
    const rainAt = growMs + passMs * 0.85;

    // the outer stars: torn loose along their orbits, flying on at their speed
    const bound: Orbit[][] = [[], []];
    const torn: Torn[] = [];
    const v: Point = { x: 0, y: 0 };
    const w: Point = { x: 0, y: 0 };
    stars.forEach((list, g) =>
      list.forEach((orbit) => {
        if (orbit.radius < OUTER * (1 - TORN)) {
          bound[g].push(orbit);
          return;
        }
        const tearAt = closest + passMs * lerp(TEAR, Math.random());
        const d = disks[g];
        centreAt(g, tearAt, d.center);
        const from = d.at(orbit, tearAt, { x: 0, y: 0 });
        const a = d.heading(orbit, tearAt);
        const speed = Math.abs(d.omega(orbit.radius)) * orbit.radius;
        centreAt(g, tearAt + 1, v);
        centreAt(g, tearAt, w);
        torn.push({
          orbit,
          galaxy: g,
          tearAt,
          from,
          vx: Math.cos(a) * speed + (v.x - w.x),
          vy: Math.sin(a) * speed + (v.y - w.y),
          worker: workers[0],
          leaves: 0,
          lands: 0,
          rain: { x: 0, y: 0 },
          bow: { x: 0, y: 0 },
        });
      }),
    );
    torn.sort((a, b) => a.tearAt - b.tearAt);
    torn.forEach((t, i) => {
      const k = i % workers.length;
      t.worker = workers[k];
      t.leaves = rainAt + k * gapMs + Math.random() * gapMs * 0.6;
      t.lands = t.leaves + dropMs;
      t.rain.x = t.from.x + t.vx * (t.leaves - t.tearAt);
      t.rain.y = t.from.y + t.vy * (t.leaves - t.tearAt);
      t.bow.x = (t.rain.x + t.worker.at.x) / 2;
      t.bow.y = Math.min(t.rain.y, t.worker.at.y) - BOW;
    });
    const firstLands = workers.map((worker) =>
      Math.min(...torn.filter((t) => t.worker === worker).map((t) => t.lands)),
    );
    const endMs = Math.max(...torn.map((t) => t.lands));
    const lastWorker = workers[firstLands.indexOf(Math.max(...firstLands))];
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const swirling = createBeats(
      [0, closest],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms > 0) shakeScreen(PASS_SHAKE);
      },
    );
    const tearing = createBeats(
      torn.filter((_, i) => i % POP_EVERY === 0),
      (t) => t.tearAt,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(POP_SHAKE);
        sound(now);
      },
    );
    const landing = createBeats(
      workers,
      (_, k) => firstLands[k],
      (worker, _, now) => {
        cover!.promote(worker);
        if (worker === lastWorker) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const coreAt = centres.map((c) => () => c);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          swirling.tick(ms, now);
          tearing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - rainAt) / 500);
          for (let g = 0; g < 2; g++) {
            centreAt(g, ms, centres[g]);
            drawStars(ctx, disks[g], bound[g], ms, STAR, grow, fade);
            if (fade > 0)
              drawWisp(ctx, coreAt[g], ms, now, CORE * grow * fade, 0.6);
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < torn.length; i++) {
            const t = torn[i];
            if (ms >= t.lands) continue;
            if (ms < t.tearAt) disks[t.galaxy].at(t.orbit, ms, bit, grow);
            else if (ms < t.leaves) {
              bit.x = t.from.x + t.vx * (ms - t.tearAt);
              bit.y = t.from.y + t.vy * (ms - t.tearAt);
            } else
              bezier(
                t.rain,
                t.bow,
                t.worker.at,
                easeIn((ms - t.leaves) / dropMs),
                bit,
              );
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              STAR * (ms >= t.tearAt ? 1.25 : 1),
              i + ms * 0.006,
              i % 2 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
