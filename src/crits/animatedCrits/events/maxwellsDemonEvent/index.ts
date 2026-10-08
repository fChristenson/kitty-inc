// the "Maxwell's Demon" event (experiment: Maxwell's demon sorting a gas;
// worker perma tiers): it covers its crit, whose click freezes the screen
// while a box of light snaps up across it, split down the middle by a wall
// with a little gate, full of a gas of glimmers bouncing about: white-hot
// fast ones and slow gold ones, all mixed; a demon wisp at the gate flicks
// it open only to let hot ones through to the right and cold ones to the
// left, every pass a click; the halves sort themselves, the right side
// seething white-hot, then the gate slams shut, the right wall bursts and
// the hot gas blasts out onto the workers, each climbing a perma tier.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "maxwellsDemon";
const MAX_WORKERS = 6;
const GAS = 140;
// the box: this share of the screen across and down, centred this far down
const BOX_W = 0.86;
const BOX_H = 0.34;
const BOX_AT = 0.42;
const WALL_W = 8;
const GATE = 120;
const GATE_OPEN_MS = 90;
// px per ms: hot and cold glimmers' speeds
const HOT: [number, number] = [0.55, 0.8];
const COLD: [number, number] = [0.12, 0.22];
const STEP = 8;
const GLIMMER = 12;
const DEMON = WISP_SIZE * 0.8;
const BOW = 180;
const PASS_SHAKE = 0.2;
const SLAM_SHAKE = 0.9;
const LAND_SHAKE = 0.5;
const SOUND_GAP_MS = 70;

interface Flight {
  worker: RewardWorker;
  from: Point;
  bow: Point;
  startMs: number;
  landsMs: number;
}

export const forceMaxwellsDemonEvent = registerWispEvent(
  KEY,
  "Maxwell's Demon",
  () => CONFIG.maxwellsDemonEvent.chance,
  (floor, context, area) => {
    const { growMs, sortMs, slamMs, burstMs, gapMs, holdMs, mergeMs } =
      CONFIG.maxwellsDemonEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const w = (area.right - area.left) * BOX_W;
    const h = (area.bottom - area.top) * BOX_H;
    const cx = (area.left + area.right) / 2;
    const cy = lerp([area.top, area.bottom], BOX_AT);
    const left = cx - w / 2;
    const right = cx + w / 2;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    const gateTop = cy - GATE / 2;
    const gateBottom = cy + GATE / 2;

    // the gas, simulated once: walls bounce everything, and the demon lets a
    // glimmer through the gate only hot going right or cold going left
    const hot = Array.from({ length: GAS }, (_, i) => i % 2 === 0);
    const x = new Float32Array(GAS);
    const y = new Float32Array(GAS);
    const vx = new Float32Array(GAS);
    const vy = new Float32Array(GAS);
    for (let i = 0; i < GAS; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      x[i] = cx + side * lerp([10, w / 2 - 10], Math.random());
      y[i] = lerp([top + 10, bottom - 10], Math.random());
      const speed = lerp(hot[i] ? HOT : COLD, Math.random());
      const a = Math.random() * Math.PI * 2;
      vx[i] = Math.cos(a) * speed;
      vy[i] = Math.sin(a) * speed;
    }
    const startMs = growMs;
    const shutAt = growMs + sortMs;
    const steps = Math.ceil(sortMs / STEP) + 1;
    const frames = new Float32Array(steps * GAS * 2);
    const passes: number[] = [];
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < GAS; i++) {
        const nx = x[i] + vx[i] * STEP;
        const ny = y[i] + vy[i] * STEP;
        if ((x[i] - cx) * (nx - cx) <= 0 && nx !== x[i]) {
          const through =
            ny > gateTop && ny < gateBottom && (hot[i] ? vx[i] > 0 : vx[i] < 0);
          if (through) passes.push(startMs + s * STEP);
          else vx[i] = -vx[i];
        }
        x[i] += vx[i] * STEP;
        y[i] += vy[i] * STEP;
        if (x[i] < left || x[i] > right) {
          vx[i] = -vx[i];
          x[i] = Math.min(right, Math.max(left, x[i]));
        }
        if (y[i] < top || y[i] > bottom) {
          vy[i] = -vy[i];
          y[i] = Math.min(bottom, Math.max(top, y[i]));
        }
        frames[(s * GAS + i) * 2] = x[i];
        frames[(s * GAS + i) * 2 + 1] = y[i];
      }
    }
    const gasAt = (i: number, ms: number, into: Point): Point => {
      const t = Math.min(steps - 1, Math.max(0, (ms - startMs) / STEP));
      const s = Math.min(steps - 2, Math.floor(t));
      const u = t - s;
      const a = (s * GAS + i) * 2;
      const b = a + GAS * 2;
      into.x = lerp([frames[a], frames[b]], u);
      into.y = lerp([frames[a + 1], frames[b + 1]], u);
      return into;
    };

    // then the hot gas on the right blasts out onto the workers in turn
    const burstAt = shutAt + slamMs;
    const outgoing = Array.from({ length: GAS }, (_, i) => i).filter(
      (i) => hot[i] && x[i] > cx,
    );
    const flights: (Flight | null)[] = Array.from({ length: GAS }, () => null);
    outgoing.forEach((i, j) => {
      const k = j % workers.length;
      const worker = workers[k];
      const from = gasAt(i, shutAt, { x: 0, y: 0 });
      const leaves = burstAt + k * gapMs + (j / outgoing.length) * gapMs * 0.5;
      flights[i] = {
        worker,
        from,
        bow: {
          x: (from.x + worker.at.x) / 2 + (Math.random() - 0.5) * BOW,
          y: Math.min(from.y, worker.at.y) - BOW,
        },
        startMs: leaves,
        landsMs: leaves + burstMs,
      };
    });
    const firstLands = workers.map((worker) =>
      Math.min(
        ...flights
          .filter((f): f is Flight => f !== null && f.worker === worker)
          .map((f) => f.landsMs),
        burstAt + burstMs,
      ),
    );
    const endMs = Math.max(
      burstAt + burstMs,
      ...flights.map((f) => f?.landsMs ?? 0),
    );
    const lastWorker = workers[workers.length - 1];
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive() || now - soundAt < SOUND_GAP_MS) return;
        shakeScreen(PASS_SHAKE);
        sound(now);
      },
    );
    const slamming = createBeats(
      [shutAt, burstAt],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        if (ms >= burstAt) {
          cover!.burst({ x: right, y: cy }, 1);
          playExplosion();
        } else playSwoosh();
        shakeScreen(SLAM_SHAKE);
      },
    );
    const landing = createBeats(
      workers,
      (_, k) => firstLands[k],
      (worker, _, now) => {
        cover!.promote(worker);
        if (worker === lastWorker) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const demon: Point = { x: cx, y: cy };
    const demonAt = () => demon;
    let passIndex = 0;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          opening.tick(ms, now);
          passing.tick(ms, now);
          slamming.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          const boxFade = 1 - clamp01((ms - burstAt) / 300);
          if (boxFade > 0) {
            const hw = (w / 2) * pop;
            const hh = (h / 2) * pop;
            const alpha = 0.7 * boxFade;
            a.x = cx - hw;
            b.x = cx + hw;
            a.y = b.y = cy - hh;
            drawBeam(ctx, a, b, WALL_W, alpha);
            a.y = b.y = cy + hh;
            drawBeam(ctx, a, b, WALL_W, alpha);
            a.x = b.x = cx - hw;
            a.y = cy - hh;
            b.y = cy + hh;
            drawBeam(ctx, a, b, WALL_W, alpha);
            if (ms < burstAt) {
              a.x = b.x = cx + hw;
              drawBeam(ctx, a, b, WALL_W, alpha);
            }
            // the divider, its gate shut unless a glimmer's just been let by
            if (passIndex > 0 && passes[passIndex - 1] > ms) passIndex = 0;
            while (passIndex < passes.length && passes[passIndex] <= ms)
              passIndex++;
            const open =
              ms < shutAt &&
              passIndex > 0 &&
              ms - passes[passIndex - 1] < GATE_OPEN_MS;
            a.x = b.x = cx;
            a.y = cy - hh;
            b.y = cy + hh;
            if (open) {
              b.y = cy - (GATE / 2) * pop;
              drawBeam(ctx, a, b, WALL_W, alpha);
              a.y = cy + (GATE / 2) * pop;
              b.y = cy + hh;
            }
            drawBeam(ctx, a, b, WALL_W, alpha);
            demon.y = cy + Math.sin(ms / 90) * 6;
            drawWisp(
              ctx,
              demonAt,
              ms,
              now,
              DEMON * pop * (open ? 1.4 : 1),
              open ? 1 : 0.4,
            );
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < GAS; i++) {
            const f = flights[i];
            if (ms < burstAt || !f) {
              if (ms >= burstAt + 300) continue;
              gasAt(i, Math.min(ms, shutAt), bit);
              bit.x = cx + (bit.x - cx) * pop;
              bit.y = cy + (bit.y - cy) * pop;
            } else {
              if (ms > f.landsMs) continue;
              const u = clamp01((ms - f.startMs) / (f.landsMs - f.startMs));
              bezier(f.from, f.bow, f.worker.at, easeIn(u), bit);
            }
            const seethe = hot[i] ? 1 + 0.3 * Math.sin(now / 40 + i) : 1;
            const fade = ms >= burstAt && !f ? 1 - (ms - burstAt) / 300 : 1;
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              GLIMMER * pop * seethe * fade,
              i + ms * 0.01,
              hot[i] ? COLOR.white : COLOR.heavenlyGold,
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
