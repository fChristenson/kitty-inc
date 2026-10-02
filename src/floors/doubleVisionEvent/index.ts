// the "Double Vision" event (experiment: the frozen screen seen double;
// cash): it covers its crit, whose click freezes the screen and the frame
// splits into ghost copies of itself that lurch apart on every beat, each
// further, like a punch-drunk double take, every lurch a bloop, a jolt and
// coins spilling out of the middle; then they slam back together into one
// sharp screen in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "doubleVision";
const REWARD = 4;
// each lurch spreads the ghosts out to SPREAD px, overshooting into place
const SPREAD: [number, number] = [26, 90];
const LURCH_MS = 140;
const SLAM_MS = 110;
const GHOST = 0.5;
const LURCH_COINS = 18;
const LURCH_SHAKE: [number, number] = [0.6, 1.4];
// the ghosts' directions: left-up and right-down
const GHOSTS = [
  { x: -1, y: -0.35 },
  { x: 1, y: 0.35 },
];

export const forceDoubleVisionEvent = registerWispEvent(
  KEY,
  "Double Vision",
  () => CONFIG.doubleVisionEvent.chance,
  (floor, context, area) => {
    const { lurchesMs, holdMs, mergeMs } = CONFIG.doubleVisionEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre = { x: left + width / 2, y: top + height / 2 };
    const slamAt = lurchesMs[lurchesMs.length - 1] + LURCH_MS * 2;
    const endAt = slamAt + SLAM_MS;
    const spreads = lurchesMs.map((_, k) =>
      lerp(SPREAD, k / Math.max(1, lurchesMs.length - 1)),
    );
    const spread = (ms: number) => {
      if (ms >= slamAt)
        return (
          spreads[spreads.length - 1] *
          (1 - easeIn(clamp01((ms - slamAt) / SLAM_MS)))
        );
      let k = -1;
      while (k + 1 < lurchesMs.length && ms >= lurchesMs[k + 1]) k++;
      if (k < 0) return 0;
      const from = k === 0 ? 0 : spreads[k - 1];
      return lerp(
        [from, spreads[k]],
        easeOutBack(clamp01((ms - lurchesMs[k]) / LURCH_MS)),
      );
    };

    let shot: ScreenCopy | null = null;
    const lurching = createBeats(
      [...lurchesMs],
      (ms) => ms,
      (_, k) => {
        cover!.launchFrom(
          centre,
          clampTargetsY(
            sprayTargets(centre, LURCH_COINS, [100, 300]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LURCH_SHAKE, k / Math.max(1, lurchesMs.length - 1)));
      },
    );
    const slamming = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          lurching.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const s = spread(ms);
          ctx.save();
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height,
          );
          ctx.globalAlpha = GHOST;
          for (const g of GHOSTS)
            drawScreenPart(
              ctx,
              shot,
              left,
              top,
              width,
              height,
              left + g.x * s,
              top + g.y * s,
              width,
              height,
            );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
