// the "Ninja" event (an experiment beyond the seven looks: a fruit-slicing
// game; cash): it covers its crit, whose click freezes the screen while
// wisps are tossed up from the bottom of the screen in high arcs, a few at a
// time, and at the top of each throw a blade of light slashes through it
// with a swish: it splits in two halves that fly apart and bursts into a
// spray of coins with a pop and a jolt; the throws come ever faster, the
// last a huge one sliced in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "ninja";
const REWARD = 4;
const TOSSES = 12;
const EDGE = 60;
// each throw peaks PEAK of the way up the screen; it's cut CUT of the way
// through its flight, near the top
const PEAK: [number, number] = [0.35, 0.65];
const CUT = 0.5;
const SLASH = 280;
const SLASH_W = 10;
const SLASH_MS = 140;
const HALF_MS = 280;
const HALF_SPREAD = 70;
const FRUIT = 0.45;
const BIG = 0.8;
const HALF = 0.25;
const COINS = 12;
const COIN_REACH: [number, number] = [30, 130];
const CUT_SHAKE: [number, number] = [0.3, 1];

export const forceNinjaEvent = registerWispEvent(
  KEY,
  "Ninja",
  () => CONFIG.ninjaEvent.chance,
  (floor, context, area) => {
    const { tossesMs, flightMs, holdMs, mergeMs } = CONFIG.ninjaEvent;
    const height = area.bottom - area.top;
    let clock = 0;
    const fruits = Array.from({ length: TOSSES }, (_, k) => {
      const big = k === TOSSES - 1;
      const x0 =
        area.left + EDGE + Math.random() * (area.right - area.left - EDGE * 2);
      const drift = (Math.random() - 0.5) * 200;
      const peak =
        area.bottom - height * (big ? 0.6 : lerp(PEAK, Math.random()));
      const tossed = clock;
      clock += lerp(tossesMs, k / (TOSSES - 1));
      const cutAt = tossed + flightMs * CUT;
      // a throw from below the screen up to its peak and back
      const pos = (ms: number, into: Point): Point => {
        const u = (ms - tossed) / flightMs;
        into.x = x0 + drift * u;
        into.y = area.bottom + 30 - (area.bottom + 30 - peak) * 4 * u * (1 - u);
        return into;
      };
      const cut = pos(cutAt, { x: 0, y: 0 });
      const angle = Math.random() * Math.PI;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const at: Point = { x: 0, y: 0 };
      const halves = [-1, 1].map((side) => {
        const h: Point = { x: 0, y: 0 };
        return (ms: number): Point => {
          const t = clamp01((ms - cutAt) / HALF_MS);
          h.x = cut.x - dy * side * HALF_SPREAD * t;
          h.y = cut.y + dx * side * HALF_SPREAD * t + 120 * t * t;
          return h;
        };
      });
      return {
        big,
        tossed,
        cutAt,
        cut,
        from: {
          x: cut.x - (dx * SLASH) / 2,
          y: cut.y - (dy * SLASH) / 2,
        } as Point,
        to: {
          x: cut.x + (dx * SLASH) / 2,
          y: cut.y + (dy * SLASH) / 2,
        } as Point,
        at: (ms: number): Point => pos(ms, at),
        halves,
      };
    });
    const last = fruits[TOSSES - 1];
    const endAt = last.cutAt;

    const slicing = createBeats(
      fruits,
      (f) => f.cutAt,
      (f, k) => {
        if (f.big) {
          cover!.blast(f.cut);
          return;
        }
        cover!.launchFrom(f.cut, ringTargets(f.cut, COINS, COIN_REACH));
        cover!.burst(f.cut, 0.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(CUT_SHAKE, k / (TOSSES - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => slicing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + HALF_MS) return;
          for (const f of fruits) {
            const size = WISP_SIZE * (f.big ? BIG : FRUIT);
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              size,
              f.big ? 1 : 0.5,
              f.tossed,
              f.cutAt,
            );
            for (const h of f.halves)
              drawWispBetween(
                ctx,
                h,
                ms,
                now,
                WISP_SIZE * HALF,
                0.5,
                f.cutAt,
                f.cutAt + HALF_MS,
              );
            const s = (ms - f.cutAt + SLASH_MS / 2) / SLASH_MS;
            if (s >= 0 && s < 1)
              drawBeam(ctx, f.from, f.to, SLASH_W * (1 - s), 1 - s);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
