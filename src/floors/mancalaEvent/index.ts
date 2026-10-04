// the "Mancala" event (experiment: a game of mancala playing itself; cash):
// it covers its crit, whose click freezes the screen and dims it while a
// mancala board of glowing pits appears, four gold seeds in each; move
// after move, quicker and quicker, a pit's seeds are scooped up and sown
// one by one round the board, hopping pit to pit, captures sweeping whole
// pits into a store with a jolt; then every seed left on the board streams
// into gold's store, which bursts into cash in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../shared/glowSprite";

const KEY = "mancala";
const REWARD = 4;
const PITS = 6;
const SEEDS = 4;
// pits 0-5 gold's row, 6 gold's store, 7-12 the other row, 13 its store
const GOLD_STORE = PITS;
const OTHER_STORE = PITS * 2 + 1;
const HOLES = PITS * 2 + 2;
const MOVES = 10;
const HOP = 60;
const START_MS = 200;
const SWEEP_MS = 380;
const VEIL = "rgba(0,0,0,0.6)";
const PIT = fadeStops(COLOR.heavenlyGold);
const SEED = fadeStops(COLOR.heavenlyGold, 0.5);
const SEED_R = 9;
const MOVE_SHAKE = 0.2;
const CAPTURE_SHAKE = 0.6;
const FINAL_SHAKE = 2.0;

interface Hop {
  seed: number;
  from: number;
  to: number;
  starts: number;
  ends: number;
}

export const forceMancalaEvent = registerWispEvent(
  KEY,
  "Mancala",
  () => CONFIG.mancalaEvent.chance,
  (floor, context, area) => {
    const { movesMs, holdMs, mergeMs } = CONFIG.mancalaEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cell = Math.min((width * 0.9) / (PITS + 2), 160);
    const mid: Point = {
      x: area.left + width / 2,
      y: area.top + height * 0.45,
    };
    // every hole's centre: gold's row along the bottom left to right, its
    // store on the right, the other row back along the top
    const holes: Point[] = Array.from({ length: HOLES }, (_, h) => {
      if (h < PITS)
        return {
          x: mid.x + (h - (PITS - 1) / 2) * cell,
          y: mid.y + cell * 0.55,
        };
      if (h === GOLD_STORE)
        return { x: mid.x + (PITS / 2 + 0.5) * cell, y: mid.y };
      if (h < OTHER_STORE)
        return {
          x: mid.x + (PITS - 1 - (h - PITS - 1) - (PITS - 1) / 2) * cell,
          y: mid.y - cell * 0.55,
        };
      return { x: mid.x - (PITS / 2 + 0.5) * cell, y: mid.y };
    });
    // the game played out at arm: gold sows the move that banks the most,
    // the other side at random
    const board: number[][] = Array.from({ length: HOLES }, () => []);
    let seedCount = 0;
    for (let h = 0; h < HOLES; h++)
      if (h !== GOLD_STORE && h !== OTHER_STORE)
        for (let s = 0; s < SEEDS; s++) board[h].push(seedCount++);
    const hops: Hop[] = [];
    const captures: number[] = [];
    let clock: number = START_MS;
    let gold = true;
    const own = (h: number, isGold: boolean) =>
      isGold ? h < PITS : h > PITS && h < OTHER_STORE;
    for (let m = 0; m < MOVES; m++) {
      const options: number[] = [];
      for (let h = 0; h < HOLES; h++)
        if (own(h, gold) && board[h].length) options.push(h);
      if (!options.length) break;
      // gold: the pit whose last seed lands nearest its store
      const pick: number = gold
        ? options.reduce((a, b) =>
            (b + board[b].length) % HOLES === GOLD_STORE ? b : a,
          )
        : options[Math.floor(Math.random() * options.length)];
      const skip = gold ? OTHER_STORE : GOLD_STORE;
      const hand = board[pick].splice(0);
      let at: number = pick;
      const hopMs = lerp([HOP, HOP * 0.45], m / (MOVES - 1));
      hand.forEach((seed, i) => {
        at = (at + 1) % HOLES;
        if (at === skip) at = (at + 1) % HOLES;
        board[at].push(seed);
        hops.push({
          seed,
          from: pick,
          to: at,
          starts: clock,
          ends: clock + (i + 1) * hopMs,
        });
      });
      clock += hand.length * hopMs;
      // landing in an empty pit of its own row captures the pit opposite
      const opposite = PITS * 2 - at;
      if (own(at, gold) && board[at].length === 1 && board[opposite]?.length) {
        const store = gold ? GOLD_STORE : OTHER_STORE;
        for (const seed of [
          ...board[at].splice(0),
          ...board[opposite].splice(0),
        ]) {
          board[store].push(seed);
          hops.push({
            seed,
            from: seed === hand[hand.length - 1] ? at : opposite,
            to: store,
            starts: clock,
            ends: clock + SWEEP_MS * 0.6,
          });
        }
        captures.push(clock + SWEEP_MS * 0.6);
        clock += SWEEP_MS * 0.6;
      }
      const extra = at === (gold ? GOLD_STORE : OTHER_STORE);
      if (!extra) gold = !gold;
      clock += lerp(movesMs, m / (MOVES - 1));
    }
    // everything left sweeps into gold's store
    const sweeps = clock;
    for (let h = 0; h < HOLES; h++) {
      if (h === GOLD_STORE) continue;
      for (const seed of board[h].splice(0)) {
        board[GOLD_STORE].push(seed);
        hops.push({
          seed,
          from: h,
          to: GOLD_STORE,
          starts: sweeps + Math.random() * 120,
          ends: sweeps + SWEEP_MS + Math.random() * 120,
        });
      }
    }
    const endAt = sweeps + SWEEP_MS + 160;
    const moves = [
      ...new Set(hops.filter((h) => h.ends > h.starts).map((h) => h.starts)),
    ].filter((ms) => ms < sweeps);
    // each seed's hops in time order, and a fixed scatter round its hole
    const bySeed: Hop[][] = Array.from({ length: seedCount }, () => []);
    for (const h of hops) bySeed[h.seed].push(h);
    const start: number[] = [];
    for (let h = 0; h < HOLES; h++)
      for (let s = 0; s < SEEDS; s++)
        if (h !== GOLD_STORE && h !== OTHER_STORE) start.push(h);
    const scatter = Array.from({ length: seedCount }, (_, i) => {
      const a = i * 2.39996;
      const r = cell * 0.18 * Math.sqrt((i % 7) / 7 + 0.15);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
    const store = holes[GOLD_STORE];

    const sowing = createBeats(
      moves,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(MOVE_SHAKE);
      },
    );
    const capturing = createBeats(
      captures,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CAPTURE_SHAKE);
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (let k = 0; k < board[GOLD_STORE].length; k++)
          cover!.launchFrom(
            store,
            clampTargetsY(
              ringTargets(store, 3, [40, 260]),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        cover!.blast(store);
        if (!cover!.isLive()) return;
        shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          sowing.tick(ms, now);
          capturing.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms > endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          const appear = easeOut(clamp01(ms / START_MS));
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(area.left, area.top, width, height);
          const prev = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.35 * fade * appear;
          for (let h = 0; h < HOLES; h++) {
            const isStore = h === GOLD_STORE || h === OTHER_STORE;
            drawGlow(
              ctx,
              PIT,
              holes[h].x,
              holes[h].y,
              cell * (isStore ? 0.55 : 0.42),
              isStore ? 1.6 : 1,
            );
          }
          ctx.globalAlpha = fade * appear;
          for (let s = 0; s < seedCount; s++) {
            // where it sits, or the arc it's hopping along
            let hole = start[s];
            let x = 0;
            let y = 0;
            let moving = false;
            for (const h of bySeed[s]) {
              if (ms < h.starts) break;
              if (ms < h.ends) {
                const u = (ms - h.starts) / (h.ends - h.starts);
                const a = holes[h.from];
                const b = holes[h.to];
                x = lerp([a.x, b.x], u);
                y = lerp([a.y, b.y], u) - Math.sin(Math.PI * u) * cell * 0.5;
                moving = true;
                break;
              }
              hole = h.to;
            }
            if (!moving) {
              const isStore = hole === GOLD_STORE || hole === OTHER_STORE;
              x = holes[hole].x + scatter[s].x * (isStore ? 1.4 : 1);
              y = holes[hole].y + scatter[s].y * (isStore ? 2.2 : 1);
            }
            drawGlow(ctx, SEED, x, y, SEED_R);
          }
          ctx.globalCompositeOperation = prev;
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
