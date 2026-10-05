// the "Ising Model" event (experiment: the Ising model of a magnet; a free
// floor): it covers its crit, whose click freezes the screen while a grid of
// glimmers covers it, each a tiny magnet pointing up (gold) or down (white)
// at random; then it cools: neighbours pull each other into line, flips
// rippling through the grid as patches of gold and white grow and swallow
// each other, every few sweeps a rumble, until the last white pocket
// flips and the whole grid blazes gold; then it's pulled into the lock like
// iron filings to a magnet, which blows open in a huge blast: the floor
// unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "isingModel";
const COLS = 14;
const MARGIN = 60;
const DOT = 18;
// snapshots of the grid as it cools, SWEEPS Metropolis sweeps apart; the
// temperature falls from HOT to COLD while a field pulling up grows to FIELD
const FRAMES = 30;
const SWEEPS = 2;
const HOT = 3;
const COLD = 0.6;
const FIELD = 1.5;
// a dot flipping pops this much bigger
const POP = 0.9;
const RUMBLE_EVERY = 6;
const RUMBLE_SHAKE: [number, number] = [0.25, 0.6];
const BLAZE_SHAKE = 0.9;

export const forceIsingModelEvent = registerWispEvent(
  KEY,
  "Ising Model",
  () => CONFIG.isingModelEvent.chance,
  (floor, context, area) => {
    const { growMs, coolMs, blazeMs, pullMs, holdMs, mergeMs } =
      CONFIG.isingModelEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const w = area.right - area.left - MARGIN * 2;
    const h = area.bottom - area.top - MARGIN * 2;
    const cell = w / COLS;
    const rows = Math.max(4, Math.floor(h / cell));
    const n = COLS * rows;
    const spots: Point[] = Array.from({ length: n }, (_, i) => ({
      x: area.left + MARGIN + ((i % COLS) + 0.5) * cell,
      y: area.top + MARGIN + (Math.floor(i / COLS) + 0.5) * cell,
    }));

    // the cooling run, simulated once: Metropolis sweeps on a torus
    const spins = Int8Array.from({ length: n }, () =>
      Math.random() < 0.5 ? 1 : -1,
    );
    const frames = new Int8Array(FRAMES * n);
    for (let f = 0; f < FRAMES; f++) {
      const k = f / (FRAMES - 1);
      const temp = lerp([HOT, COLD], k);
      const field = FIELD * k * k;
      for (let s = 0; s < SWEEPS; s++)
        for (let i = 0; i < n; i++) {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const sum =
            spins[r * COLS + ((c + 1) % COLS)] +
            spins[r * COLS + ((c + COLS - 1) % COLS)] +
            spins[((r + 1) % rows) * COLS + c] +
            spins[((r + rows - 1) % rows) * COLS + c];
          const dE = 2 * spins[i] * (sum + field);
          if (dE <= 0 || Math.random() < Math.exp(-dE / temp)) spins[i] *= -1;
        }
      if (f === FRAMES - 1) spins.fill(1);
      frames.set(spins, f * n);
    }
    const frameMs = coolMs / FRAMES;
    const frameAt = (ms: number) =>
      Math.min(FRAMES - 1, Math.max(0, Math.floor((ms - growMs) / frameMs)));
    const blazeAt = growMs + coolMs;
    const pullAt = blazeAt + blazeMs;
    // nearest the lock first
    const reach = spots.map((p) => Math.hypot(p.x - lock.x, p.y - lock.y));
    const far = Math.max(...reach);
    const pulled = reach.map((d) => pullAt + (pullMs * 0.5 * d) / far);
    const openAt = pullAt + pullMs;

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const rumbles = Array.from(
      { length: Math.floor(FRAMES / RUMBLE_EVERY) },
      (_, k) => growMs + (k + 1) * RUMBLE_EVERY * frameMs,
    );
    const cooling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(RUMBLE_SHAKE, k / Math.max(1, rumbles.length - 1)));
      },
    );
    const finishing = createBeats(
      [blazeAt, pullAt, openAt],
      (ms) => ms,
      (ms) => {
        if (ms >= openAt) {
          cover!.blast(lock);
          return;
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms === blazeAt) shakeScreen(BLAZE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          opening.tick(ms, now);
          cooling.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms >= openAt) return;
          const f = frameAt(ms);
          const into = clamp01((ms - growMs - f * frameMs) / frameMs);
          const blaze = ms >= blazeAt ? 0.7 + 0.3 * Math.sin(now / 40) : 1;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < n; i++) {
            const grow = easeOut(clamp01((ms - (i % COLS) * 15) / growMs));
            if (grow <= 0) continue;
            const up = frames[f * n + i] > 0;
            const flipped =
              f > 0 && frames[(f - 1) * n + i] !== frames[f * n + i];
            const pop = flipped ? 1 + POP * (1 - into) : 1;
            let x = spots[i].x;
            let y = spots[i].y;
            let size = DOT * grow * pop;
            if (ms > pulled[i]) {
              const u = easeIn(
                clamp01((ms - pulled[i]) / (openAt - pulled[i])),
              );
              x = lerp([x, lock.x], u);
              y = lerp([y, lock.y], u);
              size *= 1 - 0.5 * u;
            }
            stampGlimmer(
              ctx,
              x,
              y,
              size * (up ? blaze : 0.8),
              i * 0.7 + now * 0.002,
              up ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
