// the "Loom" event (mix; free upgrade levels and cash): it covers its crit,
// whose click freezes the screen while threads of cash pour straight down
// the screen like the warp on a loom; then a shuttle wisp shoots out of the
// clicked floor's button and flies back and forth across the threads,
// weaving a weft of cash behind it through every income bar in view, each
// pass ending with a clack, a jolt and free levels for that bar, ever
// faster; the last pass slams home in a huge blast and shake and the coins
// sweep into the total. Pays floor income × floor number × REWARD, plus
// the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "loom";
const REWARD = 2;
const MAX_BARS = 4;
const WARP = 5;
const EDGE = 40;
const TOP = 160;
const SHUTTLE = 0.45;
const PASS_SHAKE: [number, number] = [0.5, 1.3];

export const forceLoomEvent = registerWispEvent(
  KEY,
  "Loom",
  () => CONFIG.loomEvent.chance,
  (floor, context, area) => {
    const { warpMs, warpTravelMs, passesMs, holdMs, mergeMs } =
      CONFIG.loomEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const warps = Array.from({ length: WARP }, (_, i) => {
      const x = lerp([left + 30, right - 30], i / (WARP - 1));
      return sampleLine(
        (u) => ({ x, y: lerp([area.top + TOP, area.bottom], u) }),
        30,
      );
    });
    const warpPour: Pour = {
      coinsAlong: 260,
      width: 12,
      streamMs: warpMs,
      travelMs: warpTravelMs,
    };
    let clock = warpTravelMs * 0.6;
    let ltr = button.x < (left + right) / 2;
    const passes = bars.map((bar, k) => {
      const y = bar.center.y;
      const from = ltr ? left : right;
      const to = ltr ? right : left;
      ltr = !ltr;
      const span = lerp(passesMs, k / Math.max(1, bars.length - 1));
      const line = sampleLine((u) => ({ x: lerp([from, to], u), y }), 40);
      const starts = clock;
      clock += span;
      return {
        bar,
        line,
        starts,
        ends: starts + span,
        pour: {
          coinsAlong: 400,
          width: 18,
          streamMs: span * 0.6,
          travelMs: span,
        } as Pour,
        head: riverHead(line, span, starts),
        to: { x: to, y } as Point,
      };
    });
    const last = passes[passes.length - 1];
    const endAt = last.ends;
    const durationMs = Math.max(
      pourDurationMs(last.starts, last.pour),
      pourDurationMs(0, warpPour),
      endAt + holdMs + mergeMs,
    );
    const at: Point = { x: 0, y: 0 };
    const shuttle = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const first = passes[0];
      if (ms < first.starts) {
        const u = easeOut(clamp01(ms / first.starts));
        at.x = lerp([button.x, first.line[0].x], u);
        at.y = lerp([button.y, first.line[0].y], u);
        return at;
      }
      for (const p of passes) {
        const h = p.head(ms);
        if (h) return h;
      }
      return null;
    };

    const weaving = createBeats(
      passes,
      (p) => p.starts,
      (p) => pourLine(cover!, p.line, p.pour),
    );
    const beating = createBeats(
      passes,
      (p) => p.ends,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor), p.to);
        if (p === last) {
          cover!.slam(p.bar);
          cover!.blast(p.to);
          return;
        }
        cover!.burst(p.to, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          weaving.tick(ms, now);
          beating.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            shuttle,
            ms,
            now,
            WISP_SIZE * SHUTTLE,
            0.7,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    for (const w of warps) pourLine(cover, w, warpPour);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
