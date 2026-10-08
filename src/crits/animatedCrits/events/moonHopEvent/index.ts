// the "Moon Hop" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a moon wisp leaps out of the clicked floor's
// button into orbit round an income bar, whipping round it twice in a
// tilted ellipse, faster and faster, then slingshots off on a tangent: the
// bar flashes with a bang and a jolt and jumps a crit tier as the moon is
// flung into orbit round the next; its last orbit decays and it crashes
// into the bar in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
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

const KEY = "moonHop";
const MAX_BARS = 4;
const LAPS = 2;
const ORBIT_X = 60;
const ORBIT_Y = 70;
const TILT = 0.25;
const MOON = 0.6;
const FLING_SHAKE: [number, number] = [0.7, 1.4];

interface Orbit {
  bar: RewardBar;
  from: Point;
  entry: Point;
  rx: number;
  ry: number;
  leaves: number;
  arrives: number;
  flings: number;
  final: boolean;
}

export const forceMoonHopEvent = registerWispEvent(
  KEY,
  "Moon Hop",
  () => CONFIG.moonHopEvent.chance,
  (floor, context) => {
    const { orbitsMs, hopMs, holdMs, mergeMs } = CONFIG.moonHopEvent;
    const found = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (found.length === 0) return;
    // bottom bar first, hopping up the stack
    const bars = [...found].reverse();
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const orbits: Orbit[] = bars.map((bar, k) => {
      const rx = bar.box.width / 2 + ORBIT_X;
      const ry = bar.box.height / 2 + ORBIT_Y;
      const entry: Point = { x: bar.center.x + rx, y: bar.center.y };
      const leaves = clock;
      const arrives = leaves + hopMs;
      const flings = arrives + lerp(orbitsMs, k / Math.max(1, bars.length - 1));
      clock = flings;
      const orbit = {
        bar,
        from,
        entry,
        rx,
        ry,
        leaves,
        arrives,
        flings,
        final: k === bars.length - 1,
      };
      from = entry;
      return orbit;
    });
    const endAt = orbits[orbits.length - 1].flings;
    const moonAt: Point = { x: 0, y: 0 };
    const moon = (ms: number): Point => {
      const t = Math.max(0, ms);
      let o = orbits[0];
      for (const orbit of orbits) if (t >= orbit.leaves) o = orbit;
      if (t < o.arrives) {
        const e = easeOut(clamp01((t - o.leaves) / (o.arrives - o.leaves)));
        moonAt.x = lerp([o.from.x, o.entry.x], e);
        moonAt.y = lerp([o.from.y, o.entry.y], e);
        return moonAt;
      }
      const u = clamp01((t - o.arrives) / (o.flings - o.arrives));
      const a = Math.PI * 2 * LAPS * easeIn(u);
      // the last orbit decays into the bar
      const r = o.final ? 1 - easeIn(u) : 1;
      const ex = Math.cos(a) * o.rx * r;
      const ey = Math.sin(a) * o.ry * r;
      moonAt.x = o.bar.center.x + ex * Math.cos(TILT) - ey * Math.sin(TILT);
      moonAt.y = o.bar.center.y + ex * Math.sin(TILT) + ey * Math.cos(TILT);
      return moonAt;
    };

    const flinging = createBeats(
      orbits,
      (o) => o.flings,
      (o, k) => {
        cover!.tierUp(o.bar, o.entry);
        if (o.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(o.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(o.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FLING_SHAKE, k / Math.max(1, orbits.length - 1)));
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
        tick: (ms, now) => flinging.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, moon, ms, now, WISP_SIZE * MOON, 0.6, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
