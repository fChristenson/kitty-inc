// the "Vertical Hold" event (experiment: the screen rolls like an old TV
// losing its vertical hold; cash): it covers its crit, whose click freezes
// the screen, which jitters, slips and starts to roll, the whole frame
// scrolling down and wrapping round with a blazing gold bar between one
// copy and the next, rolling faster and faster, cash gushing out of the bar
// with a jolt every time it rolls past; then the picture locks back in place
// with a thunk in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
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

const KEY = "verticalHold";
const REWARD = 4;
const ROLLS = 5;
const BAR = 70;
const JITTER = 8;
const SPRAY = 24;
const COLOSSAL = 560;
const VOID = "rgba(0,0,0,0.9)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white);
const ROLL_SHAKE: [number, number] = [0.5, 1.2];
const LOCK_SHAKE = 2.3;

export const forceVerticalHoldEvent = registerWispEvent(
  KEY,
  "Vertical Hold",
  () => CONFIG.verticalHoldEvent.chance,
  (floor, context, area) => {
    const { slipMs, rollsMs, lockMs, holdMs, mergeMs } =
      CONFIG.verticalHoldEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const period = height + BAR;
    const total = totalSpot(area);
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    let clock = slipMs;
    const rolls = Array.from({ length: ROLLS }, (_, k) => {
      const starts = clock;
      clock += lerp(rollsMs, k / (ROLLS - 1));
      return { starts, ends: clock };
    });
    const locksAt = clock + lockMs;
    // how far the picture has rolled down, wrapping every period
    const rolledAt = (ms: number) => {
      if (ms < slipMs) return 0;
      for (let k = 0; k < ROLLS; k++) {
        const r = rolls[k];
        if (ms < r.ends)
          return ((k + (ms - r.starts) / (r.ends - r.starts)) % 1) * period;
      }
      // a last part-roll easing to rest back in place
      return (
        lerp([0, period], easeOut(clamp01((ms - clock) / lockMs))) % period
      );
    };
    const pour: Pour = {
      coinsAlong: 160,
      width: 30,
      streamMs: 260,
      travelMs: 600,
    };
    const into: Point = { x: 0, y: 0 };
    // the bar crosses the middle of the screen halfway through each roll
    const gushes = rolls.map((r) => {
      const at: Point = {
        x: mid.x + (Math.random() - 0.5) * width * 0.5,
        y: mid.y,
      };
      const bend: Point = {
        x: at.x + (at.x < total.x ? -1 : 1) * 200,
        y: lerp([at.y, total.y], 0.5),
      };
      return {
        ms: (r.starts + r.ends) / 2,
        at,
        line: sampleLine((u) => ({ ...bezier(at, bend, total, u, into) }), 24),
      };
    });

    let shot: ScreenCopy | null = null;
    const rolling = createBeats(
      gushes,
      (g) => g.ms,
      (g, k) => {
        pourLine(cover!, g.line, pour);
        cover!.launchFrom(
          g.at,
          clampTargetsY(
            sprayTargets(g.at, SPRAY, [80, 260]),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(ROLL_SHAKE, k / (ROLLS - 1)));
      },
    );
    const locking = createBeats(
      [locksAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(LOCK_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(locksAt + 600, pourDurationMs(gushes[ROLLS - 1].ms, pour)) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          rolling.tick(ms, now);
          locking.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= locksAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          // slipping: a jitter that builds before it lets go
          const jitter =
            t < slipMs ? Math.sin(t * 0.09) * JITTER * (t / slipMs) : 0;
          const rolled = rolledAt(t) + jitter;
          if (rolled === 0) return;
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            height,
            left,
            top + rolled,
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
            left,
            top + rolled - period,
            width,
            height,
          );
          // the bar between the bottom of one copy and the top of the next
          const barY = top + rolled - BAR / 2;
          ctx.globalCompositeOperation = "lighter";
          drawGlow(
            ctx,
            GOLD,
            mid.x,
            barY,
            width * 0.7,
            (BAR * 1.6) / (width * 1.4),
          );
          drawGlow(
            ctx,
            WHITE,
            mid.x,
            barY,
            width * 0.55,
            (BAR * 0.5) / (width * 1.1),
          );
          ctx.globalCompositeOperation = "source-over";
        },
        drawOver: (ctx, ms, now) =>
          drawDetonation(ctx, mid, ms - locksAt, COLOSSAL, now),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
