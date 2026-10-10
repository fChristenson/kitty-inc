// the "Sync" event (experiment: coupled oscillators syncing up, the Kuramoto
// model; worker perma tiers): it covers its crit, whose click freezes the
// screen while a field of little wisps lights up across it, each spinning
// round its own tiny circle at its own pace and flashing gold every time it
// comes round, a scatter of random blinks; then they start to feel each
// other: neighbours drift into step, clumps blink together, until the whole
// field spins as one and flashes in unison, every unison flash a boom and a
// jolt, harder each time; on the last flash they all let go at once and
// stream down onto the workers, who climb a perma tier. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "sync";
const MAX_WORKERS = 6;
// a COLS × ROWS field from TOP to BOTTOM of the screen, MARGIN in
const COLS = 7;
const ROWS = 5;
const TOP = 0.12;
const BOTTOM = 0.55;
const MARGIN = 70;
// each spins round SPIN px at HZ laps a second give or take SPREAD, its
// coupling ramping up to COUPLING over the sync
const SPIN = 16;
const HZ = 2.2;
const SPREAD = 0.35;
const COUPLING = 22;
const STEP = 8;
const DOT = 9;
const FLASH = 26;
const FLASH_MS = 120;
// unison flashes once the field's this in step
const IN_STEP = 0.93;
const BOW = 140;
const FLASH_SHAKE: [number, number] = [0.3, 1];
const LAND_SHAKE = 0.6;
const SOUND_GAP_MS = 80;

interface Drop {
  worker: RewardWorker;
  from: Point;
  bow: Point;
  lands: number;
}

export const forceSyncEvent = registerWispEvent(
  KEY,
  "Sync",
  () => CONFIG.syncEvent.chance,
  (floor, context, area) => {
    const { growMs, syncMs, dropMs, holdMs, mergeMs } = CONFIG.syncEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const n = COLS * ROWS;
    const centres: Point[] = Array.from({ length: n }, (_, i) => ({
      x: lerp(
        [area.left + MARGIN, area.right - MARGIN],
        (i % COLS) / (COLS - 1),
      ),
      y: lerp(
        [
          lerp([area.top, area.bottom], TOP),
          lerp([area.top, area.bottom], BOTTOM),
        ],
        Math.floor(i / COLS) / (ROWS - 1),
      ),
    }));

    // the oscillators, simulated once: each pulled toward the field's mean phase
    const omega = Array.from(
      { length: n },
      () => (HZ * (1 + SPREAD * (Math.random() * 2 - 1)) * Math.PI * 2) / 1000,
    );
    const theta = Float64Array.from(
      { length: n },
      () => Math.random() * Math.PI * 2,
    );
    const endSync = growMs + syncMs;
    const steps = Math.ceil(endSync / STEP) + 1;
    const phases = new Float32Array(steps * n);
    const order: number[] = [];
    for (let s = 0; s < steps; s++) {
      const ms = s * STEP;
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        cx += Math.cos(theta[i]);
        cy += Math.sin(theta[i]);
      }
      const r = Math.hypot(cx, cy) / n;
      const mean = Math.atan2(cy, cx);
      order.push(r);
      const k =
        (COUPLING / 1000) * clamp01((ms - growMs) / (syncMs * 0.6)) ** 1.5;
      for (let i = 0; i < n; i++) {
        phases[s * n + i] = theta[i];
        theta[i] += (omega[i] + k * r * Math.sin(mean - theta[i])) * STEP;
      }
    }
    const phaseAt = (i: number, ms: number) => {
      const t = Math.min(steps - 1, Math.max(0, ms / STEP));
      const s = Math.min(steps - 2, Math.floor(t));
      const a = phases[s * n + i];
      return a + (phases[(s + 1) * n + i] - a) * (t - s);
    };
    // unison flashes: whenever the field is in step and its mean comes round
    const unison: number[] = [];
    let lastMean = 0;
    for (let s = 1; s < steps; s++) {
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        cx += Math.cos(phases[s * n + i]);
        cy += Math.sin(phases[s * n + i]);
      }
      // the mean phase coming round past the top, where every dot flashes
      const mean = Math.atan2(cy, cx) + Math.PI / 2;
      const top = mean > Math.PI ? mean - Math.PI * 2 : mean;
      if (order[s] > IN_STEP && lastMean < 0 && top >= 0) unison.push(s * STEP);
      lastMean = top;
    }
    const releaseAt = unison.length > 0 ? unison[unison.length - 1] : endSync;
    const drops: Drop[] = centres.map((c, i) => {
      const worker = workers[i % workers.length];
      return {
        worker,
        from: c,
        bow: {
          x: (c.x + worker.at.x) / 2,
          y: Math.min(c.y, worker.at.y) - BOW,
        },
        lands: releaseAt + dropMs + Math.floor(i / workers.length) * 40,
      };
    });
    const firstLands = workers.map((w) =>
      Math.min(...drops.filter((d) => d.worker === w).map((d) => d.lands)),
    );
    const endMs = Math.max(...drops.map((d) => d.lands));
    const lastWorker = workers[workers.length - 1];
    let soundAt = -Infinity;

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const flashing = createBeats(
      unison,
      (ms) => ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(FLASH_SHAKE, k / Math.max(1, unison.length - 1)));
        if (now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        playBloop();
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

    const dot: Point = { x: 0, y: 0 };
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
          flashing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < 0 || ms > endMs) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < n; i++) {
            const d = drops[i];
            if (ms > d.lands) continue;
            let size = DOT;
            if (ms < releaseAt) {
              const a = phaseAt(i, ms);
              const c = centres[i];
              dot.x = c.x + Math.cos(a) * SPIN * pop;
              dot.y = c.y + Math.sin(a) * SPIN * pop;
              // a flash each time it comes round past the top
              const since =
                ((((a + Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) %
                  (Math.PI * 2)) /
                omega[i];
              size = lerp([DOT, FLASH], 1 - clamp01(since / FLASH_MS)) * pop;
            } else {
              const u = easeIn(
                clamp01((ms - releaseAt) / (d.lands - releaseAt)),
              );
              bezier(d.from, d.bow, d.worker.at, u, dot);
              size = FLASH;
            }
            stampGlimmer(
              ctx,
              dot.x,
              dot.y,
              size,
              i + ms * 0.004,
              size > DOT * 1.5 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
