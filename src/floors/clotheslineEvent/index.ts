// the "Clothesline" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while a sagging line of tiny glowing pegs
// strings itself across the top of the screen and wisps hang from it like
// laundry, flapping in a gusting wind; one after another they unpin with a
// pop and come drifting down, swaying to and fro like falling leaves, each
// settling onto a worker in view with a flash and a jolt that lights it up
// a perma tier, ever faster; the last lands in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "clothesline";
const MAX_WORKERS = 6;
const PEGS = 14;
// the line hangs HIGH px under the top, sagging SAG px, EDGE px in from the
// sides; laundry hangs DROP px under it, flapping FLAP px; it falls
// swaying SWAY px
const HIGH = 110;
const SAG = 40;
const EDGE = 24;
const DROP = 22;
const FLAP = 8;
const SWAY = 50;
const PEG = 0.14;
const LAUNDRY = 0.45;
const LAND_SHAKE: [number, number] = [0.5, 1.2];

export const forceClotheslineEvent = registerWispEvent(
  KEY,
  "Clothesline",
  () => CONFIG.clotheslineEvent.chance,
  (floor, context, area) => {
    const { stringMs, gapsMs, fallMs, holdMs, mergeMs } =
      CONFIG.clotheslineEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const lineY = area.top + HIGH;
    const lineAt = (u: number) => lineY + Math.sin(Math.PI * u) * SAG;
    const pegs = Array.from({ length: PEGS }, (_, i) => {
      const u = i / (PEGS - 1);
      const at: Point = { x: lerp([left, right], u), y: lineAt(u) };
      return { u, at: () => at };
    });
    let clock: number = stringMs;
    const laundry = workers.map((worker, k) => {
      const u = (k + 0.5) / workers.length;
      const pin: Point = { x: lerp([left, right], u), y: lineAt(u) + DROP };
      const unpins = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        unpins,
        lands: unpins + fallMs,
        at: (ms: number): Point | null => {
          if (ms < stringMs * u || ms >= unpins + fallMs) return null;
          if (ms < unpins) {
            const gust = Math.sin(ms / 140 + k * 1.3);
            at.x = pin.x + gust * FLAP;
            at.y = pin.y + Math.abs(gust) * FLAP * 0.5;
            return at;
          }
          // swaying down like a falling leaf
          const v = (ms - unpins) / fallMs;
          at.x =
            lerp([pin.x, worker.at.x], easeOut(v)) +
            Math.sin(v * Math.PI * 3) * SWAY * (1 - v);
          at.y = lerp([pin.y, worker.at.y], easeIn(v));
          return at;
        },
      };
    });
    const last = laundry[laundry.length - 1];
    const endAt = last.lands;

    const unpinning = createBeats(
      laundry,
      (l) => l.unpins,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      laundry,
      (l) => l.lands,
      (l, k) => {
        cover!.promote(l.worker);
        if (l === last) {
          cover!.blast(l.worker.at);
          return;
        }
        cover!.burst(l.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, laundry.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          unpinning.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          if (ms < endAt)
            for (const peg of pegs)
              if (ms > stringMs * peg.u)
                drawWispHead(
                  ctx,
                  peg.at,
                  ms,
                  now,
                  WISP_SIZE *
                    PEG *
                    clamp01((ms - stringMs * peg.u) / 100 + 0.01),
                );
          for (const l of laundry)
            drawWispBetween(
              ctx,
              l.at,
              ms,
              now,
              WISP_SIZE * LAUNDRY,
              0.5,
              0,
              l.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
