// the "Shredder" event (experiment: the frozen screen is fed through a
// shredder; cash): it covers its crit, whose click freezes the screen and a
// glowing gold slit lights up across its lower part; the whole screen jerks
// down into it, feeding through and coming out underneath in flapping
// ribbons, every jerk a crunch, a jolt and rivers of cash spewing out of
// the shredded ribbons into the total; then the shredder jams and spits
// the whole screen back out in one piece in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import { pourLine, sampleLine, totalSpot, type Pour } from "../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "shredder";
const REWARD = 4;
// the slit sits SLIT of the way down; the screen feeds FEED of its height
const SLIT = 0.62;
const FEED = 0.42;
const JERKS = 5;
const RIBBONS = 14;
// each ribbon's share of its strip, the rest a gap
const RIBBON = 0.72;
const FLAP = 9;
const SPLAY = 0.25;
const SLIT_GLOW = 14;
const VOID = "rgba(0,0,0,0.85)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const JERK_SHAKE: [number, number] = [0.6, 1.3];

export const forceShredderEvent = registerWispEvent(
  KEY,
  "Shredder",
  () => CONFIG.shredderEvent.chance,
  (floor, context, area) => {
    const { jerksMs, spitMs, holdMs, mergeMs } = CONFIG.shredderEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const slitY = top + height * SLIT;
    const total = totalSpot(area);
    const strip = width / RIBBONS;
    let clock = 0;
    const jerks = Array.from({ length: JERKS }, (_, k) => {
      clock += lerp(jerksMs, k / (JERKS - 1));
      return clock;
    });
    const spitsAt = clock;
    const endAt = spitsAt + spitMs;
    // how far down the screen has fed: a jerk of FEED / JERKS each beat
    const fed = (ms: number) => {
      if (ms >= spitsAt)
        return height * FEED * (1 - easeOut(clamp01((ms - spitsAt) / spitMs)));
      let down = 0;
      let since = 0;
      for (const at of jerks) {
        const step = height * (FEED / JERKS);
        if (ms >= at) down += step;
        else {
          down += step * easeOut(clamp01((ms - since) / (at - since))) * 0.25;
          break;
        }
        since = at;
      }
      return down;
    };
    const rivers = jerks.map((ms, k) => {
      const x = left + strip * (2 + ((k * 5) % (RIBBONS - 3)));
      const from: Point = { x, y: slitY + 120 };
      return {
        ms,
        from,
        line: sampleLine(
          (u) => ({
            x:
              lerp([from.x, total.x], u) +
              Math.sin(Math.PI * u) * 160 * (k % 2 ? 1 : -1),
            y: lerp([from.y, total.y], u),
          }),
          30,
        ),
      };
    });
    const pour: Pour = {
      coinsAlong: 200,
      width: 40,
      streamMs: 180,
      travelMs: 600,
    };

    let shot: ScreenCopy | null = null;
    const jerking = createBeats(
      rivers,
      (r) => r.ms,
      (r, k) => {
        pourLine(cover!, r.line, pour);
        cover!.burst(r.from, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(JERK_SHAKE, k / (JERKS - 1)));
      },
    );
    const spitting = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );
    const slitFrom: Point = { x: left, y: slitY };
    const slitTo: Point = { x: left + width, y: slitY };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs + pour.travelMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          jerking.tick(ms, now);
          spitting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const d = fed(Math.max(0, ms));
          ctx.save();
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          // the screen above the slit, slid down into it
          drawScreenPart(
            ctx,
            shot,
            left,
            top,
            width,
            slitY - d - top,
            left,
            top + d,
            width,
            slitY - d - top,
          );
          // out the bottom in flapping ribbons, splaying apart as they fall
          const below = area.bottom - slitY;
          const cut = clamp01(d / (height * FEED * 0.3));
          const ribbon = strip * lerp([1, RIBBON], cut);
          for (let i = 0; i < RIBBONS; i++) {
            const x = left + i * strip;
            const splay =
              (i - (RIBBONS - 1) / 2) * SPLAY * strip * (d / (height * FEED));
            const flap = Math.sin(ms * 0.03 + i * 1.7) * FLAP * cut;
            drawScreenPart(
              ctx,
              shot,
              x,
              slitY - d,
              ribbon,
              below,
              x + splay + flap,
              slitY + (i % 2) * 10 * cut,
              ribbon,
              below,
            );
          }
          ctx.globalCompositeOperation = "lighter";
          drawGlow(ctx, GOLD, left + width / 2, slitY, width * 0.6, 0.12);
          drawBeam(ctx, slitFrom, slitTo, SLIT_GLOW, 0.9);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
