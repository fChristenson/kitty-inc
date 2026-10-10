// the "Donuts" event (wisp; free upgrade levels): it covers its crit, whose
// click freezes the screen while a wisp screeches out of the clicked floor's
// button onto an income bar and spins donuts round it like a stunt car, two
// tight squealing loops, each a flash and a jolt, and the bar lands free
// levels; then it peels off onto the next bar and the next, spinning ever
// faster, the last set of donuts ending in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "donuts";
const MAX_BARS = 4;
const LOOPS = 2;
const RADIUS = 80;
const SQUASH = 0.45;
const DRIVE_MS = 180;
const CAR = 0.5;
const LOOP_SHAKE = 0.4;
const DONE_SHAKE: [number, number] = [0.7, 1.4];

export const forceDonutsEvent = registerWispEvent(
  KEY,
  "Donuts",
  () => CONFIG.donutsEvent.chance,
  (floor, context) => {
    const { spinsMs, holdMs, mergeMs } = CONFIG.donutsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const sets = bars.map((bar, k) => {
      const start: Point = { x: bar.center.x + RADIUS, y: bar.center.y };
      const drives = clock;
      const spins = drives + DRIVE_MS;
      const span = lerp(spinsMs, k / Math.max(1, bars.length - 1));
      clock = spins + span;
      const set = {
        bar,
        from,
        start,
        drives,
        spins,
        done: clock,
        loops: Array.from(
          { length: LOOPS },
          (_, i) => spins + (span * (i + 1)) / LOOPS,
        ),
      };
      from = start;
      return set;
    });
    const last = sets[sets.length - 1];
    const endAt = last.done;
    const carAt: Point = { x: 0, y: 0 };
    const car = (ms: number): Point => {
      let s = sets[0];
      for (const set of sets) if (ms >= set.drives) s = set;
      if (ms < s.spins) {
        const u = smoothstep(clamp01((ms - s.drives) / DRIVE_MS));
        carAt.x = lerp([s.from.x, s.start.x], u);
        carAt.y = lerp([s.from.y, s.start.y], u);
        return carAt;
      }
      const u = clamp01((ms - s.spins) / (s.done - s.spins));
      // each loop a little tighter
      const a = u * LOOPS * Math.PI * 2;
      const r = RADIUS * (1 - 0.3 * u);
      carAt.x = s.bar.center.x + Math.cos(a) * r;
      carAt.y = s.bar.center.y + Math.sin(a) * r * SQUASH;
      return carAt;
    };
    const loops = sets.flatMap((s) =>
      s.loops.slice(0, -1).map((at) => ({ s, at })),
    );

    const driving = createBeats(
      sets,
      (s) => s.drives,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const looping = createBeats(
      loops,
      (l) => l.at,
      (l) => {
        cover!.burst(l.s.start, 0.25);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LOOP_SHAKE);
      },
    );
    const finishing = createBeats(
      sets,
      (s) => s.done,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor), s.start);
        if (s === last) {
          cover!.slam(s.bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DONE_SHAKE, k / Math.max(1, sets.length - 1)));
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
          driving.tick(ms, now);
          looping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, car, ms, now, WISP_SIZE * CAR, 0.8, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
