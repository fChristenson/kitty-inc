// the "Gravity Assist" event (wisp; free upgrade levels): it covers its
// crit, whose click freezes the screen while a wisp shoots out of the clicked
// floor's button and whips round the end of one income bar after another like
// a probe slingshotting round planets, each pass hurling it on faster with a
// whoosh, a flash and a jolt that lands free levels on that bar; off the last
// it dives into the clicked floor's bar at full speed, slamming every bar in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "gravityAssist";
const MAX_BARS = 5;
// each pass curls round its bar's end ORBIT px out, over ARC of a turn
const ORBIT = 95;
const ARC = Math.PI * 1.15;
const ARC_POINTS = 6;
const PROBE = 0.9;
// its progress along the route speeds up from START_SPEED share to full
const START_SPEED = 0.55;
const PASS_SHAKE: [number, number] = [0.6, 1.4];

export const forceGravityAssistEvent = registerWispEvent(
  KEY,
  "Gravity Assist",
  () => CONFIG.gravityAssistEvent.chance,
  (floor, context) => {
    const { flightMs, levelShare, holdMs, mergeMs } = CONFIG.gravityAssistEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const own = bars.find((b) => b.floor === floor) ?? bars[0];
    const button = getButtonCenter(context.isGroundFloor);
    const first = Math.random() < 0.5 ? 1 : -1;
    // round each bar's end, alternating ends, the apex of each pass recorded
    const route: Point[] = [button];
    const apexes: number[] = [];
    const ends: Point[] = [];
    bars.forEach((bar, k) => {
      const side = k % 2 === 0 ? first : -first;
      const end: Point = {
        x: side > 0 ? bar.box.x + bar.box.width : bar.box.x,
        y: bar.center.y,
      };
      ends.push(end);
      // from below, round the far side of the end and away above
      const from = Math.PI / 2 + side * 0.4;
      for (let j = 0; j <= ARC_POINTS; j++) {
        const a = from - side * ARC * (j / ARC_POINTS);
        route.push({
          x: end.x + Math.cos(a) * ORBIT,
          y: end.y + Math.sin(a) * ORBIT,
        });
        if (j === ARC_POINTS / 2) apexes.push(route.length - 1);
      }
    });
    route.push(own.center);
    const last = route.length - 1;
    // u along the route at share s of the flight, accelerating
    const progress = (s: number) => START_SPEED * s + (1 - START_SPEED) * s * s;
    const timeAt = (u: number) =>
      flightMs *
      ((-START_SPEED +
        Math.sqrt(START_SPEED ** 2 + 4 * (1 - START_SPEED) * u)) /
        (2 * (1 - START_SPEED)));
    const passes = apexes.map((r) => timeAt(r / last));
    const into: Point = { x: 0, y: 0 };
    const probe = (ms: number): Point | null =>
      ms < 0 || ms >= flightMs
        ? null
        : alongRoute(route, progress(ms / flightMs), into);

    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        const bar = bars[k];
        const t = k / Math.max(1, bars.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), ends[k]);
        cover!.burst(ends[k], 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(PASS_SHAKE, t));
      },
    );
    const diving = createBeats(
      [flightMs],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare * 2, 3));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: flightMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          passing.tick(ms, now);
          diving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            probe,
            ms,
            now,
            WISP_SIZE * PROBE,
            clamp01(ms / flightMs),
            0,
            flightMs,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
