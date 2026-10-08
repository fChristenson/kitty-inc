// the "Curling" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a fat curling-stone wisp is slid up the screen
// from its bottom, curling gently as it goes, two little sweeper wisps
// scrubbing frantically back and forth in front of it; it glides to a stop
// dead on an income bar with a clack, a flash and a jolt that jumps the
// bar a crit tier; stone after stone, ever faster, bar after bar; the last
// knocks every bar into a slam in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "curling";
const MAX_BARS = 3;
// a stone curls CURL px off line; sweepers scrub AHEAD px in front, SCRUB
// px either way
const CURL = 70;
const AHEAD = 44;
const SCRUB = 26;
const STONE = 0.9;
const SWEEPER = 0.3;
const CLACK_SHAKE: [number, number] = [0.9, 1.5];

export const forceCurlingEvent = registerWispEvent(
  KEY,
  "Curling",
  () => CONFIG.curlingEvent.chance,
  (floor, context, area) => {
    const { slidesMs, holdMs, mergeMs } = CONFIG.curlingEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const stones = bars.map((bar, k) => {
      const span = lerp(slidesMs, k / Math.max(1, bars.length - 1));
      const to: Point = { x: bar.center.x, y: bar.center.y };
      const side = k % 2 === 0 ? 1 : -1;
      const from: Point = { x: to.x - side * CURL, y: area.bottom + 30 };
      const ctrl: Point = { x: to.x + side * CURL, y: (from.y + to.y) / 2 };
      const s = {
        bar,
        to,
        from,
        ctrl,
        starts: clock,
        stops: clock + span,
        span,
      };
      clock += span;
      return s;
    });
    const last = stones[stones.length - 1];
    const endAt = last.stops;
    const stoneAt = (s: (typeof stones)[number], ms: number, into: Point) =>
      bezier(
        s.from,
        s.ctrl,
        s.to,
        easeOut(clamp01((ms - s.starts) / s.span)),
        into,
      );
    const stoneWisps = stones.map((s) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < s.starts ? null : stoneAt(s, Math.min(ms, s.stops), at);
    });
    const sweepers = [-1, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        let s = stones[0];
        for (const stone of stones) if (ms >= stone.starts) s = stone;
        stoneAt(s, ms, at);
        const pace = 1 - clamp01((ms - s.starts) / s.span);
        at.x += side * Math.sin(ms / 35) * SCRUB * pace + side * 10;
        at.y -= AHEAD * pace;
        return at;
      };
    });

    const sliding = createBeats(
      stones,
      (s) => s.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const stopping = createBeats(
      stones,
      (s) => s.stops,
      (s, k) => {
        cover!.tierUp(s.bar, s.from);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.to);
          return;
        }
        cover!.burst(s.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLACK_SHAKE, k / Math.max(1, stones.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          sliding.tick(ms, now);
          stopping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          stones.forEach((s, i) =>
            drawWispBetween(
              ctx,
              stoneWisps[i],
              ms,
              now,
              WISP_SIZE * STONE,
              0.6,
              s.starts,
              Math.min(endAt, s.stops + 250),
            ),
          );
          for (const sweeper of sweepers)
            drawWispBetween(
              ctx,
              sweeper,
              ms,
              now,
              WISP_SIZE * SWEEPER,
              0.4,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
