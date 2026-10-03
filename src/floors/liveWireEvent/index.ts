// the "Live Wire" event (lightning; a free floor): it covers its crit, whose
// click freezes the screen while a snapped live wire of lightning drops from
// the top corner of the screen and thrashes wildly across it, its loose end
// spitting sparks, every whip a crack and a jolt, ever wilder; then it
// lashes down into the building's locked floor in a huge blast and shake,
// and the floor bursts open, unlocked for free, as the screen unfreezes.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "liveWire";
const WHIPS = 6;
// the loose end thrashes REACH of the screen round its middle
const REACH = 0.38;
const EDGE = 30;
const WHIP_SHAKE: [number, number] = [0.4, 1.2];

export const forceLiveWireEvent = registerWispEvent(
  KEY,
  "Live Wire",
  () => CONFIG.liveWireEvent.chance,
  (floor, context, area) => {
    const { thrashMs, lashMs, holdMs, mergeMs } = CONFIG.liveWireEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const door: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const anchor: Point = {
      x: Math.random() < 0.5 ? area.left + EDGE : area.right - EDGE,
      y: area.top + EDGE,
    };
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const rx = (area.right - area.left) * REACH;
    const ry = (area.bottom - area.top) * REACH;
    const lashAt = thrashMs;
    const endAt = lashAt + lashMs;
    const end: Point = { x: anchor.x, y: anchor.y };
    const wire = createBolt(anchor, end, 3);
    // the thrash: a lissajous whipping ever faster
    const phase = (ms: number) => (ms / thrashMs) ** 1.4 * WHIPS * Math.PI;
    const thrash = (ms: number, into: Point) => {
      const p = phase(ms);
      const grow = clamp01(ms / 250);
      into.x = lerp([anchor.x, center.x + Math.sin(p * 1.3) * rx], grow);
      into.y = lerp([anchor.y, center.y + Math.sin(p * 0.9 + 1) * ry], grow);
      return into;
    };
    const whips = Array.from(
      { length: WHIPS },
      (_, k) => thrashMs * ((k + 0.5) / WHIPS) ** (1 / 1.4),
    );
    const from: Point = thrash(lashAt, { x: 0, y: 0 });
    const placeEnd = (ms: number) => {
      if (ms < lashAt) {
        thrash(ms, end);
        return;
      }
      const u = easeIn(clamp01((ms - lashAt) / lashMs));
      end.x = lerp([from.x, door.x], u);
      end.y = lerp([from.y, door.y], u);
    };

    const whipping = createBeats(
      whips,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(WHIP_SHAKE, k / (WHIPS - 1)));
      },
    );
    const lashing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(door),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          whipping.tick(ms, now);
          lashing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 250) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 250 : 1;
          placeEnd(Math.min(ms, endAt));
          drawBolt(ctx, wire, 0.9 * fade, 0.7 + 0.5 * clamp01(ms / endAt));
          drawStrike(ctx, end, 0.8 * fade, 0.7, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
