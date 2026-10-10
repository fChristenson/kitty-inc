// the "Rubber Band" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a band of light snaps taut across
// the top income bar between two wisps at its ends; a third wisp grabs its
// middle and hauls it up into a deep V, the beam stretching and humming,
// then lets go: it snaps down onto the bar with a twang, a flash and a
// jolt, free levels landing as it quivers flat; band after band down the
// stack, drawn back less and snapped quicker each time, the last snapping
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "rubberBand";
const MAX_BARS = 5;
const REACH = 40;
const DRAW_BACK: [number, number] = [230, 140];
const SNAP_MS = 70;
// it quivers past flat, overshooting QUIVER px and dying off
const QUIVER = 34;
const QUIVER_MS = 320;
const QUIVER_DECAY = 90;
const QUIVER_WOBBLE = 110;
const BAND = 9;
const WISP = 0.4;
const SNAP_SHAKE: [number, number] = [0.6, 1.3];

interface Band {
  bar: RewardBar;
  left: Point;
  right: Point;
  pull: number;
  starts: number;
  lets: number;
  snaps: number;
  mid: Point;
}

export const forceRubberBandEvent = registerWispEvent(
  KEY,
  "Rubber Band",
  () => CONFIG.rubberBandEvent.chance,
  (floor, context) => {
    const { pullsMs, levelShare, holdMs, mergeMs } = CONFIG.rubberBandEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const bands: Band[] = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const starts = clock;
      const lets = starts + lerp(pullsMs, t);
      const snaps = lets + SNAP_MS;
      clock = snaps;
      const y = bar.center.y;
      return {
        bar,
        left: { x: bar.box.x - REACH, y },
        right: { x: bar.box.x + bar.box.width + REACH, y },
        pull: lerp(DRAW_BACK, t),
        starts,
        lets,
        snaps,
        mid: { x: bar.center.x, y },
      };
    });
    const last = bands[bands.length - 1];
    const endAt = last.snaps + QUIVER_MS;
    // how far above the bar the band's middle is at ms
    const lift = (b: Band, ms: number) => {
      if (ms < b.lets)
        return b.pull * easeOut(clamp01((ms - b.starts) / (b.lets - b.starts)));
      if (ms < b.snaps) return b.pull * (1 - easeIn((ms - b.lets) / SNAP_MS));
      const t = ms - b.snaps;
      return (
        -QUIVER *
        Math.exp(-t / QUIVER_DECAY) *
        Math.cos((2 * Math.PI * t) / QUIVER_WOBBLE)
      );
    };
    const grabbers = bands.map((b) => (ms: number) => {
      b.mid.y = b.bar.center.y - lift(b, ms);
      return b.mid;
    });
    const anchors = bands.flatMap((b) => [() => b.left, () => b.right]);

    const humming = createBeats(
      bands,
      (b) => b.starts,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const snapping = createBeats(
      bands,
      (b) => b.snaps,
      (b, k) => {
        cover!.levels(b.bar, levelsFor(b.bar.floor, levelShare, 2), {
          x: b.mid.x,
          y: b.mid.y - 100,
        });
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          return;
        }
        cover!.burst(b.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNAP_SHAKE, k / Math.max(1, bands.length - 1)));
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
          humming.tick(ms, now);
          snapping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (let i = 0; i < bands.length; i++) {
            const b = bands[i];
            if (ms < b.starts || ms > b.snaps + QUIVER_MS) continue;
            const mid = grabbers[i](ms);
            const fade = 1 - clamp01((ms - b.snaps) / QUIVER_MS);
            // stretched thinner and hotter the further it's drawn back
            const stretch =
              1 - 0.4 * clamp01((b.bar.center.y - mid.y) / b.pull);
            drawBeam(ctx, b.left, mid, BAND * stretch, 0.85 * fade);
            drawBeam(ctx, mid, b.right, BAND * stretch, 0.85 * fade);
            if (ms < b.snaps) drawBeamFlare(ctx, mid, 12, 0.8, now);
            drawWispBetween(
              ctx,
              anchors[i * 2],
              ms,
              now,
              WISP_SIZE * WISP,
              0.5,
              b.starts,
              b.snaps + QUIVER_MS,
            );
            drawWispBetween(
              ctx,
              anchors[i * 2 + 1],
              ms,
              now,
              WISP_SIZE * WISP,
              0.5,
              b.starts,
              b.snaps + QUIVER_MS,
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
