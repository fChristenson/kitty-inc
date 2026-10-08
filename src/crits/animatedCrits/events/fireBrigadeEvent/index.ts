// the "Fire Brigade" event (mix; a free floor and cash): it covers its crit,
// whose click freezes the screen while three nozzle wisps take up positions
// along the bottom of the screen; one after another they open up, each
// arcing a roaring jet of cash high across the screen onto the next locked
// floor, every jet landing with a splash and a jolt as the nozzles buck
// harder; with all three blasting at once the floor bursts open in a huge
// blast and shake, unlocked for free, as the screen unfreezes. Pays floor
// income × floor number × REWARD, plus the floor
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { findRewardLocked } from "../../eventRewards";
import { pourLine, sampleLine, type Pour } from "../../cashFlow";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "fireBrigade";
const REWARD = 2;
const SIDES = [0.08, 0.92, 0.5];
const LOW = 70;
const ARC = 260;
const NOZZLE = 0.5;
const BUCK = 6;
const LAND_SHAKE: [number, number] = [0.6, 1.1];
const BURST_SHAKE = 2.2;
const JET: Pour = { coinsAlong: 160, width: 30, streamMs: 0, travelMs: 0 };

export const forceFireBrigadeEvent = registerWispEvent(
  KEY,
  "Fire Brigade",
  () => CONFIG.fireBrigadeEvent.chance,
  (floor, context, area) => {
    const { opensMs, travelMs, blastMs, holdMs, mergeMs } =
      CONFIG.fireBrigadeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const width = area.right - area.left;
    let clock = 0;
    const into: Point = { x: 0, y: 0 };
    const nozzles = SIDES.map((side, k) => {
      const home: Point = { x: area.left + width * side, y: area.bottom - LOW };
      // each lands on its own side of the lock
      const hit: Point = {
        x: lock.x + (side - 0.5) * FLOOR_W * 0.4,
        y: lock.y,
      };
      const peak: Point = {
        x: lerp([home.x, hit.x], 0.5) + (side - 0.5) * ARC,
        y: Math.min(home.y, hit.y) - ARC,
      };
      const opens = clock;
      clock += lerp(opensMs, k / (SIDES.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        home,
        hit,
        opens,
        lands: opens + travelMs,
        line: sampleLine((u) => ({ ...bezier(home, peak, hit, u, into) }), 30),
        // bucking harder the more jets are blasting
        at: (ms: number): Point => {
          const on =
            ms >= opens ? 1 + Math.min(2, Math.floor((ms - opens) / 200)) : 0;
          at.x = home.x + Math.sin(ms * 0.08 + k) * BUCK * on * 0.5;
          at.y = home.y + Math.cos(ms * 0.11 + k) * BUCK * on * 0.4;
          return at;
        },
      };
    });
    const burstsAt = nozzles[nozzles.length - 1].lands + blastMs;
    const endAt = burstsAt;

    const opening = createBeats(
      nozzles,
      (n) => n.opens,
      (n) => {
        // each keeps pouring till the floor bursts
        pourLine(cover!, n.line, {
          ...JET,
          streamMs: Math.max(200, burstsAt - n.opens),
          travelMs,
        });
        cover!.burst(n.home, 0.4);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      nozzles,
      (n) => n.lands,
      (n, k) => {
        cover!.burst(n.hit, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / (nozzles.length - 1)));
      },
    );
    const bursting = createBeats(
      [burstsAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) shakeScreen(BURST_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          opening.tick(ms, now);
          landing.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 200) return;
          for (const n of nozzles)
            drawWispBetween(
              ctx,
              n.at,
              ms,
              now,
              WISP_SIZE * NOZZLE,
              0.8,
              0,
              endAt + 200,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
