// the "Figure Skater" event (mix; a crit tier and cash): it covers its crit,
// whose click freezes the screen while a wisp skates out of the clicked
// floor's button and carves a huge figure of eight across the screen, ever
// faster, cutting a glittering groove of cash behind it, every crossing a
// whoosh and a jolt; then it launches into a spinning triple jump and lands
// on the clicked floor's income bar, which jumps a crit tier in a huge
// blast and shake as the whole groove of cash lifts off into the total.
// Pays floor income × floor number × REWARD, plus the tier
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "figureSkater";
const REWARD = 2;
const COINS = 1_100;
const COIN = 0.5;
// the eight spans SPAN of the screen's width and TALL of its height,
// skated LOOPS times round
const SPAN = 0.4;
const TALL = 0.22;
const LOOPS = 1.5;
const GROOVE = 10;
// the jump arcs LOFT px over its higher end, spinning SPINS times in a
// SPIN_R px circle
const LOFT = 200;
const SPINS = 3;
const SPIN_R = 26;
const LIFT_SPREAD = 260;
const CROSS_SHAKE: [number, number] = [0.5, 1.2];

export const forceFigureSkaterEvent = registerWispEvent(
  KEY,
  "Figure Skater",
  () => CONFIG.figureSkaterEvent.chance,
  (floor, context, area) => {
    const { enterMs, skateMs, jumpMs, flightMs, holdMs, mergeMs } =
      CONFIG.figureSkaterEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const c: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.4),
    };
    const skateEnd = enterMs + skateMs;
    const landAt = skateEnd + jumpMs;
    const endAt = landAt + LIFT_SPREAD + flightMs;
    // the eight's phase, quickening; a lemniscate through the middle
    const phase = (ms: number) => {
      const u = clamp01((ms - enterMs) / skateMs);
      return Math.PI * 2 * LOOPS * (0.4 * u + 0.6 * u * u);
    };
    const eight = (t: number, into: Point): Point => {
      into.x = c.x + Math.sin(t) * width * SPAN;
      into.y = c.y + Math.sin(t) * Math.cos(t) * height * TALL;
      return into;
    };
    const takeoff = eight(phase(skateEnd), { x: 0, y: 0 });
    const landing: Point = { x: own.center.x, y: own.box.y - 20 };
    const bow: Point = {
      x: (takeoff.x + landing.x) / 2,
      y: Math.min(takeoff.y, landing.y) - LOFT,
    };
    const start = eight(0, { x: 0, y: 0 });
    const skate = (ms: number, into: Point): Point => {
      if (ms < enterMs) {
        const u = easeOut(ms / enterMs);
        into.x = lerp([button.x, start.x], u);
        into.y = lerp([button.y, start.y], u);
        return into;
      }
      if (ms < skateEnd) return eight(phase(ms), into);
      const u = clamp01((ms - skateEnd) / jumpMs);
      bezier(takeoff, bow, landing, easeIn(u), into);
      const spin = u * SPINS * Math.PI * 2;
      into.x += Math.cos(spin) * SPIN_R * Math.sin(Math.PI * u);
      into.y += Math.sin(spin) * SPIN_R * Math.sin(Math.PI * u);
      return into;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const cut = enterMs + Math.random() * skateMs;
      const rest = skate(cut, { x: 0, y: 0 });
      rest.x += (Math.random() * 2 - 1) * GROOVE;
      rest.y += (Math.random() * 2 - 1) * GROOVE;
      const leaves = landAt + ((cut - enterMs) / skateMs) * LIFT_SPREAD;
      const lift: Point = { x: rest.x, y: rest.y - 60 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < cut) return { x: rest.x, y: rest.y, scale: 0 };
        if (ms < leaves)
          return {
            x: rest.x,
            y: rest.y,
            scale: COIN * easeOut(clamp01((ms - cut) / 100)),
          };
        const total = cover?.total() ?? fallback;
        bezier(
          rest,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const skaterAt: Point = { x: 0, y: 0 };
    const skater = (ms: number): Point | null =>
      ms < 0 || ms > landAt ? null : skate(ms, skaterAt);
    // the eight crosses its middle every half lap
    const crossings: number[] = [];
    for (let ms = enterMs, k = 1; ms < skateEnd; ms += 5)
      if (phase(ms) >= k * Math.PI) {
        crossings.push(ms);
        k++;
      }

    const crossing = createBeats(
      crossings,
      (ms) => ms,
      (_, k) => {
        cover!.burst(c, 0.35);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(CROSS_SHAKE, k / Math.max(1, crossings.length - 1)));
      },
    );
    const landingBeat = createBeats(
      [landAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, bow);
        cover!.slam(own);
        cover!.blast(landing);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars: [own],
        tick: (ms, now) => {
          crossing.tick(ms, now);
          landingBeat.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            skater,
            ms,
            now,
            WISP_SIZE * 0.8,
            clamp01(ms / landAt),
            0,
            landAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
