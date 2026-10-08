// the "Sluice" event (money; cash): it covers its crit, whose click freezes
// the screen while a river of cash gushes out of the clicked floor's button
// up to the top of the screen and tumbles down a sluice zigzagging from edge
// to edge, every bend a splash, a bloop and a jolt, harder each time; at the
// bottom it crashes out in a huge blast and shake and the coins sweep into
// the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "sluice";
const REWARD = 4;
const LEGS = 6;
const STEPS = 24;
const EDGE = 40;
const TOP = 170;
const BEND_SHAKE: [number, number] = [0.4, 1.3];

export const forceSluiceEvent = registerWispEvent(
  KEY,
  "Sluice",
  () => CONFIG.sluiceEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.sluiceEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const corners: Point[] = [button];
    for (let k = 0; k <= LEGS; k++)
      corners.push({
        x: k % 2 === 0 ? left : right,
        y: lerp([area.top + TOP, area.bottom - EDGE], k / LEGS),
      });
    const line: Point[] = [{ x: button.x, y: button.y }];
    const bendIndex: number[] = [];
    for (let k = 1; k < corners.length; k++) {
      const from = corners[k - 1];
      const to = corners[k];
      for (let i = 1; i <= STEPS; i++)
        line.push({
          x: lerp([from.x, to.x], i / STEPS),
          y: lerp([from.y, to.y], i / STEPS),
        });
      bendIndex.push(line.length - 1);
    }
    const along = measure(line);
    const length = along[along.length - 1];
    const bends = bendIndex.map((i, k) => ({
      at: corners[k + 1],
      ms: (along[i] / length) * travelMs,
    }));
    const last = bends[bends.length - 1];
    const pour: Pour = { coinsAlong: 900, width: 34, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      last.ms + holdMs + mergeMs,
    );

    const bending = createBeats(
      bends,
      (b) => b.ms,
      (b, k) => {
        if (b === last) {
          cover!.blast(b.at);
          return;
        }
        cover!.burst(b.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BEND_SHAKE, k / (bends.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => bending.tick(ms, now),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
