// the "Pipeline" event: it covers its crit, whose click freezes the screen
// while a fat river of cash blasts out of the clicked floor's button and
// races through the screen like water through plumbing, in dead straight
// runs and hard right-angle bends, side to side and up, every bend a clank,
// a flash and a jolt; it bursts out into the total-income readout in a huge
// blast and shake, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { roundCorners } from "../riverPaths";
import {
  measure,
  pourDurationMs,
  pourLine,
  totalSpot,
  type Pour,
} from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "pipeline";
const REWARD = 4;
// the runs: across to these shares of the screen's width, each a RISE of
// the way up from the button to the total
const RUNS = [0.1, 0.9, 0.22, 0.78];
const BEND = 14;
const BEND_BURST: [number, number] = [0.4, 0.9];
const BEND_SHAKE: [number, number] = [0.8, 1.8];

export const forcePipelineEvent = registerWispEvent(
  KEY,
  "Pipeline",
  () => CONFIG.pipelineEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.pipelineEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const flip = button.x > (area.left + area.right) / 2;
    const rise = (button.y - total.y) / (RUNS.length + 1);
    // up, across, up, across... then up into the total
    const corners: Point[] = [button];
    let y = button.y;
    for (const share of RUNS) {
      y -= rise;
      const x = area.left + width * (flip ? 1 - share : share);
      corners.push({ x: corners[corners.length - 1].x, y }, { x, y });
    }
    const lastX = corners[corners.length - 1].x;
    const top = y - rise * 0.5;
    corners.push({ x: lastX, y: top }, { x: total.x, y: top }, total);
    const line = roundCorners(corners, BEND, 4);
    const along = measure(corners);
    const length = along[along.length - 1];
    const bends = corners
      .slice(1, -1)
      .map((at, k) => ({ at, ms: (travelMs * along[k + 1]) / length }));
    const pour: Pour = { coinsAlong: 1_500, width: 64, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );

    const clanks = createBeats(
      bends,
      (b) => b.ms,
      (b, k) => {
        const t = k / Math.max(1, bends.length - 1);
        cover!.burst(b.at, lerp(BEND_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BEND_SHAKE, t));
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clanks.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
