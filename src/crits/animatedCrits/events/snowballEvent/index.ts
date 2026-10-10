// the "Snowball" event (wisp; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while a small wisp drops
// out of the sky onto the highest income bar in view and rolls down the
// building like a snowball tumbling down stairs: along each bar, off its
// end and thump onto the next, swelling bigger and rolling faster every
// bar, each landing a bang, a jolt and free levels; it rolls onto the
// clicked floor's bar and smashes into it so hard the bar jumps a crit tier
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "snowball";
const MAX_BARS = 5;
// it grows from SIZE[0] to SIZE[1] of a wisp, riding RIDE px over a bar,
// INSET px in from its ends, overshooting an end by OVER px as it drops off
const SIZE: [number, number] = [0.45, 1.3];
const RIDE = 24;
const INSET = 16;
const OVER = 40;
const BOUNCE = 8;
const SKY = 80;
const LAND_SHAKE: [number, number] = [0.6, 1.4];

interface Leg {
  from: Point;
  to: Point;
  bow: Point | null;
  starts: number;
  ends: number;
  bar: RewardBar | null;
}

export const forceSnowballEvent = registerWispEvent(
  KEY,
  "Snowball",
  () => CONFIG.snowballEvent.chance,
  (floor, context, area) => {
    const { rollsMs, dropMs, levelShare, holdMs, mergeMs } =
      CONFIG.snowballEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    // the bars above the clicked one, top first, down to it
    const bars = [
      ...found
        .filter((b) => b !== own && b.center.y < own.center.y)
        .slice(-(MAX_BARS - 1)),
      own,
    ];
    const legs: Leg[] = [];
    let clock = 0;
    let rightward = Math.random() < 0.5;
    let at: Point = {
      x: rightward
        ? bars[0].box.x + INSET
        : bars[0].box.x + bars[0].box.width - INSET,
      y: area.top - SKY,
    };
    bars.forEach((bar, k) => {
      const y = bar.box.y - RIDE;
      const left = bar.box.x + INSET;
      const right = bar.box.x + bar.box.width - INSET;
      const land: Point = { x: rightward ? left : right, y };
      legs.push({
        from: at,
        to: land,
        bow: { x: (at.x + land.x) / 2, y: Math.min(at.y, land.y) - 20 },
        starts: clock,
        ends: clock + dropMs,
        bar,
      });
      clock += dropMs;
      const last = k === bars.length - 1;
      const roll = lerp(rollsMs, k / Math.max(1, bars.length - 1));
      const end: Point = last
        ? { x: bar.center.x, y }
        : { x: (rightward ? right : left) + (rightward ? OVER : -OVER), y };
      legs.push({
        from: land,
        to: end,
        bow: null,
        starts: clock,
        ends: clock + roll,
        bar: null,
      });
      clock += roll;
      at = end;
      rightward = !rightward;
    });
    const endAt = clock;
    const point: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      let i = 0;
      while (i < legs.length - 1 && ms > legs[i].ends) i++;
      const leg = legs[i];
      const u = clamp01((ms - leg.starts) / (leg.ends - leg.starts));
      if (leg.bow) return bezier(leg.from, leg.bow, leg.to, easeIn(u), point);
      point.x = lerp([leg.from.x, leg.to.x], u * u);
      point.y =
        leg.from.y - Math.abs(Math.sin(u * Math.PI * 3)) * BOUNCE * (1 - u);
      return point;
    };
    const landings = legs.filter((l) => l.bar);

    const landing = createBeats(
      landings,
      (l) => l.ends,
      (l, k) => {
        const t = k / Math.max(1, landings.length - 1);
        cover!.levels(l.bar!, levelsFor(l.bar!.floor, levelShare, 2), l.from);
        cover!.burst(l.to, 0.4 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, t));
      },
    );
    const smashing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          landing.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const grow = clamp01(ms / endAt);
          drawWispBetween(
            ctx,
            ball,
            ms,
            now,
            WISP_SIZE * lerp(SIZE, grow),
            grow,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
