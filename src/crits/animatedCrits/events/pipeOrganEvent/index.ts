// the "Pipe Organ" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while cash surges up out of the bottom of
// it into a row of tall organ pipes, tallest in the middle; an organist
// wisp hops along their tops and strikes chord after chord, every pipe it
// plays shooting a blast of cash up out of its top, each chord a boom and
// a jolt that jumps an income bar a crit tier, ever faster; the final
// chord plays every pipe at once and the whole organ roars up into the
// total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "pipeOrgan";
const REWARD = 2;
const MAX_BARS = 3;
const PIPES = 7;
const PER_PIPE = 80;
const COIN = 0.42;
// pipes stand on the bottom, RANGE of the screen's height tall, PIPE px
// wide; a struck pipe blasts its top BLAST px up over BLAST_MS
const RANGE: [number, number] = [0.2, 0.45];
const PIPE = 16;
const BLAST = 90;
const BLAST_MS = 260;
const CHORD = 3;
const ORGANIST = 0.55;
const SURGE_SPREAD = 260;
const CHORD_SHAKE: [number, number] = [0.8, 1.5];

export const forcePipeOrganEvent = registerWispEvent(
  KEY,
  "Pipe Organ",
  () => CONFIG.pipeOrganEvent.chance,
  (floor, context, area) => {
    const { riseMs, chordsMs, flightMs, holdMs, mergeMs } =
      CONFIG.pipeOrganEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const fallback = totalSpot(area);
    const h = area.bottom - area.top;
    const pipes = Array.from({ length: PIPES }, (_, i) => {
      const middle = 1 - Math.abs(i - (PIPES - 1) / 2) / ((PIPES - 1) / 2);
      return {
        x: lerp([area.left, area.right], (i + 0.5) / PIPES),
        tall: h * lerp(RANGE, middle),
      };
    });
    let clock: number = riseMs;
    const chords = bars.map((bar, k) => {
      const at = clock;
      clock += lerp(chordsMs, k / Math.max(1, bars.length - 1));
      const first = Math.floor(Math.random() * (PIPES - CHORD + 1));
      return {
        bar,
        at,
        keys: Array.from({ length: CHORD }, (_, j) => first + j),
      };
    });
    const finalAt = clock;
    const allKeys = pipes.map((_, i) => i);
    const strikes = [...chords, { bar: null, at: finalAt, keys: allKeys }];
    const endAt = finalAt + SURGE_SPREAD + flightMs;
    // how hard pipe i is blasting at ms
    const playedAt = pipes.map((_, i) =>
      strikes.filter((s) => s.keys.includes(i)).map((s) => s.at),
    );
    const blastOf = (i: number, ms: number) => {
      let b = 0;
      for (const at of playedAt[i]) {
        const u = (ms - at) / BLAST_MS;
        if (u >= 0 && u < 1) b = Math.max(b, Math.sin(Math.PI * u));
      }
      return b;
    };

    const paths: CoinPath[] = [];
    pipes.forEach((pipe, i) => {
      for (let j = 0; j < PER_PIPE; j++) {
        const up = j / (PER_PIPE - 1);
        const x = pipe.x + (Math.random() - 0.5) * PIPE;
        const risen = riseMs * up * 0.8;
        const leaves = finalAt + up * SURGE_SPREAD;
        const from: Point = { x, y: 0 };
        const lift: Point = { x, y: 0 };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < risen) return { x, y: area.bottom, scale: 0 };
          const grow = easeOut(clamp01((ms - risen) / (riseMs * 0.2)));
          // the top of a played pipe shoots up
          const y =
            area.bottom -
            pipe.tall * up * grow -
            blastOf(i, ms) * BLAST * up * up;
          if (ms < leaves) return { x, y, scale: COIN };
          from.y = area.bottom - pipe.tall * up;
          lift.y = from.y - 120;
          const total = cover?.total() ?? fallback;
          bezier(
            from,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    });
    const organistAt: Point = { x: 0, y: 0 };
    const organist = (ms: number): Point | null => {
      if (ms > finalAt + 200) return null;
      let from = pipes[(PIPES - 1) >> 1];
      let leaves = 0;
      for (const s of strikes) {
        const key = pipes[s.keys[(s.keys.length - 1) >> 1]];
        if (ms < s.at) {
          const u = smoothstep(clamp01((ms - leaves) / (s.at - leaves)));
          organistAt.x = lerp([from.x, key.x], u);
          organistAt.y =
            area.bottom -
            lerp([from.tall, key.tall], u) -
            30 -
            Math.sin(Math.PI * u) * 60;
          return organistAt;
        }
        from = key;
        leaves = s.at;
      }
      organistAt.x = from.x;
      organistAt.y = area.bottom - from.tall - 30;
      return organistAt;
    };

    const playing = createBeats(
      strikes,
      (s) => s.at,
      (s, k) => {
        if (!s.bar) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast({
            x: pipes[(PIPES - 1) >> 1].x,
            y: area.bottom - h * RANGE[1],
          });
          return;
        }
        cover!.tierUp(s.bar, { x: pipes[s.keys[1]].x, y: area.bottom });
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CHORD_SHAKE, k / Math.max(1, chords.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.burst(cover!.total() ?? fallback, 0.8),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          playing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            organist,
            ms,
            now,
            WISP_SIZE * ORGANIST,
            0.8,
            0,
            finalAt + 200,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
