// the "Barred Spiral" event (galaxy; levels): it covers its crit, whose
// click freezes the screen while a barred spiral galaxy of glitter swirls up
// in the middle of it, tilted: two arms trailing off a blazing bar of stars
// that turns through its core as one; the bar spins up, ever faster, stars
// piling up at its ends into swelling wisps; every half turn the end that's
// leading flings its wisp off along its swing, arcing down onto a bar for
// free levels with a jolt; the last is flung onto the clicked floor's bar in
// a big blast and every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { drawStars, planDisk, scatterArms } from "../../shared/galaxy";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "barredSpiral";
const MAX_FLINGS = 6;
const STARS = 260;
const STAR = 8;
// the galaxy: a share of the screen's width across (at most OUTER), tilted;
// the bar reaches BAR of the way out, BAR_STARS stars along it
const DISK = 0.42;
const OUTER = 310;
const SQUASH = 0.5;
const TILT = 0.2;
const BAR = 0.45;
const BAR_STARS = 36;
const CORE = WISP_SIZE * 1.1;
const CLUMP: [number, number] = [WISP_SIZE * 0.3, WISP_SIZE * 0.9];
// the bar's turns a second, spinning up
const TURN_HZ: [number, number] = [0.8, 3];
const FLING = 220;
const SLING_SHAKE: [number, number] = [0.3, 0.8];
const HIT_SHAKE = 0.6;

interface Fling {
  end: number;
  bar: RewardBar;
  grows: number;
  flings: number;
  lands: number;
  from: Point;
  bow: Point;
  to: Point;
  flight: (ms: number) => Point | null;
}

export const forceBarredSpiralEvent = registerWispEvent(
  KEY,
  "Barred Spiral",
  () => CONFIG.barredSpiralEvent.chance,
  (floor, context, area) => {
    const { growMs, spinMs, flyMs, levelShare, holdMs, mergeMs } =
      CONFIG.barredSpiralEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.36),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(centre, {
      inner: outer * BAR,
      outer,
      squash: SQUASH,
      tilt: TILT,
      rimHz: 0.5,
    });
    const stars = scatterArms(disk, STARS, 2, 0.45, 0.3);
    const barReach = outer * BAR;
    // the bar's angle at ms: spinning up through the event
    const span = spinMs / 1000;
    const angleAt = (ms: number) => {
      const s = clamp01((ms - growMs) / spinMs) * span;
      return (
        Math.PI *
        2 *
        (TURN_HZ[0] * s + ((TURN_HZ[1] - TURN_HZ[0]) * s * s) / (2 * span))
      );
    };
    // the times each half turn comes round
    const halves: number[] = [];
    let was = 0;
    for (let ms = growMs; ms <= growMs + spinMs; ms += 4) {
      const half = Math.floor(angleAt(ms) / Math.PI);
      if (half > was) halves.push(ms);
      was = half;
    }
    const others = bars.filter((b) => b !== clicked);
    const count = Math.min(
      MAX_FLINGS,
      halves.length,
      Math.max(3, bars.length * 2),
    );
    const slings = halves.slice(-count);
    const endAt = (end: number, ms: number, into: Point): Point =>
      disk.place(barReach * 1.05, angleAt(ms) + end * Math.PI, into);
    const flings: Fling[] = slings.map((ms, k) => {
      const end = k % 2;
      const bar =
        k === count - 1 || others.length === 0
          ? clicked
          : others[k % others.length];
      const from = endAt(end, ms, { x: 0, y: 0 });
      const ahead = endAt(end, ms + 8, { x: 0, y: 0 });
      const d = Math.hypot(ahead.x - from.x, ahead.y - from.y) || 1;
      const to: Point = {
        x: bar.box.x + bar.box.width * lerp([0.2, 0.8], Math.random()),
        y: bar.center.y,
      };
      const spot: Point = { x: 0, y: 0 };
      const bow: Point = {
        x: from.x + ((ahead.x - from.x) / d) * FLING,
        y: from.y + ((ahead.y - from.y) / d) * FLING,
      };
      return {
        end,
        bar,
        grows: k < 2 ? growMs : slings[k - 2],
        flings: ms,
        lands: ms + flyMs,
        from,
        bow,
        to,
        flight: (t) =>
          t < ms || t > ms + flyMs
            ? null
            : bezier(from, bow, to, easeIn((t - ms) / flyMs), spot),
      };
    });
    const last = flings[flings.length - 1];
    const endMs = last.lands;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    const spinning = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const slinging = createBeats(
      flings,
      (f) => f.flings,
      (f, k) => {
        cover!.burst(f.from, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SLING_SHAKE, k / Math.max(1, flings.length - 1)));
      },
    );
    const hitting = createBeats(
      flings,
      (f) => f.lands,
      (f) => {
        cover!.levels(f.bar, levels.get(f.bar)!, f.from);
        if (f === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(f.to);
          return;
        }
        cover!.burst(f.to, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(HIT_SHAKE);
      },
    );

    const star: Point = { x: 0, y: 0 };
    const clumps = flings.map((f) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < f.grows || ms >= f.flings ? null : endAt(f.end, ms, spot);
    });
    const centreAt = () => centre;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          spinning.tick(ms, now);
          slinging.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - last.flings) / 400);
          drawStars(ctx, disk, stars, ms, STAR, grow, fade);
          // the bar: a straight line of stars turning through the core as one
          const a = angleAt(ms);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < BAR_STARS; i++) {
            const u = (i + 0.5) / BAR_STARS;
            const r = Math.abs(u * 2 - 1) * barReach;
            disk.place(r, a + (u < 0.5 ? Math.PI : 0), star, grow);
            stampGlimmer(
              ctx,
              star.x,
              star.y,
              STAR * 1.3,
              i + ms * 0.004,
              i % 2 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          drawWisp(
            ctx,
            centreAt,
            ms,
            now,
            CORE * grow * (0.4 + 0.6 * fade),
            0.6,
          );
          for (let k = 0; k < flings.length; k++) {
            const f = flings[k];
            const swell = clamp01((ms - f.grows) / (f.flings - f.grows));
            drawWisp(ctx, clumps[k], ms, now, lerp(CLUMP, swell), swell);
            drawWispBetween(
              ctx,
              f.flight,
              ms,
              now,
              CLUMP[1],
              1,
              f.flings,
              f.lands,
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
