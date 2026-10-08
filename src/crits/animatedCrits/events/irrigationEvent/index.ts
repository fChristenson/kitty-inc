// the "Irrigation" event (money; free hires and cash): it covers its crit,
// whose click freezes the screen while a trunk river of cash gushes out of
// the clicked floor's button and splits into curving channels, one racing
// to every empty spot in view; as each channel floods its spot, a worker
// sprouts there with a splash, a bang and a jolt, the farthest last in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "irrigation";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const TRUNK = 160;
const SPREAD_MS = 70;
const LIFT = 20;
const HIRE_SHAKE: [number, number] = [0.6, 1.3];

export const forceIrrigationEvent = registerWispEvent(
  KEY,
  "Irrigation",
  () => CONFIG.irrigationEvent.chance,
  (floor, context) => {
    const { speed, holdMs, mergeMs } = CONFIG.irrigationEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const fork: Point = { x: button.x, y: button.y - TRUNK };
    const point: Point = { x: 0, y: 0 };
    const channels = hires
      .map((hire, k) => {
        const spot: Point = { x: hire.x, y: hire.y - LIFT };
        const route: Point[] = [
          button,
          fork,
          { x: lerp([fork.x, spot.x], 0.6), y: Math.min(fork.y, spot.y) - 60 },
          spot,
        ];
        const line = sampleLine((u) => {
          alongRoute(route, u, point);
          return { x: point.x, y: point.y };
        }, 40);
        const along = measure(line);
        const travelMs = along[along.length - 1] / speed;
        const starts = k * SPREAD_MS;
        const pour: Pour = {
          coinsAlong: 200,
          width: 26,
          streamMs: travelMs * 0.6,
          travelMs,
        };
        return { hire, spot, line, pour, starts, floods: starts + travelMs };
      })
      .sort((a, b) => a.floods - b.floods);
    const last = channels[channels.length - 1];
    const endAt = last.floods;
    const durationMs = Math.max(
      ...channels.map((c) => pourDurationMs(c.starts, c.pour)),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      channels,
      (c) => c.starts,
      (c) => pourLine(cover!, c.line, c.pour),
    );
    const flooding = createBeats(
      channels,
      (c) => c.floods,
      (c, k) => {
        giveHire(c.hire);
        if (c === last) {
          cover!.blast(c.spot);
          return;
        }
        cover!.burst(c.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIRE_SHAKE, k / Math.max(1, channels.length - 1)));
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
        tick: (ms, now) => {
          pouring.tick(ms, now);
          flooding.tick(ms, now);
        },
        drawOver: (ctx, _ms, now) => drawRewardHires(ctx, hires, now, FORM_MS),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
