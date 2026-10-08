// the "Bomb Bubbles" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while bubbles with lit bombs inside
// come wobbling up from below an income bar and bump up against it; once
// three cling to it they blow one after another along the bar, a chain of
// big blasts, and the bar erupts in a cluster of pops from end to end as
// it lands free levels; bar after bar, ever faster, every blast with its
// own bang and shake, the last bar going up round a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "bombBubbles";
const MAX_BARS = 4;
const BUBBLES = 3;
const POPS = 5;
const RISE = 240;
const WOBBLE = 24;
const UNDER = 18;
const CHAIN_MS = 90;
const BUBBLE = 0.42;
const FUSE = 13;
const BUBBLE_BLAST = 190;
const POP_BLAST = 110;
const FINALE_BLAST = 340;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombBubblesEvent = registerWispEvent(
  KEY,
  "Bomb Bubbles",
  () => CONFIG.bombBubblesEvent.chance,
  (floor, context) => {
    const { riseMs, barsMs, holdMs, mergeMs } = CONFIG.bombBubblesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const blasts: Blast[] = [];
    const bubbles: {
      at: (ms: number) => Point;
      leaves: number;
      blows: number;
    }[] = [];
    let clock = 0;
    const rows = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const arrives = clock + riseMs + (BUBBLES - 1) * 60;
      for (let i = 0; i < BUBBLES; i++) {
        const u = (i + 0.5) / BUBBLES;
        const top: Point = {
          x: bar.box.x + bar.box.width * (ltr ? u : 1 - u),
          y: bar.box.y + bar.box.height + UNDER,
        };
        const leaves = clock + i * 60;
        const blows = arrives + i * CHAIN_MS;
        blasts.push({
          at: top,
          ms: blows,
          size: BUBBLE_BLAST,
          shake: 0.7 + 0.15 * i,
        });
        const at: Point = { x: 0, y: 0 };
        bubbles.push({
          leaves,
          blows,
          at: (ms: number): Point => {
            const v = easeOut(clamp01((ms - leaves) / riseMs));
            at.x = top.x + Math.sin(ms / 90 + i * 2) * WOBBLE * (1 - v);
            at.y = lerp([top.y + RISE, top.y], v);
            return at;
          },
        });
      }
      const pops = arrives + BUBBLES * CHAIN_MS;
      for (let p = 0; p < POPS; p++)
        blasts.push({
          at: {
            x: bar.box.x + bar.box.width * ((p + 0.5) / POPS),
            y: bar.center.y,
          },
          ms: pops + p * 20,
          size: POP_BLAST,
          shake: 1,
        });
      clock += lerp(barsMs, k / Math.max(1, bars.length - 1));
      return { bar, pops };
    });
    const last = rows[rows.length - 1];
    const endAt = last.pops + POPS * 20;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const leveling = createBeats(
      rows,
      (r) => r.pops,
      (r) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor), r.bar.center);
        if (r !== last) return;
        for (const bar of bars) cover!.slam(bar);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(last.bar.center),
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
          booming.tick(ms, now);
          leveling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, last.bar.center, ms - endAt, FINALE_BLAST, now);
          for (const b of bubbles) {
            if (ms < b.leaves || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              (ms - b.leaves) / (b.blows - b.leaves),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BUBBLE,
              0.3,
              b.leaves,
              b.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
