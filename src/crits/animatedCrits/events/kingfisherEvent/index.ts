// the "Kingfisher" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a kingfisher wisp darts out of the clicked
// floor's button and perches above each income bar in turn, bobs once, then
// dives straight down into the bar like into water: a splash of coins bursts
// up out of it with a bloop and a jolt, and it pops back up and darts on to
// perch over the next bar, each dive quicker and steeper; after the last bar
// it climbs and dives into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
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
import { sprayTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "kingfisher";
const REWARD = 4;
const MAX_BARS = 5;
// each perch higher and nearer straight over its dive spot: steeper dives
const PERCH: [number, number] = [110, 230];
const SIDE: [number, number] = [130, 20];
const BOB = 26;
// of each dive's time: the dart over, the bob, the dive
const DART = 0.4;
const BOBBING = 0.25;
const SPLASH_COINS: [number, number] = [70, 120];
const SPLASH_REACH: [number, number] = [60, 260];
const SPLASH_SHAKE: [number, number] = [0.6, 1.3];
const BIRD = 0.5;

interface Leg {
  a: Point;
  c: Point;
  b: Point;
  from: number;
  to: number;
  ease: (t: number) => number;
}

const flat = (t: number) => t;

export const forceKingfisherEvent = registerWispEvent(
  KEY,
  "Kingfisher",
  () => CONFIG.kingfisherEvent.chance,
  (floor, context, area) => {
    const { divesMs, finalMs, holdMs, mergeMs } = CONFIG.kingfisherEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const legs: Leg[] = [];
    let clock = 0;
    let from: Point = button;
    const dives = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const cycle = lerp(divesMs, t);
      const hit: Point = {
        x: bar.box.x + bar.box.width * (0.3 + 0.4 * Math.random()),
        y: bar.center.y,
      };
      const side = k % 2 === 0 ? 1 : -1;
      const perch: Point = {
        x: hit.x + side * lerp(SIDE, t),
        y: hit.y - lerp(PERCH, t),
      };
      const dartEnds = clock + cycle * DART;
      const bobEnds = dartEnds + cycle * BOBBING;
      const hits = clock + cycle;
      // popping up out of the last splash, then darting over
      legs.push({
        a: from,
        c: { x: (from.x + perch.x) / 2, y: Math.min(from.y, perch.y) - 90 },
        b: perch,
        from: clock,
        to: dartEnds,
        ease: easeOut,
      });
      legs.push({
        a: perch,
        c: { x: perch.x, y: perch.y + BOB * 2 },
        b: perch,
        from: dartEnds,
        to: bobEnds,
        ease: flat,
      });
      legs.push({
        a: perch,
        c: { x: hit.x, y: perch.y },
        b: hit,
        from: bobEnds,
        to: hits,
        ease: easeIn,
      });
      clock = hits;
      from = hit;
      return { bar, hit, hits, t };
    });
    const last = dives[dives.length - 1];
    const apex: Point = { x: total.x + 180, y: total.y - 40 };
    const climbs = clock + finalMs * 0.55;
    const endAt = clock + finalMs;
    legs.push({
      a: last.hit,
      c: { x: apex.x, y: last.hit.y },
      b: apex,
      from: clock,
      to: climbs,
      ease: easeOut,
    });
    legs.push({
      a: apex,
      c: { x: apex.x, y: apex.y - 80 },
      b: total,
      from: climbs,
      to: endAt,
      ease: easeIn,
    });
    const head: Point = { x: 0, y: 0 };
    const bird = (ms: number): Point => {
      const t = Math.max(0, ms);
      let leg = legs[0];
      for (const l of legs) if (t >= l.from) leg = l;
      return bezier(
        leg.a,
        leg.c,
        leg.b,
        leg.ease(clamp01((t - leg.from) / (leg.to - leg.from))),
        head,
      );
    };

    const diving = createBeats(
      dives,
      (d) => d.hits,
      (d) => {
        cover!.burst(d.hit, 0.5 + 0.4 * d.t);
        cover!.launchFrom(
          d.hit,
          sprayTargets(
            d.hit,
            Math.round(lerp(SPLASH_COINS, d.t)),
            SPLASH_REACH,
            -Math.PI / 2,
            1.6,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        playSwoosh();
        shakeScreen(lerp(SPLASH_SHAKE, d.t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          diving.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            bird,
            ms,
            now,
            WISP_SIZE * BIRD,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
