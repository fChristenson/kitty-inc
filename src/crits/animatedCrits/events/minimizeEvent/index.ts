// the "Minimize" event (experiment: the screen is minimized like a window;
// cash): it covers its crit, whose click freezes the screen and the whole of
// it is sucked into the total like a window being minimized, pinching into a
// funnel and swooshing up into it top to bottom; the total bursts in a huge
// blast and shake, loops of cash gushing out of it and pouring back in, and
// the screen genies back out of it into place. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawDetonation } from "../../../../shared/explosion";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "minimize";
const REWARD = 4;
const STRIPS = 40;
// how far apart the top and bottom strips set off, as a share of the suck
const SPREAD = 0.55;
const NECK = 24;
const VOID = "rgba(0,0,0,0.9)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const LOOPS = 6;
const LOOP = 520;
const SWEEP = 1.1;
const COLOSSAL = 480;
const POP_SHAKE = 2.4;
const BACK_SHAKE = 0.8;

export const forceMinimizeEvent = registerWispEvent(
  KEY,
  "Minimize",
  () => CONFIG.minimizeEvent.chance,
  (floor, context, area) => {
    const { suckMs, gapMs, outMs, holdMs, mergeMs } = CONFIG.minimizeEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const midX = left + width / 2;
    const strip = height / STRIPS;
    const outAt = suckMs + gapMs;
    const endAt = outAt + outMs;
    // petals of cash curling out of the total and back into it
    const loops = Array.from({ length: LOOPS }, (_, i) => {
      const angle = Math.PI * (0.12 + (0.76 * i) / (LOOPS - 1));
      return sampleLine((u) => {
        const a = angle + (u - 0.5) * SWEEP;
        const r = Math.sin(Math.PI * u) * LOOP;
        return { x: total.x + Math.cos(a) * r, y: total.y + Math.sin(a) * r };
      }, 30);
    });
    const pour: Pour = {
      coinsAlong: 220,
      width: 34,
      streamMs: 420,
      travelMs: 700,
    };
    // how far strip i has been sucked in at ms, top strips first
    const sucked = (i: number, ms: number) => {
      const d = (i / (STRIPS - 1)) * SPREAD;
      if (ms < outAt) return easeIn(clamp01((ms / suckMs - d) / (1 - SPREAD)));
      return 1 - easeOut(clamp01(((ms - outAt) / outMs - d) / (1 - SPREAD)));
    };

    let shot: ScreenCopy | null = null;
    const popping = createBeats(
      [suckMs],
      (ms) => ms,
      () => {
        for (const line of loops) pourLine(cover!, line, pour);
        cover!.blast(cover!.total() ?? total);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(POP_SHAKE);
      },
    );
    const restoring = createBeats(
      [outAt, endAt],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        if (ms === outAt) playSwoosh();
        else shakeScreen(BACK_SHAKE);
      },
    );
    const at: Point = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: suckMs + pour.streamMs + pour.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          restoring.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          const sink = cover!.total() ?? total;
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          drawGlow(ctx, GOLD, sink.x, sink.y, width * 0.5);
          ctx.globalCompositeOperation = "source-over";
          for (let i = 0; i < STRIPS; i++) {
            const e = sucked(i, t);
            const y = top + i * strip;
            const w = lerp([NECK, width], (1 - e) ** 1.5);
            const h = strip * (1 - e) + 0.5;
            at.x = lerp([midX, sink.x], e);
            at.y = lerp([y + strip / 2, sink.y], e);
            drawScreenPart(
              ctx,
              shot,
              left,
              y,
              width,
              strip,
              at.x - w / 2,
              at.y - h / 2,
              w,
              h,
            );
          }
        },
        drawOver: (ctx, ms, now) => {
          // the void hides the cover's own blast, so the burst is drawn on top
          if (ms >= suckMs && ms < suckMs + 900)
            drawDetonation(
              ctx,
              cover!.total() ?? total,
              ms - suckMs,
              COLOSSAL,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playSwoosh();
    playBoostEventStream();
  },
);
