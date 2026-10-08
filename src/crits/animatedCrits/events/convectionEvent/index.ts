// the "Convection" event (experiment: Rayleigh–Bénard convection; worker
// perma tiers): it covers its crit, whose click freezes the screen while a
// slab of glitter settles across it, every grain jittering about at random
// like a pan of water on the heat; then convection sets in: the grains
// organise into rolling cells, white-hot plumes rising between gold sheets
// sinking, turning faster and faster, every surge a jolt; the plumes boil
// over and erupt, their hot grains streaming out in arcs onto the workers,
// each climbing a perma tier as its stream lands. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "convection";
const MAX_WORKERS = 6;
const GRAINS = 320;
const GRAIN = 10;
// the slab: from TOP to BOTTOM of the screen, MARGIN in from its sides,
// rolling in CELLS cells
const TOP = 0.18;
const BOTTOM = 0.5;
const MARGIN = 50;
const CELLS = 4;
// px per ms at full boil, and the random jitter before it sets in
const SPEED = 0.55;
const JITTER = 0.12;
const STEP = 8;
// each plume throws this share of the grains onto the workers
const ERUPT = 0.4;
const BOW = 160;
const SURGES = 4;
const SURGE_SHAKE: [number, number] = [0.3, 0.8];
const ERUPT_SHAKE = 1;
const LAND_SHAKE = 0.6;

interface Throw {
  worker: RewardWorker;
  from: Point;
  bow: Point;
  leaves: number;
  lands: number;
}

export const forceConvectionEvent = registerWispEvent(
  KEY,
  "Convection",
  () => CONFIG.convectionEvent.chance,
  (floor, context, area) => {
    const { settleMs, boilMs, gapMs, dropMs, holdMs, mergeMs } =
      CONFIG.convectionEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const left = area.left + MARGIN;
    const right = area.right - MARGIN;
    const top = lerp([area.top, area.bottom], TOP);
    const bottom = lerp([area.top, area.bottom], BOTTOM);
    const w = right - left;
    const h = bottom - top;
    const kx = (CELLS * Math.PI) / w;
    const ky = Math.PI / h;
    const eruptAt = settleMs + boilMs;
    // the rolls' strength: nothing, then setting in and quickening
    const strength = (ms: number) =>
      smoothstep(clamp01((ms - settleMs) / (boilMs * 0.5))) *
      lerp([0.6, 1], clamp01((ms - settleMs) / boilMs));
    const amp = (SPEED * h) / Math.PI;

    // the grains, simulated once: advected round the rolls, jittering till then
    const x = Float32Array.from(
      { length: GRAINS },
      () => left + Math.random() * w,
    );
    const y = Float32Array.from(
      { length: GRAINS },
      () => top + Math.random() * h,
    );
    const steps = Math.ceil(eruptAt / STEP) + 1;
    const frames = new Float32Array(steps * GRAINS * 2);
    const rising = new Float32Array(steps * GRAINS);
    for (let s = 0; s < steps; s++) {
      const ms = s * STEP;
      const a = amp * strength(ms);
      const jitter = JITTER * (1 - clamp01(a / amp));
      for (let i = 0; i < GRAINS; i++) {
        const px = (x[i] - left) * kx;
        const py = (y[i] - top) * ky;
        const vx = a * ky * Math.sin(px) * Math.cos(py);
        const vy = -a * kx * Math.cos(px) * Math.sin(py);
        x[i] += (vx + (Math.random() - 0.5) * jitter) * STEP;
        y[i] += (vy + (Math.random() - 0.5) * jitter) * STEP;
        x[i] = Math.min(right, Math.max(left, x[i]));
        y[i] = Math.min(bottom, Math.max(top, y[i]));
        frames[(s * GRAINS + i) * 2] = x[i];
        frames[(s * GRAINS + i) * 2 + 1] = y[i];
        rising[s * GRAINS + i] = a > 0 ? clamp01(-vy / (amp * kx)) : 0;
      }
    }
    const grainAt = (i: number, ms: number, into: Point): number => {
      const t = Math.min(steps - 1, Math.max(0, ms / STEP));
      const s = Math.min(steps - 2, Math.floor(t));
      const u = t - s;
      const a = (s * GRAINS + i) * 2;
      into.x = lerp([frames[a], frames[a + GRAINS * 2]], u);
      into.y = lerp([frames[a + 1], frames[a + GRAINS * 2 + 1]], u);
      return rising[Math.round(t) * GRAINS + i];
    };

    // the hottest grains near the top boil over onto the workers
    const end: Point = { x: 0, y: 0 };
    const ranked = Array.from({ length: GRAINS }, (_, i) => {
      const heat = grainAt(i, eruptAt, end);
      return { i, score: heat - (end.y - top) / h };
    }).sort((a, b) => b.score - a.score);
    const throws: (Throw | null)[] = Array.from({ length: GRAINS }, () => null);
    ranked.slice(0, Math.round(GRAINS * ERUPT)).forEach(({ i }, j) => {
      const k = j % workers.length;
      const worker = workers[k];
      const from = { ...end };
      grainAt(i, eruptAt, from);
      const leaves = eruptAt + k * gapMs + Math.random() * gapMs * 0.5;
      throws[i] = {
        worker,
        from,
        bow: {
          x: (from.x + worker.at.x) / 2 + (Math.random() - 0.5) * BOW,
          y: Math.min(from.y, worker.at.y) - BOW,
        },
        leaves,
        lands: leaves + dropMs,
      };
    });
    const firstLands = workers.map((worker) =>
      Math.min(
        ...throws
          .filter((t): t is Throw => t !== null && t.worker === worker)
          .map((t) => t.lands),
      ),
    );
    const endMs = Math.max(...throws.map((t) => t?.lands ?? 0));
    const lastWorker = workers[firstLands.indexOf(Math.max(...firstLands))];

    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => settleMs + boilMs * (1 - 0.6 ** (k + 1)),
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const erupting = createBeats(
      [eruptAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(ERUPT_SHAKE);
      },
    );
    const landing = createBeats(
      workers,
      (_, k) => firstLands[k],
      (worker) => {
        cover!.promote(worker);
        if (worker === lastWorker) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        playBloop();
      },
    );

    const grain: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          surging.tick(ms, now);
          erupting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms > endMs) return;
          const pop = easeOutBack(clamp01(ms / (settleMs * 0.6)));
          const fade = 1 - clamp01((ms - eruptAt) / 300);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < GRAINS; i++) {
            const t = throws[i];
            let heat: number;
            if (t && ms >= t.leaves) {
              if (ms > t.lands) continue;
              bezier(
                t.from,
                t.bow,
                t.worker.at,
                easeIn((ms - t.leaves) / (t.lands - t.leaves)),
                grain,
              );
              heat = 1;
            } else {
              if (!t && fade <= 0) continue;
              heat = grainAt(i, Math.min(ms, eruptAt), grain);
            }
            stampGlimmer(
              ctx,
              grain.x,
              grain.y,
              GRAIN * pop * (0.8 + 0.6 * heat) * (t ? 1 : fade),
              i + ms * 0.004,
              heat > 0.4 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
