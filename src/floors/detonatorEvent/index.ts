// the "Detonator" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a fizzing charge wisp is planted on every
// income bar, each wired back with a glittering wire to a detonator wisp at
// the bottom of the screen; the plunger slams down with a bang and a jolt
// and sparks race up every wire, the nearest charge blowing first, each a
// big blast and a cluster with its own bang and shake that jumps its bar a
// crit tier; then the plunger slams again and every charge goes off at once
// with one colossal blast and the hardest shake of all. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "detonator";
const MAX_BARS = 4;
const LOW = 60;
const PLUNGER = 0.6;
const CHARGE = 0.45;
const FUSE = 46;
const SPARK = 0.3;
// px per ms the sparks race up the wires
const SPARK_SPEED = 1.4;
const WIRE_DOTS = 14;
const WIRE_DOT = 5;
const MAIN = 290;
const SIDE = 190;
const SIDE_OFF = 90;
const SIDE_GAP_MS = 60;
const COLOSSAL = 700;
const BANG_GAP_MS = 50;
const PLUNGE_SHAKE = 0.8;
const BLAST_SHAKE: [number, number] = [0.8, 1.3];
const FINAL_SHAKE = 2.4;

interface Charge {
  bar: RewardBar;
  at: Point;
  blows: number;
  spark: (ms: number) => Point;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

export const forceDetonatorEvent = registerWispEvent(
  KEY,
  "Detonator",
  () => CONFIG.detonatorEvent.chance,
  (floor, context, area) => {
    const { plungeMs, againMs, holdMs, mergeMs } = CONFIG.detonatorEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const plunger: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - LOW,
    };
    const charges: Charge[] = bars
      .map((bar) => {
        const at: Point = { x: bar.center.x, y: bar.center.y };
        const blows =
          plungeMs +
          Math.hypot(at.x - plunger.x, at.y - plunger.y) / SPARK_SPEED;
        const spot: Point = { x: 0, y: 0 };
        return {
          bar,
          at,
          blows,
          spark: (ms: number): Point => {
            const u = Math.min(
              1,
              Math.max(0, (ms - plungeMs) / (blows - plungeMs)),
            );
            spot.x = lerp([plunger.x, at.x], u);
            spot.y = lerp([plunger.y, at.y], u);
            return spot;
          },
        };
      })
      .sort((a, b) => a.blows - b.blows);
    const finalAt = charges[charges.length - 1].blows + againMs;
    const middle: Point = {
      x: plunger.x,
      y: (charges[0].at.y + charges[charges.length - 1].at.y) / 2,
    };
    const clusterOf = (at: Point, ms: number, size: number): Blast[] => [
      { at, ms, size },
      {
        at: { x: at.x - SIDE_OFF, y: at.y - 30 },
        ms: ms + SIDE_GAP_MS,
        size: SIDE,
      },
      {
        at: { x: at.x + SIDE_OFF, y: at.y + 30 },
        ms: ms + SIDE_GAP_MS * 2,
        size: SIDE,
      },
    ];
    const blasts: Blast[] = [
      ...charges.flatMap((c) => clusterOf(c.at, c.blows, MAIN)),
      ...charges.flatMap((c) => clusterOf(c.at, finalAt, MAIN)),
      { at: middle, ms: finalAt + SIDE_GAP_MS, size: COLOSSAL },
    ];
    const endAt = finalAt + SIDE_GAP_MS * 2 + DETONATION_MS;
    const plungerAt = () => plunger;
    const chargeSpots = charges.map((c) => () => c.at);
    const wireDot: Point = { x: 0, y: 0 };

    const plunging = createBeats(
      [plungeMs, finalAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(middle);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          return;
        }
        cover!.burst(plunger, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(PLUNGE_SHAKE);
      },
    );
    const blowing = createBeats(
      charges,
      (c) => c.blows,
      (c) => cover!.tierUp(c.bar, c.at),
    );
    let bang = -Infinity;
    const banging = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive() || b.size === COLOSSAL) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(lerp(BLAST_SHAKE, b.ms / finalAt) * (b.size / MAIN));
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
          plunging.tick(ms, now);
          blowing.tick(ms, now);
          banging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let k = 0; k < charges.length; k++) {
            const c = charges[k];
            if (ms < c.blows) {
              // the wire, burnt away behind its spark
              const burnt = Math.max(0, (ms - plungeMs) / (c.blows - plungeMs));
              for (let i = 0; i < WIRE_DOTS; i++) {
                const u = (i + 0.5) / WIRE_DOTS;
                if (u < burnt) continue;
                wireDot.x = lerp([plunger.x, c.at.x], u);
                wireDot.y = lerp([plunger.y, c.at.y], u);
                drawGlitterLight(
                  ctx,
                  wireDot.x,
                  wireDot.y,
                  WIRE_DOT,
                  i + k * 31,
                  0.7,
                  now,
                );
              }
              drawLitFuse(ctx, c.at, ms / c.blows, FUSE, now);
              drawWispBetween(
                ctx,
                chargeSpots[k],
                ms,
                now,
                WISP_SIZE * CHARGE,
                0.6 + 0.4 * (ms / c.blows),
                0,
                c.blows,
              );
              drawWispBetween(
                ctx,
                c.spark,
                ms,
                now,
                WISP_SIZE * SPARK,
                1,
                plungeMs,
                c.blows,
              );
            }
          }
          if (ms < finalAt)
            drawWispBetween(
              ctx,
              plungerAt,
              ms,
              now,
              WISP_SIZE * PLUNGER,
              0.8,
              0,
              finalAt,
            );
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
