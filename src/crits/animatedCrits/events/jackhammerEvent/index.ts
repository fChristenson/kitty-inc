// the "Jackhammer" event: it covers its crit, whose click freezes the screen
// while the wisp jackhammers the button, its taps coming ever faster and
// shorter, each a jolt with coins popping out, building to a blurring frenzy;
// then it blows apart on the button in a huge blast and shake that sprays
// coins over the whole screen, and they all sweep into the total. Pays floor
// income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSlamExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp } from "../../../../shared/easing";

const KEY = "jackhammer";
const REWARD = 3;
// taps a second, from the first to the last, and how high the wisp lifts off
// the button between them (shrinking as they speed up)
const TAP_HZ: [number, number] = [6, 26];
const LIFT: [number, number] = [200, 90];
// it strikes this far above the button's middle
const CONTACT = 18;
// each tap: a jolt growing with the frenzy, a burst on the button and a coin
// or two popping up out of it, this high and this far to the sides. Shakes
// stack, so at full speed the taps rattle at about 3x TAP_SHAKE's end
const TAP_SHAKE: [number, number] = [0.15, 0.3];
const TAP_BURST = 0.18;
const TAP_BURST_MS = 220;
const TAP_COINS = 2;
const POP_UP: [number, number] = [60, 260];
const POP_SIDE = 170;
// a whir only for taps at least this far apart, so the frenzy doesn't drone
const BLOOP_GAP_MS = 70;
// the blast
const BLAST_COINS = 40;
const BLAST_SHAKE = 2.6;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 360;
const SPARK_SIZE = 22;


registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.jackhammerEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { hammerMs, holdMs, mergeMs } = CONFIG.jackhammerEvent;
      const button = getButtonCenter(context.isGroundFloor);
      const contact = { x: button.x, y: button.y - CONTACT };
      // taps done by ms in: the integral of the speeding-up tap rate
      const tapsAt = (ms: number) => {
        const sec = Math.min(ms, hammerMs) / 1000;
        const slope = (TAP_HZ[1] - TAP_HZ[0]) / (hammerMs / 1000);
        return TAP_HZ[0] * sec + (slope * sec * sec) / 2;
      };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= hammerMs) return null;
        const u = ms / hammerMs;
        return {
          x: contact.x,
          y:
            contact.y -
            lerp(LIFT, u) * Math.abs(Math.sin(Math.PI * tapsAt(ms))),
        };
      };
      const startedAt = performance.now();
      const tapTimes: number[] = [];
      let lastBloop = -Infinity;
      let blastAt: number | null = null;

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: hammerMs + holdMs + mergeMs, mergeMs },
        {
          layout: (area) => coverSpots(area, BLAST_COINS),
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (tapTimes.length < Math.floor(tapsAt(ms))) tap(now, ms);
            if (blastAt === null && ms >= hammerMs) blast(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const last = tapTimes[tapTimes.length - 1];
            if (last !== undefined)
              drawWhiteBurst(
                ctx,
                contact.x,
                contact.y,
                (now - last) / TAP_BURST_MS,
                TAP_BURST,
              );
            if (blastAt !== null)
              drawExplosion(
                ctx,
                contact.x,
                contact.y,
                now - blastAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisp over its coins, so they pop out from under it
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(
              ctx,
              wispAt,
              ms,
              now,
              WISP_SIZE,
              Math.min(1, ms / hammerMs),
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each tap lands
      function tap(now: number, ms: number): void {
        tapTimes.push(now);
        if (!cover?.isLive()) return;
        const u = Math.min(1, ms / hammerMs);
        shakeScreen(lerp(TAP_SHAKE, u));
        if (now - lastBloop >= BLOOP_GAP_MS) {
          lastBloop = now;
          playBloop();
        }
        cover.launchFrom(
          contact,
          Array.from({ length: TAP_COINS }, () => ({
            x: contact.x + (Math.random() * 2 - 1) * POP_SIDE,
            y: contact.y - lerp(POP_UP, Math.random()),
          })),
        );
      }
      function blast(now: number): void {
        blastAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        cover.launchFrom(contact, cover.spots);
      }
    },
  },
  { label: "Jackhammer", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Jackhammer
export function forceJackhammerEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
