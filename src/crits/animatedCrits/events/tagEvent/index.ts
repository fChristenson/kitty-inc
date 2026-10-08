// the "Tag" event: it covers its crit, whose click freezes the screen while a
// small wisp darts out of the button and a big one swoops in from off the
// screen after it, hot on its tail. The small one dodges round the screen in
// sharp darts, ever faster, the big one gaining; every dodge a flash, a
// whoosh, a jolt and coins knocked loose. Then it bolts back to the button
// and the big one catches it there, swallowing it in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import {
  clamp01,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { ringTargets, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "tag";
const REWARD = 4;
// darts before the last bolt back to the button, each to the farthest of
// PICKS random spots EDGE_MARGIN of the screen's width in from its edges,
// curving CURVE of its length to alternate sides
const DODGES = 8;
const PICKS = 3;
const EDGE_MARGIN = 0.12;
const CURVE = 0.25;
// the chaser swoops in from ENTRY of the screen's width off its side
const ENTRY = 0.25;
// the wisps, as shares of the screen's width; the chaser swells as it gains
const SMALL = 0.05;
const BIG: [number, number] = [0.09, 0.13];
const POP_MS = 120;
// each dodge: a burst, a jolt and coins knocked loose off the turn
const DODGE_BURST: [number, number] = [0.3, 0.55];
const DODGE_BURST_MS = 240;
const DODGE_SHAKE: [number, number] = [0.6, 1.5];
const DODGE_COINS: [number, number] = [3, 5];
const SPRAY: [number, number] = [70, 210];
// the catch: a huge blast and a ring of FINAL_COINS
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 380];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;

interface Leg {
  from: Point;
  to: Point;
  // the bend's control point
  bend: Point;
  at: number;
  ms: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.tagEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { dodgeMs, lagMs, holdMs, mergeMs } = CONFIG.tagEvent;
      const width = area.right - area.left;
      const margin = width * EDGE_MARGIN;
      const button = getButtonCenter(context.isGroundFloor);
      const small = Math.max(WISP_SIZE, width * SMALL);
      const big = BIG.map((s) => Math.max(WISP_SIZE * 1.6, width * s)) as [
        number,
        number,
      ];

      const spot = (): Point => ({
        x: area.left + margin + Math.random() * (width - margin * 2),
        y:
          area.top +
          margin +
          Math.random() * (area.bottom - area.top - margin * 2),
      });
      const farthest = (from: Point): Point => {
        let best = spot();
        for (let k = 1; k < PICKS; k++) {
          const next = spot();
          if (
            Math.hypot(next.x - from.x, next.y - from.y) >
            Math.hypot(best.x - from.x, best.y - from.y)
          )
            best = next;
        }
        return best;
      };
      const legOf = (
        from: Point,
        to: Point,
        at: number,
        ms: number,
        k: number,
      ): Leg => {
        const side = k % 2 === 0 ? 1 : -1;
        return {
          from,
          to,
          bend: {
            x: (from.x + to.x) / 2 - (to.y - from.y) * CURVE * side,
            y: (from.y + to.y) / 2 + (to.x - from.x) * CURVE * side,
          },
          at,
          ms,
        };
      };

      // the small one's legs: out of the button, DODGES darts, back to it
      const legs: Leg[] = [];
      let from: Point = button;
      let at = 0;
      for (let k = 0; k <= DODGES; k++) {
        const to = k === DODGES ? button : farthest(from);
        const ms = lerp(dodgeMs, k / DODGES);
        legs.push(legOf(from, to, at, ms, k));
        from = to;
        at += ms;
      }
      const catchAt = at;
      // the chaser's run-in, from off the side farther from the button
      const offLeft = button.x - area.left > area.right - button.x;
      const entry = legOf(
        {
          x: offLeft ? area.left - width * ENTRY : area.right + width * ENTRY,
          y: (area.top + area.bottom) / 2,
        },
        button,
        -lagMs,
        lagMs,
        1,
      );

      const pointOn = (leg: Leg, ms: number): Point => {
        const u = smoothstep(clamp01((ms - leg.at) / leg.ms));
        const v = 1 - u;
        return {
          x: v * v * leg.from.x + 2 * u * v * leg.bend.x + u * u * leg.to.x,
          y: v * v * leg.from.y + 2 * u * v * leg.bend.y + u * u * leg.to.y,
        };
      };
      // the small one's trail along its legs; before it sets off, the chaser's
      // run-in, so the chaser can trace the same line
      const trailAt = (ms: number): Point => {
        if (ms < 0) return pointOn(entry, ms);
        for (const leg of legs)
          if (ms < leg.at + leg.ms) return pointOn(leg, ms);
        return button;
      };
      const smallAt = (ms: number): Point | null =>
        ms < 0 || ms >= catchAt ? null : trailAt(ms);
      // the chaser runs the same line lagging behind, closing to nothing at
      // the catch
      const bigAt = (ms: number): Point | null =>
        ms >= catchAt
          ? null
          : trailAt(ms - lagMs * (1 - clamp01(ms / catchAt)));

      const startedAt = performance.now();
      const beats = createBeats(
        legs,
        (leg) => leg.at + leg.ms,
        (leg, k) => dodged(leg, k),
      );

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: catchAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            beats.tick(ms, now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            legs.forEach((leg, k) => {
              const firedAt = beats.firedAt(k);
              if (firedAt === null || k === DODGES) return;
              const t = (now - firedAt) / DODGE_BURST_MS;
              if (t < 1)
                drawWhiteBurst(
                  ctx,
                  leg.to.x,
                  leg.to.y,
                  t,
                  lerp(DODGE_BURST, k / DODGES),
                );
            });
            const caughtAt = beats.firedAt(DODGES);
            if (caughtAt !== null)
              drawExplosion(
                ctx,
                button.x,
                button.y,
                now - caughtAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the wisps over the coins they knock loose
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            const heat = clamp01(ms / catchAt);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWispBetween(
              ctx,
              smallAt,
              ms,
              now,
              small * easeOutCubic(clamp01(ms / POP_MS)),
              heat,
              0,
              catchAt,
            );
            drawWispBetween(
              ctx,
              bigAt,
              ms,
              now,
              lerp(big, heat),
              heat,
              0,
              catchAt,
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame the small one turns at the end of each leg
      function dodged(leg: Leg, k: number): void {
        if (!cover?.isLive()) return;
        if (k === DODGES) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            button,
            ringTargets(button, FINAL_COINS, FINAL_RING),
          );
          return;
        }
        const t = k / DODGES;
        playExplosion();
        playSwoosh();
        shakeScreen(lerp(DODGE_SHAKE, t));
        cover.launchFrom(
          leg.to,
          sprayTargets(leg.to, Math.round(lerp(DODGE_COINS, t)), SPRAY),
        );
      }
    },
  },
  { label: "Tag", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Tag
export function forceTagEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
