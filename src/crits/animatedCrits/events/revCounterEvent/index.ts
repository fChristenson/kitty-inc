// the "Rev Counter" event (experiment: a giant rev counter; cash): it
// covers its crit, whose click freezes the screen while a huge gauge of
// glowing ticks sweeps round the middle of it with a needle of light;
// the engine revs: the needle surges up the dial, roars at its peak in a
// jolt and a spray of coins off its tip, drops back as it shifts gear and
// surges higher, ever quicker; on the last rev it smashes into the redline
// and the whole gauge blows in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "revCounter";
const REWARD = 4;
// the dial sweeps from START to END rad, TICKS ticks, GAUGE of the
// screen's smaller side round; the last REDLINE of it is the redline
const START = Math.PI * 0.75;
const END = Math.PI * 2.25;
const TICKS = 26;
const GAUGE = 0.4;
const REDLINE = 0.15;
const PEAKS = [0.45, 0.65, 0.85, 1];
const IDLE = 0.08;
const SHIFT = 0.35;
const DROP_MS = 130;
const NEEDLE = 8;
const TICK = 7;
const REV_COINS = 10;
const REV_REACH: [number, number] = [30, 120];
const TICK_GLOW = fadeStops(COLOR.white, 0.4);
const RED_GLOW = fadeStops(COLOR.heavenlyGold, 0.4);
const REV_SHAKE: [number, number] = [0.6, 1.3];

export const forceRevCounterEvent = registerWispEvent(
  KEY,
  "Rev Counter",
  () => CONFIG.revCounterEvent.chance,
  (floor, context, area) => {
    const { dialMs, revsMs, holdMs, mergeMs } = CONFIG.revCounterEvent;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius =
      Math.min(area.right - area.left, area.bottom - area.top) * GAUGE;
    let clock: number = dialMs;
    let from = IDLE;
    const revs = PEAKS.map((peak, k) => {
      const starts = clock;
      const peaks = starts + lerp(revsMs, k / (PEAKS.length - 1));
      clock = peaks + DROP_MS;
      const r = { from, peak, starts, peaks };
      from = SHIFT;
      return r;
    });
    const last = revs[revs.length - 1];
    const endAt = last.peaks;
    // the needle's reading, 0..1 round the dial
    const reading = (ms: number) => {
      let v = IDLE * clamp01(ms / dialMs);
      for (const r of revs) {
        if (ms < r.starts) break;
        if (ms < r.peaks)
          v = lerp(
            [r.from, r.peak],
            easeIn((ms - r.starts) / (r.peaks - r.starts)),
          );
        else v = lerp([r.peak, SHIFT], clamp01((ms - r.peaks) / DROP_MS));
      }
      if (ms >= endAt) v = 1;
      // a quiver at speed
      return v + Math.sin(ms / 23) * 0.006 * v;
    };
    const angleOf = (v: number) => lerp([START, END], v);
    const ticks: Point[] = Array.from({ length: TICKS }, (_, i) => {
      const a = angleOf(i / (TICKS - 1));
      return {
        x: center.x + Math.cos(a) * radius,
        y: center.y + Math.sin(a) * radius,
      };
    });
    const tip: Point = { x: 0, y: 0 };
    const tipAt = (v: number, into: Point) => {
      const a = angleOf(v);
      into.x = center.x + Math.cos(a) * radius * 0.9;
      into.y = center.y + Math.sin(a) * radius * 0.9;
      return into;
    };

    const revving = createBeats(
      revs,
      (r) => r.peaks,
      (r, k) => {
        if (r === last) {
          cover!.blast(center);
          return;
        }
        const spot = tipAt(r.peak, { x: 0, y: 0 });
        cover!.launchFrom(spot, ringTargets(spot, REV_COINS, REV_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(REV_SHAKE, k / (revs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => revving.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 500) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 500 : 1;
          const v = reading(ms);
          ctx.globalCompositeOperation = "lighter";
          ticks.forEach((t, i) => {
            const share = i / (TICKS - 1);
            const shown = clamp01((ms - dialMs * share) / 80);
            if (shown <= 0) return;
            const red = share >= 1 - REDLINE;
            const lit = share <= v ? 1 : 0.35;
            ctx.globalAlpha = shown * fade * lit;
            drawGlow(
              ctx,
              red ? RED_GLOW : TICK_GLOW,
              t.x,
              t.y,
              TICK * (red ? 1.4 : 1),
            );
          });
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          if (ms >= dialMs * 0.5) {
            tipAt(v, tip);
            drawBeam(ctx, center, tip, NEEDLE, fade);
            drawBeamFlare(ctx, center, 18, fade, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
