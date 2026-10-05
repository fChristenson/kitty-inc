// the "Strange Attractor" event (experiment: the Lorenz attractor; worker
// perma tiers): it covers its crit, whose click freezes the screen while a
// wisp sets off along the Lorenz system's chaotic flow, simulated at arm,
// looping round one wing and then flipping unpredictably to the other,
// faster and faster, leaving a trail of glimmers that draws the attractor's
// butterfly across the screen, every wing flip a whoosh and a jolt; then
// the butterfly bursts and its glimmers stream off onto the workers in
// view, one after another, each lighting up a perma tier, the last in a
// huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { findRewardWorkers } from "../eventRewards";

const KEY = "strangeAttractor";
const MAX_WORKERS = 6;
// the Lorenz system and its run: steps of DT after SKIP settling ones
const SIGMA = 10;
const RHO = 28;
const BETA = 8 / 3;
const DT = 0.008;
const STEPS = 2600;
const SKIP = 150;
// a glimmer left every MARK_EVERY steps; x spans ±HALF_X, z 0..Z_SPAN
const MARK_EVERY = 10;
const HALF_X = 22;
const Z_SPAN = 52;
// the flow speeds up: progress = time share ^ RAMP
const RAMP = 1.6;
// x must swing past FLIP to count as a wing flip
const FLIP = 4;
// the butterfly's width share of the screen, and its top's gap from it
const WIDTH = 0.85;
const TOP = 220;
const MARK = 9;
const PEN = WISP_SIZE * 0.8;
const BEND = 160;
const FLIP_SHAKE: [number, number] = [0.25, 0.7];
const BURST_SHAKE = 1.2;
const HIT_SHAKE: [number, number] = [0.5, 1.0];

// the Lorenz flow from near the origin, RK4 integrated
function lorenz(): Float32Array {
  const out = new Float32Array(STEPS * 3);
  let x = 1;
  let y = 1;
  let z = 1;
  const f = (px: number, py: number, pz: number): [number, number, number] => [
    SIGMA * (py - px),
    px * (RHO - pz) - py,
    px * py - BETA * pz,
  ];
  for (let s = 0; s < STEPS + SKIP; s++) {
    const k1 = f(x, y, z);
    const k2 = f(
      x + (DT / 2) * k1[0],
      y + (DT / 2) * k1[1],
      z + (DT / 2) * k1[2],
    );
    const k3 = f(
      x + (DT / 2) * k2[0],
      y + (DT / 2) * k2[1],
      z + (DT / 2) * k2[2],
    );
    const k4 = f(x + DT * k3[0], y + DT * k3[1], z + DT * k3[2]);
    x += (DT / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (DT / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (DT / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    if (s < SKIP) continue;
    const i = (s - SKIP) * 3;
    out[i] = x;
    out[i + 1] = y;
    out[i + 2] = z;
  }
  return out;
}

export const forceStrangeAttractorEvent = registerWispEvent(
  KEY,
  "Strange Attractor",
  () => CONFIG.strangeAttractorEvent.chance,
  (floor, context, area) => {
    const { traceMs, gatherMs, flyMs, holdMs, mergeMs } =
      CONFIG.strangeAttractorEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const flow = lorenz();
    const width = area.right - area.left;
    const half = (width * WIDTH) / 2;
    const cx = (area.left + area.right) / 2;
    const top = area.top + TOP;
    const tall = Math.min(area.bottom - top - 100, half * 1.4);
    // every step's spot on screen
    const xs = new Float32Array(STEPS);
    const ys = new Float32Array(STEPS);
    for (let s = 0; s < STEPS; s++) {
      xs[s] = cx + (flow[s * 3] / HALF_X) * half;
      ys[s] = top + tall - (flow[s * 3 + 2] / Z_SPAN) * tall;
    }
    const stepAt = (ms: number) => (STEPS - 1) * clamp01(ms / traceMs) ** RAMP;
    const msAtStep = (s: number) => traceMs * (s / (STEPS - 1)) ** (1 / RAMP);
    const pen: Point = { x: 0, y: 0 };
    const penAt = (ms: number): Point | null => {
      if (ms > traceMs) return null;
      const f = stepAt(Math.max(0, ms));
      const s = Math.min(STEPS - 2, Math.floor(f));
      pen.x = lerp([xs[s], xs[s + 1]], f - s);
      pen.y = lerp([ys[s], ys[s + 1]], f - s);
      return pen;
    };
    // every swing from one wing over to the other
    const flips: number[] = [];
    let wing = Math.sign(flow[0]) || 1;
    for (let s = 1; s < STEPS; s++) {
      const x = flow[s * 3];
      if (wing > 0 ? x < -FLIP : x > FLIP) {
        wing = -wing;
        flips.push(msAtStep(s));
      }
    }
    const marks = Array.from(
      { length: Math.floor(STEPS / MARK_EVERY) },
      (_, i) => i * MARK_EVERY,
    );
    const burstAt = traceMs + gatherMs;
    const centre: Point = { x: cx, y: top + tall / 2 };
    const flights = marks.map((s, i) => {
      const w = i % workers.length;
      const departs = burstAt + w * flyMs * 0.25 + (i % 7) * 8;
      const from: Point = { x: xs[s], y: ys[s] };
      const to = workers[w].at;
      const side = i % 2 ? 1 : -1;
      return {
        w,
        step: s,
        departs,
        arrives: departs + flyMs,
        from,
        bend: {
          x: (from.x + to.x) / 2 + side * BEND * 0.5,
          y: Math.min(from.y, to.y) - BEND,
        },
        to,
      };
    });
    const hits = workers.map((_, w) =>
      Math.min(...flights.filter((f) => f.w === w).map((f) => f.arrives)),
    );
    const lastHit = Math.max(...hits);
    const endAt = Math.max(...flights.map((f) => f.arrives));

    const starting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const flipping = createBeats(
      flips,
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(FLIP_SHAKE, ms / traceMs));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        cover!.burst(centre, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
      },
    );
    const tagging = createBeats(
      hits,
      (ms) => ms,
      (ms, w) => {
        const worker = workers[w];
        cover!.promote(worker);
        if (ms === lastHit) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, w / Math.max(1, workers.length - 1)));
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          starting.tick(ms, now);
          flipping.tick(ms, now);
          bursting.tick(ms, now);
          tagging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const reached = stepAt(ms);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < flights.length; i++) {
            const f = flights[i];
            if (f.step > reached || ms >= f.arrives) continue;
            if (ms < f.departs) {
              bit.x = f.from.x;
              bit.y = f.from.y;
            } else {
              bezier(
                f.from,
                f.bend,
                f.to,
                easeIn(clamp01((ms - f.departs) / flyMs)),
                bit,
              );
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              MARK,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          drawWispBetween(ctx, penAt, ms, now, PEN, 0.9, 0, traceMs);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
