// the "Wildfire" event (experiment: the forest-fire model; levels): it
// covers its crit, whose click freezes the screen while a forest of gold
// glimmer trees sprouts across the whole screen; a bolt of lightning cracks
// down onto the tree nearest the clicked floor's bar and it bursts into
// white flame, and the fire spreads tree to tree, every step a crackle and
// a jolt, racing out as a ragged front and leaving burnt-out gaps behind;
// wherever the front sweeps over an income bar it lands free levels on it
// in a flash, and as the last trees flare the clicked floor's bar slams in
// a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "wildfire";
const COLS = 9;
// share of cells that hold a tree (well over the 0.59 that lets fire cross)
const DENSITY = 0.75;
const MARGIN = 60;
const TREE = 0.32;
const FLAME = 0.7;
const BURN_GENS = 2;
const STRIKE_MS = 220;
const SOUND_GAP_MS = 80;
const STEP_SHAKE: [number, number] = [0.15, 0.5];
const BAR_SHAKE = 0.8;

export const forceWildfireEvent = registerWispEvent(
  KEY,
  "Wildfire",
  () => CONFIG.wildfireEvent.chance,
  (floor, context, area) => {
    const { growMs, stepMs, levelShare, holdMs, mergeMs } =
      CONFIG.wildfireEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const left = area.left + MARGIN;
    const top = area.top + MARGIN;
    const width = area.right - MARGIN - left;
    const cell = width / COLS;
    const rows = Math.max(4, Math.floor((area.bottom - MARGIN - top) / cell));
    const n = COLS * rows;
    const cellAt = (i: number): Point => ({
      x: left + ((i % COLS) + 0.5) * cell,
      y: top + (Math.floor(i / COLS) + 0.5) * cell,
    });
    const spots = Array.from({ length: n }, (_, i) => cellAt(i));
    const tree = Array.from({ length: n }, () => Math.random() < DENSITY);
    // lightning strikes the tree nearest the clicked bar
    let start = 0;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(
        spots[i].x - bar.center.x,
        spots[i].y - bar.center.y,
      );
      if (d < best) {
        best = d;
        start = i;
      }
    }
    tree[start] = true;
    // the fire spreads to every neighbouring tree a generation at a time
    const gen = new Int16Array(n).fill(-1);
    gen[start] = 0;
    let front = [start];
    let gens = 0;
    while (front.length > 0) {
      const next: number[] = [];
      for (const i of front) {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        for (const [dc, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const cc = c + dc;
          const rr = r + dr;
          if (cc < 0 || cc >= COLS || rr < 0 || rr >= rows) continue;
          const j = rr * COLS + cc;
          if (!tree[j] || gen[j] >= 0) continue;
          gen[j] = gens + 1;
          next.push(j);
        }
      }
      if (next.length > 0) gens++;
      front = next;
    }
    const strikeAt = growMs;
    // each generation catches a little quicker than the last
    const genAt: number[] = [strikeAt + STRIKE_MS * 0.5];
    for (let g = 1; g <= gens + BURN_GENS; g++)
      genAt.push(genAt[g - 1] + lerp(stepMs, g / Math.max(1, gens)));
    const endAt = genAt[gens + BURN_GENS];
    // the front's first touch of each bar's band lands its levels
    const hits: { bar: RewardBar; ms: number; at: Point }[] = [];
    for (const b of bars) {
      let first = -1;
      for (let i = 0; i < n; i++) {
        if (gen[i] < 0) continue;
        if (Math.abs(spots[i].y - b.center.y) > cell * 0.75) continue;
        if (spots[i].x < b.box.x || spots[i].x > b.box.x + b.box.width)
          continue;
        if (first < 0 || gen[i] < gen[first]) first = i;
      }
      if (first >= 0)
        hits.push({ bar: b, ms: genAt[gen[first]], at: spots[first] });
    }
    const bolt = createBolt(
      { x: spots[start].x + 120, y: area.top - 100 },
      spots[start],
      2,
    );
    let soundAt = -Infinity;

    const striking = createBeats(
      [strikeAt],
      (ms) => ms,
      () => {
        cover!.burst(spots[start], 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.1);
      },
    );
    const spreading = createBeats(
      genAt.slice(1, gens + 1),
      (ms) => ms,
      (_, g, now) => {
        if (!cover!.isLive()) return;
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
        shakeScreen(lerp(STEP_SHAKE, g / Math.max(1, gens - 1)));
      },
    );
    const burning = createBeats(
      hits,
      (h) => h.ms,
      (h) => {
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 1), h.at);
        if (!cover!.isLive()) return;
        shakeScreen(BAR_SHAKE);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare * 2, 2), bar.center);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          striking.tick(ms, now);
          spreading.tick(ms, now);
          burning.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          const grow = easeOut(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - endAt) / 300);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < n; i++) {
            if (!tree[i]) continue;
            const g = gen[i];
            const p = spots[i];
            // still standing: a small gold tree
            if (g < 0 || ms < genAt[g]) {
              stampGlimmer(
                ctx,
                p.x,
                p.y,
                cell * TREE * grow * fade,
                i * 1.7 + ms * 0.002,
                COLOR.heavenlyGold,
              );
              continue;
            }
            // ablaze for BURN_GENS steps, flaring then dying to nothing
            const burnt = (ms - genAt[g]) / (genAt[g + BURN_GENS] - genAt[g]);
            if (burnt >= 1) continue;
            const flare =
              burnt < 0.25 ? burnt / 0.25 : 1 - (burnt - 0.25) / 0.75;
            stampGlimmer(
              ctx,
              p.x,
              p.y - cell * 0.15 * burnt,
              cell * FLAME * flare,
              i + ms * 0.01,
              COLOR.white,
            );
          }
          ctx.restore();
          const since = ms - strikeAt;
          if (since >= 0 && since < STRIKE_MS) {
            const alpha = 1 - since / STRIKE_MS;
            drawBolt(ctx, bolt, alpha, 1.3);
            drawStrike(ctx, spots[start], alpha, 1.3, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
