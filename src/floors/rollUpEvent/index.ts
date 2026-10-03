// the "Roll Up" event (experiment: the frozen screen rolls up like a blind;
// cash): it covers its crit, whose click freezes the screen and its bottom
// edge starts rolling up into a fat roll, the whole screen winding up like
// a window blind, revealing a blaze of gold behind it with rivers of cash
// gushing up out of it into the total, every gush a jolt; the roll hangs at
// the top, trembling, then snaps back down in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { pourLine, sampleLine, totalSpot, type Pour } from "../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "rollUp";
const REWARD = 4;
// the roll's radius, and how high it winds before it hangs
const ROLL = 70;
const STOP = 0.18;
const GUSHES = 5;
const EDGE = 8;
const VOID = "rgba(0,0,0,0.85)";
const SHADE = "rgba(0,0,0,0.45)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const GLOW = fadeStops(COLOR.white, 0.2);
const GUSH_SHAKE: [number, number] = [0.4, 1];

export const forceRollUpEvent = registerWispEvent(
  KEY,
  "Roll Up",
  () => CONFIG.rollUpEvent.chance,
  (floor, context, area) => {
    const { rollMs, hangMs, snapMs, holdMs, mergeMs } = CONFIG.rollUpEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const highest = top + height * STOP;
    const snapsAt = rollMs + hangMs;
    const endAt = snapsAt + snapMs;
    // the roll's middle: winding up, hanging, then snapping back down
    const edge = (ms: number) => {
      if (ms < rollMs)
        return lerp([area.bottom, highest], easeIn(clamp01(ms / rollMs)));
      if (ms < snapsAt) return highest + Math.sin(ms * 0.08) * 4;
      return lerp(
        [highest, area.bottom],
        easeIn(clamp01((ms - snapsAt) / snapMs)),
      );
    };
    const gushes = Array.from({ length: GUSHES }, (_, i) => {
      const ms = (rollMs * (i + 1)) / (GUSHES + 1);
      const x =
        left +
        width * ((i % 2 === 0 ? 0.3 : 0.7) + (Math.random() - 0.5) * 0.2);
      const from: Point = { x, y: area.bottom - 30 };
      return {
        ms,
        from,
        line: sampleLine(
          (u) => ({
            x:
              lerp([from.x, total.x], u) +
              Math.sin(Math.PI * u) * (x - total.x) * 0.4,
            y: lerp([from.y, total.y], u),
          }),
          30,
        ),
      };
    });
    const pour: Pour = {
      coinsAlong: 220,
      width: 44,
      streamMs: rollMs * 0.35,
      travelMs: 650,
    };

    let shot: ScreenCopy | null = null;
    const gushing = createBeats(
      gushes,
      (g) => g.ms,
      (g, k) => {
        pourLine(cover!, g.line, pour);
        cover!.burst(g.from, 0.6);
        if (cover!.isLive()) shakeScreen(lerp(GUSH_SHAKE, k / (GUSHES - 1)));
      },
    );
    const slamming = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playExplosion();
        cover!.blast(cover!.total() ?? total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs + pour.travelMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gushing.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const y = edge(Math.max(0, ms));
          if (y >= area.bottom) return;
          ctx.save();
          // what's been rolled away: a blaze of gold behind the screen
          ctx.fillStyle = VOID;
          ctx.fillRect(left, y, width, area.bottom - y);
          ctx.globalCompositeOperation = "lighter";
          const open = area.bottom - y;
          drawGlow(
            ctx,
            GOLD,
            left + width / 2,
            area.bottom,
            width * 0.7,
            Math.min(3, (open * 1.4) / (width * 0.7)),
          );
          drawGlow(
            ctx,
            GLOW,
            left + width / 2,
            area.bottom,
            width * 0.45,
            Math.min(3, open / (width * 0.45)),
          );
          ctx.globalCompositeOperation = "source-over";
          // the screen still hanging above the roll
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            y - top,
            left,
            top,
            width,
            y - top,
          );
          // the roll: the rows just below the edge wound round a tube
          drawScreenPart(
            ctx,
            shot,
            left,
            y,
            width,
            ROLL,
            left,
            y - ROLL * 0.5,
            width,
            ROLL * 0.5,
          );
          ctx.fillStyle = SHADE;
          ctx.fillRect(left, y - ROLL * 0.5, width, ROLL * 0.5);
          drawScreenPart(
            ctx,
            shot,
            left,
            y + ROLL,
            width,
            ROLL * 1.5,
            left,
            y,
            width,
            ROLL,
          );
          drawScreenPart(
            ctx,
            shot,
            left,
            y + ROLL * 2.5,
            width,
            ROLL,
            left,
            y + ROLL,
            width,
            ROLL * 0.45,
          );
          ctx.fillRect(left, y + ROLL, width, ROLL * 0.45);
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.fillRect(left, y - ROLL * 0.5 - EDGE / 2, width, EDGE);
          ctx.fillRect(left, y + ROLL * 1.45 - EDGE / 2, width, EDGE);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
