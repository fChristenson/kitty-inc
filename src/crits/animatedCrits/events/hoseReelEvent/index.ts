// the "Hose Reel" event (mix; cash): it covers its crit, whose click freezes
// the screen while a wisp nozzle races out of the clicked floor's button,
// unreeling a hose of flowing cash behind it in big loop-the-loops across
// the screen, every loop a coin spray, a bloop and a jolt; then it whips
// round and reels the whole hose back in at double speed, the cash rushing
// back along it and up into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "hoseReel";
const REWARD = 4;
const LOOPS = 4;
const LOOP_R = 110;
const EDGE = 140;
const COINS = 12;
const WISP = 0.55;
const LOOP_SHAKE: [number, number] = [0.4, 1.1];

export const forceHoseReelEvent = registerWispEvent(
  KEY,
  "Hose Reel",
  () => CONFIG.hoseReelEvent.chance,
  (floor, context, area) => {
    const { unreelMs, reelMs, holdMs, mergeMs } = CONFIG.hoseReelEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const y = (area.top + area.bottom) / 2;
    const x0 = area.left + EDGE;
    const x1 = area.right - EDGE;
    // a cycloid: loop-the-loops marching across the screen and back
    const out = sampleLine((u): Point => {
      if (u < 0.1) {
        const e = u / 0.1;
        return { x: lerp([button.x, x0], e), y: lerp([button.y, y], e) };
      }
      const v = (u - 0.1) / 0.9;
      const a = v * LOOPS * Math.PI * 2;
      return {
        x: lerp([x0, x1], v) - Math.sin(a) * LOOP_R,
        y: y - (1 - Math.cos(a)) * LOOP_R,
      };
    }, 160);
    const back = [...out].reverse();
    back.push(total);
    const unreel: Pour = {
      coinsAlong: 200,
      width: 30,
      streamMs: unreelMs * 0.8,
      travelMs: unreelMs,
    };
    const reel: Pour = {
      coinsAlong: 260,
      width: 36,
      streamMs: reelMs * 0.8,
      travelMs: reelMs,
    };
    const endAt = unreelMs + reelMs;
    const loops = Array.from({ length: LOOPS }, (_, k) => {
      const i = Math.round((0.1 + (0.9 * (k + 0.5)) / LOOPS) * 160);
      return { at: out[i], ms: (unreelMs * i) / 160 };
    });
    const durationMs = Math.max(
      pourDurationMs(unreelMs, reel),
      endAt + holdMs + mergeMs,
    );
    const outHead = riverHead(out, unreelMs);
    const backHead = riverHead(back, reelMs, unreelMs);
    const nozzle = (ms: number): Point | null =>
      outHead(Math.max(0, ms)) ?? backHead(ms);

    const pouring = createBeats(
      [0, unreelMs],
      (ms) => ms,
      (ms) => {
        if (ms === 0) pourLine(cover!, out, unreel);
        else pourLine(cover!, back, reel);
      },
    );
    const looping = createBeats(
      loops,
      (l) => l.ms,
      (l, k) => {
        cover!.launchFrom(
          l.at,
          clampTargetsY(
            ringTargets(l.at, COINS, [40, 160]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LOOP_SHAKE, k / (LOOPS - 1)));
      },
    );
    const finale = createBeats(
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
          pouring.tick(ms, now);
          looping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            nozzle,
            ms,
            now,
            WISP_SIZE * WISP,
            0.7,
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
