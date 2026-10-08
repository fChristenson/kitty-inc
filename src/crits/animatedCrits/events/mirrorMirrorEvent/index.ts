// the "Mirror Mirror" event (experiment: the screen folds into its own mirror
// image; cash): it covers its crit, whose click freezes the screen and its
// left half unfolds over the right like a page, a mirror image, with a jolt
// and a blazing seam gushing cash; then the top half unfolds down over the
// bottom the same way, leaving a four-way kaleidoscope with cash pouring
// out of both seams; then it all snaps back to normal in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { bezier } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "mirrorMirror";
const REWARD = 4;
const SEAM = 26;
const SPRAYS = 3;
const SPRAY = 16;
const COLOSSAL = 560;
const FOLD_SHAKE = [1.0, 1.4];
const SNAP_SHAKE = 2.3;

export const forceMirrorMirrorEvent = registerWispEvent(
  KEY,
  "Mirror Mirror",
  () => CONFIG.mirrorMirrorEvent.chance,
  (floor, context, area) => {
    const { foldMs, gapMs, showMs, snapMs, holdMs, mergeMs } =
      CONFIG.mirrorMirrorEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const halfW = width / 2;
    const halfH = height / 2;
    const cx = left + halfW;
    const cy = top + halfH;
    const mid: Point = { x: cx, y: cy };
    const total = totalSpot(area);
    const folds = [0, foldMs + gapMs];
    const snapsAt = folds[1] + foldMs + showMs;
    const endAt = snapsAt + snapMs;
    const openAt = (ms: number, k: number) => {
      if (ms >= snapsAt) return 1 - easeIn(clamp01((ms - snapsAt) / snapMs));
      return easeOut(clamp01((ms - folds[k]) / foldMs));
    };
    const pour: Pour = {
      coinsAlong: 160,
      width: 32,
      streamMs: 300,
      travelMs: 600,
    };
    const into: Point = { x: 0, y: 0 };
    // each seam's middle pours up into the total
    const seams: Point[] = [
      { x: cx, y: top + height * 0.7 },
      { x: left + width * 0.25, y: cy },
    ];
    const rivers = seams.map((from) => {
      const bend: Point = {
        x: from.x + (from.x < total.x ? -1 : 1) * 180,
        y: (from.y + total.y) / 2,
      };
      return sampleLine((u) => ({ ...bezier(from, bend, total, u, into) }), 24);
    });
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    let shot: ScreenCopy | null = null;
    const folding = createBeats(
      folds,
      (ms) => ms + foldMs,
      (_, k) => {
        pourLine(cover!, rivers[k], pour);
        for (let i = 0; i < SPRAYS; i++) {
          const at: Point =
            k === 0
              ? { x: cx, y: top + height * (0.2 + 0.3 * i) }
              : { x: left + width * (0.2 + 0.3 * i), y: cy };
          cover!.launchFrom(
            at,
            clampTargetsY(
              sprayTargets(at, SPRAY, [60, 220]),
              top + 40,
              area.bottom - 40,
            ),
          );
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FOLD_SHAKE[k]);
      },
    );
    const swooshing = createBeats(
      folds,
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const snapping = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(SNAP_SHAKE);
      },
    );

    // the left half mirrored over the right, `s` of the way open, rows y..y+h
    const drawMirroredLeft = (
      ctx: CanvasRenderingContext2D,
      copy: ScreenCopy,
      s: number,
      y: number,
      h: number,
    ) => {
      if (s <= 0) return;
      ctx.save();
      ctx.translate(cx, 0);
      ctx.scale(-s, 1);
      ctx.translate(-cx, 0);
      drawScreenPart(ctx, copy, left, y, halfW, h, left, y, halfW, h);
      ctx.restore();
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt + 600, pourDurationMs(folds[1] + foldMs, pour)) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          swooshing.tick(ms, now);
          folding.tick(ms, now);
          snapping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          const s1 = openAt(t, 0);
          const s2 = t >= folds[1] ? openAt(t, 1) : 0;
          if (s1 <= 0) return;
          drawMirroredLeft(ctx, shot, s1, top, height);
          if (s2 > 0) {
            // the top half as it now stands, mirrored down over the bottom
            ctx.save();
            ctx.translate(0, cy);
            ctx.scale(1, -s2);
            ctx.translate(0, -cy);
            drawScreenPart(
              ctx,
              shot,
              left,
              top,
              halfW,
              halfH,
              left,
              top,
              halfW,
              halfH,
            );
            drawMirroredLeft(ctx, shot, s1, top, halfH);
            ctx.restore();
          }
          a.x = b.x = cx;
          a.y = top;
          b.y = area.bottom;
          drawBeam(ctx, a, b, SEAM, 0.5 + 0.5 * s1);
          if (s2 <= 0) return;
          a.x = left;
          b.x = area.right;
          a.y = b.y = cy;
          drawBeam(ctx, a, b, SEAM, 0.5 + 0.5 * s2);
        },
        drawOver: (ctx, ms, now) =>
          drawDetonation(ctx, mid, ms - endAt, COLOSSAL, now),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
