// the "Safecracker" event (an experiment beyond the seven looks: cracking a
// safe's combination dial; a free floor): it covers its crit, whose click
// freezes the screen while a ring of glowing ticks lights up round the
// building's locked floor like a safe's dial and a pointer wisp flies out of
// the clicked floor's button onto it; it spins the dial one way, then back
// the other, then round again, each stop a click, a gold flash, a jolt and
// its number popping up; on the third number the lock blows in a huge blast
// and shake and the floor bursts open, unlocked for free, as the screen
// unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "safecracker";
const TICKS = 20;
const RADIUS = 110;
const SQUASH = 0.7;
const TICK = 9;
const LIT_TICK = 22;
const LIT_MS = 400;
const FLY_MS = 250;
// each spin: turns round the dial (signed for its way), and the tick it stops on
const SPINS = [
  { turns: 1.4, stop: 7 },
  { turns: -1.15, stop: 15 },
  { turns: 0.8, stop: 3 },
];
const POINTER = 0.5;
const NUMBER_MS = 500;
const TICK_GLOW = fadeStops(COLOR.heavenlyGold);
const STOP_SHAKE: [number, number] = [0.6, 1.1];

export const forceSafecrackerEvent = registerWispEvent(
  KEY,
  "Safecracker",
  () => CONFIG.safecrackerEvent.chance,
  (floor, context) => {
    const { spinsMs, holdMs, mergeMs } = CONFIG.safecrackerEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const tickAt = (angle: number, into: Point): Point => {
      into.x = lock.x + Math.sin(angle) * RADIUS;
      into.y = lock.y - Math.cos(angle) * RADIUS * SQUASH;
      return into;
    };
    const ticks = Array.from({ length: TICKS }, (_, i) =>
      tickAt((i / TICKS) * Math.PI * 2, { x: 0, y: 0 }),
    );
    let clock = FLY_MS;
    let angle = 0;
    const spins = SPINS.map((s, k) => {
      const from = angle;
      const target = (s.stop / TICKS) * Math.PI * 2;
      // the whole turns its way, landing on its tick
      let to = from + s.turns * Math.PI * 2;
      to +=
        ((((target - to) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) -
        Math.PI;
      const starts = clock;
      clock += lerp(spinsMs, k / (SPINS.length - 1));
      angle = to;
      return {
        from,
        to,
        starts,
        stops: clock,
        tick: ticks[s.stop],
        number: createCritTextSprite(String(s.stop * 5), COLOR.heavenlyGold, {
          fontSize: 40,
          strokeWidth: 7,
        }),
      };
    });
    const last = spins[spins.length - 1];
    const endAt = last.stops;
    const pointerAt: Point = { x: 0, y: 0 };
    const pointer = (ms: number): Point => {
      if (ms < FLY_MS) {
        const u = easeOut(ms / FLY_MS);
        tickAt(0, pointerAt);
        pointerAt.x = lerp([button.x, pointerAt.x], u);
        pointerAt.y = lerp([button.y, pointerAt.y], u);
        return pointerAt;
      }
      let s = spins[0];
      for (const spin of spins) if (ms >= spin.starts) s = spin;
      return tickAt(
        lerp(
          [s.from, s.to],
          smoothstep(clamp01((ms - s.starts) / (s.stops - s.starts))),
        ),
        pointerAt,
      );
    };

    const stopping = createBeats(
      spins,
      (s) => s.stops,
      (s, k) => {
        if (s === last) {
          cover!.blast(lock);
          return;
        }
        cover!.burst(s.tick, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STOP_SHAKE, k / (spins.length - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => stopping.tick(ms, now),
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + NUMBER_MS) return;
          if (ms <= endAt) {
            const show = clamp01(ms / FLY_MS);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = show;
            for (const t of ticks) drawGlow(ctx, TICK_GLOW, t.x, t.y, TICK);
            for (const s of spins) {
              const lit = 1 - (ms - s.stops) / LIT_MS;
              if (ms >= s.stops)
                drawGlow(
                  ctx,
                  TICK_GLOW,
                  s.tick.x,
                  s.tick.y,
                  TICK + LIT_TICK * Math.max(0.3, lit),
                );
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
            drawWispBetween(
              ctx,
              pointer,
              ms,
              now,
              WISP_SIZE * POINTER,
              0.8,
              0,
              endAt,
            );
          }
          for (const s of spins) {
            const t = (ms - s.stops) / NUMBER_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              s.number,
              s.tick.x,
              s.tick.y - 50 - 30 * t,
              1,
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
