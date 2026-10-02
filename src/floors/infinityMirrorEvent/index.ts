// the "Infinity Mirror" event (experiment: the frozen screen nested inside
// itself; cash): it covers its crit, whose click freezes the screen and it
// turns into an infinity mirror, the whole frame shrinking into a copy of
// itself round the clicked floor's button, inside a copy, inside a copy;
// the view dives in through them, ever faster, every frame it passes a bang,
// a jolt and a spray of cash out of the middle; then it snaps back out to
// one plain screen in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "infinityMirror";
const REWARD = 4;
const BEHIND = "#0B0814";
const FRAME = "#B8860B";
// each copy is SHRINK the size of the one round it, framed BORDER px
const SHRINK = 0.62;
const COPIES = 7;
const BORDER = 10;
// the copies fan in over NEST ms, then the dive passes DIVES frames
const NEST_MS = 260;
const DIVES = 4;
const PASS_COINS = 16;
const PASS_SHAKE: [number, number] = [0.7, 1.5];

export const forceInfinityMirrorEvent = registerWispEvent(
  KEY,
  "Infinity Mirror",
  () => CONFIG.infinityMirrorEvent.chance,
  (floor, context, area) => {
    const { diveMs, holdMs, mergeMs } = CONFIG.infinityMirrorEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const eye = getButtonCenter(context.isGroundFloor);
    const endAt = NEST_MS + diveMs;
    // how many frames deep the view has dived, ms in
    const depth = (ms: number) =>
      easeIn(clamp01((ms - NEST_MS) / diveMs)) * DIVES;
    const passes = Array.from({ length: DIVES }, (_, k) => {
      const u = Math.sqrt((k + 1) / DIVES);
      return NEST_MS + diveMs * u;
    }).slice(0, -1);

    let shot: ScreenCopy | null = null;
    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, passes.length - 1);
        cover!.launchFrom(
          eye,
          clampTargetsY(
            sprayTargets(eye, PASS_COINS, [120, 320]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PASS_SHAKE, t));
      },
    );
    const snapping = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(eye),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          passing.tick(ms, now);
          snapping.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const nest = clamp01(ms / NEST_MS);
          const dive = depth(ms) % 1;
          ctx.save();
          ctx.fillStyle = BEHIND;
          ctx.fillRect(left, top, width, height);
          // outermost first, each copy drawn over the one round it
          for (let j = -1; j < COPIES; j++) {
            const k = SHRINK ** (j - dive);
            const scale = 1 - (1 - k) * nest;
            const x = eye.x + (left - eye.x) * scale;
            const y = eye.y + (top - eye.y) * scale;
            const w = width * scale;
            const h = height * scale;
            if (w < 8) break;
            ctx.fillStyle = FRAME;
            ctx.fillRect(
              x - BORDER,
              y - BORDER,
              w + BORDER * 2,
              h + BORDER * 2,
            );
            drawScreenPart(ctx, shot, left, top, width, height, x, y, w, h);
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
