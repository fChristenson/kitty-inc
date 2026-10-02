// the "Climb" event: it covers its crit, whose click freezes the screen while
// a ladder of wisps pops up the screen, zigzagging from side to side up from
// the clicked floor's button to the total-income readout; a fat river of
// cash, led by a blazing wisp, rushes up it, bouncing from wisp to wisp, each
// it hits flaring with a flash, a bloop and a harder jolt before it pops,
// until it hits the total in a huge blast and shake, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { roundCorners } from "../riverPaths";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "climb";
const REWARD = 4;
// the rungs: PEGS wisps, alternating sides INSET of the screen's width in
// from its edges, climbing to UNDER of its height below the total
const PEGS = 7;
const INSET = 0.13;
const UNDER = 0.08;
// the river bounces off each peg OFF px in front of it
const OFF = 18;
const ROUND = 40;
// the pegs, as shares of the screen's width, popping in POP_GAP_MS apart and
// out POP_OUT_MS after they're hit, flaring FLARE bigger
const PEG = 0.05;
const HEAD = 0.06;
const POP_MS = 160;
const POP_GAP_MS = 45;
const POP_OUT_MS = 300;
const FLARE = 0.6;
// each hit: a burst, a bloop and a jolt, growing
const HIT_BURST: [number, number] = [0.4, 0.9];
const HIT_SHAKE: [number, number] = [0.6, 1.9];

export const forceClimbEvent = registerWispEvent(
  KEY,
  "Climb",
  () => CONFIG.climbEvent.chance,
  (floor, context, area) => {
    const { leadMs, streamMs, travelMs, holdMs, mergeMs } = CONFIG.climbEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const first = Math.random() < 0.5 ? 0 : 1;
    const top = total.y + height * UNDER;
    const pegs: Point[] = Array.from({ length: PEGS }, (_, k) => {
      const right = (k + first) % 2 === 1;
      return {
        x: right ? area.right - width * INSET : area.left + width * INSET,
        y: button.y + ((top - button.y) * (k + 0.5)) / PEGS,
      };
    });
    // the river's corners, just in front of each peg
    const corners = [
      button,
      ...pegs.map((p) => ({ x: p.x + (p.x < total.x ? OFF : -OFF), y: p.y })),
      total,
    ];
    const line = roundCorners(corners, ROUND, 6);
    const along = measure(corners);
    const pour: Pour = { coinsAlong: 1_500, width: 70, streamMs, travelMs };
    const hits = pegs.map(
      (_, k) => leadMs + (travelMs * along[k + 1]) / along[along.length - 1],
    );
    const topAt = leadMs + travelMs;
    const durationMs = Math.max(
      pourDurationMs(leadMs, pour),
      topAt + holdMs + mergeMs,
    );
    const head = riverHead(line, travelMs, leadMs);
    const pegAt = pegs.map(
      (p, k) =>
        (ms: number): Point | null =>
          ms < k * POP_GAP_MS || ms >= hits[k] + POP_OUT_MS ? null : p,
    );

    const go = createBeats(
      [leadMs],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const strikes = createBeats(
      pegs,
      (_, k) => hits[k],
      (peg, k) => {
        const t = k / (PEGS - 1);
        cover!.burst(peg, lerp(HIT_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const finale = createBeats(
      [topAt],
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
          go.tick(ms, now);
          strikes.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const base = Math.max(WISP_SIZE, width * PEG);
          pegs.forEach((_, k) => {
            const from = k * POP_GAP_MS;
            const hit = clamp01((ms - hits[k]) / POP_OUT_MS);
            const size =
              base *
              easeOutBack(clamp01((ms - from) / POP_MS)) *
              (1 + FLARE * Math.sin(Math.PI * hit));
            drawWispBetween(
              ctx,
              pegAt[k],
              ms,
              now,
              size,
              ms >= hits[k] ? 1 : 0.2,
              from,
              hits[k] + POP_OUT_MS,
            );
          });
          drawWispBetween(
            ctx,
            head,
            ms,
            now,
            Math.max(WISP_SIZE, width * HEAD),
            1,
            leadMs,
            topAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
