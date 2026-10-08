// the "Lawnmower" event (mix; cash): it covers its crit, whose click freezes
// the screen while a wisp mows back and forth across the screen in stripes,
// top to bottom, ever faster, leaving a thick carpet of cash in every
// stripe behind it, each turn at the edge a whoosh and a jolt; when the
// whole screen is laid it dives into the total and the carpet is raked up
// after it, stripe by stripe, in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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

const KEY = "lawnmower";
const REWARD = 4;
const STRIPES = 5;
const STRIPE_COINS = 280;
const COIN = 0.55;
// the mower runs INSET px in from the screen's sides; each coin pops up over
// POP_MS just behind it
const INSET = 40;
const POP_MS = 80;
const RAKE_SPREAD = 320;
const LIFT = 70;
const TURN_SHAKE: [number, number] = [0.5, 1.2];

export const forceLawnmowerEvent = registerWispEvent(
  KEY,
  "Lawnmower",
  () => CONFIG.lawnmowerEvent.chance,
  (floor, context, area) => {
    const { stripesMs, turnMs, diveMs, flightMs, holdMs, mergeMs } =
      CONFIG.lawnmowerEvent;
    const fallback = totalSpot(area);
    const left = area.left + INSET;
    const right = area.right - INSET;
    const band = (area.bottom - area.top - 80) / STRIPES;
    let clock = 0;
    const stripes = Array.from({ length: STRIPES }, (_, k) => {
      const rightward = k % 2 === 0;
      const y = area.top + 40 + band * (k + 0.5);
      const starts = clock;
      const span = lerp(stripesMs, k / (STRIPES - 1));
      clock = starts + span + turnMs;
      return {
        y,
        from: rightward ? left : right,
        to: rightward ? right : left,
        starts,
        ends: starts + span,
        span,
      };
    });
    const mowEnd = stripes[STRIPES - 1].ends;
    const endAt = mowEnd + diveMs + RAKE_SPREAD + flightMs;
    const mowerAt: Point = { x: 0, y: 0 };
    const mower = (ms: number): Point | null => {
      if (ms < 0 || ms > mowEnd + diveMs) return null;
      if (ms > mowEnd) {
        const last = stripes[STRIPES - 1];
        const total = cover?.total() ?? fallback;
        const u = easeIn((ms - mowEnd) / diveMs);
        mowerAt.x = lerp([last.to, total.x], u);
        mowerAt.y = lerp([last.y, total.y], u);
        return mowerAt;
      }
      let k = 0;
      while (k < STRIPES - 1 && ms > stripes[k].ends) k++;
      const s = stripes[k];
      if (ms < s.starts) {
        // turning down into the next stripe
        const prev = stripes[k - 1];
        const u = smoothstep((ms - prev.ends) / turnMs);
        mowerAt.x = prev.to;
        mowerAt.y = lerp([prev.y, s.y], u);
        return mowerAt;
      }
      mowerAt.x = lerp([s.from, s.to], (ms - s.starts) / s.span);
      mowerAt.y = s.y;
      return mowerAt;
    };

    const paths: CoinPath[] = stripes.flatMap((s, k) =>
      Array.from({ length: STRIPE_COINS }, () => {
        const x = left + Math.random() * (right - left);
        const rest: Point = {
          x,
          y: s.y + (Math.random() - 0.5) * band * 0.9,
        };
        const laid =
          s.starts + (Math.abs(x - s.from) / (right - left)) * s.span;
        const raked =
          mowEnd + diveMs + (k / STRIPES) * RAKE_SPREAD + Math.random() * 60;
        const lift: Point = { x: rest.x, y: rest.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        return (f) => {
          const ms = f * endAt;
          if (ms < laid) return { x: rest.x, y: rest.y, scale: 0 };
          if (ms < raked)
            return {
              x: rest.x,
              y: rest.y,
              scale: COIN * easeOut(clamp01((ms - laid) / POP_MS)),
            };
          const total = cover?.total() ?? fallback;
          bezier(
            rest,
            lift,
            total,
            easeIn(clamp01((ms - raked) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        };
      }),
    );

    const turning = createBeats(
      stripes.slice(0, -1),
      (s) => s.ends,
      (s, k) => {
        cover!.burst({ x: s.to, y: s.y }, 0.35);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(TURN_SHAKE, k / (STRIPES - 2)));
      },
    );
    const raking = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          raking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            mower,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / mowEnd),
            0,
            mowEnd + diveMs,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
