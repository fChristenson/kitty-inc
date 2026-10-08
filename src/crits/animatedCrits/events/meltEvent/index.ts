// the "Melt" event (experiment: the frozen screen melts; cash): it covers
// its crit, whose click freezes the screen and the whole frame starts to
// melt like wax, thin columns of it sagging and dripping down the screen at
// their own pace, ever further, cash dripping off the sagging edge with a
// bloop and a jolt; then it snaps back up solid in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "melt";
const REWARD = 4;
const BEHIND = "#0B0814";
const COLUMNS = 24;
// columns sag up to SAG of the screen's height
const SAG = 0.38;
const SNAP_MS = 140;
const DRIP_COINS = 14;
const DRIP_SHAKE: [number, number] = [0.5, 1.2];

export const forceMeltEvent = registerWispEvent(
  KEY,
  "Melt",
  () => CONFIG.meltEvent.chance,
  (floor, context, area) => {
    const { meltMs, drips, holdMs, mergeMs } = CONFIG.meltEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const colW = width / COLUMNS;
    const p1 = Math.random() * 6;
    const p2 = Math.random() * 6;
    // smooth, uneven sag along the screen
    const sags = Array.from({ length: COLUMNS }, (_, i) => {
      const u = i / COLUMNS;
      const wave =
        0.55 + 0.25 * Math.sin(u * 7 + p1) + 0.2 * Math.sin(u * 17 + p2);
      return height * SAG * clamp01(wave) * (0.8 + 0.2 * Math.random());
    });
    const endAt = meltMs + SNAP_MS;
    const sag = (i: number, ms: number) =>
      ms < meltMs
        ? sags[i] * easeIn(ms / meltMs)
        : sags[i] * (1 - easeOut(clamp01((ms - meltMs) / SNAP_MS)));
    const dripAt = Array.from(
      { length: drips },
      (_, k) => meltMs * (0.3 + (0.7 * (k + 1)) / (drips + 1)),
    );

    let shot: ScreenCopy | null = null;
    const dripping = createBeats(
      dripAt,
      (ms) => ms,
      (ms, k) => {
        let deepest = 0;
        for (let i = 1; i < COLUMNS; i++)
          if (sag(i, ms) > sag(deepest, ms)) deepest = i;
        const at = {
          x: left + (deepest + 0.5) * colW,
          y: top + sag(deepest, ms),
        };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, DRIP_COINS, [80, 240], Math.PI / 2, Math.PI * 0.7),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DRIP_SHAKE, k / Math.max(1, drips - 1)));
      },
    );
    const snapping = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast({ x: left + width / 2, y: top + height / 2 }),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          dripping.tick(ms, now);
          snapping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          for (let i = 0; i < COLUMNS; i++) {
            const x = left + i * colW;
            // a hair wider so no seams show between columns
            drawScreenPart(
              ctx,
              shot,
              x,
              top,
              colW + 1,
              height,
              x,
              top + sag(i, ms),
              colW + 1,
              height,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
