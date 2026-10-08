// the "Rain Dance" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a wisp hops out of the clicked
// floor's button over an empty spot and spins there in a tight, quickening
// dance as a downpour of cash streams from it onto the floor below; as the
// puddle fills, a new worker sprouts there with a bang and a jolt, and the
// wisp hops on to dance over the next spot, quicker each time, the last
// hire landing in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "rainDance";
const REWARD = 2;
const MAX_HIRES = 5;
const FORM_MS = 300;
const HOVER = 190;
const SPIN_R = 36;
const SPINS = 3;
const DROPS = 5;
const DROP_SPREAD = 34;
const DANCER = 0.5;
const SPROUT_SHAKE: [number, number] = [0.6, 1.3];

interface Dance {
  hire: RewardHire;
  from: Point;
  over: Point;
  spot: Point;
  hops: number;
  dances: number;
  sprouts: number;
  rain: Point[][];
  pour: Pour;
  final: boolean;
}

export const forceRainDanceEvent = registerWispEvent(
  KEY,
  "Rain Dance",
  () => CONFIG.rainDanceEvent.chance,
  (floor, context) => {
    const { dancesMs, hopMs, holdMs, mergeMs } = CONFIG.rainDanceEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const dances: Dance[] = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y };
      const over: Point = { x: hire.x, y: hire.y - HOVER };
      const span = lerp(dancesMs, k / Math.max(1, hires.length - 1));
      const hops = clock;
      const dances = hops + hopMs;
      const sprouts = dances + span;
      clock = sprouts;
      const dance: Dance = {
        hire,
        from,
        over,
        spot,
        hops,
        dances,
        sprouts,
        rain: Array.from({ length: DROPS }, (_, d) => {
          const x = spot.x + (d / (DROPS - 1) - 0.5) * DROP_SPREAD * 2;
          return sampleLine(
            (u) => ({ x, y: lerp([over.y + 20, spot.y], u) }),
            12,
          );
        }),
        pour: {
          coinsAlong: 70,
          width: 12,
          streamMs: span * 0.75,
          travelMs: 280,
        },
        final: k === hires.length - 1,
      };
      from = over;
      return dance;
    });
    const last = dances[dances.length - 1];
    const endAt = last.sprouts;
    const dancerAt: Point = { x: 0, y: 0 };
    const dancer = (ms: number): Point => {
      const t = Math.max(0, ms);
      let d = dances[0];
      for (const dance of dances) if (t >= dance.hops) d = dance;
      if (t < d.dances) {
        const e = easeOut(clamp01((t - d.hops) / (d.dances - d.hops)));
        dancerAt.x = lerp([d.from.x, d.over.x], e);
        dancerAt.y = lerp([d.from.y, d.over.y], e) - Math.sin(e * Math.PI) * 60;
        return dancerAt;
      }
      const u = clamp01((t - d.dances) / (d.sprouts - d.dances));
      const a = Math.PI * 2 * SPINS * u * u;
      dancerAt.x = d.over.x + Math.cos(a) * SPIN_R;
      dancerAt.y = d.over.y + Math.sin(a) * SPIN_R * 0.5;
      return dancerAt;
    };
    const durationMs = Math.max(
      ...dances.map((d) => pourDurationMs(d.dances, d.pour)),
      endAt + holdMs + mergeMs,
    );

    const raining = createBeats(
      dances,
      (d) => d.dances,
      (d) => {
        for (const line of d.rain) pourLine(cover!, line, d.pour);
      },
    );
    const sprouting = createBeats(
      dances,
      (d) => d.sprouts,
      (d, k) => {
        giveHire(d.hire);
        if (d.final) {
          cover!.blast(d.spot);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(d.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPROUT_SHAKE, k / Math.max(1, dances.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          raining.tick(ms, now);
          sprouting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            dancer,
            ms,
            now,
            WISP_SIZE * DANCER,
            0.6,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
