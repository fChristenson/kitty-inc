// the "Buffon's Needle" event (experiment: Buffon's needle; levels): it
// covers its crit, whose click freezes the screen while needles of light
// rain down over the income bars in view, faster and faster, each tumbling
// end over end and landing flat at a random spot and angle, every landing
// a tick and a jolt; a needle that lands across a bar's middle line flares
// white and lands free levels on that bar, one that misses dims; when the
// last has landed every needle across a bar flashes at once and the
// clicked floor's bar slams in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "buffonsNeedle";
const NEEDLES = 40;
// a needle's length, of the gap between bars (the classic needle is as
// long as the lines are apart)
const LENGTH = 0.8;
const NEEDLE_W = 6;
const FALL = 600;
const TURNS = 1.5;
const FLARE = 34;
const SOUND_GAP_MS = 60;
const LAND_SHAKE = 0.15;
const CROSS_SHAKE: [number, number] = [0.4, 0.9];

interface Needle {
  at: Point;
  angle: number;
  lands: number;
  bar: RewardBar | null;
  // where it crosses the bar's line
  cross: Point;
}

export const forceBuffonsNeedleEvent = registerWispEvent(
  KEY,
  "Buffon's Needle",
  () => CONFIG.buffonsNeedleEvent.chance,
  (floor, context) => {
    const { dropMs, fallMs, levelShare, holdMs, mergeMs } =
      CONFIG.buffonsNeedleEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const ys = bars.map((b) => b.center.y);
    const gap =
      bars.length > 1
        ? (ys[ys.length - 1] - ys[0]) / (bars.length - 1)
        : bar.box.height * 4;
    const length = gap * LENGTH;
    const left = Math.min(...bars.map((b) => b.box.x));
    const right = Math.max(...bars.map((b) => b.box.x + b.box.width));
    const top = ys[0] - gap / 2;
    const bottom = ys[ys.length - 1] + gap / 2;
    let clock: number = 0;
    const needles: Needle[] = Array.from({ length: NEEDLES }, (_, k) => {
      const at = {
        x: lerp([left, right], Math.random()),
        y: lerp([top, bottom], Math.random()),
      };
      const angle = Math.random() * Math.PI;
      clock += lerp(dropMs, k / (NEEDLES - 1));
      const lands = clock + fallMs;
      // the bar whose middle line it lies across, if any
      const half = (length / 2) * Math.sin(angle);
      const crossed =
        bars.find((b) => {
          if (Math.abs(at.y - b.center.y) > half) return false;
          const cx = at.x + (b.center.y - at.y) / Math.tan(angle || 1e-6);
          return cx >= b.box.x && cx <= b.box.x + b.box.width;
        }) ?? null;
      const cross = crossed
        ? {
            x: at.x + (crossed.center.y - at.y) / Math.tan(angle || 1e-6),
            y: crossed.center.y,
          }
        : at;
      return { at, angle, lands, bar: crossed, cross };
    });
    const endAt = Math.max(...needles.map((n) => n.lands)) + 120;
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    let soundAt = -Infinity;

    const landing = createBeats(
      needles,
      (n) => n.lands,
      (n, k, now) => {
        if (n.bar)
          cover!.levels(n.bar, levelsFor(n.bar.floor, levelShare, 1), n.at);
        if (!cover!.isLive()) return;
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          if (n.bar) playExplosion();
          else playBloop();
        }
        shakeScreen(n.bar ? lerp(CROSS_SHAKE, k / (NEEDLES - 1)) : LAND_SHAKE);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare * 3, 2), bar.center);
        cover!.slam(bar);
        cover!.blast(bar.center);
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
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 500) return;
          const flash = clamp01(1 - (ms - endAt) / 400);
          for (const n of needles) {
            const falls = n.lands - fallMs;
            if (ms < falls) continue;
            const u = clamp01((ms - falls) / fallMs);
            // tumbling down onto its spot, then lying there
            const spin = n.angle + TURNS * Math.PI * (1 - u);
            const y = n.at.y - FALL * (1 - easeIn(u));
            const half = length / 2;
            a.x = n.at.x - Math.cos(spin) * half;
            a.y = y - Math.sin(spin) * half;
            b.x = n.at.x + Math.cos(spin) * half;
            b.y = y + Math.sin(spin) * half;
            const since = ms - n.lands;
            const alpha =
              since < 0
                ? 0.8
                : n.bar
                  ? lerp(
                      [0.5, 0.95],
                      ms >= endAt ? flash : Math.max(0, 1 - since / 300),
                    )
                  : 0.25;
            drawBeam(
              ctx,
              a,
              b,
              NEEDLE_W * (n.bar && since >= 0 ? 1.4 : 1),
              alpha,
            );
            if (n.bar && since >= 0 && since < 400)
              drawBeamFlare(ctx, n.cross, FLARE, 1 - since / 400, now);
            if (n.bar && ms >= endAt && ms < endAt + 400)
              drawBeamFlare(ctx, n.cross, FLARE * 1.3, flash, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
