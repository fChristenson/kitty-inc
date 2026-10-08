// the "Denoise" event (experiment: a diffusion model; cash): it covers its
// crit, whose click freezes the screen while a fog of hundreds of glitter
// dots fills it at random, pure noise; then, step by step like an image
// model denoising, every dot lurches a little toward its place and jitters
// a little less, each step a click and a jolt, quicker and quicker, until
// out of the noise snaps a giant crown; it blazes, sprays coins, and its
// dots pour into the total in a huge blast. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { drawDots, shapeFill, SHAPES } from "../../../../shared/drawing";
import { totalSpot } from "../../cashFlow";

const KEY = "denoise";
const REWARD = 4;
const DOTS = 260;
const DOT = 10;
const STEPS = 12;
// the crown's size as a share of the screen's width (at most SIZE px)
const WIDTH = 0.36;
const SIZE = 250;
// noise left after each step, as a share of the screen, falling to none
const NOISE = 0.12;
const PUFF = 40;
const PUFF_REACH: [number, number] = [80, 260];
const FLIGHT_SPREAD = 200;
const STEP_SHAKE: [number, number] = [0.25, 0.8];
const BLAZE_SHAKE = 1.1;

// a standard normal sample
const gauss = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) *
  Math.cos(2 * Math.PI * Math.random());

export const forceDenoiseEvent = registerWispEvent(
  KEY,
  "Denoise",
  () => CONFIG.denoiseEvent.chance,
  (floor, context, area) => {
    const { fogMs, stepsMs, blazeMs, flightMs, holdMs, mergeMs } =
      CONFIG.denoiseEvent;
    const fallback = totalSpot(area);
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const size = Math.min(SIZE, w * WIDTH);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + size + 20, lerp([area.top, area.bottom], 0.38)),
    };
    const crown = shapeFill(SHAPES.crown, DOTS, centre, size);
    const n = crown.length;
    // every dot's spot after each step: x += (target - x)·a + σ·z, the
    // noise σ shrinking to nothing as a reaches 1
    const xs = new Float32Array((STEPS + 1) * n);
    const ys = new Float32Array((STEPS + 1) * n);
    for (let i = 0; i < n; i++) {
      xs[i] = area.left + Math.random() * w;
      ys[i] = area.top + Math.random() * h;
    }
    for (let k = 1; k <= STEPS; k++) {
      const a = 1 / (STEPS - k + 1);
      const sigma = NOISE * Math.min(w, h) * (1 - k / STEPS) ** 1.5;
      for (let i = 0; i < n; i++) {
        const px = xs[(k - 1) * n + i];
        const py = ys[(k - 1) * n + i];
        xs[k * n + i] = px + (crown[i].x - px) * a + sigma * gauss();
        ys[k * n + i] = py + (crown[i].y - py) * a + sigma * gauss();
      }
    }
    // each step starts here, quickening
    const steps = Array.from(
      { length: STEPS },
      (_, k) => fogMs + stepsMs * (1 - (1 - k / STEPS) ** 1.6),
    );
    const stepEnd = (k: number) =>
      k + 1 < STEPS ? steps[k + 1] : fogMs + stepsMs;
    const doneAt = fogMs + stepsMs;
    const pourAt = doneAt + blazeMs;
    const endAt = pourAt + FLIGHT_SPREAD + flightMs;
    // each dot pours into the total in turn, top row first
    const leaves = crown.map((_, i) => pourAt + (i / n) * FLIGHT_SPREAD);

    const stepping = createBeats(
      steps,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STEP_SHAKE, k / (STEPS - 1)));
      },
    );
    const finishing = createBeats(
      [0, doneAt, pourAt, endAt],
      (ms) => ms,
      (ms) => {
        if (ms === endAt) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        if (ms === doneAt) {
          cover!.burst(centre, 1.2);
          cover!.launchFrom(centre, ringTargets(centre, PUFF, PUFF_REACH));
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms === doneAt) shakeScreen(BLAZE_SHAKE);
      },
    );

    const now: Point[] = crown.map(() => ({ x: 0, y: 0 }));
    const from: Point = { x: 0, y: 0 };
    const lift: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, clock) => {
          stepping.tick(ms, clock);
          finishing.tick(ms, clock);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms > endAt) return;
          // the step running now, and how far through its lurch
          let k = -1;
          while (k + 1 < STEPS && ms >= steps[k + 1]) k++;
          const u =
            k < 0
              ? 0
              : easeOut(
                  clamp01((ms - steps[k]) / ((stepEnd(k) - steps[k]) * 0.6)),
                );
          const total = cover?.total() ?? fallback;
          let shown = 0;
          for (let i = 0; i < n; i++) {
            const a = Math.max(0, k) * n + i;
            const b = (k + 1) * n + i;
            const x = k < 0 ? xs[i] : lerp([xs[a], xs[b]], u);
            const y = k < 0 ? ys[i] : lerp([ys[a], ys[b]], u);
            if (ms < leaves[i]) {
              now[shown].x = x;
              now[shown].y = y;
            } else {
              const t = (ms - leaves[i]) / flightMs;
              if (t >= 1) continue;
              from.x = x;
              from.y = y;
              lift.x = x;
              lift.y = y - 120;
              bezier(from, lift, total, easeIn(t), now[shown]);
            }
            shown++;
          }
          // the fog thickening in, then the dots, blazing once it's a crown
          const fog = clamp01(ms / fogMs);
          ctx.globalAlpha = fog;
          drawDots(
            ctx,
            now,
            shown,
            DOT * (0.5 + 0.5 * fog),
            ms,
            clamp01((ms - doneAt) / 150),
          );
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
