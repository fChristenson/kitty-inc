// the "Sunflower" event (explosion; levels): it covers its crit, whose click
// freezes the screen while bombs pop out of the middle of the screen one by
// one along the golden angle, growing into the seed spiral of a sunflower;
// its outermost seed is lit, and a chain of blasts races round and round the
// spiral into its heart, faster and faster, every seed's blast its own bang
// and jolt and every Fibonacci seed a cluster; then the heart blows in a
// colossal blast and shake that flings a spark onto every bar for free
// levels. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "sunflower";
const SEEDS = 34;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);
// the flower's radius as a share of the screen's smaller side
const RADIUS = 0.42;
const SEED = 15;
const POP_MS = 120;
const FUSE_MS = 300;
const LIT_AHEAD = 3;
const BLAST: [number, number] = [100, 160];
const CLUSTER = 200;
const SATELLITES = 3;
const SATELLITE = 80;
const SATELLITE_OUT = 70;
const SATELLITE_MS = 70;
const HEART_WAIT = 220;
const HEART = 400;
const HEART_WISP = 1.1;
const FLY_MS = 320;
const SPARK = 0.6;
const BANG_GAP_MS = 60;
const SEED_SHAKE: [number, number] = [0.3, 0.7];
const CLUSTER_SHAKE = 1.1;
const HEART_SHAKE = 2;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceSunflowerEvent = registerWispEvent(
  KEY,
  "Sunflower",
  () => CONFIG.sunflowerEvent.chance,
  (floor, context, area) => {
    const { growMs, chainMs, levelShare, holdMs, mergeMs } =
      CONFIG.sunflowerEvent;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    const heart: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius =
      Math.min(area.right - area.left, area.bottom - area.top) * RADIUS;
    // seed i of SEEDS, the heart being seed 0
    const seeds = Array.from({ length: SEEDS + 1 }, (_, i) => {
      const at: Point = {
        x: heart.x + Math.cos(i * GOLDEN) * radius * Math.sqrt(i / SEEDS),
        y: heart.y + Math.sin(i * GOLDEN) * radius * Math.sqrt(i / SEEDS),
      };
      return {
        at,
        wisp: () => at,
        pops: (growMs * i) / SEEDS,
        blows: Infinity,
      };
    });
    // from the rim in, quickening
    const blasts: Blast[] = [];
    let clock: number = growMs + FUSE_MS;
    for (let i = SEEDS; i >= 1; i--) {
      const u = (SEEDS - i) / (SEEDS - 1);
      seeds[i].blows = clock;
      const cluster = FIBONACCI.has(i);
      blasts.push({
        at: seeds[i].at,
        ms: clock,
        size: cluster ? CLUSTER : lerp(BLAST, u),
        shake: cluster ? CLUSTER_SHAKE : lerp(SEED_SHAKE, u),
      });
      if (cluster)
        for (let k = 0; k < SATELLITES; k++) {
          const a = (k / SATELLITES) * Math.PI * 2 + i;
          blasts.push({
            at: {
              x: seeds[i].at.x + Math.cos(a) * SATELLITE_OUT,
              y: seeds[i].at.y + Math.sin(a) * SATELLITE_OUT,
            },
            ms: clock + SATELLITE_MS,
            size: SATELLITE,
            shake: 0,
          });
        }
      clock += lerp(chainMs, u);
    }
    const heartAt = clock + HEART_WAIT;
    seeds[0].blows = heartAt;
    blasts.push({ at: heart, ms: heartAt, size: HEART, shake: HEART_SHAKE });
    const sparks = bars.map((bar) => {
      const bend: Point = {
        x: (heart.x + bar.center.x) / 2,
        y: Math.min(heart.y, bar.center.y) - 140,
      };
      const spot: Point = { x: 0, y: 0 };
      return {
        bar,
        at: (ms: number): Point | null => {
          if (ms < heartAt || ms > heartAt + FLY_MS) return null;
          return bezier(
            heart,
            bend,
            bar.center,
            easeIn((ms - heartAt) / FLY_MS),
            spot,
          );
        },
      };
    });
    const landsAt = heartAt + FLY_MS;
    const endAt = landsAt + 600;

    let bang = -Infinity;
    const blowing = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.shake > 0) shakeScreen(b.shake);
        if (b.ms - bang >= BANG_GAP_MS || b.at === heart) {
          bang = b.ms;
          playExplosion();
        }
      },
    );
    const landing = createBeats(
      [landsAt],
      (ms) => ms,
      () => {
        for (const s of sparks) {
          cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 3), heart);
          cover!.burst(s.bar.center, 0.6);
        }
        for (const s of sparks) cover!.slam(s.bar);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          blowing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          // the seeds still to go: the next few lit and fizzing
          let lit = 0;
          for (let i = SEEDS; i >= 1; i--) {
            const s = seeds[i];
            if (ms < s.pops || ms >= s.blows) continue;
            const pop = easeOut(clamp01((ms - s.pops) / POP_MS));
            const burn = 1 - (s.blows - ms) / FUSE_MS;
            if (burn > 0 && lit < LIT_AHEAD) {
              lit++;
              drawLitFuse(ctx, s.at, burn, SEED * 2, now);
              drawWispHead(ctx, s.wisp, ms, now, WISP_SIZE * 0.4, burn);
            } else drawGlitterLight(ctx, s.at.x, s.at.y, SEED * pop, i, 1, now);
          }
          if (ms < heartAt) {
            const burn = clamp01((ms - growMs) / (heartAt - growMs));
            drawLitFuse(ctx, heart, burn, SEED * 4, now);
            drawWispHead(
              ctx,
              seeds[0].wisp,
              ms,
              now,
              WISP_SIZE * HEART_WISP,
              burn,
            );
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const s of sparks)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SPARK,
              1,
              heartAt,
              landsAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
