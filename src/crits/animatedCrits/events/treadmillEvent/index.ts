// the "Treadmill" event (experiment: the frozen screen runs sideways; cash):
// it covers its crit, whose click freezes the screen and the whole frame
// starts sliding sideways and wrapping round like a treadmill belt, faster
// and faster until it's a blur; every full lap it comes round, a bang, a
// jolt and coins flung off the edge it's running toward; then it brakes
// hard and lands back exactly in place with a lurch, in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "treadmill";
const REWARD = 4;
const POWER = 2.2;
const BRAKE_MS = 260;
const SEAM = 8;
const COINS = 14;
const LAP_SHAKE: [number, number] = [0.5, 1.4];

export const forceTreadmillEvent = registerWispEvent(
  KEY,
  "Treadmill",
  () => CONFIG.treadmillEvent.chance,
  (floor, context, area) => {
    const { runMs, laps, holdMs, mergeMs } = CONFIG.treadmillEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid = { x: left + width / 2, y: top + height / 2 };
    // distance run: laps whole widths by runMs, then a braking overshoot home
    const run = (ms: number) => laps * width * clamp01(ms / runMs) ** POWER;
    const lapTimes = Array.from(
      { length: laps },
      (_, k) => runMs * ((k + 1) / laps) ** (1 / POWER),
    );
    const brakeFrom = run(runMs - BRAKE_MS);
    const endAt = runMs;
    const offset = (ms: number) => {
      if (ms < runMs - BRAKE_MS) return run(ms) % width;
      const u = easeOutBack(clamp01((ms - (runMs - BRAKE_MS)) / BRAKE_MS));
      return lerp([brakeFrom, laps * width], u) % width;
    };
    const edge = { x: area.right - 20, y: mid.y };

    let shot: ScreenCopy | null = null;
    const lapping = createBeats(
      lapTimes.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        cover!.launchFrom(
          edge,
          clampTargetsY(
            sprayTargets(edge, COINS, [80, 300], Math.PI, Math.PI * 0.7),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAP_SHAKE, k / Math.max(1, laps - 2)));
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
          lapping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const o = offset(ms);
          ctx.save();
          ctx.beginPath();
          ctx.rect(left, top, width, height);
          ctx.clip();
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left + o,
            top,
            width,
            height,
          );
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left + o - width,
            top,
            width,
            height,
          );
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.fillRect(left + o - SEAM / 2, top, SEAM, height);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
