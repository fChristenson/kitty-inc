// the "Gemstone" event (charge + drawing; levels + a crit tier): it covers
// its crit, whose click freezes the screen while the glitter lying all over
// it is sucked into a giant gem in the middle, a trickle at first, then a
// flood; the gem crushes smaller and whiter as it fills, trembling harder,
// light racing into it, the rumble building; at the climax it blazes and
// bursts, its shards diving onto every bar in quick fire, each landing its
// levels, the clicked bar last in a huge blast that climbs a crit tier.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
} from "../../../../shared/charge";
import { SHAPES, shapeOutline } from "../../../../shared/drawing";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "gemstone";
// the gem's half width, of the screen's, from loose to crushed
const SIZE: [number, number] = [0.3, 0.19];
// its outline and facets, in a unit box (y down, its point at the bottom)
const OUTLINE = 170;
const FACETS: [Point, Point, number][] = [
  [{ x: -1, y: -0.3 }, { x: 1, y: -0.3 }, 24],
  [{ x: -0.3, y: -0.3 }, { x: 0, y: 1 }, 18],
  [{ x: 0.3, y: -0.3 }, { x: 0, y: 1 }, 18],
  [{ x: -0.55, y: -0.8 }, { x: -0.3, y: -0.3 }, 7],
  [{ x: 0.55, y: -0.8 }, { x: 0.3, y: -0.3 }, 7],
  [{ x: 0, y: -0.8 }, { x: -0.3, y: -0.3 }, 7],
  [{ x: 0, y: -0.8 }, { x: 0.3, y: -0.3 }, 7],
];
// the glitter: lying over the screen, each speck pulled in over PULL_MS,
// landing slow then flooding in, all landed by LANDED of the charge
const PULL_MS: [number, number] = [520, 200];
const LANDED = 0.96;
const SPECK = 20;
const PULLED = 10;
const SET = 30;
const SET_GROW = 16;
const SET_POP = 30;
const SET_POP_MS = 90;
const BURST_SPECK = 44;
const BURST_MS = 320;
const BURST_SPREAD = 0.004;
// the charge's look, of the screen's width
const TREMBLE = 18;
const GLOW = 0.55;
const STREAKS = 0.6;
const BLAZE = 0.6;
const BLAZE_MS = 450;
const BLAZE_BLAST = 240;
// the shards: up to SHARDS_PER_BAR a bar, flying from the gem bowed LIFT,
// the first landing FIRST_MS after the climax, then GAP_MS apart
const SHARDS_PER_BAR = 3;
const ALONG = [0.25, 0.75, 0.5];
const LIFT = 160;
const LAUNCH_MS = 40;
const SHARD = WISP_SIZE * 1.1;
const SHARD_BLAST = 70;
const SHARD_SHAKE = 0.8;
// the last onto the clicked bar, then its cluster
const LAST_GAP_MS = 140;
const BIG_SHARD = WISP_SIZE * 1.8;
const BOOM_BLAST = 240;
const CLUSTER = [-0.6, 0.6, -0.3, 0.3];
const CLUSTER_GAP_MS = 45;
const CLUSTER_BLAST = 100;
const BOOM_SHAKE = 2.6;
const SOUND_GAP_MS = 55;
const WHITE = fadeStops(COLOR.white);

interface Speck {
  // its spot on the gem, unit box
  unit: Point;
  from: Point;
  pull: number;
  lands: number;
}
interface Shard {
  bar: RewardBar;
  spot: Point;
  at: number;
  path: (ms: number) => Point | null;
}

// the gem's dots in the unit box
function gemDots(): Point[] {
  const dots = shapeOutline(SHAPES.gem, OUTLINE, { x: 0, y: 0 }, 1);
  for (const [a, b, n] of FACETS)
    for (let i = 1; i <= n; i++)
      dots.push({
        x: lerp([a.x, b.x], i / (n + 1)),
        y: lerp([a.y, b.y], i / (n + 1)),
      });
  return dots;
}

export const forceGemstoneEvent = registerWispEvent(
  KEY,
  "Gemstone",
  () => CONFIG.gemstoneEvent.chance,
  (floor, context, area) => {
    const {
      chargeMs,
      shardGapMs,
      shardMs,
      levelShare,
      winnerShare,
      holdMs,
      mergeMs,
    } = CONFIG.gemstoneEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const gem: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const startMs = 0;
    const climax = startMs + chargeMs;
    const charge = planCharge(startMs, chargeMs);
    const sizeAt = (c: number) => width * lerp(SIZE, c);

    // the glitter, landing in a shuffled order so the gem fills all over
    const units = gemDots();
    const order = units
      .map((_, i) => ({ i, k: Math.random() }))
      .sort((a, b) => a.k - b.k);
    const specks: Speck[] = order.map(({ i }, rank) => {
      const share = (rank + 1) / units.length;
      const lands = startMs + chargeMs * LANDED * Math.sqrt(share);
      return {
        unit: units[i],
        from: {
          x: area.left + Math.random() * width,
          y: area.top + Math.random() * (area.bottom - area.top),
        },
        pull: lands - lerp(PULL_MS, share),
        lands,
      };
    });

    // the shards: every other bar top to bottom, round and round, then the
    // clicked one
    const others = bars
      .filter((b) => b !== clicked)
      .sort((a, b) => a.center.y - b.center.y);
    const targets = others.length > 0 ? others : [clicked];
    const shards: Shard[] = [];
    for (let k = 0; k < SHARDS_PER_BAR; k++)
      for (const bar of targets) {
        const spot = {
          x: bar.box.x + bar.box.width * ALONG[k],
          y: bar.center.y,
        };
        shards.push({
          bar,
          spot,
          at: climax + shardMs + shards.length * shardGapMs,
          path: () => null,
        });
      }
    const boomAt = shards[shards.length - 1].at + LAST_GAP_MS;
    const big: Shard = {
      bar: clicked,
      spot: clicked.center,
      at: boomAt,
      path: () => null,
    };
    const launch = climax + LAUNCH_MS;
    for (const s of [...shards, big]) {
      const at: Point = { x: 0, y: 0 };
      const top = Math.min(gem.y, s.spot.y) - LIFT;
      s.path = (ms) => {
        if (ms < launch || ms > s.at) return null;
        const t = clamp01((ms - launch) / (s.at - launch)) ** 1.5;
        const u = 1 - t;
        at.x =
          u * u * gem.x +
          2 * u * t * ((gem.x + s.spot.x) / 2) +
          t * t * s.spot.x;
        at.y = u * u * gem.y + 2 * u * t * top + t * t * s.spot.y;
        return at;
      };
    }
    const endMs = boomAt + CLUSTER.length * CLUSTER_GAP_MS + DETONATION_MS;

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const landing = createBeats(
      shards,
      (s) => s.at,
      (s, _, now) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), s.spot);
        if (!cover!.isLive()) return;
        shakeScreen(SHARD_SHAKE);
        bang(now);
      },
    );
    const booming = createBeats(
      [boomAt],
      (ms) => ms,
      (_, __, now) => {
        cover!.levels(clicked, levelsFor(clicked.floor, winnerShare, 1), gem);
        cover!.tierUp(clicked, gem);
        for (const bar of bars) cover!.slam(bar);
        if (!cover!.isLive()) return;
        shakeScreen(BOOM_SHAKE);
        bang(now);
      },
    );

    const shiver: Point = { x: 0, y: 0 };
    const center: Point = { x: 0, y: 0 };
    const side: Point = { x: 0, y: clicked.center.y };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: boomAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          if (cover!.isLive()) tickCharge(charge, ms);
          landing.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const c = chargeAt(charge, ms);
          trembleAt(c, ms, TREMBLE, shiver);
          center.x = gem.x + shiver.x;
          center.y = gem.y + shiver.y;
          const size = sizeAt(c);
          if (ms < climax) {
            drawChargeStreaks(ctx, center, c, width * STREAKS, ms);
            drawChargeGlow(ctx, center, c, width * GLOW, now);
          }
          const blaze = ms >= climax ? 1 - (ms - climax) / BLAZE_MS : 0;
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          if (blaze > 0) {
            ctx.globalAlpha = blaze;
            drawGlow(ctx, WHITE, gem.x, gem.y, width * BLAZE);
            ctx.globalAlpha = 1;
          }
          // the glitter: lying, pulled in, set in the gem, then flung out
          if (ms < climax + BURST_MS) {
            const fade = ms < climax ? 1 : 1 - (ms - climax) / BURST_MS;
            const flung = 1 + Math.max(0, ms - climax) * BURST_SPREAD;
            const crushed = sizeAt(1) * flung;
            ctx.globalAlpha = fade;
            beginLightBatch(ctx);
            for (let i = 0; i < specks.length; i++) {
              const s = specks[i];
              let x: number;
              let y: number;
              let r: number;
              if (ms >= climax) {
                x = gem.x + s.unit.x * crushed;
                y = gem.y + s.unit.y * crushed;
                r = BURST_SPECK;
              } else if (ms >= s.lands) {
                x = center.x + s.unit.x * size;
                y = center.y + s.unit.y * size;
                r =
                  SET +
                  SET_GROW * c +
                  SET_POP * Math.max(0, 1 - (ms - s.lands) / SET_POP_MS);
              } else {
                const u = clamp01((ms - s.pull) / (s.lands - s.pull)) ** 2;
                x = lerp([s.from.x, center.x + s.unit.x * size], u);
                y = lerp([s.from.y, center.y + s.unit.y * size], u);
                r = SPECK + PULLED * u;
              }
              stampGlimmer(
                ctx,
                x,
                y,
                r,
                i,
                c > 0.6 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
            endLightBatch(ctx);
            ctx.globalAlpha = 1;
          }
          ctx.globalCompositeOperation = previous;
          drawDetonation(ctx, gem, ms - climax, BLAZE_BLAST, now);

          // the shards diving onto the bars, the big one last
          for (const s of shards) {
            drawWispBetween(ctx, s.path, ms, now, SHARD, 0.6, launch, s.at);
            drawDetonation(ctx, s.spot, ms - s.at, SHARD_BLAST, now);
          }
          drawWispBetween(ctx, big.path, ms, now, BIG_SHARD, 1, launch, boomAt);
          drawDetonation(ctx, clicked.center, ms - boomAt, BOOM_BLAST, now);
          for (let k = 0; k < CLUSTER.length; k++) {
            side.x = clicked.center.x + (CLUSTER[k] * clicked.box.width) / 2;
            drawDetonation(
              ctx,
              side,
              ms - boomAt - (k + 1) * CLUSTER_GAP_MS,
              CLUSTER_BLAST,
              now,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
