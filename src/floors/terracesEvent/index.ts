// the "Terraces" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a thick column of cash crashes
// down out of the sky onto the top income bar; it brims over and spills off
// both its ends in two curling falls of cash onto the bar below, which
// brims and spills onto the next, terrace after terrace down the screen,
// ever faster, every bar the cash lands on jolting with a splash, a bloop
// and free levels; the lowest bar fills last and every bar slams in a huge
// blast and shake. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "terraces";
const REWARD = 2;
const MAX_BARS = 5;
// each fall arcs OUT px past the end it spills off
const OUT = 90;
// no pour runs longer than this, keeping the coin count down
const STREAM_MS = 700;
const LAND_SHAKE: [number, number] = [0.6, 1.4];

export const forceTerracesEvent = registerWispEvent(
  KEY,
  "Terraces",
  () => CONFIG.terracesEvent.chance,
  (floor, context, area) => {
    const { pourMs, fallsMs, levelShare, holdMs, mergeMs } =
      CONFIG.terracesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const curve = (a: Point, control: Point, b: Point) =>
      sampleLine((u) => bezier(a, control, b, u, { x: 0, y: 0 }), 40);
    const first = bars[0];
    const sky: Point = { x: first.center.x, y: area.top - 60 };
    // stage k pours onto bars[k]: from the sky, then off both ends of the bar above
    const stages = bars.map((bar, k) => {
      if (k === 0)
        return [
          curve(
            sky,
            { x: sky.x, y: (sky.y + bar.box.y) / 2 },
            { x: bar.center.x, y: bar.box.y - 6 },
          ),
        ];
      const above = bars[k - 1];
      return [-1, 1].map((side) => {
        const lip: Point = {
          x: side < 0 ? above.box.x + 10 : above.box.x + above.box.width - 10,
          y: above.box.y,
        };
        const land: Point = {
          x: bar.box.x + bar.box.width * (side < 0 ? 0.2 : 0.8),
          y: bar.box.y - 6,
        };
        return curve(lip, { x: lip.x + side * OUT, y: lip.y + 30 }, land);
      });
    });
    const travels = bars.map((_, k) =>
      k === 0 ? pourMs : lerp(fallsMs, (k - 1) / Math.max(1, bars.length - 2)),
    );
    const starts: number[] = [];
    let clock = 0;
    travels.forEach((ms) => {
      starts.push(clock);
      clock += ms;
    });
    const endAt = clock;
    const pours: Pour[] = travels.map((ms, k) => ({
      coinsAlong: k === 0 ? 260 : 90,
      width: k === 0 ? 24 : 14,
      streamMs: Math.min(STREAM_MS, endAt - starts[k] + 120),
      travelMs: ms,
    }));
    const doneAt = Math.max(
      ...pours.map((pour, k) => pourDurationMs(starts[k], pour)),
    );

    const pouring = createBeats(
      stages,
      (_, k) => starts[k],
      (lines, k) => {
        for (const line of lines) pourLine(cover!, line, pours[k]);
      },
    );
    const landing = createBeats(
      bars,
      (_, k) => starts[k] + travels[k],
      (bar, k) => {
        const t = k / Math.max(1, bars.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2));
        if (k === bars.length - 1) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst({ x: bar.center.x, y: bar.box.y }, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(doneAt, endAt + holdMs + mergeMs),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
