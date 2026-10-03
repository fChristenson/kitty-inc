// the "Fountain Pen" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a nib wisp flies out of the clicked
// floor's button and signs its name across the screen in flowing cursive
// ink of cash; it stabs the full stop down onto an income bar with a bang
// and a jolt, the bar jumping a crit tier; then it slashes a cross-stroke
// onto the next bar and dots an i onto the last, each stroke faster, the
// final dot landing in a huge blast and shake as the ink sweeps into the
// total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pointAlong,
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../cashFlow";
import { findRewardBars } from "../eventRewards";

const KEY = "fountainPen";
const REWARD = 2;
const MAX_BARS = 3;
const EDGE = 90;
const TOP = 260;
// the signature: LOOPS cursive loops LOOP px tall
const LOOPS = 5;
const LOOP = 70;
const STEPS = 140;
const STAB_MS = 110;
const NIB = 0.4;
const STAB_SHAKE: [number, number] = [0.9, 1.5];

export const forceFountainPenEvent = registerWispEvent(
  KEY,
  "Fountain Pen",
  () => CONFIG.fountainPenEvent.chance,
  (floor, context, area) => {
    const { signMs, strokesMs, holdMs, mergeMs } = CONFIG.fountainPenEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const baseline = area.top + TOP;
    // a run of cursive loops from the button's side across the screen
    const ltr = button.x < (left + right) / 2;
    const signature = sampleLine((u) => {
      const a = u * Math.PI * 2 * LOOPS;
      return {
        x:
          lerp([ltr ? left : right, ltr ? right : left], u) -
          (ltr ? 1 : -1) * Math.sin(a) * LOOP * 0.45,
        y: baseline - (1 - Math.cos(a)) * LOOP * 0.5,
      };
    }, STEPS);
    const sign: Pour = {
      coinsAlong: 640,
      width: 18,
      streamMs: signMs * 0.8,
      travelMs: signMs,
    };
    const stroke = (from: Point, to: Point) =>
      sampleLine(
        (u) => ({ x: lerp([from.x, to.x], u), y: lerp([from.y, to.y], u) }),
        20,
      );
    let clock: number = signMs;
    let from = signature[signature.length - 1];
    const stabs = bars.map((bar, k) => {
      const ms = lerp(strokesMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      const lands = starts + ms;
      clock = lands;
      const line = stroke(from, bar.center);
      const stab = {
        bar,
        from,
        line,
        pour: {
          coinsAlong: 420,
          width: 16,
          streamMs: ms * 0.6,
          travelMs: ms,
        } as Pour,
        starts,
        lands,
      };
      from = { x: bar.center.x, y: bar.center.y - 160 };
      return stab;
    });
    const last = stabs[stabs.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      endAt + holdMs + mergeMs,
    );
    const signAlong = measure(signature);
    const nibAt: Point = { x: 0, y: 0 };
    const nib = (ms: number): Point => {
      if (ms < signMs)
        return pointAlong(signature, signAlong, ms / signMs, nibAt);
      let s = stabs[0];
      for (const stab of stabs) if (ms >= stab.starts - STAB_MS) s = stab;
      if (ms < s.starts) {
        // lifting the pen to the next stroke
        const prev = stabs[stabs.indexOf(s) - 1];
        const u = clamp01((ms - (s.starts - STAB_MS)) / STAB_MS);
        const p = prev ? prev.bar.center : s.from;
        nibAt.x = lerp([p.x, s.from.x], u);
        nibAt.y = lerp([p.y, s.from.y], u);
        return nibAt;
      }
      const u = easeIn(clamp01((ms - s.starts) / (s.lands - s.starts)));
      nibAt.x = lerp([s.from.x, s.bar.center.x], u);
      nibAt.y = lerp([s.from.y, s.bar.center.y], u);
      return nibAt;
    };

    const signing = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, signature, sign),
    );
    const stroking = createBeats(
      stabs,
      (s) => s.starts,
      (s) => {
        pourLine(cover!, s.line, s.pour);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const stabbing = createBeats(
      stabs,
      (s) => s.lands,
      (s, k) => {
        cover!.tierUp(s.bar, s.from);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STAB_SHAKE, k / Math.max(1, stabs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          signing.tick(ms, now);
          stroking.tick(ms, now);
          stabbing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(ctx, nib, ms, now, WISP_SIZE * NIB, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
