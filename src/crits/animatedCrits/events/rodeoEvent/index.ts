// the "Rodeo" event (mix; cash): it covers its crit, whose click freezes the
// screen while a river of cash bursts out of the clicked floor's button like
// a bucking bronco and a rider wisp clings to its head as it bucks across the
// screen, kicking higher with every leap, every buck a whoop, a bloop and a
// jolt; then it rears up off the far side into the total and throws its
// rider in a huge blast and shake. Pays floor income × floor number × REWARD
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
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "rodeo";
const REWARD = 4;
const BUCKS = 5;
const EDGE = 40;
// bucks kick from KICK[0] to KICK[1] px high
const KICK: [number, number] = [50, 170];
const RIDER = 0.5;
const BUCK_SHAKE: [number, number] = [0.4, 1.3];

export const forceRodeoEvent = registerWispEvent(
  KEY,
  "Rodeo",
  () => CONFIG.rodeoEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.rodeoEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x < (area.left + area.right) / 2;
    const far = ltr ? area.right - EDGE : area.left + EDGE;
    const total = totalSpot(area);
    const base = Math.min(area.bottom - EDGE - KICK[1] / 2, button.y + 120);
    // the bucking run takes RUN of the river, the rear up into the total the rest
    const RUN = 0.8;
    const line = sampleLine((u) => {
      if (u > RUN) {
        const v = (u - RUN) / (1 - RUN);
        return { x: lerp([far, total.x], v * v), y: lerp([base, total.y], v) };
      }
      const v = u / RUN;
      const buck = Math.abs(Math.sin(v * BUCKS * Math.PI));
      return {
        x: lerp([button.x, far], v),
        y: lerp([button.y, base], Math.min(1, v * 4)) - buck * lerp(KICK, v),
      };
    }, 200);
    const pour: Pour = { coinsAlong: 1000, width: 40, streamMs, travelMs };
    const head = riverHead(line, travelMs);
    const bucks = Array.from({ length: BUCKS }, (_, k) => {
      const v = (k + 0.5) / BUCKS;
      return {
        ms: travelMs * RUN * v,
        at: { x: lerp([button.x, far], v), y: base - lerp(KICK, v) } as Point,
      };
    });
    const endAt = travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      endAt + holdMs + mergeMs,
    );

    const bucking = createBeats(
      bucks,
      (b) => b.ms,
      (b, k) => {
        cover!.burst(b.at, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BUCK_SHAKE, k / (BUCKS - 1)));
      },
    );
    const thrown = createBeats(
      [endAt],
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
          bucking.tick(ms, now);
          thrown.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, head, ms, now, WISP_SIZE * RIDER, 0.6, 0, endAt),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
