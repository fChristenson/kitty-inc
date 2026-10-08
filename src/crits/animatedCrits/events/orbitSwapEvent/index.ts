// the "Orbit Swap" event (wisp; crit tiers): it covers its crit, whose
// click freezes the screen while two wisps fly out of the clicked floor's
// button and circle an income bar in opposite directions, crossing at
// either end of it with a spark and a bloop, faster every lap; on their
// third crossing they smash into each other on the bar in a flash, a bang
// and a jolt, and it jumps a crit tier; they split off to circle the next
// bar, the last smash a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "orbitSwap";
const MAX_BARS = 4;
const MEETS = 3;
const ORBIT_X = 50;
const ORBIT_Y = 60;
const ARRIVE_MS = 160;
const WISP = 0.45;
const SMASH_SHAKE: [number, number] = [0.7, 1.4];

interface Orbit {
  bar: RewardBar;
  from: Point;
  starts: number;
  circles: number;
  smashes: number;
}

export const forceOrbitSwapEvent = registerWispEvent(
  KEY,
  "Orbit Swap",
  () => CONFIG.orbitSwapEvent.chance,
  (floor, context) => {
    const { orbitsMs, holdMs, mergeMs } = CONFIG.orbitSwapEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const orbits: Orbit[] = bars.map((bar, k) => {
      const starts = clock;
      const circles = starts + ARRIVE_MS;
      const smashes =
        circles + lerp(orbitsMs, k / Math.max(1, bars.length - 1));
      clock = smashes;
      const orbit = { bar, from, starts, circles, smashes };
      from = bar.center;
      return orbit;
    });
    const endAt = clock;
    const last = orbits[orbits.length - 1];
    // the two wisps meet at the bar's ends every half lap; on the last
    // meeting the orbit has shrunk onto the bar's middle
    const angleAt = (o: Orbit, ms: number) =>
      Math.PI *
      MEETS *
      easeIn(clamp01((ms - o.circles) / (o.smashes - o.circles)));
    const wisps = [1, -1].map((dir) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms);
        let o = orbits[0];
        for (const orbit of orbits) if (t >= orbit.starts) o = orbit;
        const rx = o.bar.box.width / 2 + ORBIT_X;
        const ry = o.bar.box.height / 2 + ORBIT_Y;
        const { x: cx, y: cy } = o.bar.center;
        if (t < o.circles) {
          const e = easeOut(clamp01((t - o.starts) / ARRIVE_MS));
          at.x = lerp([o.from.x, cx - rx], e);
          at.y = lerp([o.from.y, cy], e);
          return at;
        }
        const u = clamp01((t - o.circles) / (o.smashes - o.circles));
        const a = Math.PI + dir * angleAt(o, Math.min(t, o.smashes));
        const shrink = 1 - easeIn(clamp01((u - 0.75) / 0.25));
        at.x = cx + Math.cos(a) * rx * shrink;
        at.y = cy + Math.sin(a) * ry * shrink;
        return at;
      };
    });
    const meets = orbits.flatMap((o) =>
      Array.from({ length: MEETS - 1 }, (_, m) => {
        // angle π·(m+1) reached when easeIn(u) = (m+1)/MEETS
        const u = Math.sqrt((m + 1) / MEETS);
        return o.circles + u * (o.smashes - o.circles);
      }),
    );

    const meeting = createBeats(
      meets,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const smashing = createBeats(
      orbits,
      (o) => o.smashes,
      (o, k) => {
        cover!.tierUp(o.bar);
        if (o === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(o.bar.center);
          return;
        }
        cover!.burst(o.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SMASH_SHAKE, k / Math.max(1, orbits.length - 1)));
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
          meeting.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const w of wisps)
            drawWispBetween(ctx, w, ms, now, WISP_SIZE * WISP, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
