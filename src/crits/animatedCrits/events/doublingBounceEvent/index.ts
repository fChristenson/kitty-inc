// the "Doubling Bounce" event (bounce; levels): it covers its crit, whose
// click freezes the screen while a lit bomb wisp drops in onto a bar and
// bounces down the building, blowing on every landing and splitting in two:
// one, two, four, eight, each landing a blast, a jolt and free levels on its
// bar, quicker each time; the last eight hop up off the bottom bar and burst
// in a rattling cluster of sixteen, capped by one huge blast as every bar
// slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "doublingBounce";
const MAX_GENERATIONS = 4;
// the drop starts this far above the screen; each generation's hop arcs
// this high and is this much quicker than the last
const DROP = 420;
const LIFT: [number, number] = [260, 150];
const QUICKEN = 0.88;
// bombs land this much apart, left to right
const STAGGER_MS = 35;
const BOMB: [number, number] = [WISP_SIZE * 1.4, WISP_SIZE * 0.85];
const LAND_BLAST: [number, number] = [260, 170];
const LAND_SHAKE: [number, number] = [0.6, 1.1];
// the last bombs hop up this far, then burst into two blasts this far apart
const RISE = 200;
const RISE_MS = 230;
const CLUSTER_SPREAD = 45;
const CLUSTER_GAP_MS = 25;
const CLUSTER_BLAST = 170;
const CLUSTER_SHAKE = 0.5;
const FINALE_LAG = 160;
const FINALE_BLAST = 850;
const FINALE_SHAKE = 1.7;
const SOUND_GAP_MS = 55;

interface Bomb {
  gen: number;
  bar: RewardBar;
  spot: Point;
  start: number;
  land: number;
  // when it leaves the bar: its children's hop, or the last ones' burst
  end: number;
  at: (ms: number) => Point | null;
}

interface Blast {
  at: Point;
  ms: number;
}

export const forceDoublingBounceEvent = registerWispEvent(
  KEY,
  "Doubling Bounce",
  () => CONFIG.doublingBounceEvent.chance,
  (floor, context, area) => {
    const { dropMs, hopMs, levelShare, holdMs, mergeMs } =
      CONFIG.doublingBounceEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    // up to four bars top to bottom, ending on the clicked one when it can
    const sorted = [...bars].sort((a, b) => a.box.y - b.box.y);
    const last = Math.max(
      sorted.indexOf(clicked),
      Math.min(MAX_GENERATIONS, sorted.length) - 1,
    );
    const route = sorted.slice(
      Math.max(0, last - MAX_GENERATIONS + 1),
      last + 1,
    );
    const gens = route.length;
    const shareOf = (gen: number) => (gens > 1 ? gen / (gens - 1) : 1);
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    const bombs: Bomb[][] = [];
    route.forEach((bar, gen) => {
      const n = 2 ** gen;
      const row: Bomb[] = [];
      for (let i = 0; i < n; i++) {
        const spot: Point = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / n),
          y: bar.box.y,
        };
        const parent = gen > 0 ? bombs[gen - 1][i >> 1] : null;
        const from: Point = parent
          ? parent.spot
          : { x: spot.x, y: Math.min(area.top, spot.y) - DROP };
        const start = parent ? parent.land : 0;
        const land =
          (parent ? start + hopMs * QUICKEN ** (gen - 1) : dropMs) +
          i * STAGGER_MS;
        const lift = parent ? lerp(LIFT, shareOf(gen)) : 0;
        const point: Point = { x: 0, y: 0 };
        const bomb: Bomb = {
          gen,
          bar,
          spot,
          start,
          land,
          end: land,
          at: (ms) => {
            if (ms < start || ms > bomb.end) return null;
            if (ms >= land) {
              const u = easeOutCubic(clamp01((ms - land) / RISE_MS));
              point.x = spot.x;
              point.y = spot.y - RISE * u;
              return point;
            }
            const u = (ms - start) / (land - start);
            point.x = lerp([from.x, spot.x], u);
            point.y = parent
              ? lerp([from.y, spot.y], u) - 4 * lift * u * (1 - u)
              : lerp([from.y, spot.y], u * u);
            return point;
          },
        };
        row.push(bomb);
      }
      bombs.push(row);
    });
    const bottom = bombs[gens - 1];
    for (const b of bottom) b.end = b.land + RISE_MS;
    const cluster: Blast[] = bottom.flatMap((b) =>
      [-1, 1].map((side, k) => ({
        at: { x: b.spot.x + side * CLUSTER_SPREAD, y: b.spot.y - RISE },
        ms: b.end + k * CLUSTER_GAP_MS,
      })),
    );
    const finaleAt = Math.max(...cluster.map((c) => c.ms)) + FINALE_LAG;
    const finaleSpot = route[gens - 1].center;
    const all = bombs.flat();
    const endMs = finaleAt + DETONATION_MS;

    let soundAt = -Infinity;
    const bang = (now: number, loud = false) => {
      if (!loud && now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const dropping = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      all,
      (b) => b.land,
      (b, _, now) => {
        cover!.levels(b.bar, levels.get(b.bar)!, b.spot);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(LAND_SHAKE, shareOf(b.gen)));
        bang(now);
      },
    );
    const clustering = createBeats(
      cluster,
      (c) => c.ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(CLUSTER_SHAKE);
        bang(now);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      (_, __, now) => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(finaleSpot);
        if (!cover!.isLive()) return;
        shakeScreen(FINALE_SHAKE);
        bang(now, true);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          dropping.tick(ms, now);
          landing.tick(ms, now);
          clustering.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const burn = clamp01(ms / finaleAt);
          for (const b of all) {
            const size = lerp(BOMB, shareOf(b.gen));
            const at = b.at(ms);
            if (at) drawLitFuse(ctx, at, burn, size * 1.4, now);
            drawWispBetween(ctx, b.at, ms, now, size, burn, b.start, b.end);
          }
          for (const b of all)
            drawDetonation(
              ctx,
              b.spot,
              ms - b.land,
              lerp(LAND_BLAST, shareOf(b.gen)),
              now,
            );
          for (const c of cluster)
            drawDetonation(ctx, c.at, ms - c.ms, CLUSTER_BLAST, now);
          drawDetonation(ctx, finaleSpot, ms - finaleAt, FINALE_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
