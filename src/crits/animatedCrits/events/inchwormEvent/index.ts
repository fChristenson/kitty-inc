// the "Inchworm" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while an inchworm of lightning drops onto an
// income bar: two crackling bolts arched up to a wisp at its hump, its feet
// planted on the bar; it inches along it, hind foot hunching up to the
// front, front foot stretching out ahead, every foot it plants striking
// with a crack and a jolt; at the bar's far end it rears up and slams down
// so the bar jumps a crit tier, then leaps onto the next bar, quicker each
// time, the last slam landing in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "inchworm";
const MAX_BARS = 4;
const STEPS = 3;
const PAD = 30;
// the gap between its feet hunched and the hump's height hunched / stretched
const HUNCH = 34;
const HIGH = 95;
const LOW = 35;
const REAR = 190;
const LIFT = 30;
const ENTER_MS = 260;
const LEAP_MS = 200;
const REAR_MS = 150;
const SLAM_MS = 70;
const STRIKE_MS = 150;
const HUMP = 0.42;
const CRACK_GAP_MS = 45;
const PLANT_SHAKE: [number, number] = [0.2, 0.45];
const HIT_SHAKE: [number, number] = [0.7, 1.4];

const REAR_FOOT = 1;
const FRONT_FOOT = 2;

interface Key {
  ms: number;
  rear: Point;
  front: Point;
  hump: number;
  // which feet it plants on arriving at this pose
  plants: number;
  hit: RewardBar | null;
}

export const forceInchwormEvent = registerWispEvent(
  KEY,
  "Inchworm",
  () => CONFIG.inchwormEvent.chance,
  (floor, context, area) => {
    const { stepsMs, holdMs, mergeMs } = CONFIG.inchwormEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const first = bars[0];
    const sky: Point = { x: first.box.x + PAD, y: area.top - 40 };
    const keys: Key[] = [
      { ms: 0, rear: sky, front: sky, hump: 0, plants: 0, hit: null },
    ];
    let clock = 0;
    const pose = (
      ms: number,
      rear: Point,
      front: Point,
      hump: number,
      plants: number,
      hit: RewardBar | null = null,
    ) => {
      clock += ms;
      keys.push({ ms: clock, rear, front, hump, plants, hit });
    };
    bars.forEach((bar, k) => {
      const dir = k % 2 ? -1 : 1;
      const { box } = bar;
      const y = box.y;
      const x0 = dir > 0 ? box.x + PAD : box.x + box.width - PAD;
      const length = Math.max(0, box.width - PAD * 2);
      // stretched far enough that its front foot lands at the far end
      const reach = Math.max(
        HUNCH + 30,
        (length + STEPS * HUNCH) / (STEPS + 1),
      );
      const stepMs = lerp(stepsMs, k / Math.max(1, bars.length - 1));
      let rear: Point = { x: x0, y };
      let front: Point = { x: x0 + dir * reach, y };
      pose(
        k === 0 ? ENTER_MS : LEAP_MS,
        rear,
        front,
        LOW,
        REAR_FOOT | FRONT_FOOT,
      );
      for (let s = 0; s < STEPS; s++) {
        rear = { x: front.x - dir * HUNCH, y };
        pose(stepMs * 0.5, rear, front, HIGH, REAR_FOOT);
        front = { x: rear.x + dir * reach, y };
        pose(stepMs * 0.5, rear, front, LOW, FRONT_FOOT);
      }
      pose(REAR_MS, rear, front, REAR, 0);
      pose(SLAM_MS, rear, front, 4, REAR_FOOT | FRONT_FOOT, bar);
    });
    const endAt = clock;
    const hits = keys.filter((key) => key.hit);
    const lastHit = hits[hits.length - 1];
    const plants = keys.filter((key) => key.plants);

    // a foot that moves arcs up off the bar, higher the farther it goes
    const lift = (p: Point, q: Point) => {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      return d > 1 ? Math.min(LIFT * 5, LIFT + d * 0.25) : 0;
    };
    // its feet and hump at ms, written into the three points given
    const poseAt = (ms: number, rear: Point, front: Point, hump: Point) => {
      let i = 0;
      while (i < keys.length - 2 && ms >= keys[i + 1].ms) i++;
      const a = keys[i];
      const b = keys[i + 1];
      const u = smoothstep(
        Math.min(1, Math.max(0, (ms - a.ms) / (b.ms - a.ms))),
      );
      const arc = Math.sin(Math.PI * u);
      rear.x = lerp([a.rear.x, b.rear.x], u);
      rear.y = lerp([a.rear.y, b.rear.y], u) - arc * lift(a.rear, b.rear);
      front.x = lerp([a.front.x, b.front.x], u);
      front.y = lerp([a.front.y, b.front.y], u) - arc * lift(a.front, b.front);
      hump.x = (rear.x + front.x) / 2;
      hump.y = Math.min(rear.y, front.y) - lerp([a.hump, b.hump], u);
    };
    const rear: Point = { x: 0, y: 0 };
    const front: Point = { x: 0, y: 0 };
    const hump: Point = { x: 0, y: 0 };
    const trail = {
      rear: { x: 0, y: 0 },
      front: { x: 0, y: 0 },
      hump: { x: 0, y: 0 },
    };
    const humpAt = (ms: number): Point => {
      poseAt(Math.max(0, ms), trail.rear, trail.front, trail.hump);
      return trail.hump;
    };
    const back = createBolt(rear, hump, 0);
    const ahead = createBolt(hump, front, 0);

    let crack = -Infinity;
    const planting = createBeats(
      plants,
      (key) => key.ms,
      (key) => {
        if (key.hit || !cover!.isLive()) return;
        shakeScreen(lerp(PLANT_SHAKE, key.ms / endAt));
        if (key.ms - crack < CRACK_GAP_MS) return;
        crack = key.ms;
        playBloop();
      },
    );
    const slamming = createBeats(
      hits,
      (key) => key.ms,
      (key, k) => {
        const bar = key.hit!;
        cover!.tierUp(bar, bar.center);
        const at: Point = {
          x: (key.rear.x + key.front.x) / 2,
          y: key.rear.y,
        };
        if (key === lastHit) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
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
          planting.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + STRIKE_MS) return;
          for (const key of plants) {
            const t = (ms - key.ms) / STRIKE_MS;
            if (t < 0 || t >= 1) continue;
            const scale = key.hit ? 0.9 : 0.45;
            if (key.plants & REAR_FOOT)
              drawStrike(ctx, key.rear, 1 - t, scale, now);
            if (key.plants & FRONT_FOOT)
              drawStrike(ctx, key.front, 1 - t, scale, now);
          }
          if (ms > endAt) return;
          poseAt(ms, rear, front, hump);
          const alpha = 0.6 + 0.4 * Math.random();
          drawBolt(ctx, back, alpha, 0.45);
          drawBolt(ctx, ahead, alpha, 0.45);
          drawWisp(ctx, humpAt, ms, now, WISP_SIZE * HUMP, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
