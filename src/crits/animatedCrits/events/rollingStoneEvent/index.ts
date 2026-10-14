// the "Rolling Stone" event (snowball; free hires): it covers its crit, whose
// click freezes the screen while a wisp ball rolls across the top of the
// screen from rest, the glitter lying there sticking on and turning with it;
// it drops and rolls back across the screen lower down, bigger and quicker
// each lane, a jolt at each end; at the bottom it bursts with a huge blast,
// flinging its crust off as wisps that drop onto every empty spot in view,
// each a new worker. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  snowballRadius,
  type RollPass,
} from "../../../../shared/animationStyles/snowball";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01 } from "../../../../shared/twinkle";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "rollingStone";
const MAX_HIRES = 6;
// the lanes, top to bottom, at these shares of the screen's height, INSET
// of its width in from the sides; DROP_MS from one lane to the next
const LANES = [0.2, 0.4, 0.6, 0.78];
const INSET = 0.1;
const DROP_MS = 140;
// the glitter on each lane, scattered SPREAD of the height up and down it,
// picked up within REACH of the ball's line
const SPECKS = 22;
const SPREAD = 0.05;
const REACH = 0.05;
const SPECK = 24;
// the ball: BALL of the width round, growing GROW a sqrt of a speck
const BALL = 0.03;
const GROW = 0.008;
const WALL_SHAKE: [number, number] = [0.6, 1.4];
const BURST_BLAST = 260;
const BURST_SHAKE = 2.8;
const FADE_MS = 80;
// the hires: wisps flung off the burst, bowed LIFT over, landing HIRE_UP
// over their spots
const LIFT = 220;
const HIRE_UP = 40;
const HIRE_WISP = 1.1;
const HIRE_BURST = 0.5;
const HIRE_SHAKE = 1;

export const forceRollingStoneEvent = registerWispEvent(
  KEY,
  "Rolling Stone",
  () => CONFIG.rollingStoneEvent.chance,
  (floor, context, area) => {
    const { firstMs, rollsMs, hireMs, hireGapMs, holdMs, mergeMs } =
      CONFIG.rollingStoneEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const left = area.left + width * INSET;
    const right = area.right - width * INSET;
    const passes: RollPass[] = [];
    const ends: number[] = [];
    let t = firstMs;
    LANES.forEach((share, k) => {
      const y = area.top + height * share;
      const rightward = k % 2 === 0;
      const last = k === LANES.length - 1;
      const from = { x: rightward ? left : right, y };
      const to = { x: last ? (left + right) / 2 : rightward ? right : left, y };
      if (k > 0) {
        passes.push({
          from: passes[passes.length - 1].to,
          to: from,
          startMs: t,
          endMs: t + DROP_MS,
        });
        t += DROP_MS;
      }
      const ms = lerp(rollsMs, k / (LANES.length - 1));
      passes.push({ from, to, startMs: t, endMs: t + ms });
      t += ms;
      ends.push(t);
    });
    const burstAt = t;
    const burst = passes[passes.length - 1].to;
    const specks = LANES.flatMap((share, k) =>
      Array.from({ length: SPECKS }, (_, i) => ({
        x: lerp([left, right], hash01(i, 1870 + k)),
        y:
          area.top +
          height * share +
          (hash01(i, 1874 + k) - 0.5) * 2 * height * SPREAD,
      })),
    );
    const ball = planSnowball(passes, specks, width * REACH);
    const spots = hires.map((hire, k) => ({
      hire,
      at: { x: hire.x, y: hire.y - HIRE_UP },
      lands: burstAt + hireMs + k * hireGapMs,
    }));
    const last = spots[spots.length - 1];
    const hirePaths = spots.map((s) => {
      const into = { x: 0, y: 0 };
      const top = Math.min(burst.y, s.at.y) - LIFT;
      return (ms: number): Point | null => {
        if (ms < burstAt || ms > s.lands) return null;
        const p = clamp01((ms - burstAt) / (s.lands - burstAt)) ** 1.4;
        const u = 1 - p;
        into.x =
          u * u * burst.x + 2 * u * p * ((burst.x + s.at.x) / 2) + p * p * s.at.x;
        into.y = u * u * burst.y + 2 * u * p * top + p * p * s.at.y;
        return into;
      };
    });
    const endMs = last.lands + DETONATION_MS;

    const rolling = createBeats(
      ends.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        shakeScreen(lerp(WALL_SHAKE, k / Math.max(1, ends.length - 2)));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
      },
    );
    const landing = createBeats(
      spots,
      (s) => s.lands,
      (s) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.at);
          return;
        }
        cover!.burst(s.at, HIRE_BURST);
        if (cover!.isLive()) shakeScreen(HIRE_SHAKE);
      },
    );

    const at: Point = { x: 0, y: 0 };
    const trail: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: last.lands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          rolling.tick(ms, now);
          bursting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const gone = clamp01((ms - burstAt) / FADE_MS);
          if (gone < 1) {
            rollAt(ball, ms, at);
            const radius = snowballRadius(ball, ms, width * BALL, width * GROW);
            drawSnowball(ctx, ball, ms, at, radius, SPECK, 1 - gone);
            drawWispHead(
              ctx,
              (m) => rollAt(ball, m, trail),
              ms,
              now,
              WISP_SIZE * (1 + radius / (width * BALL * 2)),
              0.6,
              1 - gone,
            );
          }
          drawDetonation(ctx, burst, ms - burstAt, BURST_BLAST, now);
          for (let k = 0; k < spots.length; k++)
            drawWispBetween(
              ctx,
              hirePaths[k],
              ms,
              now,
              WISP_SIZE * HIRE_WISP,
              0.6,
              burstAt,
              spots[k].lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
