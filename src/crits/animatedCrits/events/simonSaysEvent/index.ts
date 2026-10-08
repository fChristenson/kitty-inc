// the "Simon Says" event (experiment: a memory game; crit tiers): it covers
// its crit, whose click freezes the screen while it splits into four great
// glowing pads like a Simon memory game; the pads flash out a pattern,
// each flash a blaze of light and a tone, and as each round's pattern
// finishes an income bar jumps a crit tier with a bang and a jolt; every
// round the pattern is longer and faster; after the last all four pads
// blaze at once and every bar slams in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { findRewardBars } from "../../eventRewards";

const KEY = "simonSays";
const MAX_BARS = 3;
// round k flashes FIRST + k pads; a pad glows PAD of the screen's smaller
// side round, dim at IDLE between flashes
const FIRST = 2;
const PAD = 0.26;
const IDLE = 0.18;
const FLASH = 0.7;
const PAD_GLOW = fadeStops(COLOR.heavenlyGold, 0.2);
const FLARE_GLOW = fadeStops(COLOR.white, 0.1);
const ROUND_SHAKE: [number, number] = [0.8, 1.5];

export const forceSimonSaysEvent = registerWispEvent(
  KEY,
  "Simon Says",
  () => CONFIG.simonSaysEvent.chance,
  (floor, context, area) => {
    const { lightMs, beatsMs, roundGapMs, holdMs, mergeMs } =
      CONFIG.simonSaysEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const pads: Point[] = [
      { x: area.left + w * 0.27, y: area.top + h * 0.3 },
      { x: area.left + w * 0.73, y: area.top + h * 0.3 },
      { x: area.left + w * 0.73, y: area.top + h * 0.7 },
      { x: area.left + w * 0.27, y: area.top + h * 0.7 },
    ];
    const radius = Math.min(w, h) * PAD;
    const flashes: { pad: number; at: number; beat: number }[] = [];
    let clock: number = lightMs;
    let previous = -1;
    const rounds = bars.map((bar, k) => {
      const beat = lerp(beatsMs, k / Math.max(1, bars.length - 1));
      for (let i = 0; i < FIRST + k; i++) {
        let pad = Math.floor(Math.random() * pads.length);
        if (pad === previous) pad = (pad + 1) % pads.length;
        previous = pad;
        flashes.push({ pad, at: clock, beat });
        clock += beat;
      }
      const done = clock;
      clock += roundGapMs;
      return { bar, done };
    });
    const last = rounds[rounds.length - 1];
    const endAt = last.done;
    const center: Point = { x: area.left + w / 2, y: area.top + h / 2 };

    const flashing = createBeats(
      flashes,
      (f) => f.at,
      (f) => {
        cover!.burst(pads[f.pad], 0.3);
        if (cover!.isLive()) playBloop();
      },
    );
    const scoring = createBeats(
      rounds,
      (r) => r.done,
      (r, k) => {
        cover!.tierUp(r.bar, center);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ROUND_SHAKE, k / Math.max(1, rounds.length - 1)));
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
          flashing.tick(ms, now);
          scoring.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          const on =
            clamp01(ms / lightMs) *
            (ms > endAt ? Math.max(0, 1 - (ms - endAt) / 400) : 1);
          if (on <= 0) return;
          ctx.globalCompositeOperation = "lighter";
          for (let p = 0; p < pads.length; p++) {
            let lit = 0;
            for (const f of flashes) {
              if (f.pad !== p) continue;
              const t = (ms - f.at) / (f.beat * FLASH);
              if (t >= 0 && t < 1) lit = Math.max(lit, 1 - t);
            }
            if (ms >= endAt) lit = 1;
            ctx.globalAlpha = on * (IDLE + (1 - IDLE) * lit);
            drawGlow(
              ctx,
              PAD_GLOW,
              pads[p].x,
              pads[p].y,
              radius * (1 + 0.1 * lit),
            );
            if (lit > 0) {
              ctx.globalAlpha = on * lit * 0.8;
              drawGlow(ctx, FLARE_GLOW, pads[p].x, pads[p].y, radius * 0.6);
            }
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
