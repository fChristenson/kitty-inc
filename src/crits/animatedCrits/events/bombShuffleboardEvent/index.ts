// the "Bomb Shuffleboard" event (explosion; levels and a crit tier): it
// covers its crit, whose click freezes the screen while a lit bomb puck is
// shoved in off the side of the screen and glides along the top of a bar
// like a shuffleboard puck, slowing to a stop, its fuse blinking ever
// faster; it blows in a big blast that bursts into a cluster along the bar,
// landing free levels, and the blast shoves the next puck off along the
// next bar, a rolling chain bar after bar; a giant puck glides last onto the
// clicked floor's bar and goes up in a colossal ring of blasts, the bar
// jumping a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "bombShuffleboard";
const MAX_PUCKS = 4;
const PUCK = WISP_SIZE * 1.2;
const GIANT = WISP_SIZE * 2.2;
// each puck stops this share along its bar
const STOP: [number, number] = [0.45, 0.8];
const BLAST = 440;
const GIANT_BLAST = 950;
const CLUSTER = 3;
const CLUSTER_BLAST = 220;
const CLUSTER_GAP = 70;
const CLUSTER_REACH = 130;
const RING = 6;
const RING_BLAST = 340;
const RING_REACH = 260;
const RING_GAP = 50;
const SHAKES = { blast: 1.2, cluster: 0.5, ring: 1 };
const SOUND_GAP_MS = 60;

interface Puck {
  bar: RewardBar;
  giant: boolean;
  from: Point;
  stop: Point;
  slides: number;
  stops: number;
  blows: number;
  at: (ms: number) => Point | null;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  puck: Puck | null;
}

export const forceBombShuffleboardEvent = registerWispEvent(
  KEY,
  "Bomb Shuffleboard",
  () => CONFIG.bombShuffleboardEvent.chance,
  (floor, context, area) => {
    const { slideMs, fuseMs, giantFuseMs, levelShare, holdMs, mergeMs } =
      CONFIG.bombShuffleboardEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const order = [
      ...bars.filter((b) => b !== clicked).slice(0, MAX_PUCKS - 1),
      clicked,
    ];
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 2)]),
    );

    // each puck shoved off the moment the one before it blows
    let clock = 0;
    const pucks: Puck[] = order.map((bar, k) => {
      const giant = bar === clicked;
      const size = giant ? GIANT : PUCK;
      const y = bar.box.y - size * 0.45;
      const from: Point = { x: area.left - 80, y };
      const stop: Point = {
        x: bar.box.x + bar.box.width * lerp(STOP, Math.random()),
        y,
      };
      const slides = clock;
      const stops =
        slides + slideMs * (giant ? 1.2 : lerp([1.1, 0.8], k / MAX_PUCKS));
      const blows = stops + (giant ? giantFuseMs : fuseMs);
      clock = blows;
      const spot: Point = { x: 0, y: 0 };
      return {
        bar,
        giant,
        from,
        stop,
        slides,
        stops,
        blows,
        at: (ms) => {
          if (ms < slides || ms >= blows) return null;
          const u = easeOut(clamp01((ms - slides) / (stops - slides)));
          spot.x = lerp([from.x, stop.x], u);
          spot.y = y;
          return spot;
        },
      };
    });
    const blasts: Blast[] = [];
    for (const p of pucks) {
      blasts.push({
        at: p.stop,
        ms: p.blows,
        size: p.giant ? GIANT_BLAST : BLAST,
        shake: p.giant ? 0 : SHAKES.blast,
        puck: p,
      });
      const count = p.giant ? RING : CLUSTER;
      for (let k = 0; k < count; k++) {
        const a = p.giant ? (k / count) * Math.PI * 2 : Math.PI + (k - 1) * 0.9;
        const reach = p.giant ? RING_REACH : CLUSTER_REACH;
        blasts.push({
          at: {
            x: p.stop.x + Math.cos(a) * reach * (p.giant ? 1 : k % 2 ? 1 : -1),
            y: p.stop.y + Math.sin(a) * reach * 0.5,
          },
          ms: p.blows + 70 + k * (p.giant ? RING_GAP : CLUSTER_GAP),
          size: p.giant ? RING_BLAST : CLUSTER_BLAST,
          shake: p.giant ? SHAKES.ring : SHAKES.cluster,
          puck: null,
        });
      }
    }
    const last = pucks[pucks.length - 1];
    const endMs = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;
    let soundAt = -Infinity;

    const sliding = createBeats(
      pucks,
      (p) => p.slides,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b, _, now) => {
        if (b.puck) {
          cover!.levels(b.puck.bar, levels.get(b.puck.bar)!, b.at);
          if (b.puck === last) {
            cover!.tierUp(last.bar, b.at);
            cover!.slam(last.bar);
            cover!.blast(b.at);
            return;
          }
        }
        if (!cover!.isLive()) return;
        shakeScreen(b.shake);
        if (b.puck || now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: last.blows + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: order,
        tick: (ms, now) => {
          sliding.tick(ms, now);
          blasting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          for (const p of pucks) {
            const at = p.at(ms);
            if (!at) continue;
            const size = p.giant ? GIANT : PUCK;
            const burn = clamp01((ms - p.slides) / (p.blows - p.slides));
            drawLitFuse(ctx, at, burn, size * 1.4, now);
            drawWisp(ctx, p.at, ms, now, size, burn);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
