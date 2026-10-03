// the "Dynamite Fishing" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a river of cash pours out of the clicked
// floor's button into a pool across the bottom of the screen, and lit
// sticks of dynamite come tumbling into it one after another; they blow in
// a chain of big blasts, each throwing a geyser of coins high into the air
// with a bang and a shake; then a cluster of sticks lands together and the
// whole pool goes up round a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "dynamiteFishing";
const REWARD = 4;
const STICKS = 5;
const CLUSTER = 3;
const EDGE = 90;
const BOTTOM = 90;
const LOFT = 200;
const STEPS = 40;
const STICK = 0.32;
const FUSE = 14;
const STICK_BLAST = 210;
const CLUSTER_BLAST = 170;
const FINALE_BLAST = 360;
// each geyser throws GEYSER coins up to SPOUT px high
const GEYSER = 30;
const SPOUT = 300;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceDynamiteFishingEvent = registerWispEvent(
  KEY,
  "Dynamite Fishing",
  () => CONFIG.dynamiteFishingEvent.chance,
  (floor, context, area) => {
    const { fillMs, sticksMs, flightMs, holdMs, mergeMs } =
      CONFIG.dynamiteFishingEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const surface = area.bottom - BOTTOM;
    const into: Point = { x: 0, y: 0 };
    const near: Point = {
      x: button.x < (left + right) / 2 ? left : right,
      y: surface,
    };
    const far: Point = { x: near.x === left ? right : left, y: surface };
    const ctrl: Point = {
      x: (button.x + near.x) / 2,
      y: Math.min(button.y, near.y) - 120,
    };
    // a pour down into the pool, then spreading along it
    const fill = sampleLine(
      (u) =>
        u < 0.4
          ? { ...bezier(button, ctrl, near, u / 0.4, into) }
          : { x: lerp([near.x, far.x], (u - 0.4) / 0.6), y: surface },
      STEPS,
    );
    const pool: Pour = {
      coinsAlong: 900,
      width: 40,
      streamMs: fillMs * 0.7,
      travelMs: fillMs,
    };
    const blasts: Blast[] = [];
    const sticks: {
      at: (ms: number) => Point;
      leaves: number;
      blows: number;
    }[] = [];
    const toss = (to: Point, leaves: number, blows: number) => {
      const c: Point = {
        x: (button.x + to.x) / 2,
        y: Math.min(button.y, to.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      const lands = leaves + flightMs;
      sticks.push({
        leaves,
        blows,
        at: (ms: number): Point => {
          if (ms < lands)
            return bezier(button, c, to, clamp01((ms - leaves) / flightMs), at);
          // bobbing in the pool till it blows
          at.x = to.x;
          at.y = to.y + Math.sin(ms / 60) * 4;
          return at;
        },
      });
    };
    let clock: number = fillMs * 0.5;
    for (let i = 0; i < STICKS; i++) {
      const to: Point = {
        x: lerp([left, right], (i + 0.5) / STICKS),
        y: surface,
      };
      const blows = clock + flightMs + 120;
      toss(to, clock, blows);
      blasts.push({
        at: to,
        ms: blows,
        size: STICK_BLAST,
        shake: 0.7 + 0.1 * i,
        coins: GEYSER,
      });
      clock += lerp(sticksMs, i / (STICKS - 1));
    }
    const finaleAt = clock + flightMs + 160;
    const middle: Point = { x: (left + right) / 2, y: surface };
    for (let c = 0; c < CLUSTER; c++) {
      const to: Point = { x: middle.x + (c - 1) * 90, y: surface };
      toss(to, clock + c * 30, finaleAt);
      blasts.push({
        at: to,
        ms: finaleAt,
        size: CLUSTER_BLAST,
        shake: 1.4,
        coins: GEYSER,
      });
    }
    const endAt = finaleAt;
    let lastBang = -Infinity;

    const filling = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, fill, pool),
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        // a geyser: coins thrown high up out of the blast
        const spout = Array.from(
          { length: b.coins },
          (): Point => ({
            x: b.at.x + (Math.random() - 0.5) * 140,
            y: b.at.y - SPOUT * (0.4 + 0.6 * Math.random()),
          }),
        );
        cover!.launchFrom(b.at, spout);
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(middle),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(pourDurationMs(0, pool), endAt + holdMs + mergeMs),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          filling.tick(ms, now);
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, middle, ms - endAt, FINALE_BLAST, now);
          for (const s of sticks) {
            if (ms < s.leaves || ms >= s.blows) continue;
            drawLitFuse(
              ctx,
              s.at(ms),
              (ms - s.leaves) / (s.blows - s.leaves),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * STICK,
              0.5,
              s.leaves,
              s.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
