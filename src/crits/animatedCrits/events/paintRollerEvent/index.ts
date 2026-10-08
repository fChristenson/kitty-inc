// the "Paint Roller" event (mix; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a roller wisp drops out of the
// clicked floor's button onto the top income bar and rolls along it, laying
// a broad flat stripe of cash behind it like a coat of paint; at the end it
// hops down onto the next bar and rolls back the other way, bar after bar,
// each one finished landing free levels with a splash and a jolt; the last
// stroke slams its bar in a huge blast and shake and the coins sweep into
// the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "paintRoller";
const REWARD = 2;
const MAX_BARS = 4;
const ROLL_STEPS = 24;
const HOP_STEPS = 12;
const HOP = 70;
const ROLLER = 0.55;
const DONE_SHAKE: [number, number] = [0.5, 1.3];

export const forcePaintRollerEvent = registerWispEvent(
  KEY,
  "Paint Roller",
  () => CONFIG.paintRollerEvent.chance,
  (floor, context) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.paintRollerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const line: Point[] = [];
    const doneIndex: number[] = [];
    const hop = (from: Point, to: Point) => {
      const ctrl: Point = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - HOP,
      };
      for (let i = 1; i <= HOP_STEPS; i++)
        line.push(bezier(from, ctrl, to, i / HOP_STEPS, { x: 0, y: 0 }));
    };
    line.push({ x: button.x, y: button.y });
    bars.forEach((bar, k) => {
      const ltr = k % 2 === 0;
      const x0 = ltr ? bar.box.x : bar.box.x + bar.box.width;
      const x1 = ltr ? bar.box.x + bar.box.width : bar.box.x;
      hop(line[line.length - 1], { x: x0, y: bar.center.y });
      for (let i = 1; i <= ROLL_STEPS; i++)
        line.push({ x: lerp([x0, x1], i / ROLL_STEPS), y: bar.center.y });
      doneIndex.push(line.length - 1);
    });
    const along = measure(line);
    const length = along[along.length - 1];
    const strokes = bars.map((bar, k) => ({
      bar,
      at: line[doneIndex[k]],
      ms: (along[doneIndex[k]] / length) * travelMs,
    }));
    const last = strokes[strokes.length - 1];
    const pour: Pour = { coinsAlong: 900, width: 44, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      last.ms + holdMs + mergeMs,
    );
    const roller = riverHead(line, travelMs);

    const finishing = createBeats(
      strokes,
      (s) => s.ms,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor), s.at);
        if (s === last) {
          cover!.slam(s.bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.at, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DONE_SHAKE, k / Math.max(1, strokes.length - 1)));
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
        tick: (ms, now) => finishing.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            roller,
            ms,
            now,
            WISP_SIZE * ROLLER,
            0.7,
            0,
            travelMs,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
