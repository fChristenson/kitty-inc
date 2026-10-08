// the "Fold" event (an experiment beyond the six templates: the frozen
// screen folds up like a sheet of paper): it covers its crit, whose click
// freezes the screen while its top half folds down over the bottom with a
// slap, turning over to a gold back, then the folded sheet's left half folds
// over its right, each fold a bang, a jolt and coins bursting out of the
// crease; then it all springs open in a white flash and a huge blast that
// sprays cash everywhere, and the coins sweep into the total. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";

const KEY = "fold";
const REWARD = 4;
const BEHIND = "#0B0814";
const SECOND_BACK = "#B8860B";
const CREASE_COINS = 22;
const FOLD_SHAKE = [1.3, 1.8];

export const forceFoldEvent = registerWispEvent(
  KEY,
  "Fold",
  () => CONFIG.foldEvent.chance,
  (floor, context, area) => {
    const { foldMs, gapMs, holdOpenMs, holdMs, mergeMs } = CONFIG.foldEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const midY = top + height / 2;
    const midX = left + width / 2;
    const folds = [0, foldMs + gapMs];
    const openAt = folds[1] + foldMs + holdOpenMs;
    const creases: [Point, Point][] = [
      [
        { x: left, y: midY },
        { x: area.right, y: midY },
      ],
      [
        { x: midX, y: midY },
        { x: midX, y: area.bottom },
      ],
    ];

    let shot: ScreenCopy | null = null;
    const landing = createBeats(
      folds.map((at) => at + foldMs),
      (ms) => ms,
      (_, k) => {
        const [a, b] = creases[k];
        for (let i = 0; i < 3; i++) {
          const at = {
            x: a.x + ((b.x - a.x) * (i + 0.5)) / 3,
            y: a.y + ((b.y - a.y) * (i + 0.5)) / 3,
          };
          cover!.launchFrom(
            at,
            clampTargetsY(
              sprayTargets(
                at,
                CREASE_COINS / 3,
                [60, 240],
                -Math.PI / 2,
                Math.PI * 2,
              ),
              top + 40,
              area.bottom - 20,
            ),
          );
          cover!.burst(at, 0.7);
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
        if (cover?.isLive()) playSwoosh();
      },
    );
    const opening = createBeats(
      [openAt],
      (ms) => ms,
      () => cover!.blast({ x: midX, y: midY }),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          swooshing.tick(ms, now);
          landing.tick(ms, now);
          opening.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= openAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          // 0..1 through each fold: the flap squashes to its crease, then its
          // back opens out the far side
          const u1 = easeIn(clamp01(ms / foldMs));
          const u2 = easeIn(clamp01((ms - folds[1]) / foldMs));
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          // the bottom half, under the first flap until the second fold lifts it
          if (u2 <= 0)
            drawScreenPart(
              ctx,
              shot,
              left,
              midY,
              width,
              height / 2,
              left,
              midY,
              width,
              height / 2,
            );
          // first fold: the top half
          const c1 = Math.cos(Math.PI * u1);
          if (c1 > 0) {
            const h = (height / 2) * c1;
            drawScreenPart(
              ctx,
              shot,
              left,
              top,
              width,
              height / 2,
              left,
              midY - h,
              width,
              h,
            );
          } else {
            ctx.fillStyle = COLOR.heavenlyGold;
            const h = (height / 2) * -c1;
            // once the second fold starts, its left half goes with it
            const w = u2 > 0 ? width / 2 : width;
            ctx.fillRect(u2 > 0 ? midX : left, midY, w, h);
          }
          if (u2 > 0) {
            const c2 = Math.cos(Math.PI * u2);
            if (c2 > 0) {
              const w = (width / 2) * c2;
              ctx.fillStyle = COLOR.heavenlyGold;
              ctx.fillRect(midX - w, midY, w, height / 2);
            } else {
              const w = (width / 2) * -c2;
              ctx.fillStyle = SECOND_BACK;
              ctx.fillRect(midX, midY, w, height / 2);
            }
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
