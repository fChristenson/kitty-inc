// the "Video Wall" event (experiment: the frozen screen tiled like a wall of
// TVs; cash): it covers its crit, whose click freezes the screen and on
// every beat it punches out into a bigger wall of copies of itself, two by
// two, three by three, four by four, six by six, each a thump, a jolt and
// coins bursting out of the screens; then every screen but one cuts out
// and the one showing the clicked floor's button zooms back up to fill the
// view in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "videoWall";
const REWARD = 4;
const BEHIND = "#0B0814";
const GRIDS = [2, 3, 4, 6];
const GAP = 4;
const PUNCH_MS = 220;
const BEAT_COINS = 30;
const BEAT_SHAKE: [number, number] = [0.6, 1.4];

export const forceVideoWallEvent = registerWispEvent(
  KEY,
  "Video Wall",
  () => CONFIG.videoWallEvent.chance,
  (floor, context, area) => {
    const { beatsMs, zoomMs, holdMs, mergeMs } = CONFIG.videoWallEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre = { x: left + width / 2, y: top + height / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const zoomAt = beatsMs[beatsMs.length - 1] + PUNCH_MS;
    const endAt = zoomAt + zoomMs;
    const last = GRIDS[GRIDS.length - 1];
    // the screen on the final wall that shows the button
    const keepCol = Math.min(
      last - 1,
      Math.max(0, Math.floor(((button.x - left) / width) * last)),
    );
    const keepRow = Math.min(
      last - 1,
      Math.max(0, Math.floor(((button.y - top) / height) * last)),
    );
    // the wall at ms: its grid, and how far it's zoomed in past its size
    const wall = (ms: number) => {
      let k = -1;
      while (k + 1 < beatsMs.length && ms >= beatsMs[k + 1]) k++;
      if (k < 0) return { n: 1, zoom: 1 };
      const n = GRIDS[k];
      const was = k === 0 ? 1 : GRIDS[k - 1];
      const u = clamp01((ms - beatsMs[k]) / PUNCH_MS);
      return { n, zoom: lerp([n / was, 1], easeOutBack(u)) };
    };

    let shot: ScreenCopy | null = null;
    const beating = createBeats(
      [...beatsMs],
      (ms) => ms,
      (_, k) => {
        cover!.launchFrom(
          centre,
          clampTargetsY(
            sprayTargets(centre, BEAT_COINS, [120, 420]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BEAT_SHAKE, k / Math.max(1, beatsMs.length - 1)));
      },
    );
    const zooming = createBeats(
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
          beating.tick(ms, now);
          zooming.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt || ms < beatsMs[0]) {
            if (ms >= endAt) shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          if (ms >= zoomAt) {
            const u = easeIn(clamp01((ms - zoomAt) / zoomMs));
            const tw = width / last;
            const th = height / last;
            drawScreenPart(
              ctx,
              shot,
              left,
              top,
              width,
              height,
              lerp([left + keepCol * tw + GAP / 2, left], u),
              lerp([top + keepRow * th + GAP / 2, top], u),
              lerp([tw - GAP, width], u),
              lerp([th - GAP, height], u),
            );
            ctx.restore();
            return;
          }
          const { n, zoom } = wall(ms);
          const tw = (width / n) * zoom;
          const th = (height / n) * zoom;
          const x0 = centre.x - (tw * n) / 2;
          const y0 = centre.y - (th * n) / 2;
          for (let row = 0; row < n; row++)
            for (let col = 0; col < n; col++)
              drawScreenPart(
                ctx,
                shot,
                left,
                top,
                width,
                height,
                x0 + col * tw + GAP / 2,
                y0 + row * th + GAP / 2,
                tw - GAP,
                th - GAP,
              );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
