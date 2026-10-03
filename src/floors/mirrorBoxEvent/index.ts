// the "Mirror Box" event (experiment: the frozen screen mirrors itself;
// cash): it covers its crit, whose click freezes the screen and on every
// beat half of it swings over like a page and becomes a mirror image of the
// other half, across the clicked floor's button: left onto right, then top
// onto bottom, then both at once into a four-way mirror, then the other
// ways, each swing a whoosh, a jolt and coins bursting out of the mirror
// line; then the mirrors shatter back to the plain screen in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "mirrorBox";
const REWARD = 4;
// which half each beat mirrors onto the other: x from the left (1) or the
// right (-1), y from the top (1) or the bottom (-1), 0 for neither
const MIRRORS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
];
const SWING_MS = 150;
const SEAM = 6;
const COINS = 16;
const SWING_SHAKE: [number, number] = [0.5, 1.3];

export const forceMirrorBoxEvent = registerWispEvent(
  KEY,
  "Mirror Box",
  () => CONFIG.mirrorBoxEvent.chance,
  (floor, context, area) => {
    const { swingsMs, holdMs, mergeMs } = CONFIG.mirrorBoxEvent;
    const left = area.left;
    const top = area.top;
    const right = area.right;
    const bottom = area.bottom;
    const button = getButtonCenter(context.isGroundFloor);
    const ax = Math.min(right - 60, Math.max(left + 60, button.x));
    const ay = Math.min(bottom - 60, Math.max(top + 60, button.y));
    const swings: number[] = [];
    let clock = 100;
    MIRRORS.forEach((_, k) => {
      swings.push(clock);
      clock += lerp(swingsMs, k / (MIRRORS.length - 1));
    });
    const endAt = clock;

    // the source half (left/top when +1) laid flipped over the other half,
    // its swing `s` 0..1 folding it over from the mirror line
    const mirror = (
      ctx: CanvasRenderingContext2D,
      shot: ScreenCopy,
      mx: number,
      my: number,
      s: number,
    ) => {
      const sx = mx === 0 ? left : mx > 0 ? left : ax;
      const sw = mx === 0 ? right - left : mx > 0 ? ax - left : right - ax;
      const sy = my === 0 ? top : my > 0 ? top : ay;
      const sh = my === 0 ? bottom - top : my > 0 ? ay - top : bottom - ay;
      ctx.save();
      ctx.translate(mx === 0 ? 0 : ax, my === 0 ? 0 : ay);
      ctx.scale(mx === 0 ? 1 : -s, my === 0 ? 1 : -s);
      ctx.translate(mx === 0 ? 0 : -ax, my === 0 ? 0 : -ay);
      drawScreenPart(ctx, shot, sx, sy, sw, sh, sx, sy, sw, sh);
      ctx.restore();
    };

    let shot: ScreenCopy | null = null;
    const swinging = createBeats(
      swings,
      (ms) => ms,
      (_, k) => {
        const m = MIRRORS[k];
        const at = {
          x: m.x === 0 ? (left + right) / 2 : ax,
          y: m.y === 0 ? (top + bottom) / 2 : ay,
        };
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, [60, 240]),
            top + 40,
            bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SWING_SHAKE, k / (MIRRORS.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast({ x: ax, y: ay }),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          swinging.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          let k = -1;
          while (k + 1 < swings.length && ms >= swings[k + 1]) k++;
          if (k < 0) return;
          const m = MIRRORS[k];
          const s = easeOutBack(clamp01((ms - swings[k]) / SWING_MS));
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, right - left, bottom - top);
          ctx.clip();
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            right - left,
            bottom - top,
            left,
            top,
            right - left,
            bottom - top,
          );
          if (m.x !== 0) mirror(ctx, shot, m.x, 0, s);
          if (m.y !== 0) mirror(ctx, shot, 0, m.y, s);
          if (m.x !== 0 && m.y !== 0) mirror(ctx, shot, m.x, m.y, s);
          ctx.fillStyle = COLOR.heavenlyGold;
          if (m.x !== 0) ctx.fillRect(ax - SEAM / 2, top, SEAM, bottom - top);
          if (m.y !== 0) ctx.fillRect(left, ay - SEAM / 2, right - left, SEAM);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
