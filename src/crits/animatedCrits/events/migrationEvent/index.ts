// the "Migration" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a V of wisps sweeps in across the top of the
// screen like migrating birds; one after another, ever faster, a wisp peels
// off the flock and swoops down onto an empty spot on a floor in view with
// room, landing in a flash, a bang and a jolt as a new worker; after the
// last lands its new hire flashes in a huge blast and shake as the leader
// flies on off the screen. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "migration";
const MAX_HIRES = 4;
// the V's wings: each bird BACK px behind and WING px out from the one ahead
const BACK = 80;
const WING = 46;
const ALTITUDE = 140;
const FORM_MS = 280;
const BIRD = 0.75;
const LAND_SHAKE: [number, number] = [0.9, 1.7];

export const forceMigrationEvent = registerWispEvent(
  KEY,
  "Migration",
  () => CONFIG.migrationEvent.chance,
  (floor, context, area) => {
    const { crossMs, firstPeelMs, peelGapsMs, diveMs, holdMs, mergeMs } =
      CONFIG.migrationEvent;
    const hires = findRewardHires(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const span = area.right - area.left + 400;
    const startX = dir > 0 ? area.left - 80 : area.right + 80;
    const y = area.top + ALTITUDE;
    // the leader's spot ms in; bird i trails it in the V
    const flock = (i: number, ms: number, into: Point): Point => {
      const rank = Math.ceil(i / 2);
      into.x = startX + dir * ((span * ms) / crossMs - rank * BACK);
      into.y = y + rank * WING * (i % 2 === 0 ? 1 : -1) * 0.6 + rank * 10;
      return into;
    };
    const peels: number[] = [];
    let clock: number = firstPeelMs;
    hires.forEach((_, k) => {
      peels.push(clock);
      clock += lerp(peelGapsMs, k / Math.max(1, hires.length - 1));
    });
    const lands = peels.map((at) => at + diveMs);
    const endAt = lands[lands.length - 1];
    const birds = hires.map((hire, k) => {
      const from = flock(k + 1, peels[k], { x: 0, y: 0 });
      const spot: Point = { x: hire.x, y: hire.y };
      const swoop: Point = { x: spot.x - dir * 120, y: from.y + 40 };
      const head: Point = { x: 0, y: 0 };
      return {
        spot,
        at: (ms: number): Point | null => {
          if (ms < 0 || ms > lands[k]) return null;
          if (ms < peels[k]) return flock(k + 1, ms, head);
          return bezier(
            from,
            swoop,
            spot,
            easeIn((ms - peels[k]) / diveMs),
            head,
          );
        },
      };
    });
    const leaderHead: Point = { x: 0, y: 0 };
    const leader = (ms: number): Point | null =>
      ms < 0 || ms > crossMs ? null : flock(0, ms, leaderHead);

    const peeling = createBeats(
      peels,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      lands,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, hires.length - 1);
        giveHire(hires[k]);
        if (k === hires.length - 1) {
          cover!.blast(birds[k].spot);
          return;
        }
        cover!.burst(birds[k].spot, 0.8 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: Math.max(crossMs, endAt + holdMs) + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          peeling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          const heat = clamp01(ms / endAt);
          drawWispBetween(ctx, leader, ms, now, WISP_SIZE, heat, 0, crossMs);
          birds.forEach((bird, k) =>
            drawWispBetween(
              ctx,
              bird.at,
              ms,
              now,
              WISP_SIZE * BIRD,
              heat,
              0,
              lands[k],
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
