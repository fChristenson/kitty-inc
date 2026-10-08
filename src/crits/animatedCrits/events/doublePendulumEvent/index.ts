// the "Double Pendulum" event (wisp; worker perma tiers): it covers its
// crit, whose click freezes the screen while a pivot wisp lights up at the
// top of the screen with two wisps hung from it on glitter arms, one below
// the other; they're let go and flail wildly, the lower one whipping round
// in chaotic loops and lashes across the whole screen, and every worker its
// tip whips past lights up a perma tier with a crack, a flash and a jolt;
// then the tip snaps loose, darts onto any worker it missed and the last
// lands in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawGlitterLight,
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "doublePendulum";
const MAX_WORKERS = 6;
const PIVOT = 150;
// each arm's share of the pivot's height over the lowest worker
const ARM = 0.5;
const HIT = 110;
const DT = 2;
// a pendulum ARM long takes PERIOD_MS to swing (small swings)
const PERIOD_MS = 1300;
const TRIES = 12;
const HOLD_MS = 160;
const DART_MS = 140;
const GAP = 30;
const GLITTER = 6;
const PIVOT_WISP = 0.35;
const MID_WISP = 0.45;
const TIP_WISP = 0.7;
const HIT_SHAKE: [number, number] = [0.6, 1.4];

// the arms' angles from straight down every DT ms, by RK4 (equal masses)
function swing(
  a1: number,
  a2: number,
  length: number,
  g: number,
  steps: number,
): Float32Array {
  const out = new Float32Array(steps * 2);
  let t1 = a1;
  let t2 = a2;
  let w1 = 0;
  let w2 = 0;
  // the arms' angular accelerations, into acc
  const acc = [0, 0];
  const accel = (p1: number, p2: number, v1: number, v2: number) => {
    const d = p1 - p2;
    const den = length * (3 - Math.cos(2 * d));
    acc[0] =
      (-3 * g * Math.sin(p1) -
        g * Math.sin(p1 - 2 * p2) -
        2 * Math.sin(d) * length * (v2 * v2 + v1 * v1 * Math.cos(d))) /
      den;
    acc[1] =
      (2 *
        Math.sin(d) *
        (2 * v1 * v1 * length +
          2 * g * Math.cos(p1) +
          v2 * v2 * length * Math.cos(d))) /
      den;
  };
  const h = DT / 2;
  for (let i = 0; i < steps; i++) {
    out[i * 2] = t1;
    out[i * 2 + 1] = t2;
    accel(t1, t2, w1, w2);
    const [a1k1, a2k1] = acc;
    accel(t1 + w1 * h, t2 + w2 * h, w1 + a1k1 * h, w2 + a2k1 * h);
    const [a1k2, a2k2] = acc;
    const w1k2 = w1 + a1k1 * h;
    const w2k2 = w2 + a2k1 * h;
    accel(t1 + w1k2 * h, t2 + w2k2 * h, w1 + a1k2 * h, w2 + a2k2 * h);
    const [a1k3, a2k3] = acc;
    const w1k3 = w1 + a1k2 * h;
    const w2k3 = w2 + a2k2 * h;
    accel(t1 + w1k3 * DT, t2 + w2k3 * DT, w1 + a1k3 * DT, w2 + a2k3 * DT);
    const [a1k4, a2k4] = acc;
    const w1k4 = w1 + a1k3 * DT;
    const w2k4 = w2 + a2k3 * DT;
    t1 += ((w1 + 2 * w1k2 + 2 * w1k3 + w1k4) * DT) / 6;
    t2 += ((w2 + 2 * w2k2 + 2 * w2k3 + w2k4) * DT) / 6;
    w1 += ((a1k1 + 2 * a1k2 + 2 * a1k3 + a1k4) * DT) / 6;
    w2 += ((a2k1 + 2 * a2k2 + 2 * a2k3 + a2k4) * DT) / 6;
  }
  return out;
}

export const forceDoublePendulumEvent = registerWispEvent(
  KEY,
  "Double Pendulum",
  () => CONFIG.doublePendulumEvent.chance,
  (floor, context, area) => {
    const { flailMs, holdMs, mergeMs } = CONFIG.doublePendulumEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const pivot: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + PIVOT,
    };
    const lowest = Math.max(...workers.map((w) => w.at.y));
    const length = Math.max(220, (lowest - pivot.y) * ARM);
    const g = (length * (2 * Math.PI) ** 2) / PERIOD_MS ** 2;
    const steps = Math.ceil(flailMs / DT);
    const tip = (angles: Float32Array, i: number, into: Point) => {
      const t1 = angles[i * 2];
      const t2 = angles[i * 2 + 1];
      into.x = pivot.x + length * (Math.sin(t1) + Math.sin(t2));
      into.y = pivot.y + length * (Math.cos(t1) + Math.cos(t2));
      return into;
    };
    // the throw that whips its tip past the most workers soonest
    let best: { angles: Float32Array; hits: Map<RewardWorker, number> } | null =
      null;
    let bestScore = -Infinity;
    const probe: Point = { x: 0, y: 0 };
    for (let n = 0; n < TRIES; n++) {
      const side = n % 2 === 0 ? 1 : -1;
      const angles = swing(
        side * (Math.PI / 2 + Math.random() * 0.6),
        side * (Math.PI * 0.6 + Math.random() * 1.2),
        length,
        g,
        steps,
      );
      const hits = new Map<RewardWorker, number>();
      let lastHit = -Infinity;
      for (let i = 0; i < steps; i += 2) {
        tip(angles, i, probe);
        for (const w of workers) {
          if (hits.has(w) || i * DT - lastHit < GAP * 3) continue;
          if (Math.hypot(probe.x - w.at.x, probe.y - w.at.y) < HIT) {
            hits.set(w, i * DT);
            lastHit = i * DT;
          }
        }
      }
      let score = hits.size * 10000;
      for (const t of hits.values()) score -= t;
      if (score > bestScore) {
        bestScore = score;
        best = { angles, hits };
      }
    }
    const { angles, hits } = best!;
    const flailEnds = HOLD_MS + flailMs;
    const missed = workers.filter((w) => !hits.has(w));
    const strikes = [
      ...[...hits].map(([worker, t]) => ({ worker, ms: HOLD_MS + t })),
      ...missed.map((worker, i) => ({
        worker,
        ms: flailEnds + (i + 1) * DART_MS,
      })),
    ].sort((a, b) => a.ms - b.ms);
    const endAt = strikes[strikes.length - 1].ms;
    const last = strikes[strikes.length - 1];

    const index = (ms: number) =>
      Math.min(steps - 1, Math.max(0, Math.floor((ms - HOLD_MS) / DT)));
    const midAt: Point = { x: 0, y: 0 };
    const mid = (ms: number): Point | null => {
      if (ms > flailEnds) return null;
      const t1 = angles[index(ms) * 2];
      midAt.x = pivot.x + length * Math.sin(t1);
      midAt.y = pivot.y + length * Math.cos(t1);
      return midAt;
    };
    const tipAt: Point = { x: 0, y: 0 };
    const dartFrom: Point = { x: 0, y: 0 };
    tip(angles, steps - 1, dartFrom);
    const darts = strikes.filter((s) => s.ms > flailEnds);
    const tipWisp = (ms: number): Point | null => {
      if (ms <= flailEnds) return tip(angles, index(ms), tipAt);
      let from = dartFrom;
      let starts = flailEnds;
      for (const d of darts) {
        if (ms <= d.ms) {
          const u = easeIn(clamp01((ms - starts) / (d.ms - starts)));
          tipAt.x = lerp([from.x, d.worker.at.x], u);
          tipAt.y = lerp([from.y, d.worker.at.y], u);
          return tipAt;
        }
        from = d.worker.at;
        starts = d.ms;
      }
      return null;
    };
    const pivotAt = () => pivot;

    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, strikes.length - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          if (ms <= flailEnds) {
            const m = mid(ms)!;
            const t = tipWisp(ms)!;
            const arm = (a: Point, b: Point, seed: number) => {
              const n = Math.floor(length / 26);
              for (let i = 1; i < n; i++)
                drawGlitterLight(
                  ctx,
                  lerp([a.x, b.x], i / n),
                  lerp([a.y, b.y], i / n),
                  GLITTER,
                  seed + i,
                  0.8,
                  now,
                );
            };
            arm(pivot, m, 0);
            arm(m, t, 100);
            drawWisp(ctx, pivotAt, ms, now, WISP_SIZE * PIVOT_WISP, 0.3);
          }
          drawWispBetween(
            ctx,
            mid,
            ms,
            now,
            WISP_SIZE * MID_WISP,
            0.5,
            0,
            flailEnds,
          );
          drawWispBetween(
            ctx,
            tipWisp,
            ms,
            now,
            WISP_SIZE * TIP_WISP,
            0.9,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
