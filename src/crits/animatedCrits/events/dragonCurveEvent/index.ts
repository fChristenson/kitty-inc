// the "Dragon Curve" event (experiment: the Heighway dragon fractal; cash):
// it covers its crit, whose click freezes the screen and dims it while a
// single short line of gold appears; a copy of it swings round its end like
// a folding paper strip, doubling it, then the whole thing copies and
// swings again, and again, each fold quicker than the last with a jolt, the
// line folding out into the twisting coastline of the dragon fractal;
// then the whole dragon flares and bursts into cash in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";

const KEY = "dragonCurve";
const REWARD = 4;
const FOLDS = 10;
const FIT = 0.8;
const VEIL = "rgba(0,0,0,0.6)";
const GLOW = 9;
const LINE = 3;
const BURST_POINTS = 140;
const FOLD_SHAKE: [number, number] = [0.2, 0.9];
const FINAL_SHAKE = 2.0;

export const forceDragonCurveEvent = registerWispEvent(
  KEY,
  "Dragon Curve",
  () => CONFIG.dragonCurveEvent.chance,
  (floor, context, area) => {
    const { foldsMs, holdMs, mergeMs } = CONFIG.dragonCurveEvent;
    // the whole curve in unit steps: each fold adds the curve so far,
    // turned a quarter round its end, in reverse
    const xs = [0, 1];
    const ys = [0, 0];
    const lengths = [2];
    for (let f = 0; f < FOLDS; f++) {
      const n = xs.length;
      const px = xs[n - 1];
      const py = ys[n - 1];
      for (let i = n - 2; i >= 0; i--) {
        xs.push(px - (ys[i] - py));
        ys.push(py + (xs[i] - px));
      }
      lengths.push(xs.length);
    }
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const scale = Math.min(
      (width * FIT) / (maxX - minX || 1),
      (height * FIT) / (maxY - minY || 1),
    );
    const offX = area.left + (width - (maxX - minX) * scale) / 2 - minX * scale;
    const offY = area.top + (height - (maxY - minY) * scale) / 2 - minY * scale;
    const point = (i: number): Point => ({
      x: offX + xs[i] * scale,
      y: offY + ys[i] * scale,
    });
    // the curve as it stands before each fold, one path apiece
    const paths = lengths.map((n) => {
      const path = new Path2D();
      path.moveTo(offX + xs[0] * scale, offY + ys[0] * scale);
      for (let i = 1; i < n; i++)
        path.lineTo(offX + xs[i] * scale, offY + ys[i] * scale);
      return path;
    });
    let clock = 150;
    const folds = Array.from({ length: FOLDS }, (_, f) => {
      const starts = clock;
      clock += lerp(foldsMs, f / (FOLDS - 1));
      return { starts, ends: clock, pivot: point(lengths[f] - 1) };
    });
    const endAt = clock;

    const folding = createBeats(
      folds,
      (f) => f.ends,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FOLD_SHAKE, k / (FOLDS - 1)));
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        const n = xs.length;
        for (let j = 0; j < BURST_POINTS; j++) {
          const at = point(Math.floor((j / BURST_POINTS) * n));
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 3, [20, 90]),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        }
        cover!.blast({ x: area.left + width / 2, y: area.top + height / 2 });
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const stroke = (ctx: CanvasRenderingContext2D, path: Path2D) => {
      ctx.globalAlpha *= 0.35;
      ctx.lineWidth = GLOW;
      ctx.stroke(path);
      ctx.globalAlpha /= 0.35;
      ctx.lineWidth = LINE;
      ctx.stroke(path);
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          folding.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(area.left, area.top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = COLOR.heavenlyGold;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.globalAlpha = fade * easeOut(clamp01(ms / 150));
          let f = 0;
          while (f < FOLDS - 1 && ms >= folds[f].ends) f++;
          const fold = folds[f];
          const done = ms >= fold.ends;
          // the curve so far, and its copy swinging round its end
          stroke(ctx, paths[done ? f + 1 : f]);
          if (!done && ms >= fold.starts) {
            const turn =
              (Math.PI / 2) *
              smoothstep((ms - fold.starts) / (fold.ends - fold.starts));
            ctx.save();
            ctx.translate(fold.pivot.x, fold.pivot.y);
            ctx.rotate(turn);
            ctx.translate(-fold.pivot.x, -fold.pivot.y);
            stroke(ctx, paths[f]);
            ctx.restore();
          }
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
