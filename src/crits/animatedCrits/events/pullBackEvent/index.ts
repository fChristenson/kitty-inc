// the "Pull Back" event (experiment: the camera pulls out; cash): it covers
// its crit, whose click freezes the screen and the view yanks back: the
// whole frozen screen shrinks to a small picture floating in a vast dark,
// gold-lit void; it punches outward again and again like a speaker cone,
// each thump a bang, a jolt and a ring of coins flung off its edges into
// the dark; then the camera slams back in to fill the view in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "pullBack";
const REWARD = 4;
const SMALL = 0.36;
const PUNCH = 0.1;
const PUNCH_MS = 150;
const THUMPS = 5;
const FRAME = 6;
const COINS = 18;
const VOID = "rgba(0,0,0,0.92)";
const GLOW = fadeStops(COLOR.heavenlyGold);
const THUMP_SHAKE: [number, number] = [0.6, 1.4];

export const forcePullBackEvent = registerWispEvent(
  KEY,
  "Pull Back",
  () => CONFIG.pullBackEvent.chance,
  (floor, context, area) => {
    const { pullMs, thumpsMs, slamMs, holdMs, mergeMs } = CONFIG.pullBackEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid = { x: left + width / 2, y: top + height / 2 };
    const thumps: number[] = [];
    let clock = pullMs;
    for (let k = 0; k < THUMPS; k++) {
      clock += lerp(thumpsMs, k / (THUMPS - 1));
      thumps.push(clock);
    }
    const slamAt = clock + 120;
    const endAt = slamAt + slamMs;
    const scale = (ms: number) => {
      if (ms < pullMs)
        return lerp([1, SMALL], easeOutCubic(clamp01(ms / pullMs)));
      if (ms >= slamAt)
        return lerp([SMALL, 1], easeIn(clamp01((ms - slamAt) / slamMs)));
      let s = SMALL;
      for (const t of thumps) {
        const p = (ms - t) / PUNCH_MS;
        if (p > 0 && p < 1)
          s = SMALL * (1 + PUNCH * Math.sin(Math.PI * easeOutBack(p)));
      }
      return s;
    };

    let shot: ScreenCopy | null = null;
    const thumping = createBeats(
      thumps,
      (ms) => ms,
      (_, k) => {
        const reach: [number, number] = [width * SMALL * 0.6, width * 0.55];
        cover!.launchFrom(
          mid,
          clampTargetsY(
            ringTargets(mid, COINS, reach),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(THUMP_SHAKE, k / (THUMPS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(mid),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          thumping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const s = scale(ms);
          const w = width * s;
          const h = height * s;
          ctx.save();
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.7;
          drawGlow(ctx, GLOW, mid.x, mid.y, Math.max(w, h) * 0.9);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.fillRect(
            mid.x - w / 2 - FRAME,
            mid.y - h / 2 - FRAME,
            w + FRAME * 2,
            h + FRAME * 2,
          );
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            mid.x - w / 2,
            mid.y - h / 2,
            w,
            h,
          );
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
