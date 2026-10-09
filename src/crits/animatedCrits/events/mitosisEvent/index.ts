// the "Mitosis" event: it covers its crit, whose click freezes the screen
// while the wisp shoots up out of the clicked floor's button and splits in
// two with a pop, the halves veering apart and bouncing off the screen's
// edges; every wisp splits again, ever faster and hotter, 1 → 2 → 4 → … → 32,
// each split a flash, a pop, a jolt and a coin; then the whole swarm blows at
// once in a blinding flash, a bang and a huge shake, spraying coins that merge
// into the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp } from "../../../../shared/easing";

const KEY = "mitosis";
const REWARD = 4;
// the wisps bounce off this far inside the screen's edges
const MARGIN = 40;
// each generation's speed (px per ms on a 700px-tall screen); each is smaller
const SPEED = [1.3, 1.5, 1.7, 1.9, 2.1, 2.3];
const SHRINK = 0.88;
// the first flies up within this of straight up (rad); halves veer apart by
const LAUNCH_SPREAD = 0.5;
const SPLIT_TURN: [number, number] = [0.35, 0.75];
const SPLIT_SKEW = 0.15;
// each split: a small burst, a jolt growing per generation, a coin
const SPLIT_BURST = 0.12;
const SPLIT_BURST_MS = 260;
const SPLIT_SHAKE: [number, number] = [0.25, 0.7];
const SPLIT_COIN_REACH = 90;
// the swarm blowing at once
const POP_BURST = 0.3;
const POP_BURST_MS = 420;
const POP_SHAKE = 2.8;
const POP_COINS = 2;
const POP_COIN_REACH: [number, number] = [40, 180];
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

// p bounced back and forth between lo and hi
function fold(p: number, lo: number, hi: number): number {
  const span = hi - lo;
  const t = (((p - lo) % (2 * span)) + 2 * span) % (2 * span);
  return lo + (t <= span ? t : 2 * span - t);
}

interface Wisp {
  gen: number;
  born: number;
  dies: number;
  from: Point;
  v: Point;
  end: Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.mitosisEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const { genMs, holdMs, mergeMs } = CONFIG.mitosisEvent;
      const last = genMs.length - 1;
      // when each generation splits (the last: blows)
      const ends: number[] = [];
      genMs.reduce((at, ms) => {
        ends.push(at + ms);
        return at + ms;
      }, 0);
      const startedAt = performance.now();
      const wisps: Wisp[] = [];
      let splits = 0;
      const splitAt: number[] = [];
      let poppedAt: number | null = null;

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: ends[last] + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect || !cover) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (splits < last && ms >= ends[splits]) split(splits++, now);
            if (poppedAt === null && ms >= ends[last]) pop(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            splitAt.forEach((at, gen) => {
              const t = (now - at) / SPLIT_BURST_MS;
              if (t >= 1) return;
              for (const w of wisps)
                if (w.gen === gen)
                  drawWhiteBurst(ctx, w.end.x, w.end.y, t, SPLIT_BURST);
            });
            if (poppedAt !== null) {
              const since = now - poppedAt;
              for (const w of wisps)
                if (w.gen === last)
                  drawWhiteBurst(
                    ctx,
                    w.end.x,
                    w.end.y,
                    since / POP_BURST_MS,
                    POP_BURST,
                  );
              const flash = 1 - since / FLASH_MS;
              if (flash > 0) {
                const { area } = cover;
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = FLASH_ALPHA * flash;
                ctx.fillStyle = COLOR.white;
                ctx.fillRect(
                  area.left,
                  area.top,
                  area.right - area.left,
                  area.bottom - area.top,
                );
              }
            }
            ctx.restore();
          },
          // the swarm over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const w of wisps) {
              if (ms < w.born || ms > w.dies + WISP_TRAIL_MS) continue;
              drawWisp(
                ctx,
                (t) => (t >= w.born && t < w.dies ? posOf(w, t) : null),
                ms,
                now,
                WISP_SIZE * SHRINK ** w.gen,
                w.gen / last,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area } = cover;
      const lo = { x: area.left + MARGIN, y: area.top + MARGIN };
      const hi = { x: area.right - MARGIN, y: area.bottom - MARGIN };
      const scale = (area.bottom - area.top) / 700;

      function posOf(w: Wisp, t: number): Point {
        return {
          x: fold(w.from.x + w.v.x * (t - w.born), lo.x, hi.x),
          y: fold(w.from.y + w.v.y * (t - w.born), lo.y, hi.y),
        };
      }
      // a wisp and, splitting off where it ends, all its descendants
      function spawn(gen: number, born: number, from: Point, heading: number) {
        const speed = SPEED[Math.min(gen, SPEED.length - 1)] * scale;
        const w: Wisp = {
          gen,
          born,
          dies: ends[gen],
          from,
          v: { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed },
          end: from,
        };
        w.end = posOf(w, w.dies);
        wisps.push(w);
        if (gen === last) return;
        const before = posOf(w, w.dies - 1);
        const ahead = Math.atan2(w.end.y - before.y, w.end.x - before.x);
        const turn = lerp(SPLIT_TURN, Math.random());
        const skew = (Math.random() * 2 - 1) * SPLIT_SKEW;
        spawn(gen + 1, w.dies, w.end, ahead - turn + skew);
        spawn(gen + 1, w.dies, w.end, ahead + turn + skew);
      }
      const start = {
        x: Math.min(hi.x, Math.max(lo.x, cover.button.x)),
        y: Math.min(hi.y, Math.max(lo.y, cover.button.y)),
      };
      spawn(
        0,
        0,
        start,
        -Math.PI / 2 + (Math.random() * 2 - 1) * LAUNCH_SPREAD,
      );

      // on the frame generation gen splits: a pop, a jolt, a coin per split
      function split(gen: number, now: number): void {
        splitAt[gen] = now;
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPLIT_SHAKE, gen / Math.max(1, last - 1)));
        for (const w of wisps) {
          if (w.gen !== gen) continue;
          const angle = Math.random() * Math.PI * 2;
          const r = SPLIT_COIN_REACH * Math.sqrt(Math.random());
          cover.launchFrom(w.end, [
            {
              x: w.end.x + Math.cos(angle) * r,
              y: w.end.y + Math.sin(angle) * r,
            },
          ]);
        }
      }
      // on the frame the whole swarm blows: coins spray out of every wisp
      function pop(now: number): void {
        poppedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(POP_SHAKE);
        for (const w of wisps) {
          if (w.gen !== last) continue;
          cover.launchFrom(
            w.end,
            Array.from({ length: POP_COINS }, () => {
              const angle = Math.random() * Math.PI * 2;
              const r = lerp(POP_COIN_REACH, Math.random());
              return {
                x: w.end.x + Math.cos(angle) * r,
                y: w.end.y + Math.sin(angle) * r,
              };
            }),
          );
        }
      }
    },
  },
  { label: "Mitosis", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Mitosis
export function forceMitosisEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
