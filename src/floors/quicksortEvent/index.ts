// the "Quicksort" event (experiment: a sorting algorithm sorting gold
// columns; cash): it covers its crit, whose click freezes the screen and dims
// it under a row of blazing gold columns of jumbled heights; quicksort sets
// to work on them, pairs of columns flashing and swapping places, faster and
// faster, every pivot that lands in its place a jolt, until the row stands
// in a perfect staircase; then a river of cash cascades down the staircase
// and up into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "quicksort";
const REWARD = 4;
const COLUMNS = 20;
const LOW = 90;
const TALL: [number, number] = [60, 520];
const COLUMN_W = 16;
const VEIL = "rgba(0,0,0,0.55)";
const RISE_MS = 220;
const FLARE_MS = 160;
const TICK_GAP_MS = 55;
const PIVOT_SHAKE: [number, number] = [0.3, 0.9];
const DONE_SHAKE = 1.6;

interface Swap {
  a: number;
  b: number;
  ms: number;
}

export const forceQuicksortEvent = registerWispEvent(
  KEY,
  "Quicksort",
  () => CONFIG.quicksortEvent.chance,
  (floor, context, area) => {
    const { swapsMs, holdMs, mergeMs } = CONFIG.quicksortEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const base = area.bottom - LOW;
    const gap = width / (COLUMNS + 1);
    const heights = Array.from({ length: COLUMNS }, (_, i) =>
      lerp(TALL, i / (COLUMNS - 1)),
    );
    for (let i = COLUMNS - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [heights[i], heights[j]] = [heights[j], heights[i]];
    }
    // the swaps quicksort (Lomuto) makes, and each pivot's landing
    const order = heights.slice();
    const moves: { a: number; b: number; pivot: boolean }[] = [];
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const pivot = order[hi];
      let i = lo;
      for (let j = lo; j < hi; j++)
        if (order[j] < pivot) {
          if (i !== j) {
            [order[i], order[j]] = [order[j], order[i]];
            moves.push({ a: i, b: j, pivot: false });
          }
          i++;
        }
      [order[i], order[hi]] = [order[hi], order[i]];
      moves.push({ a: i, b: hi, pivot: true });
      sort(lo, i - 1);
      sort(i + 1, hi);
    };
    sort(0, COLUMNS - 1);
    let clock = RISE_MS;
    const swaps: Swap[] = moves.map((m, k) => {
      clock += lerp(swapsMs, k / Math.max(1, moves.length - 1));
      return { a: m.a, b: m.b, ms: clock };
    });
    const pivots = swaps.filter((_, k) => moves[k].pivot);
    const sortedAt = clock + lerp(swapsMs, 1);
    // which column stands in each slot after every swap
    const slotOf: Int16Array[] = [];
    const slots = Int16Array.from({ length: COLUMNS }, (_, i) => i);
    slotOf.push(slots.slice());
    for (const s of swaps) {
      [slots[s.a], slots[s.b]] = [slots[s.b], slots[s.a]];
      slotOf.push(slots.slice());
    }
    const xOf = (slot: number) => left + gap * (slot + 1);
    const total = totalSpot(area);
    // down the staircase from its top, then up into the total
    const stairs = sampleLine((u) => {
      const s = u * (COLUMNS - 1);
      const i = Math.floor(s);
      const hTop = lerp(TALL, 1 - Math.min(1, s / (COLUMNS - 1)));
      return u < 1
        ? { x: xOf(COLUMNS - 1 - i) - (s - i) * gap, y: base - hTop - 12 }
        : { x: xOf(0), y: base - TALL[0] - 12 };
    }, 40);
    const climb = sampleLine(
      (u) => ({
        x: lerp([xOf(0), total.x], u),
        y:
          lerp([base - TALL[0] - 12, total.y], u * u) -
          Math.sin(Math.PI * u) * 80,
      }),
      20,
    );
    const river = [...stairs, ...climb];
    const pour: Pour = {
      coinsAlong: 220,
      width: 34,
      streamMs: 420,
      travelMs: 900,
    };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };

    let ticked = -Infinity;
    const swapping = createBeats(
      swaps,
      (s) => s.ms,
      (s) => {
        if (s.ms - ticked < TICK_GAP_MS || !cover!.isLive()) return;
        ticked = s.ms;
        playBloop();
      },
    );
    const pivoting = createBeats(
      pivots,
      (s) => s.ms,
      (_, k) => {
        if (cover!.isLive())
          shakeScreen(lerp(PIVOT_SHAKE, k / Math.max(1, pivots.length - 1)));
      },
    );
    const sorted = createBeats(
      [sortedAt],
      (ms) => ms,
      () => {
        pourLine(cover!, river, pour);
        cover!.blast(cover!.total() ?? total);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(DONE_SHAKE);
      },
    );
    const endAt = sortedAt + 500;

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt, pourDurationMs(sortedAt, pour)) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          swapping.tick(ms, now);
          pivoting.tick(ms, now);
          sorted.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms < 0 || ms >= endAt) return;
          const fade = 1 - clamp01((ms - sortedAt) / 500);
          ctx.globalAlpha = fade * clamp01(ms / 150);
          ctx.fillStyle = VEIL;
          ctx.fillRect(left, top, width, height);
          ctx.globalAlpha = 1;
          let k = 0;
          while (k < swaps.length && ms >= swaps[k].ms) k++;
          const now0 = slotOf[k];
          // the swap under way slides its two columns past each other
          const moving = k < swaps.length ? swaps[k] : null;
          const prevMs = k === 0 ? RISE_MS : swaps[k - 1].ms;
          const u = moving
            ? smoothstep(clamp01((ms - prevMs) / (moving.ms - prevMs)))
            : 0;
          const rise = easeOut(clamp01(ms / RISE_MS));
          for (let slot = 0; slot < COLUMNS; slot++) {
            const column = now0[slot];
            let x = xOf(slot);
            if (moving && (slot === moving.a || slot === moving.b))
              x = lerp([x, xOf(slot === moving.a ? moving.b : moving.a)], u);
            from.x = to.x = x;
            from.y = base;
            to.y = base - heights[column] * rise;
            drawBeam(ctx, from, to, COLUMN_W, fade);
          }
          for (let j = Math.max(0, k - 3); j < k; j++) {
            const t = (ms - swaps[j].ms) / FLARE_MS;
            if (t < 0 || t >= 1) continue;
            to.x = xOf(swaps[j].a);
            to.y = base;
            drawBeamFlare(ctx, to, 18, (1 - t) * fade, now);
            to.x = xOf(swaps[j].b);
            drawBeamFlare(ctx, to, 18, (1 - t) * fade, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
