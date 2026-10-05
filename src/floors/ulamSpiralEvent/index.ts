// the "Ulam Spiral" event (experiment: the Ulam spiral of primes; worker
// perma tiers): it covers its crit, whose click freezes the screen while a
// counting wisp sets off from the middle of the screen and winds out round
// a square spiral cell by cell, ever faster, counting 1, 2, 3...; every
// prime it lands on flares gold and stays lit, every other number winks
// out, until the primes stand in the strange diagonal streaks Ulam saw;
// then every prime streaks off onto a worker in view, each worker lighting
// up a perma tier as its sparks land, the last in a huge blast. Then the
// crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { findRewardWorkers } from "../eventRewards";

const KEY = "ulamSpiral";
// the spiral's side in cells (odd), and the cell's size of the screen width
const SIDE = 13;
const CELL = 0.06;
const MAX_WORKERS = 6;
const COUNTER = WISP_SIZE * 0.55;
const PRIME = 0.42;
const WINK_MS = 160;
const BEND = 160;
const SOUND_GAP_MS = 70;
const PRIME_SHAKE = 0.12;
const DONE_SHAKE = 1.0;
const HIT_SHAKE = 0.8;

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

// the square spiral's cells for 1..count, from the middle out: right, up,
// left, down, each side one longer every second turn
function spiral(count: number): [number, number][] {
  const cells: [number, number][] = [[0, 0]];
  let x = 0;
  let y = 0;
  let run = 1;
  const dirs = [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ];
  let d = 0;
  while (cells.length < count) {
    for (let twice = 0; twice < 2 && cells.length < count; twice++) {
      for (let s = 0; s < run && cells.length < count; s++) {
        x += dirs[d][0];
        y += dirs[d][1];
        cells.push([x, y]);
      }
      d = (d + 1) % 4;
    }
    run++;
  }
  return cells;
}

export const forceUlamSpiralEvent = registerWispEvent(
  KEY,
  "Ulam Spiral",
  () => CONFIG.ulamSpiralEvent.chance,
  (floor, context, area) => {
    const { stepMs, flyMs, holdMs, mergeMs } = CONFIG.ulamSpiralEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const count = SIDE * SIDE;
    const cell = (area.right - area.left) * CELL;
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const spots = spiral(count).map(([x, y]) => ({
      x: mid.x + x * cell,
      y: mid.y + y * cell,
    }));
    const primes = spots.map((_, i) => isPrime(i + 1));
    // each count a little quicker than the last
    const counts: number[] = [0];
    for (let i = 1; i < count; i++)
      counts.push(counts[i - 1] + lerp(stepMs, i / (count - 1)));
    const doneAt = counts[count - 1] + 120;
    const primeCells = spots.map((_, i) => i).filter((i) => primes[i]);
    const flights = primeCells.map((i, k) => {
      const w = k % workers.length;
      const from = spots[i];
      const to = workers[w].at;
      const departs = doneAt + 150 + w * 90 + (k % 5) * 12;
      return {
        w,
        from,
        bend: {
          x: (from.x + to.x) / 2,
          y: Math.min(from.y, to.y) - BEND,
        },
        to,
        departs,
        arrives: departs + flyMs,
        spot: { x: 0, y: 0 },
      };
    });
    const flown = new Map(
      primeCells.map((cellIndex, k) => [cellIndex, flights[k]]),
    );
    const hits = workers.map((_, w) =>
      Math.min(...flights.filter((f) => f.w === w).map((f) => f.arrives)),
    );
    const lastHit = Math.max(...hits);
    const endAt = Math.max(...flights.map((f) => f.arrives));
    const counter: Point = { x: 0, y: 0 };
    const counterAt = (ms: number): Point | null => {
      if (ms > doneAt) return null;
      let lo = 0;
      let hi = count - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (counts[m] <= ms) lo = m;
        else hi = m;
      }
      const u = easeOut(clamp01((ms - counts[lo]) / (counts[hi] - counts[lo])));
      counter.x = lerp([spots[lo].x, spots[hi].x], u);
      counter.y = lerp([spots[lo].y, spots[hi].y], u);
      return counter;
    };
    const bit: Point = { x: 0, y: 0 };
    let soundAt = -Infinity;

    const counting = createBeats(
      primeCells,
      (i) => counts[i],
      (_, k, now) => {
        if (!cover!.isLive()) return;
        if (k === 0) playSwoosh();
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
        shakeScreen(PRIME_SHAKE);
      },
    );
    const done = createBeats(
      [doneAt],
      (ms) => ms,
      () => {
        cover!.burst(mid, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(DONE_SHAKE);
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
        shakeScreen(HIT_SHAKE);
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
          counting.tick(ms, now);
          done.tick(ms, now);
          tagging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < count; i++) {
            const since = ms - counts[i];
            if (since < 0) break;
            const p = spots[i];
            if (!primes[i]) {
              // a composite winks as it's counted, then goes out
              if (since < WINK_MS)
                stampGlimmer(
                  ctx,
                  p.x,
                  p.y,
                  cell * 0.3 * (1 - since / WINK_MS),
                  i,
                  COLOR.white,
                );
              continue;
            }
            const f = flown.get(i)!;
            if (ms >= f.arrives) continue;
            if (ms < f.departs) {
              bit.x = p.x;
              bit.y = p.y;
            } else {
              bezier(
                f.from,
                f.bend,
                f.to,
                easeIn(clamp01((ms - f.departs) / flyMs)),
                bit,
              );
            }
            const pop = 1 + 0.6 * Math.max(0, 1 - since / 200);
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              cell * PRIME * pop,
              i * 0.7 + ms * 0.003,
              ms >= doneAt ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          drawWispBetween(ctx, counterAt, ms, now, COUNTER, 0.5, 0, doneAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
