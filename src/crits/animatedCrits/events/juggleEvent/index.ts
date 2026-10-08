// the "Juggle" event: it covers its crit, whose click freezes the screen
// while the button tosses up three wisps, one after another, into a juggle in
// the middle of it: they loop round a figure of eight between two unseen
// hands, ever faster and higher, each catch a flash, a pop, a jolt and coins
// tossed out. Then each is caught one last time and hurled straight up, all
// three meeting in a huge blast and shake, and the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playSwoosh } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01, between } from "../../../../shared/easing";

const KEY = "juggle";
const REWARD = 4;
const BALLS = 3;
// THROWS in all, one a beat, alternating hands; each ball is caught BALLS
// beats after it's thrown and held for DWELL of a beat before its next throw
const THROWS = 9;
const FIRST_THROW_MS = 80;
const DWELL = 0.4;
// the hands, as shares of the screen: HANDS_Y below its middle, throwing
// from INNER out of the middle and catching OUTER out, scooping DIP down
const HANDS_Y = 0.18;
const INNER = 0.08;
const OUTER = 0.22;
const DIP = 0.04;
// each throw's height, as a share of the screen's height, growing
const HEIGHT: [number, number] = [0.24, 0.42];
// the balls at BALL_SIZE of the screen width
const BALL_SIZE = 0.07;
// each catch: a burst, a jolt and coins tossed out
const CATCH_BURST: [number, number] = [0.3, 0.6];
const CATCH_BURST_MS = 220;
const CATCH_SHAKE: [number, number] = [0.3, 1.1];
const CATCH_COINS: [number, number] = [2, 4];
const TOSS: [number, number] = [80, 240];
// the last: all three meet APEX of the screen height above the hands, a huge
// blast and a ring of FINAL_COINS
const APEX = 0.5;
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 360];
const FINAL_SHAKE = 2.7;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

const mix = (a: Point, b: Point, u: number): Point => ({
  x: a.x + (b.x - a.x) * u,
  y: a.y + (b.y - a.y) * u,
});

interface Catch {
  at: number;
  where: Point;
  throwIndex: number;
  firedAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.juggleEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { beatMs, riseMs, holdMs, mergeMs } = CONFIG.juggleEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const handsY = center.y + height * HANDS_Y;
      const ceiling = area.top + height * 0.08;
      const button = getButtonCenter(context.isGroundFloor);
      const ballSize = Math.max(WISP_SIZE, width * BALL_SIZE);
      // hand 0 the left, 1 the right
      const throwFrom = (hand: number): Point => ({
        x: center.x + (hand === 0 ? -1 : 1) * width * INNER,
        y: handsY,
      });
      const catchAt = (hand: number): Point => ({
        x: center.x + (hand === 0 ? -1 : 1) * width * OUTER,
        y: handsY,
      });
      const apex = {
        x: center.x,
        y: Math.max(ceiling, handsY - height * APEX),
      };

      // the beats, quickening, with BALLS spare for the last catches
      const beats = [FIRST_THROW_MS];
      for (let k = 1; k < THROWS + BALLS; k++)
        beats.push(beats[k - 1] + lerp(beatMs, (k - 1) / (THROWS + BALLS - 2)));
      const dwellBefore = (k: number) => DWELL * (beats[k] - beats[k - 1]);
      const blastAt = beats[THROWS + BALLS - 1] + riseMs;
      // throw j: from hand j % 2 to the other, caught BALLS beats on
      const catches: Catch[] = Array.from({ length: THROWS }, (_, j) => ({
        at: beats[j + BALLS] - dwellBefore(j + BALLS),
        where: catchAt(1 - (j % 2)),
        throwIndex: j,
        firedAt: null,
      }));
      const startedAt = performance.now();
      let blastedAt: number | null = null;

      const arc = (from: Point, to: Point, lift: number, u: number): Point => {
        const at = mix(from, to, u);
        return { x: at.x, y: at.y - lift * 4 * u * (1 - u) };
      };
      // ball b ms in: thrown on beats b, b + BALLS, …; the first straight
      // off the button; after its last catch, hurled up to the apex
      const ballAt = (b: number, ms: number): Point | null => {
        if (ms < beats[b] || ms >= blastAt) return null;
        let j = b;
        while (j + BALLS < THROWS && ms >= beats[j + BALLS]) j += BALLS;
        const hand = j % 2;
        const caught = catches[j];
        const from = j < BALLS ? button : throwFrom(hand);
        if (ms < caught.at) {
          const u = (ms - beats[j]) / (caught.at - beats[j]);
          const lift = height * lerp(HEIGHT, j / (THROWS - 1));
          return arc(from, caught.where, Math.min(lift, handsY - ceiling), u);
        }
        if (j + BALLS < THROWS) {
          // scooped from the catch in to the next throw
          const next = j + BALLS;
          const u = (ms - caught.at) / (beats[next] - caught.at);
          return arc(caught.where, throwFrom(1 - hand), -height * DIP, u);
        }
        const u = (ms - caught.at) / (blastAt - caught.at);
        return mix(caught.where, apex, 1 - (1 - u) ** 2);
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            for (const c of catches)
              if (c.firedAt === null && ms >= c.at) fireCatch(c, now);
            if (blastedAt === null && ms >= blastAt) blast(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const c of catches) {
              if (c.firedAt === null) continue;
              drawWhiteBurst(
                ctx,
                c.where.x,
                c.where.y,
                (now - c.firedAt) / CATCH_BURST_MS,
                lerp(CATCH_BURST, c.throwIndex / (THROWS - 1)),
              );
            }
            if (blastedAt !== null)
              drawExplosion(
                ctx,
                apex.x,
                apex.y,
                now - blastedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the balls over the coins they toss out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / blastAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let b = 0; b < BALLS; b++) {
              const pop = clamp01((ms - beats[b]) / 120);
              drawWisp(ctx, (t) => ballAt(b, t), ms, now, ballSize * pop, heat);
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      playSwoosh();

      // on the frame each ball lands in a hand
      function fireCatch(c: Catch, now: number): void {
        c.firedAt = now;
        if (!cover?.isLive()) return;
        const t = c.throwIndex / (THROWS - 1);
        playBloop();
        shakeScreen(lerp(CATCH_SHAKE, t));
        cover.launchFrom(
          c.where,
          Array.from({ length: Math.round(lerp(CATCH_COINS, t)) }, () => {
            const angle = -Math.PI * Math.random();
            const r = between(TOSS);
            return {
              x: c.where.x + Math.cos(angle) * r,
              y: Math.max(ceiling, c.where.y + Math.sin(angle) * r),
            };
          }),
        );
      }

      // on the frame all three meet at the apex
      function blast(now: number): void {
        blastedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        cover.launchFrom(
          apex,
          Array.from({ length: FINAL_COINS }, (_, i) => {
            const angle = (i / FINAL_COINS) * Math.PI * 2;
            const r = between(FINAL_RING);
            return {
              x: apex.x + Math.cos(angle) * r,
              y: Math.max(ceiling, apex.y + Math.sin(angle) * r),
            };
          }),
        );
      }
    },
  },
  { label: "Juggle", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Juggle
export function forceJuggleEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
