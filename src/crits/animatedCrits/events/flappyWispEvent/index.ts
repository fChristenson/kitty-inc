// the "Flappy Wisp" event (an experiment beyond the seven looks: the
// flappy-bird game; cash): it covers its crit, whose click freezes the
// screen while a wisp hops out of the clicked floor's button and flaps in
// little bounding hops as pillars of light slide in from the side of the
// screen, each with a gap; it threads gap after gap, each pass a pop, a
// jolt and a burst of coins, the pillars coming faster and faster; through
// the last it bursts in a huge blast and shake. Pays floor income × floor
// number × REWARD
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "flappyWisp";
const REWARD = 4;
const PILLARS = 7;
// the bird holds at X of the screen's width; gaps GAP px tall
const X = 0.3;
const GAP = 170;
const PILLAR_W = 26;
const TOP = 140;
const ENTER_MS = 250;
const FLAPS_PER_PILLAR = 2;
const FLAP = 40;
const BIRD = 0.45;
const COINS = 12;
const COIN_REACH: [number, number] = [30, 120];
const PASS_SHAKE: [number, number] = [0.3, 1.1];

export const forceFlappyWispEvent = registerWispEvent(
  KEY,
  "Flappy Wisp",
  () => CONFIG.flappyWispEvent.chance,
  (floor, context, area) => {
    const { pillarsMs, holdMs, mergeMs } = CONFIG.flappyWispEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const birdX = area.left + width * X;
    const top = area.top + TOP;
    const bottom = area.bottom - 40;
    const birdHome: Point = { x: birdX, y: (top + bottom) / 2 };
    let clock: number = ENTER_MS;
    let gapY = birdHome.y;
    const pillars = Array.from({ length: PILLARS }, (_, k) => {
      const span = lerp(pillarsMs, k / (PILLARS - 1));
      const passes = clock + span;
      const prevGap = gapY;
      gapY = Math.min(
        bottom - GAP,
        Math.max(top + GAP, gapY + (Math.random() - 0.5) * 260),
      );
      const pillar = {
        // a pillar slides in from off the right edge, reaching the bird as it passes
        starts: clock,
        passes,
        gapY,
        prevGap,
        upper: [
          { x: 0, y: area.top },
          { x: 0, y: gapY - GAP / 2 },
        ] as [Point, Point],
        lower: [
          { x: 0, y: gapY + GAP / 2 },
          { x: 0, y: area.bottom },
        ] as [Point, Point],
        spot: { x: birdX, y: gapY } as Point,
      };
      clock = passes;
      return pillar;
    });
    const last = pillars[PILLARS - 1];
    const endAt = last.passes;
    const speedOf = (p: (typeof pillars)[number]) =>
      (area.right + PILLAR_W - birdX) / (p.passes - p.starts);
    const birdAt: Point = { x: 0, y: 0 };
    const bird = (ms: number): Point => {
      if (ms < ENTER_MS) {
        const u = easeOut(ms / ENTER_MS);
        birdAt.x = lerp([button.x, birdHome.x], u);
        birdAt.y = lerp([button.y, birdHome.y], u);
        return birdAt;
      }
      let p = pillars[0];
      for (const pillar of pillars) if (ms >= pillar.starts) p = pillar;
      const u = clamp01((ms - p.starts) / (p.passes - p.starts));
      // hop toward the gap: a few flaps, each a little arc
      const flap = (u * FLAPS_PER_PILLAR) % 1;
      birdAt.x = birdX;
      birdAt.y = lerp([p.prevGap, p.gapY], u) - Math.sin(Math.PI * flap) * FLAP;
      return birdAt;
    };

    const flapping = createBeats(
      pillars,
      (p) => p.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const passing = createBeats(
      pillars,
      (p) => p.passes,
      (p, k) => {
        if (p === last) {
          cover!.blast(p.spot);
          return;
        }
        cover!.launchFrom(p.spot, ringTargets(p.spot, COINS, COIN_REACH));
        cover!.burst(p.spot, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, k / (PILLARS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flapping.tick(ms, now);
          passing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const p of pillars) {
            if (ms < p.starts) continue;
            const x = area.right + PILLAR_W - (ms - p.starts) * speedOf(p);
            if (x < area.left - PILLAR_W) continue;
            p.upper[0].x = p.upper[1].x = x;
            p.lower[0].x = p.lower[1].x = x;
            drawBeam(ctx, p.upper[0], p.upper[1], PILLAR_W, 0.6);
            drawBeam(ctx, p.lower[0], p.lower[1], PILLAR_W, 0.6);
          }
          drawWispBetween(ctx, bird, ms, now, WISP_SIZE * BIRD, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
