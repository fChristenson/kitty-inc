// the "Three-Body" event (experiment: the three-body problem; cash): it
// covers its crit, whose click freezes the screen while three wisps tangle
// in a chaotic gravitational dance mid-screen, simulated for real, swinging
// round each other in looping orbits with glowing tethers between them;
// every close pass a flash, a pop, a jolt and a burst of coins; then one is
// slung clean out of the system and streaks into the total in a huge blast,
// the other two fading off as a pair. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawBeam } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";

const KEY = "threeBody";
const REWARD = 4;
// the simulation: step, softening, how long a seed may run before being
// dropped, when a body counts as flung out, and a close pass
const DT = 0.002;
const SOFT = 0.05;
const MAX_T = 8;
const MIN_T = 1.5;
const EJECT_R = 1.8;
const CLOSE = 0.25;
const SEEDS = 40;
const MAX_PASSES = 14;
// px across a sim unit, as a share of the screen's smaller side
const SCALE = 0.28;
const BODY = 0.6;
const COINS = 8;
const REACH: [number, number] = [60, 200];
const TETHER = 0.25;
const BLOOP_GAP_MS = 60;
const PASS_SHAKE: [number, number] = [0.5, 1.0];
const FLING_SHAKE = 1.2;

interface Run {
  frames: Float32Array;
  steps: number;
  ejected: number;
  ejectStep: number;
  passes: { step: number; a: number; b: number }[];
}

// three equal masses from a random bound start, integrated by leapfrog
function simulate(): Run {
  const p = new Float64Array(6);
  const v = new Float64Array(6);
  const acc = new Float64Array(6);
  const accel = () => {
    acc.fill(0);
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        const dx = p[j * 2] - p[i * 2];
        const dy = p[j * 2 + 1] - p[i * 2 + 1];
        const r2 = dx * dx + dy * dy + SOFT * SOFT;
        const f = 1 / (r2 * Math.sqrt(r2));
        acc[i * 2] += dx * f;
        acc[i * 2 + 1] += dy * f;
        acc[j * 2] -= dx * f;
        acc[j * 2 + 1] -= dy * f;
      }
  };
  const energy = () => {
    let e = 0;
    for (let i = 0; i < 3; i++) e += 0.5 * (v[i * 2] ** 2 + v[i * 2 + 1] ** 2);
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        e -= 1 / Math.hypot(p[j * 2] - p[i * 2], p[j * 2 + 1] - p[i * 2 + 1]);
    return e;
  };
  const start = () => {
    for (;;) {
      for (let k = 0; k < 6; k++) {
        p[k] = Math.random() * 2 - 1;
        v[k] = Math.random() - 0.5;
      }
      for (let axis = 0; axis < 2; axis++) {
        const pm = (p[axis] + p[2 + axis] + p[4 + axis]) / 3;
        const vm = (v[axis] + v[2 + axis] + v[4 + axis]) / 3;
        for (let i = 0; i < 3; i++) {
          p[i * 2 + axis] -= pm;
          v[i * 2 + axis] -= vm;
        }
      }
      if (energy() < -0.3) return;
    }
  };
  const steps = Math.ceil(MAX_T / DT);
  let best: Run | null = null;
  for (let seed = 0; seed < SEEDS; seed++) {
    start();
    const frames = new Float32Array((steps + 1) * 6);
    const passes: Run["passes"] = [];
    const last = [Infinity, Infinity, Infinity];
    const falling = [false, false, false];
    let ejected = -1;
    let ejectStep = steps;
    accel();
    for (let s = 0; s <= steps; s++) {
      frames.set(p, s * 6);
      // close passes: where a pair's distance bottoms out
      [
        [0, 1],
        [0, 2],
        [1, 2],
      ].forEach(([a, b], k) => {
        const d = Math.hypot(p[b * 2] - p[a * 2], p[b * 2 + 1] - p[a * 2 + 1]);
        if (d > last[k] && falling[k] && last[k] < CLOSE)
          passes.push({ step: s, a, b });
        falling[k] = d < last[k];
        last[k] = d;
      });
      if (s * DT > MIN_T)
        for (let i = 0; i < 3 && ejected < 0; i++) {
          const cx = (p[0] + p[2] + p[4] - p[i * 2]) / 2;
          const cy = (p[1] + p[3] + p[5] - p[i * 2 + 1]) / 2;
          const dx = p[i * 2] - cx;
          const dy = p[i * 2 + 1] - cy;
          if (
            Math.hypot(dx, dy) > EJECT_R &&
            dx * v[i * 2] + dy * v[i * 2 + 1] > 0
          ) {
            ejected = i;
            ejectStep = s;
          }
        }
      if (ejected >= 0 && s > ejectStep + steps / 8) break;
      for (let k = 0; k < 6; k++) v[k] += acc[k] * DT * 0.5;
      for (let k = 0; k < 6; k++) p[k] += v[k] * DT;
      accel();
      for (let k = 0; k < 6; k++) v[k] += acc[k] * DT * 0.5;
    }
    const run: Run = { frames, steps, ejected, ejectStep, passes };
    if (ejected >= 0 && passes.length >= 2) return run;
    if (!best || passes.length > best.passes.length) best = run;
  }
  // none flung one out in time: fling the one farthest out at the end
  const run = best!;
  const s = run.steps * 6;
  let far = 0;
  for (let i = 1; i < 3; i++)
    if (
      Math.hypot(run.frames[s + i * 2], run.frames[s + i * 2 + 1]) >
      Math.hypot(run.frames[s + far * 2], run.frames[s + far * 2 + 1])
    )
      far = i;
  run.ejected = far;
  return run;
}

export const forceThreeBodyEvent = registerWispEvent(
  KEY,
  "Three-Body",
  () => CONFIG.threeBodyEvent.chance,
  (floor, context, area) => {
    const { danceMs, flingMs, holdMs, mergeMs } = CONFIG.threeBodyEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.55,
    };
    const scale = Math.min(width, height) * SCALE;
    const total = totalSpot(area);
    const run = simulate();
    const msPerStep = danceMs / Math.max(1, run.ejectStep);
    const lastStep = run.frames.length / 6 - 1;
    const flungAt = danceMs;
    const endAt = flungAt + flingMs;
    const simAt = (i: number, ms: number, into: Point) => {
      const f = Math.min(lastStep, Math.max(0, ms / msPerStep));
      const s = Math.min(lastStep - 1, Math.floor(f));
      const u = f - s;
      const a = s * 6 + i * 2;
      into.x = centre.x + lerp([run.frames[a], run.frames[a + 6]], u) * scale;
      into.y =
        centre.y + lerp([run.frames[a + 1], run.frames[a + 7]], u) * scale;
      return into;
    };
    const flung = run.ejected;
    const spots = [0, 1, 2].map(() => ({ x: 0, y: 0 }));
    const bodies = [0, 1, 2].map((i) => (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const p = simAt(i, ms, spots[i]);
      if (i !== flung || ms < flungAt) return p;
      const u = easeIn(clamp01((ms - flungAt) / flingMs));
      p.x = lerp([p.x, total.x], u);
      p.y = lerp([p.y, total.y], u);
      return p;
    });
    const passes = run.passes
      .filter((s) => s.step < run.ejectStep)
      .slice(0, MAX_PASSES)
      .map((s) => ({ ...s, ms: s.step * msPerStep }));
    const mid: Point = { x: 0, y: 0 };
    const pa: Point = { x: 0, y: 0 };
    const pb: Point = { x: 0, y: 0 };

    let bloop = -Infinity;
    const passing = createBeats(
      passes,
      (s) => s.ms,
      (s, k) => {
        simAt(s.a, s.ms, pa);
        simAt(s.b, s.ms, pb);
        const at: Point = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        cover!.burst(at, 0.5);
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (s.ms - bloop >= BLOOP_GAP_MS) {
          bloop = s.ms;
          playBloop();
        }
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const flinging = createBeats(
      [flungAt],
      (ms) => ms,
      () => {
        cover!.burst(simAt(flung, flungAt, { x: 0, y: 0 }), 0.8);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FLING_SHAKE);
      },
    );
    const landing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          passing.tick(ms, now);
          flinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - flungAt) / flingMs);
          // the pull between each pair, brighter the closer they swing
          for (let a = 0; a < 3; a++)
            for (let b = a + 1; b < 3; b++) {
              simAt(a, ms, pa);
              simAt(b, ms, pb);
              const d = Math.hypot(pb.x - pa.x, pb.y - pa.y) / scale;
              const alpha = clamp01(TETHER / Math.max(0.05, d)) * fade;
              if (alpha > 0.05) {
                mid.x = pb.x;
                mid.y = pb.y;
                drawBeam(ctx, pa, mid, 4, alpha);
              }
            }
          for (let i = 0; i < 3; i++) {
            const alive = i === flung ? 1 : fade;
            if (alive <= 0) continue;
            drawWispBetween(
              ctx,
              bodies[i],
              ms,
              now,
              WISP_SIZE * BODY * alive,
              i === flung && ms > flungAt ? 1 : 0.6,
              0,
              endAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
