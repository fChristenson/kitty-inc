// the "Sky Writer" event (wisp; cash): it covers its crit, whose click
// freezes the screen while a wisp shoots out of the clicked floor's button
// and skywrites across the screen in big looping cursive, loop after loop
// trailing glitter, each loop it closes puffing out a ring of coins with a
// whoosh and a jolt, ever faster; it signs off with a long flourish that
// underlines the lot and goes off in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "skyWriter";
const REWARD = 4;
const LOOPS = 6;
// loops are LOOP px round, written across WIDE of the screen at HIGH of the
// way down; the flourish dips DIP px under them
const LOOP = 46;
const WIDE = 0.8;
const HIGH = 0.4;
const DIP = 90;
const WRITER = 0.6;
const PUFF = 10;
const PUFF_REACH: [number, number] = [30, 110];
const LOOP_SHAKE: [number, number] = [0.4, 1.1];

export const forceSkyWriterEvent = registerWispEvent(
  KEY,
  "Sky Writer",
  () => CONFIG.skyWriterEvent.chance,
  (floor, context, area) => {
    const { climbMs, writeMs, flourishMs, holdMs, mergeMs } =
      CONFIG.skyWriterEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const w = (area.right - area.left) * WIDE;
    const left = (area.left + area.right) / 2 - w / 2;
    const cy = area.top + (area.bottom - area.top) * HIGH;
    const start: Point = { x: left, y: cy };
    const writeAt = climbMs;
    const flourishAt = writeAt + writeMs;
    const endAt = flourishAt + flourishMs;
    // loops written ever faster: the phase through them by ms
    const phase = (ms: number) =>
      LOOPS * clamp01((ms - writeAt) / writeMs) ** 1.4;
    const write = (p: number, into: Point): Point => {
      // a trochoid: sliding along while looping round
      const a = p * Math.PI * 2;
      into.x = left + (p / LOOPS) * w - Math.sin(a) * LOOP;
      into.y = cy - (1 - Math.cos(a)) * LOOP;
      return into;
    };
    const end = write(LOOPS, { x: 0, y: 0 });
    const writerAt: Point = { x: 0, y: 0 };
    const writer = (ms: number): Point | null => {
      if (ms > endAt) return null;
      if (ms < writeAt) {
        const u = easeOut(ms / climbMs);
        writerAt.x = lerp([button.x, start.x], u);
        writerAt.y = lerp([button.y, start.y], u);
        return writerAt;
      }
      if (ms < flourishAt) return write(phase(ms), writerAt);
      // swoop back under the loops to underline them
      const u = smoothstep((ms - flourishAt) / flourishMs);
      writerAt.x = lerp([end.x, left - 20], u);
      writerAt.y = cy + Math.sin(Math.PI * u) * DIP;
      return writerAt;
    };
    // each loop closes at its top
    const tops = Array.from({ length: LOOPS }, (_, k) => {
      const p = k + 0.5;
      return {
        at: writeAt + writeMs * (p / LOOPS) ** (1 / 1.4),
        spot: write(p, { x: 0, y: 0 }),
      };
    });
    const underline: Point = { x: (left + end.x) / 2, y: cy + DIP };

    const looping = createBeats(
      tops,
      (t) => t.at,
      (t, k) => {
        cover!.launchFrom(t.spot, ringTargets(t.spot, PUFF, PUFF_REACH));
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(LOOP_SHAKE, k / (LOOPS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(underline),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          looping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            writer,
            ms,
            now,
            WISP_SIZE * WRITER,
            0.9,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
