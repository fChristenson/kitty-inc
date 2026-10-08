// the "Newton's Cradle" event: it covers its crit, whose click freezes the
// screen while five wisps pop up in a row across the middle of it, like a
// Newton's cradle. The left one is drawn back and let go: it clacks into the
// row and knocks the right one flying out, which comes back and clacks it
// the other way, ever faster and further, each clack
// a flash, a bang, a jolt and coins sprayed out of it. On the last clack all
// five fly apart in a huge blast and shake, and the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playExplosion, playSlamExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01 } from "../../../../shared/easing";

const KEY = "newtonsCradle";
const REWARD = 4;
const BALLS = 5;
// the balls sit SPACING of the screen width apart, just touching at
// BALL_SIZE of their spacing, popping in staggered over popMs
const SPACING = 0.11;
const BALL_SIZE = 0.69;
const POP_STAGGER_MS = 40;
// the swings: CLACKS in all, the ends swinging like pendulums from an unseen
// pivot PENDULUM of the screen width above them, each out-and-back reaching
// SWING rad, growing as they quicken
const CLACKS = 8;
const PENDULUM = 0.19;
const SWING: [number, number] = [0.55, 1.1];
// each clack: a flash where the balls meet, a jolt and coins sprayed out
const CLACK_BURST: [number, number] = [0.25, 0.5];
const CLACK_BURST_MS = 260;
const CLACK_SHAKE: [number, number] = [0.5, 1.4];
const CLACK_COINS: [number, number] = [3, 7];
const SPRAY: [number, number] = [70, 240];
// the last: every ball flies FLY_OUT of the screen width apart over flyMs,
// a huge blast and a ring of FINAL_COINS
const FLY_OUT = 0.6;
const FINAL_COINS = 30;
const FINAL_RING: [number, number] = [140, 380];
const FINAL_SHAKE = 2.6;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

interface Clack {
  at: number;
  // which end swung in to make it: 0 the left, BALLS - 1 the right
  ball: number;
  firedAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.newtonsCradleEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { popMs, firstSwingMs, swingMs, flyMs, holdMs, mergeMs } =
        CONFIG.newtonsCradleEvent;
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const width = area.right - area.left;
      const spacing = width * SPACING;
      const ballSize = spacing * BALL_SIZE;
      const pendulum = width * PENDULUM;
      const restX = (i: number) => center.x + (i - (BALLS - 1) / 2) * spacing;
      const restY = center.y;
      // the left lets go first, then each clack hands the swing to the other end
      let at = popMs + firstSwingMs;
      const clacks: Clack[] = Array.from({ length: CLACKS }, (_, k) => {
        if (k > 0) at += lerp(swingMs, (k - 1) / (CLACKS - 2));
        return { at, ball: k % 2 === 0 ? 0 : BALLS - 1, firedAt: null };
      });
      const last = clacks[clacks.length - 1];
      const startedAt = performance.now();

      // ball i's swing angle ms in (negative swings left)
      const angleOf = (i: number, ms: number): number => {
        if (i !== 0 && i !== BALLS - 1) return 0;
        const side = i === 0 ? -1 : 1;
        // drawn back while popping in, then let go into the first clack
        if (i === 0 && ms < clacks[0].at) {
          const pull = SWING[0] * clamp01(ms / popMs);
          const u = clamp01((ms - popMs) / firstSwingMs);
          return side * pull * Math.cos((Math.PI / 2) * u);
        }
        for (let k = 1; k < clacks.length; k++) {
          const from = clacks[k - 1];
          const to = clacks[k];
          if (ms < from.at || ms >= to.at) continue;
          // the clack at `from` knocks out the other end, which swings back for `to`
          if (to.ball !== i) return 0;
          const u = (ms - from.at) / (to.at - from.at);
          return side * lerp(SWING, k / (CLACKS - 1)) * Math.sin(Math.PI * u);
        }
        return 0;
      };
      const ballAt = (i: number, ms: number): Point | null => {
        if (ms < i * POP_STAGGER_MS) return null;
        if (ms >= last.at) {
          // flung apart from the middle after the last clack
          const u = (ms - last.at) / flyMs;
          if (u >= 1) return null;
          const dx = restX(i) - center.x;
          const away = {
            x: dx || 0.001,
            y: -spacing * (0.3 * (i - 2) ** 2 + 0.6),
          };
          const length = Math.hypot(away.x, away.y);
          const out = width * FLY_OUT * (1 - (1 - u) ** 2);
          return {
            x: restX(i) + (away.x / length) * out,
            y: restY + (away.y / length) * out,
          };
        }
        const angle = angleOf(i, ms);
        return {
          x: restX(i) + pendulum * Math.sin(angle),
          y: restY - pendulum * (1 - Math.cos(angle)),
        };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.at + Math.max(flyMs, holdMs) + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            clacks.forEach((clack, k) => {
              if (clack.firedAt === null && ms >= clack.at) fire(clack, k, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            clacks.forEach((clack, k) => {
              if (clack.firedAt === null || clack === last) return;
              const contact = contactOf(clack);
              drawWhiteBurst(
                ctx,
                contact.x,
                contact.y,
                (now - clack.firedAt) / CLACK_BURST_MS,
                lerp(CLACK_BURST, k / (CLACKS - 1)) * (ballSize / WISP_SIZE),
              );
            });
            if (last.firedAt !== null)
              drawExplosion(
                ctx,
                center.x,
                restY,
                now - last.firedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the balls over the coins they knock out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (let i = 0; i < BALLS; i++) {
              const pop = clamp01((ms - i * POP_STAGGER_MS) / popMs);
              const size = ballSize * pop;
              const heat = clamp01(ms / last.at);
              // only the swinging ends (and the flung finale) leave a trail
              if (i === 0 || i === BALLS - 1 || ms >= last.at)
                drawWisp(ctx, (t) => ballAt(i, t), ms, now, size, heat);
              else drawWispHead(ctx, (t) => ballAt(i, t), ms, now, size, heat);
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // where an end ball meets the row
      function contactOf(clack: Clack): Point {
        const inner = clack.ball === 0 ? 1 : BALLS - 2;
        return { x: (restX(clack.ball) + restX(inner)) / 2, y: restY };
      }

      // on the frame each clack lands
      function fire(clack: Clack, k: number, now: number): void {
        clack.firedAt = now;
        if (!cover?.isLive()) return;
        if (clack === last) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            { x: center.x, y: restY },
            Array.from({ length: FINAL_COINS }, (_, i) => {
              const angle = (i / FINAL_COINS) * Math.PI * 2;
              const r = lerp(FINAL_RING, Math.random());
              return {
                x: center.x + Math.cos(angle) * r,
                y: restY + Math.sin(angle) * r,
              };
            }),
          );
          return;
        }
        const t = k / (CLACKS - 1);
        playExplosion();
        shakeScreen(lerp(CLACK_SHAKE, t));
        const contact = contactOf(clack);
        cover.launchFrom(
          contact,
          Array.from({ length: Math.round(lerp(CLACK_COINS, t)) }, () => {
            const angle = -Math.PI * Math.random();
            const r = lerp(SPRAY, Math.random());
            return {
              x: contact.x + Math.cos(angle) * r,
              y: contact.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Newton's Cradle", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Newton's Cradle
export function forceNewtonsCradleEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
