// the "Champagne Tower" event (money; levels and cash): it covers its crit,
// whose click freezes the screen while a river of cash pours down from the
// top of the screen into the top income bar like champagne into the top
// glass of a tower; when it's brimming it overflows off both ends in two
// streams down into the bar below, and so on down the stack, every bar
// filling with a splash, a bang, a jolt and free levels; the last overflows
// off the bottom in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "champagneTower";
const REWARD = 2;
const MAX_BARS = 5;
const SPILL_OUT = 70;
const FILL_SHAKE: [number, number] = [0.6, 1.4];

export const forceChampagneTowerEvent = registerWispEvent(
  KEY,
  "Champagne Tower",
  () => CONFIG.champagneTowerEvent.chance,
  (floor, context, area) => {
    const { pourMs, fillMs, levelShare, holdMs, mergeMs } =
      CONFIG.champagneTowerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const pour: Pour = {
      coinsAlong: 160,
      width: 30,
      streamMs: fillMs,
      travelMs: pourMs,
    };
    const line = (a: Point, b: Point, bend: Point) =>
      sampleLine((u) => bezier(a, bend, b, u, { x: 0, y: 0 }), 24);
    // each glass's rim, and where its overflow lands on the next one down
    const spill = (bar: RewardBar, below: Point | null, side: number) => {
      const from: Point = {
        x: bar.center.x + side * bar.box.width * 0.5,
        y: bar.center.y,
      };
      const to: Point = below
        ? { x: below.x + side * bar.box.width * 0.25, y: below.y }
        : { x: from.x + side * SPILL_OUT, y: area.bottom + 40 };
      return line(from, to, { x: from.x + side * SPILL_OUT, y: from.y + 20 });
    };
    const first = bars[0].center;
    const rivers: { line: Point[]; starts: number }[] = [
      {
        line: line({ x: first.x, y: area.top }, first, {
          x: first.x,
          y: (area.top + first.y) / 2,
        }),
        starts: 0,
      },
    ];
    const fills = bars.map((bar, k) => {
      const filledAt = pourMs + k * (pourMs + fillMs);
      const below = bars[k + 1]?.center ?? null;
      for (const side of [-1, 1])
        rivers.push({
          line: spill(bar, below, side),
          starts: filledAt + fillMs * 0.5,
        });
      return { bar, fills: filledAt, last: k === bars.length - 1 };
    });
    const endAt = fills[fills.length - 1].fills + fillMs * 0.5 + pourMs;
    const durationMs = Math.max(
      ...rivers.map((r) => pourDurationMs(r.starts, pour)),
      endAt + holdMs + mergeMs,
    );
    const bottom: Point = { x: first.x, y: area.bottom - 60 };

    const pouring = createBeats(
      rivers,
      (r) => r.starts,
      (r) => pourLine(cover!, r.line, pour),
    );
    const filling = createBeats(
      fills,
      (f) => f.fills,
      (f, k) => {
        cover!.levels(f.bar, levelsFor(f.bar.floor, levelShare, 2));
        cover!.burst(f.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FILL_SHAKE, k / Math.max(1, fills.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(bottom);
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
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          filling.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
