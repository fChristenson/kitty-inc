// the "Ring Light" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while ten wisps fly up into a hoop round
// the top of the screen, beams joining each to the next into a blazing ring
// of light; the ring drops down the screen like a hoop, tilting as it falls,
// and every income bar it passes through flashes with a crack and a jolt
// and free levels; at the bottom it cinches tight to a point and blows in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "ringLight";
const MAX_BARS = 5;
const WISPS = 10;
const TOP = 140;
const BOTTOM = 160;
const REACH = 0.42;
const STAGGER_MS = 18;
const SPIN = 0.0025;
const SQUASH: [number, number] = [0.18, 0.34];
const TILT = 0.22;
const WIDTH = 18;
const PASS_MS = 180;
const FLARE = 70;
const DOT = 0.32;
const PASS_SHAKE: [number, number] = [0.6, 1.3];

export const forceRingLightEvent = registerWispEvent(
  KEY,
  "Ring Light",
  () => CONFIG.ringLightEvent.chance,
  (floor, context, area) => {
    const { formMs, dropMs, cinchMs, levelShare, holdMs, mergeMs } =
      CONFIG.ringLightEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const radius = (area.right - area.left) * REACH;
    const y0 = area.top + TOP;
    const y1 = area.bottom - BOTTOM;
    const dropAt = formMs + STAGGER_MS * WISPS;
    const cinchAt = dropAt + dropMs;
    const endAt = cinchAt + cinchMs;
    // the hoop's middle falls as easeIn, so it passes y at sqrt of its share
    const passes = bars
      .map((bar) => ({
        bar,
        at:
          dropAt + dropMs * Math.sqrt(clamp01((bar.center.y - y0) / (y1 - y0))),
      }))
      .sort((a, b) => a.at - b.at);
    const middle: Point = { x: cx, y: y1 };

    // wisp i's spot on the hoop at ms, into `into`
    const place = (i: number, ms: number, into: Point): Point => {
      ms = Math.max(0, ms);
      const fall = easeIn(clamp01((ms - dropAt) / dropMs));
      const cinch = easeIn(clamp01((ms - cinchAt) / cinchMs));
      const y = lerp([y0, y1], fall);
      const r = radius * (1 - cinch);
      const squash = lerp(SQUASH, 0.5 + 0.5 * Math.sin(ms * 0.006));
      const tilt = TILT * Math.sin(ms * 0.004);
      const a = (i / WISPS) * Math.PI * 2 + ms * SPIN;
      const ex = Math.cos(a) * r;
      const ey = Math.sin(a) * r * squash;
      const hx = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const hy = y + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const form = easeOut(clamp01((ms - i * STAGGER_MS) / formMs));
      into.x = lerp([button.x, hx], form);
      into.y = lerp([button.y, hy], form);
      return into;
    };
    const wisps = Array.from({ length: WISPS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => place(i, ms, at);
    });
    const hoop: Point[] = Array.from({ length: WISPS }, () => ({ x: 0, y: 0 }));

    const passing = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2));
        cover!.burst(p.bar.center, 0.5 + 0.1 * k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const blowing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(middle);
        if (cover!.isLive()) playExplosion();
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
          passing.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (let i = 0; i < WISPS; i++) place(i, ms, hoop[i]);
          const joined = clamp01((ms - formMs) / (STAGGER_MS * WISPS));
          let flash = 0;
          for (const p of passes) {
            const t = (ms - p.at) / PASS_MS;
            if (t >= 0 && t < 1) flash = Math.max(flash, 1 - t);
          }
          const cinch = clamp01((ms - cinchAt) / cinchMs);
          const width = WIDTH * (1 + flash + 1.5 * cinch);
          if (joined > 0)
            for (let i = 0; i < WISPS; i++)
              drawBeam(ctx, hoop[i], hoop[(i + 1) % WISPS], width, joined);
          if (cinch > 0) drawBeamFlare(ctx, middle, FLARE * cinch, 1, now);
          for (const at of wisps)
            drawWispBetween(ctx, at, ms, now, WISP_SIZE * DOT, flash, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
