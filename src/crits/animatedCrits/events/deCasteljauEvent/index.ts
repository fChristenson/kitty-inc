// the "de Casteljau" event (experiment: de Casteljau's construction of a
// Bézier curve; cash): it covers its crit, whose click freezes the screen
// while four control points flare up, from the clicked floor's button to
// the total, joined by beams; points slide along the beams, beams between
// them, points along those, and so on down to one wisp that sweeps out the
// curve as the whole scaffold scissors across the screen, every level a
// whoosh; once the curve is drawn the scaffold falls away and a river of
// cash pours along it into the total in a huge blast. Pays floor income ×
// floor number × 4
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "deCasteljau";
const REWARD = 4;
const CURVE_STEPS = 60;
// the two middle control points, as shares of the screen across and down
const MIDDLE: [number, number][] = [
  [0.1, 0.3],
  [0.95, 0.75],
];
// each level's beams: wide and faint at the frame, bright at the last
const WIDTHS = [4, 5, 6];
const ALPHAS = [0.3, 0.45, 0.6];
const CURVE_W = 8;
const CURVE_ALPHA = 0.7;
const POINT = 14;
const HEAD = WISP_SIZE * 0.9;
const BUILD_SHAKE = 0.4;
const POUR_SHAKE = 0.7;

export const forceDeCasteljauEvent = registerWispEvent(
  KEY,
  "de Casteljau",
  () => CONFIG.deCasteljauEvent.chance,
  (floor, context, area) => {
    const { growMs, drawMs, travelMs, streamMs, holdMs, mergeMs } =
      CONFIG.deCasteljauEvent;
    const fallback = totalSpot(area);
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const control: Point[] = [
      getButtonCenter(context.isGroundFloor),
      ...MIDDLE.map(([u, v]) => ({
        x: area.left + w * u,
        y: area.top + h * v,
      })),
      fallback,
    ];
    // the scaffold at t: every level's points, the last one on the curve
    const levels: Point[][] = [3, 2, 1].map((n) =>
      Array.from({ length: n }, () => ({ x: 0, y: 0 })),
    );
    const build = (t: number): Point => {
      let prev = control;
      for (const level of levels) {
        for (let i = 0; i < level.length; i++) {
          level[i].x = lerp([prev[i].x, prev[i + 1].x], t);
          level[i].y = lerp([prev[i].y, prev[i + 1].y], t);
        }
        prev = level;
      }
      return levels[2][0];
    };
    const line: Point[] = Array.from({ length: CURVE_STEPS + 1 }, (_, i) => {
      const p = build(i / CURVE_STEPS);
      return { x: p.x, y: p.y };
    });
    const sweepAt = growMs;
    const doneAt = sweepAt + drawMs;
    const tAt = (ms: number) => smoothstep(clamp01((ms - sweepAt) / drawMs));
    const tip: Point = { x: 0, y: 0 };
    const tipAt = (ms: number): Point | null => {
      if (ms > doneAt) return null;
      const p = build(tAt(ms));
      tip.x = p.x;
      tip.y = p.y;
      return tip;
    };
    const pour: Pour = { coinsAlong: 2_000, width: 20, streamMs, travelMs };
    const pourAt = doneAt + 80;
    const head = riverHead(line, travelMs, pourAt);
    const riverAt = (ms: number) => head(Math.max(pourAt, ms));
    const inAt = pourAt + travelMs;
    const durationMs = Math.max(
      pourDurationMs(pourAt, pour),
      inAt + holdMs + mergeMs,
    );

    const building = createBeats(
      [0, sweepAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BUILD_SHAKE);
      },
    );
    const pouring = createBeats(
      [pourAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        pourLine(cover!, line, pour);
        cover!.burst(line[0], 0.6);
        shakeScreen(POUR_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          building.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > inAt + 600) return;
          const grow = easeOut(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - doneAt) / 300);
          // the curve drawn so far, fading as the river takes over
          const t = tAt(ms);
          const drawn = Math.floor(t * CURVE_STEPS);
          const curveFade = 1 - clamp01((ms - pourAt) / travelMs);
          for (let i = 1; i <= drawn; i++)
            drawBeam(
              ctx,
              line[i - 1],
              line[i],
              CURVE_W,
              CURVE_ALPHA * curveFade,
            );
          if (fade > 0) {
            for (let i = 1; i < control.length; i++)
              drawBeam(
                ctx,
                control[i - 1],
                control[i],
                WIDTHS[0],
                ALPHAS[0] * grow * fade,
              );
            if (ms >= sweepAt) {
              build(t);
              for (let l = 0; l < 2; l++) {
                const pts = levels[l];
                for (let i = 1; i < pts.length; i++)
                  drawBeam(
                    ctx,
                    pts[i - 1],
                    pts[i],
                    WIDTHS[l + 1],
                    ALPHAS[l + 1] * fade,
                  );
              }
            }
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (const p of control)
              stampGlimmer(
                ctx,
                p.x,
                p.y,
                POINT * 1.4 * grow * fade,
                ms * 0.004,
                COLOR.white,
              );
            if (ms >= sweepAt)
              for (let l = 0; l < 2; l++)
                for (const p of levels[l])
                  stampGlimmer(
                    ctx,
                    p.x,
                    p.y,
                    POINT * fade,
                    ms * 0.004,
                    COLOR.heavenlyGold,
                  );
            ctx.restore();
          }
          drawWispBetween(ctx, tipAt, ms, now, HEAD, 0.7, sweepAt, doneAt);
          drawWispBetween(ctx, riverAt, ms, now, HEAD, 0.9, pourAt, inAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
