// the "Screen Reels" event (experiment: the frozen screen as slot reels;
// cash): it covers its crit, whose click freezes the screen and it splits
// into five tall columns that spin downward like slot machine reels, faster
// and faster until the screen is a blur; then the reels clunk to a stop one
// by one, left to right, each landing back on its own slice of the screen
// with a bang, a jolt and a spray of coins; the last stop lines the screen
// up whole again in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "screenReels";
const REWARD = 4;
const REELS = 5;
const POWER = 1.7;
const SETTLE_MS = 160;
const DIVIDER = 6;
const COINS = 16;
const COIN_REACH: [number, number] = [60, 220];
const STOP_SHAKE: [number, number] = [0.6, 1.4];

export const forceScreenReelsEvent = registerWispEvent(
  KEY,
  "Screen Reels",
  () => CONFIG.screenReelsEvent.chance,
  (floor, context, area) => {
    const { spinMs, stopGapMs, speed, holdMs, mergeMs } =
      CONFIG.screenReelsEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const reelW = width / REELS;
    const spun = (ms: number) => speed * Math.max(0, ms) ** POWER;
    const reels = Array.from({ length: REELS }, (_, c) => {
      const stops = spinMs + c * stopGapMs;
      const from = spun(stops - SETTLE_MS);
      // lands a whole number of turns round, so the slice sits back in place
      const rest = Math.ceil(from / height + 0.5) * height;
      return {
        x: left + c * reelW,
        stops,
        from,
        rest,
        centre: { x: left + (c + 0.5) * reelW, y: top + height / 2 },
      };
    });
    const endAt = reels[REELS - 1].stops + 60;
    const offset = (r: (typeof reels)[number], ms: number) => {
      if (ms >= r.stops) return 0;
      if (ms < r.stops - SETTLE_MS) return spun(ms) % height;
      const u = easeOutBack(clamp01((ms - (r.stops - SETTLE_MS)) / SETTLE_MS));
      return lerp([r.from, r.rest], u) % height;
    };

    let shot: ScreenCopy | null = null;
    const stopping = createBeats(
      reels,
      (r) => r.stops,
      (r, k) => {
        cover!.launchFrom(
          r.centre,
          clampTargetsY(
            ringTargets(r.centre, COINS, COIN_REACH),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STOP_SHAKE, k / (REELS - 1)));
      },
    );
    const finale = createBeats(
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
          stopping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, width, height);
          ctx.clip();
          for (const r of reels) {
            const o = offset(r, ms);
            drawScreenPart(
              ctx,
              shot,
              r.x,
              top,
              reelW,
              height,
              r.x,
              top + o,
              reelW,
              height,
            );
            drawScreenPart(
              ctx,
              shot,
              r.x,
              top,
              reelW,
              height,
              r.x,
              top + o - height,
              reelW,
              height,
            );
          }
          ctx.fillStyle = COLOR.heavenlyGold;
          for (let c = 1; c < REELS; c++)
            ctx.fillRect(left + c * reelW - DIVIDER / 2, top, DIVIDER, height);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
