// the "Water Strider" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a strider wisp skates out of the clicked floor's
// button in sudden darting glides that stop dead, zigzagging across the
// screen; at every stop it dimples the screen like a pond, a ring of
// glitter ripples spreading round it and a ring of coins flicked out, with a
// bloop and a jolt; the glides get quicker and quicker, and the last shoots
// it up into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "waterStrider";
const REWARD = 4;
const GLIDES = 10;
const EDGE = 90;
const TOP = 220;
const RIPPLE_MS = 420;
const RIPPLES = 3;
const RIPPLE_DOTS = 18;
const RIPPLE_REACH = 90;
const RIPPLE_GAP_MS = 70;
const GLITTER = 8;
const COINS = 10;
const COIN_REACH: [number, number] = [30, 120];
const STRIDER = 0.5;
const STOP_SHAKE: [number, number] = [0.35, 0.9];

export const forceWaterStriderEvent = registerWispEvent(
  KEY,
  "Water Strider",
  () => CONFIG.waterStriderEvent.chance,
  (floor, context, area) => {
    const { glidesMs, holdMs, mergeMs } = CONFIG.waterStriderEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    let clock = 0;
    let from: Point = button;
    const glides = Array.from({ length: GLIDES }, (_, k) => {
      const final = k === GLIDES - 1;
      const side = k % 2 === 0 ? 0 : 1;
      const to: Point = final
        ? total
        : {
            x: lerp(
              [area.left + EDGE, area.right - EDGE],
              side * 0.55 + Math.random() * 0.45,
            ),
            y: lerp([area.top + TOP, area.bottom - EDGE], Math.random()),
          };
      const leaves = clock;
      clock += lerp(glidesMs, k / (GLIDES - 1));
      const glide = { from, to, leaves, stops: clock, final };
      from = to;
      return glide;
    });
    const endAt = clock;
    const striderAt: Point = { x: 0, y: 0 };
    const strider = (ms: number): Point => {
      const t = Math.max(0, ms);
      let g = glides[0];
      for (const glide of glides) if (t >= glide.leaves) g = glide;
      const e = easeOutCubic(clamp01((t - g.leaves) / (g.stops - g.leaves)));
      striderAt.x = lerp([g.from.x, g.to.x], e);
      striderAt.y = lerp([g.from.y, g.to.y], e);
      return striderAt;
    };
    const stops = glides.filter((g) => !g.final);

    const stopping = createBeats(
      stops,
      (g) => g.stops,
      (g, k) => {
        cover!.launchFrom(
          g.to,
          clampTargetsY(
            ringTargets(g.to, COINS, COIN_REACH),
            area.top + EDGE,
            area.bottom - EDGE,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STOP_SHAKE, k / (stops.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
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
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + RIPPLE_MS * 2) return;
          for (const g of stops) {
            for (let r = 0; r < RIPPLES; r++) {
              const t = (ms - g.stops - r * RIPPLE_GAP_MS) / RIPPLE_MS;
              if (t <= 0 || t >= 1) continue;
              const reach = RIPPLE_REACH * easeOutCubic(t);
              for (let d = 0; d < RIPPLE_DOTS; d++) {
                const a = (d / RIPPLE_DOTS) * Math.PI * 2;
                drawGlitterLight(
                  ctx,
                  g.to.x + Math.cos(a) * reach,
                  g.to.y + Math.sin(a) * reach * 0.45,
                  GLITTER,
                  d + r * RIPPLE_DOTS,
                  1 - t,
                  now,
                );
              }
            }
          }
          drawWispBetween(
            ctx,
            strider,
            ms,
            now,
            WISP_SIZE * STRIDER,
            0.5,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
