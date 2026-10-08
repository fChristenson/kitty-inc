// the "Equalizer" event (experiment: a graphic equalizer; free upgrade
// levels): it covers its crit, whose click freezes the screen while columns
// of glowing segments rise out of the bottom of it like a music player's
// equalizer, bouncing to a beat; on every beat they leap, a wave of them
// shooting up to an income bar, which jolts with a thump and free levels,
// beat after beat, ever faster and higher; on the drop every column
// maxes out at once and every bar slams in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "equalizer";
const MAX_BARS = 5;
const COLUMNS = 9;
const BEATS = 8;
// segments every SEGMENT px, SEG px round; leaps fall away over DECAY ms;
// between beats the columns idle at IDLE px
const SEGMENT = 20;
const SEG = 9;
const PEAK = 15;
const DECAY = 220;
const IDLE = 60;
const BASE = 20;
const SEG_GLOW = fadeStops(COLOR.heavenlyGold, 0.3);
const PEAK_GLOW = fadeStops(COLOR.white, 0.3);
const BEAT_SHAKE: [number, number] = [0.5, 1.2];

export const forceEqualizerEvent = registerWispEvent(
  KEY,
  "Equalizer",
  () => CONFIG.equalizerEvent.chance,
  (floor, context, area) => {
    const { riseMs, beatsMs, levelShare, holdMs, mergeMs } =
      CONFIG.equalizerEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => b.center.y - a.center.y);
    if (bars.length === 0) return;
    const bottom = area.bottom - BASE;
    const xs = Array.from({ length: COLUMNS }, (_, c) =>
      lerp([area.left, area.right], (c + 0.5) / COLUMNS),
    );
    let clock: number = riseMs;
    // each beat throws a wave peaking on one column up to a bar, the drop
    // up to the top of the screen
    const beats = Array.from({ length: BEATS }, (_, k) => {
      const at = clock;
      clock += lerp(beatsMs, k / (BEATS - 1));
      const drop = k === BEATS - 1;
      const bar = drop ? null : bars[k % bars.length];
      const reach = drop
        ? bottom - area.top - 20
        : bottom - (bar!.center.y - 10);
      const peak = Math.floor(Math.random() * COLUMNS);
      return {
        at,
        bar,
        shape: xs.map((_, c) =>
          drop ? 1 : Math.max(0.25, 1 - Math.abs(c - peak) * 0.18),
        ),
        reach,
      };
    });
    const dropAt = beats[BEATS - 1].at;
    const endAt = dropAt + DECAY;
    const heights = new Float32Array(COLUMNS);
    const heightsAt = (ms: number) => {
      const rise = clamp01(ms / riseMs);
      for (let c = 0; c < COLUMNS; c++) {
        let h = IDLE * rise * (0.6 + 0.4 * Math.sin(ms / 110 + c * 1.7));
        for (const b of beats) {
          if (ms < b.at) break;
          h = Math.max(
            h,
            b.reach * b.shape[c] * Math.exp(-(ms - b.at) / DECAY),
          );
        }
        heights[c] = h;
      }
      return heights;
    };

    const beating = createBeats(
      beats,
      (b) => b.at,
      (b, k) => {
        if (!b.bar) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast({ x: (area.left + area.right) / 2, y: area.top + 80 });
          return;
        }
        cover!.levels(b.bar, levelsFor(b.bar.floor, levelShare, 1), {
          x: b.bar.center.x,
          y: bottom,
        });
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BEAT_SHAKE, k / (BEATS - 1)));
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
        tick: (ms, now) => beating.tick(ms, now),
        drawUnder: (ctx, ms) => {
          if (ms > endAt + 400) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 400 : 1;
          const hs = heightsAt(ms);
          ctx.globalCompositeOperation = "lighter";
          for (let c = 0; c < COLUMNS; c++) {
            const count = Math.floor(hs[c] / SEGMENT);
            ctx.globalAlpha = 0.85 * fade;
            for (let s = 0; s < count; s++)
              drawGlow(ctx, SEG_GLOW, xs[c], bottom - s * SEGMENT, SEG);
            ctx.globalAlpha = fade;
            drawGlow(ctx, PEAK_GLOW, xs[c], bottom - hs[c], PEAK);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
