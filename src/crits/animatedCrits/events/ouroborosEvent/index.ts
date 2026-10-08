// the "Ouroboros" event (mix): it covers its crit, whose click freezes the
// screen while a wisp shoots out of the clicked floor's button and races
// round a great ring, a river of cash pouring out behind it, until it closes
// the ring and bites its own tail with a flash, a bang and a jolt; then the
// whole ring of cash spins faster and faster, shrinking tighter as the
// screen rumbles, and collapses up into the total-income readout in a huge
// blast and shake, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutCubic, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "ouroboros";
const REWARD = 4;
// the ring, RADIUS of the screen's width (or height, if less) round a point
// DROP of its height under its middle, shrinking to SHRINK of that; the
// head runs TURNS turns in all, the first closing the ring
const RADIUS = 0.36;
const DROP = 0.06;
const SHRINK = 0.35;
const TURNS = 3;
// COINS in the ring, LANE px either side of it
const COINS = 1_100;
const LANE = 9;
const COIN = 0.8;
const HEAD = 0.07;
const ENTER_MS = 220;
const BITE_BURST = 1.2;
const BITE_SHAKE = 2.2;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.5, 1.4];

export const forceOuroborosEvent = registerWispEvent(
  KEY,
  "Ouroboros",
  () => CONFIG.ouroborosEvent.chance,
  (floor, context, area) => {
    const { ringMs, spinMs, collapseMs, holdMs, mergeMs } =
      CONFIG.ouroborosEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const centre = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const r0 = Math.min(width, height) * RADIUS;
    const way = button.x > centre.x ? -1 : 1;
    // it joins the ring at the point nearest the button
    const start = Math.atan2(button.y - centre.y, button.x - centre.x);
    const biteAt = ENTER_MS + ringMs;
    const spinTo = biteAt + spinMs;
    const travelMs = spinTo + collapseMs;
    // the head's angle round the ring, speeding up after the bite
    const turned = (ms: number) => {
      const t = ms - ENTER_MS;
      if (t <= ringMs) return (Math.PI * 2 * Math.max(0, t)) / ringMs;
      const u = clamp01((t - ringMs) / spinMs);
      return Math.PI * 2 * (1 + (TURNS - 1) * u * u);
    };
    const radius = (ms: number) =>
      r0 * lerp([1, SHRINK], easeOutCubic(clamp01((ms - biteAt) / spinMs)));
    const onRing = (a: number, r: number, into: Point): Point => {
      into.x = centre.x + Math.cos(start + way * a) * r;
      into.y = centre.y + Math.sin(start + way * a) * r;
      return into;
    };
    const head = { x: 0, y: 0 };
    const headAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= spinTo) return null;
      if (ms < ENTER_MS) {
        onRing(0, r0, head);
        const u = easeOutCubic(ms / ENTER_MS);
        head.x = button.x + (head.x - button.x) * u;
        head.y = button.y + (head.y - button.y) * u;
        return head;
      }
      return onRing(turned(ms), radius(ms), head);
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      // how far behind the head round the ring, once it's closed
      const lag = ((i + 0.5) / COINS) * Math.PI * 2;
      const lane = (Math.random() - 0.5) * LANE * 2;
      const leave = spinTo + Math.random() * collapseMs * 0.4;
      return (f) => {
        const ms = f * travelMs;
        const a = turned(Math.min(ms, spinTo)) - lag;
        if (a < 0) return { x: button.x, y: button.y, scale: 0 };
        const p = onRing(a, radius(Math.min(ms, spinTo)) + lane, {
          x: 0,
          y: 0,
        });
        if (ms < leave) return { x: p.x, y: p.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - leave) / (travelMs - leave)));
        return {
          x: p.x + (total.x - p.x) * u,
          y: p.y + (total.y - p.y) * u,
          scale: COIN,
        };
      };
    });

    let lastRumble = -Infinity;
    const bite = createBeats(
      [biteAt],
      (ms) => ms,
      () => {
        const at = onRing(Math.PI * 2, r0, { x: 0, y: 0 });
        cover!.burst(at, BITE_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BITE_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bite.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms > biteAt &&
            ms < spinTo &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, (ms - biteAt) / spinMs));
          }
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            headAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * HEAD),
            clamp01(ms / spinTo),
            0,
            spinTo,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
