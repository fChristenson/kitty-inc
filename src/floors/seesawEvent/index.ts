// the "Seesaw" event: it covers its crit, whose click freezes the screen
// while a big gold seesaw pops up in the middle of it, a wisp sitting on its
// low end. Another drops from the top onto the high end, slamming it down and
// catapulting the first up; it comes down on the other end and launches the
// second higher, back and forth, ever higher, each landing a slam, a bang, a
// jolt and coins flung off the plank. The last lands so hard it rockets the
// other clean off the top of the screen in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, playSlamExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, type Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "seesaw";
const REWARD = 4;
// landings in all, the first the drop from the top
const LANDINGS = 6;
// the seesaw, as shares of the screen's width: its plank LENGTH long and
// THICK thick, tipping TILT rad either way on a fulcrum FULCRUM_W wide and
// FULCRUM_H tall whose tip sits DROP of the screen's height below its middle;
// popping in over POP_MS
const LENGTH = 0.72;
const THICK = 0.035;
const TILT = 0.32;
const FULCRUM_W = 0.14;
const FULCRUM_H = 0.12;
const DROP = 0.14;
const POP_MS = 220;
// each flip: the plank snaps over, overshooting by WOBBLE and settling
const WOBBLE = 0.18;
// the wisps at WISP of the screen's width; each launch HEIGHT of the
// screen's height high (growing), capped CEILING below its top
const WISP = 0.065;
const HEIGHT: [number, number] = [0.18, 0.42];
const CEILING = 0.06;
// each landing: a burst, a jolt and coins flung off the plank
const LAND_BURST: [number, number] = [0.3, 0.55];
const LAND_BURST_MS = 260;
const LAND_SHAKE: [number, number] = [0.7, 1.7];
const LAND_COINS: [number, number] = [3, 5];
const FLING: [number, number] = [90, 260];
// the last: the other wisp rockets off the top over ROCKET_MS, a huge blast
// on the plank's end and a ring of FINAL_COINS
const ROCKET_MS = 320;
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 380];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;
// the look
const EDGE_WIDTH = 5;
const GLOW_WIDTH = 16;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const between = (range: [number, number]) => lerp(range, Math.random());

interface Landing {
  at: number;
  // which end it's on: -1 the left, 1 the right
  side: number;
  // how high the other wisp's launched off it, and for how long
  height: number;
  flightMs: number;
  firedAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.seesawEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { introMs, flightMs, flipMs, holdMs, mergeMs } = CONFIG.seesawEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const pivot = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2 + height * DROP,
      };
      const half = (width * LENGTH) / 2;
      const thick = width * THICK;
      const wisp = width * WISP;
      const ceiling = area.top + height * CEILING;

      // the right end lands first, then each lands on the end just tipped up
      let at = introMs;
      const landings: Landing[] = Array.from({ length: LANDINGS }, (_, k) => {
        const t = k / (LANDINGS - 2);
        const landing: Landing = {
          at,
          side: k % 2 === 0 ? 1 : -1,
          height: height * lerp(HEIGHT, Math.min(1, t)),
          flightMs:
            k === LANDINGS - 1 ? ROCKET_MS : lerp(flightMs, Math.min(1, t)),
          firedAt: null,
        };
        at += landing.flightMs;
        return landing;
      });
      const last = landings[LANDINGS - 1];
      const startedAt = performance.now();

      // the plank's tilt ms in: positive tips its right end down; it starts
      // left end down and snaps toward each landing's end
      const tiltAt = (ms: number): number => {
        let tilt = -TILT;
        for (const landing of landings) {
          if (ms < landing.at) break;
          const u = clamp01((ms - landing.at) / flipMs);
          const from = -landing.side * TILT;
          const to = landing.side * TILT;
          const ease = 1 - (1 - u) ** 3;
          const settle = WOBBLE * Math.sin(Math.PI * u) * (1 - u);
          tilt = from + (to - from) * ease + landing.side * TILT * settle;
        }
        return tilt;
      };
      // where a wisp sits on an end at a given tilt
      const seatAt = (side: number, tilt: number): Point => ({
        x:
          pivot.x +
          side * half * Math.cos(tilt) +
          Math.sin(tilt) * (thick / 2 + wisp * 0.6),
        y:
          pivot.y +
          side * half * Math.sin(tilt) -
          Math.cos(tilt) * (thick / 2 + wisp * 0.6),
      });
      const upSeat = (side: number) => seatAt(side, -side * TILT);

      // wisp `side` ms in: riding its end, flung up off it, landing back on it
      const wispAt = (side: number, ms: number): Point | null => {
        if (ms < 0) return null;
        // the right one drops in from the top onto its high end
        if (side === 1 && ms < landings[0].at) {
          const seat = upSeat(1);
          const v = (ms / landings[0].at) ** 2;
          return {
            x: seat.x,
            y: area.top - wisp * 2 + (seat.y - area.top + wisp * 2) * v,
          };
        }
        // launched off the landing on the other end, until it lands again
        const launch = landings.find(
          (l) => l.side === -side && ms >= l.at && ms < l.at + l.flightMs,
        );
        if (launch) {
          const off = launch.at + flipMs;
          const seat = upSeat(side);
          if (ms < off) return seatAt(side, tiltAt(ms));
          const u = (ms - off) / (launch.at + launch.flightMs - off);
          if (launch === last) {
            const top = area.top - height * 0.3;
            return { x: seat.x, y: seat.y + (top - seat.y) * u * (2 - u) };
          }
          const lift = Math.min(launch.height, seat.y - ceiling);
          return { x: seat.x, y: seat.y - lift * 4 * u * (1 - u) };
        }
        if (ms >= last.at + last.flightMs && side === -last.side) return null;
        return seatAt(side, tiltAt(ms));
      };

      const drawSeesaw = (ctx: CanvasRenderingContext2D, ms: number) => {
        const grow = 1 - (1 - clamp01(ms / POP_MS)) ** 3;
        if (grow <= 0) return;
        const shapes = [
          () => {
            const fw = width * FULCRUM_W * grow;
            const fh = width * FULCRUM_H * grow;
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(pivot.x + fw / 2, pivot.y + fh);
            ctx.lineTo(pivot.x - fw / 2, pivot.y + fh);
            ctx.closePath();
          },
          () => {
            ctx.save();
            ctx.translate(pivot.x, pivot.y);
            ctx.rotate(tiltAt(ms));
            ctx.beginPath();
            ctx.roundRect(
              -half * grow,
              -thick / 2,
              half * 2 * grow,
              thick,
              thick / 2,
            );
            ctx.restore();
          },
        ];
        for (const shape of shapes) {
          shape();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = COLOR.heavenlyGold;
          ctx.lineWidth = GLOW_WIDTH;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.fill();
          ctx.strokeStyle = COLOR.white;
          ctx.lineWidth = EDGE_WIDTH;
          ctx.stroke();
        }
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.at + last.flightMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            landings.forEach((landing, k) => {
              if (landing.firedAt === null && ms >= landing.at)
                land(landing, k, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            ctx.lineJoin = "round";
            drawSeesaw(ctx, ms);
            landings.forEach((landing, k) => {
              if (landing.firedAt === null || landing === last) return;
              const at = seatAt(landing.side, landing.side * TILT);
              drawWhiteBurst(
                ctx,
                at.x,
                at.y,
                (now - landing.firedAt) / LAND_BURST_MS,
                lerp(LAND_BURST, k / (LANDINGS - 2)),
              );
            });
            if (last.firedAt !== null) {
              const at = seatAt(last.side, last.side * TILT);
              drawExplosion(
                ctx,
                at.x,
                at.y,
                now - last.firedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            }
            ctx.restore();
          },
          // the wisps over the coins they fling
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / last.at);
            const grow = 1 - (1 - clamp01(ms / POP_MS)) ** 3;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const side of [-1, 1])
              drawWisp(
                ctx,
                (t) => wispAt(side, t),
                ms,
                now,
                wisp * (side === 1 ? 1 : grow),
                heat,
              );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each wisp lands on its end
      function land(landing: Landing, k: number, now: number): void {
        landing.firedAt = now;
        if (!cover?.isLive()) return;
        const at = seatAt(landing.side, landing.side * TILT);
        if (landing === last) {
          playSlamExplosion();
          playSwoosh();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            at,
            Array.from({ length: FINAL_COINS }, (_, i) => {
              const angle = (i / FINAL_COINS) * Math.PI * 2;
              const r = between(FINAL_RING);
              return {
                x: at.x + Math.cos(angle) * r,
                y: at.y + Math.sin(angle) * r,
              };
            }),
          );
          return;
        }
        const t = k / (LANDINGS - 2);
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(LAND_SHAKE, t));
        cover.launchFrom(
          at,
          Array.from({ length: Math.round(lerp(LAND_COINS, t)) }, () => {
            const angle = -Math.PI / 2 + landing.side * Math.random() * 1.2;
            const r = between(FLING);
            return {
              x: at.x + Math.cos(angle) * r,
              y: at.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Seesaw", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Seesaw
export function forceSeesawEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
