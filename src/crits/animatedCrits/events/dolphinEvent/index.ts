// the "Dolphin" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a river of cash rolls in along
// the bottom of the screen and a dolphin wisp rides it, leaping out in great
// arcs, each higher, up to touch an income bar with its nose and splash back
// down, the bar landing free levels with a splash, a bloop and a jolt; the
// last leap slams its bar in a huge blast and shake as the coins sweep into
// the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "dolphin";
const REWARD = 2;
const MAX_BARS = 4;
const EDGE = 30;
const WATER = 90;
const DOLPHIN = 0.55;
const LEAP_SHAKE: [number, number] = [0.5, 1.3];

export const forceDolphinEvent = registerWispEvent(
  KEY,
  "Dolphin",
  () => CONFIG.dolphinEvent.chance,
  (floor, context, area) => {
    const { leapsMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.dolphinEvent;
    // the lowest bar first, each leap higher
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const water = area.bottom - WATER;
    const ltr = Math.random() < 0.5;
    const from = ltr ? area.left + EDGE : area.right - EDGE;
    const to = ltr ? area.right - EDGE : area.left + EDGE;
    const river = sampleLine(
      (u) => ({
        x: lerp([from, to], u),
        y: water + Math.sin(u * Math.PI * 4) * 10,
      }),
      60,
    );
    const pour: Pour = { coinsAlong: 900, width: 50, streamMs, travelMs };
    // leaps take turns across the screen, each from the water up to its bar
    let clock = travelMs * 0.3;
    const leaps = bars.map((bar, k) => {
      const dir = k % 2 === 0 ? 1 : -1;
      const startX = bar.center.x - dir * 140;
      const endX = bar.center.x + dir * 140;
      const span = lerp(leapsMs, k / Math.max(1, bars.length - 1));
      const leaves = clock;
      clock += span;
      return {
        bar,
        startX,
        endX,
        leaves,
        span,
        touches: leaves + span / 2,
        lands: clock,
      };
    });
    const last = leaps[leaps.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      last.touches + holdMs + mergeMs,
    );
    const dolphinAt: Point = { x: 0, y: 0 };
    const dolphin = (ms: number): Point => {
      let l = leaps[0];
      for (const leap of leaps) if (ms >= leap.leaves) l = leap;
      if (ms < leaps[0].leaves) {
        const u = ms / leaps[0].leaves;
        dolphinAt.x = lerp([from, leaps[0].startX], u);
        dolphinAt.y = water;
        return dolphinAt;
      }
      const u = clamp01((ms - l.leaves) / l.span);
      dolphinAt.x = lerp([l.startX, l.endX], u);
      dolphinAt.y = water - Math.sin(Math.PI * u) * (water - l.bar.center.y);
      return dolphinAt;
    };

    const touching = createBeats(
      leaps,
      (l) => l.touches,
      (l, k) => {
        cover!.levels(l.bar, levelsFor(l.bar.floor), {
          x: l.bar.center.x,
          y: water,
        });
        if (l === last) {
          cover!.slam(l.bar);
          cover!.blast(l.bar.center);
          return;
        }
        cover!.burst(l.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LEAP_SHAKE, k / Math.max(1, leaps.length - 1)));
      },
    );
    const splashing = createBeats(
      leaps,
      (l) => l.lands,
      (l) => cover!.burst({ x: l.endX, y: water }, 0.35),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          touching.tick(ms, now);
          splashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            dolphin,
            ms,
            now,
            WISP_SIZE * DOLPHIN,
            0.7,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, river, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
