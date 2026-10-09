// the "Boomerang" event: it covers its crit, whose click freezes the screen
// while the button hurls the wisp out like a boomerang: it sweeps a wide loop
// across the screen, shedding coins all along it, and whips back to the
// button, slamming into it with a flash, a bang and a jolt. Each throw flies a
// different way, wider and faster; the last whips back in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
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
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";

const KEY = "boomerang";
const REWARD = 4;
// each throw: TURN rad off the way to the screen's middle, reaching REACH of
// the screen's width out (capped by its edges, EDGE_MARGIN in), the loop
// WIDE of that across, curving out on one side and back on the other
const TURN = [-0.45, 0.5, -0.95, 0];
const REACH = [0.45, 0.55, 0.62, 0.8];
const WIDE = 0.42;
const EDGE_MARGIN = 0.06;
// the wisp, growing over the throws
const SIZE: [number, number] = [1.2, 1.8];
// a coin shed every SHED_MS along each loop, tossed SHED_TOSS px off it
const SHED_MS = 55;
const SHED_TOSS: [number, number] = [40, 130];
// each catch: a burst on the button, a jolt and a spray of coins
const CATCH_BURST: [number, number] = [0.35, 0.6];
const CATCH_BURST_MS = 260;
const CATCH_SHAKE: [number, number] = [0.7, 1.5];
const CATCH_COINS = 5;
const SPRAY: [number, number] = [80, 220];
// the last: a huge blast and a ring of FINAL_COINS
const FINAL_COINS = 24;
const FINAL_RING: [number, number] = [120, 340];
const FINAL_SHAKE = 2.7;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

interface Throw {
  at: number;
  ms: number;
  // the way out (a unit vector), how far, and which side the loop leans
  way: Point;
  reach: number;
  side: number;
  caughtAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.boomerangEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { throwMs, holdMs, mergeMs } = CONFIG.boomerangEvent;
      const width = area.right - area.left;
      const margin = width * EDGE_MARGIN;
      const button = getButtonCenter(context.isGroundFloor);
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const base = Math.atan2(center.y - button.y, center.x - button.x);
      // how far a ray from the button runs before nearing the screen's edge
      const roomAlong = (way: Point): number => {
        const limits = [
          way.x < 0 ? (area.left + margin - button.x) / way.x : Infinity,
          way.x > 0 ? (area.right - margin - button.x) / way.x : Infinity,
          way.y < 0 ? (area.top + margin - button.y) / way.y : Infinity,
          way.y > 0 ? (area.bottom - margin - button.y) / way.y : Infinity,
        ];
        return Math.max(0, Math.min(...limits));
      };

      let at = 0;
      const throws: Throw[] = TURN.map((turn, k) => {
        const angle = base + turn;
        const way = { x: Math.cos(angle), y: Math.sin(angle) };
        const ms = lerp(throwMs, k / (TURN.length - 1));
        const thrown: Throw = {
          at,
          ms,
          way,
          reach: Math.min(width * REACH[k], roomAlong(way) * 0.92),
          side: k % 2 === 0 ? 1 : -1,
          caughtAt: null,
        };
        at += ms;
        return thrown;
      });
      const last = throws[throws.length - 1];
      const endAt = last.at + last.ms;
      const startedAt = performance.now();
      let shedAt = 0;

      // out along its way and back, leaning to one side going out and the
      // other coming back, slowing at the far end
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= endAt) return null;
        const thrown = throws.find((t) => ms < t.at + t.ms) ?? last;
        const u = (ms - thrown.at) / thrown.ms;
        const along = thrown.reach * Math.sin(Math.PI * u);
        const across =
          thrown.side * thrown.reach * WIDE * Math.sin(2 * Math.PI * u);
        const { way } = thrown;
        return {
          x: button.x + way.x * along - way.y * across,
          y: button.y + way.y * along + way.x * across,
        };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: endAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            throws.forEach((thrown, k) => {
              if (thrown.caughtAt === null && ms >= thrown.at + thrown.ms)
                caught(thrown, k, now);
            });
            if (ms < endAt && ms - shedAt >= SHED_MS) {
              shedAt = ms;
              shed(ms);
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            throws.forEach((thrown, k) => {
              if (thrown.caughtAt === null || thrown === last) return;
              drawWhiteBurst(
                ctx,
                button.x,
                button.y,
                (now - thrown.caughtAt) / CATCH_BURST_MS,
                lerp(CATCH_BURST, k / (throws.length - 2)),
              );
            });
            if (last.caughtAt !== null)
              drawExplosion(
                ctx,
                button.x,
                button.y,
                now - last.caughtAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisp over the coins it sheds
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const t = clamp01(ms / endAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(ctx, wispAt, ms, now, WISP_SIZE * lerp(SIZE, t), t);
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      playSwoosh();

      // a coin knocked off the wisp where it is
      function shed(ms: number): void {
        const at = wispAt(ms);
        if (!at || !cover?.isLive()) return;
        const angle = Math.random() * Math.PI * 2;
        const r = between(SHED_TOSS);
        cover.launchFrom(at, [
          { x: at.x + Math.cos(angle) * r, y: at.y + Math.sin(angle) * r },
        ]);
      }

      // on the frame the wisp whips back into the button
      function caught(thrown: Throw, k: number, now: number): void {
        thrown.caughtAt = now;
        if (!cover?.isLive()) return;
        if (thrown === last) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            button,
            ringTargets(button, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(CATCH_SHAKE, k / (throws.length - 2)));
        cover.launchFrom(
          button,
          sprayTargets(button, CATCH_COINS, SPRAY),
        );
      }
    },
  },
  { label: "Boomerang", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Boomerang
export function forceBoomerangEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
