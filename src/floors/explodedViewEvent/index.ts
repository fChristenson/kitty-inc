// the "Exploded View" event (experiment: the screen comes apart like an
// exploded-view diagram; cash): it covers its crit, whose click freezes the
// screen and splits it into a grid of tiles that burst apart from the middle
// in three jolts, each wider than the last, a blaze of gold showing through
// the widening cracks and cash gushing out of them into the total with a
// bang and a shake; then every tile slams back into place at once in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { drawDetonation } from "../../shared/explosion";
import { bezier } from "../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "explodedView";
const REWARD = 4;
const COLS = 8;
const ROWS = 12;
// how far the tiles stand apart after each jolt, as a share of their
// distance from the middle
const SPREAD = [0.08, 0.16, 0.3];
const RISE_MS = 150;
const SLAM_MS = 170;
const CRACKS = 5;
const CRACK_COINS = 14;
const COLOSSAL = 560;
const VOID = "rgba(0,0,0,0.9)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const PULSE_SHAKE: [number, number] = [0.8, 1.5];
const SLAM_SHAKE = 2.4;

export const forceExplodedViewEvent = registerWispEvent(
  KEY,
  "Exploded View",
  () => CONFIG.explodedViewEvent.chance,
  (floor, context, area) => {
    const { pulseGapMs, openMs, holdMs, mergeMs } = CONFIG.explodedViewEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const total = totalSpot(area);
    const tw = width / COLS;
    const th = height / ROWS;
    const tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
      const x = left + (i % COLS) * tw;
      const y = top + Math.floor(i / COLS) * th;
      return { x, y, dx: x + tw / 2 - mid.x, dy: y + th / 2 - mid.y };
    });
    let clock = 0;
    const pulses = SPREAD.map((spread, k) => {
      const at = clock;
      clock += lerp(pulseGapMs, k / (SPREAD.length - 1));
      return { at, spread, from: k === 0 ? 0 : SPREAD[k - 1] };
    });
    const slamsAt = pulses[pulses.length - 1].at + RISE_MS + openMs;
    const endAt = slamsAt + SLAM_MS;
    const spreadAt = (ms: number) => {
      if (ms >= slamsAt)
        return (
          SPREAD[SPREAD.length - 1] *
          (1 - easeIn(clamp01((ms - slamsAt) / SLAM_MS)))
        );
      let s = 0;
      for (const p of pulses)
        if (ms >= p.at)
          s = lerp(
            [p.from, p.spread],
            easeOutBack(clamp01((ms - p.at) / RISE_MS)),
          );
      return s;
    };
    // rivers out of the middle, curling either way up into the total
    const rivers = [-1, 1].map((side) => {
      const bend: Point = {
        x: mid.x + side * width * 0.45,
        y: lerp([mid.y, total.y], 0.4),
      };
      const into: Point = { x: 0, y: 0 };
      return sampleLine((u) => ({ ...bezier(mid, bend, total, u, into) }), 30);
    });
    const pour: Pour = {
      coinsAlong: 160,
      width: 34,
      streamMs: 280,
      travelMs: 650,
    };
    // the corners where tiles meet, which cash bursts out of
    const crack = (spread: number): Point => {
      const c = 1 + Math.floor(Math.random() * (COLS - 1));
      const r = 1 + Math.floor(Math.random() * (ROWS - 1));
      const x = left + c * tw;
      const y = top + r * th;
      return { x: x + (x - mid.x) * spread, y: y + (y - mid.y) * spread };
    };

    let shot: ScreenCopy | null = null;
    const pulsing = createBeats(
      pulses,
      (p) => p.at + RISE_MS * 0.4,
      (p, k) => {
        for (const line of rivers) pourLine(cover!, line, pour);
        for (let i = 0; i < CRACKS; i++) {
          const at = crack(p.spread);
          cover!.launchFrom(
            at,
            clampTargetsY(
              sprayTargets(at, CRACK_COINS, [60, 200]),
              top + 40,
              area.bottom - 40,
            ),
          );
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PULSE_SHAKE, k / (pulses.length - 1)));
      },
    );
    const slamming = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(SLAM_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(
            endAt + 600,
            pourDurationMs(pulses[pulses.length - 1].at, pour),
          ) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pulsing.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const s = spreadAt(Math.max(0, ms));
          if (s <= 0) return;
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = clamp01(s / SPREAD[0]);
          drawGlow(ctx, GOLD, mid.x, mid.y, width * (0.5 + s));
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          for (const t of tiles)
            drawScreenPart(
              ctx,
              shot,
              t.x,
              t.y,
              tw,
              th,
              t.x + t.dx * s,
              t.y + t.dy * s,
              tw,
              th,
            );
        },
        drawOver: (ctx, ms, now) =>
          drawDetonation(ctx, mid, ms - endAt, COLOSSAL, now),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
