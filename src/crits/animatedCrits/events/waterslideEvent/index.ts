// the "Waterslide" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a river of cash pours in at the
// top of the screen and races down a winding waterslide, whipping round a
// full loop-the-loop at every income bar; each loop it comes out of lands
// its bar free levels with a splash, a bloop and a jolt, and the last loop
// slams its bar in a huge blast and shake as the coins sweep into the total.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pourDurationMs, pourLine, type Pour } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "waterslide";
const REWARD = 2;
const MAX_BARS = 4;
const LOOP = 60;
const LOOP_STEPS = 28;
const SWING = 170;
const TOP = 140;
const LOOP_SHAKE: [number, number] = [0.5, 1.3];

export const forceWaterslideEvent = registerWispEvent(
  KEY,
  "Waterslide",
  () => CONFIG.waterslideEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.waterslideEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const line: Point[] = [{ x: button.x, y: button.y }];
    const loopEnds: number[] = [];
    const curve = (to: Point, ctrl: Point) => {
      const from = line[line.length - 1];
      for (let i = 1; i <= 14; i++)
        line.push(bezier(from, ctrl, to, i / 14, { x: 0, y: 0 }));
    };
    const start: Point = { x: bars[0].center.x - SWING, y: area.top + TOP };
    curve(start, { x: button.x, y: start.y });
    bars.forEach((bar, k) => {
      const side = k % 2 === 0 ? -1 : 1;
      // in along the bar's row to the loop's foot, round it, out the far side
      const foot: Point = { x: bar.center.x, y: bar.center.y };
      const last = line[line.length - 1];
      curve(foot, { x: last.x, y: foot.y });
      const hub: Point = { x: foot.x, y: foot.y - LOOP };
      for (let i = 1; i <= LOOP_STEPS; i++) {
        const a = Math.PI / 2 + side * (i / LOOP_STEPS) * Math.PI * 2;
        line.push({
          x: hub.x + Math.cos(a) * LOOP + -side * (i / LOOP_STEPS) * 20,
          y: hub.y + Math.sin(a) * LOOP,
        });
      }
      loopEnds.push(line.length - 1);
      const out = line[line.length - 1];
      curve(
        { x: out.x - side * SWING, y: out.y + 40 },
        { x: out.x - side * SWING * 0.6, y: out.y },
      );
    });
    const along = measure(line);
    const length = along[along.length - 1];
    const loops = bars.map((bar, k) => ({
      bar,
      at: line[loopEnds[k]],
      ms: (along[loopEnds[k]] / length) * travelMs,
    }));
    const last = loops[loops.length - 1];
    const pour: Pour = { coinsAlong: 1_000, width: 30, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      last.ms + holdMs + mergeMs,
    );

    const looping = createBeats(
      loops,
      (l) => l.ms,
      (l, k) => {
        cover!.levels(l.bar, levelsFor(l.bar.floor), l.at);
        if (l === last) {
          cover!.slam(l.bar);
          cover!.blast(l.bar.center);
          return;
        }
        cover!.burst(l.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LOOP_SHAKE, k / Math.max(1, loops.length - 1)));
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
        tick: (ms, now) => looping.tick(ms, now),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
