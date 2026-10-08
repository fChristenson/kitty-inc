// the "Bullseye" event: it covers its crit, whose click freezes the screen
// while bullseye targets pop up all over it. The button turns turret: a red
// sight flicks onto each target in turn and the wisp fires dead straight
// into it, ever faster, each hit blowing the target apart in a flash, a bang
// and a jolt, spraying coins. The last, biggest target dead center blows in a
// huge blast and shake, and the coins sweep into the total. Pays floor income
// × floor number × REWARD (see ../moneyCover)
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
import {
  drawWisp,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../../../shared/wisp";
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

const KEY = "bullseye";
const REWARD = 4;
const TARGETS = 7;
// each target's radius, the last (dead center) FINAL_SIZE times bigger; they
// pop in staggered by POP_STAGGER_MS, overshooting a little
const TARGET_R = 70;
const FINAL_SIZE = 1.8;
const POP_STAGGER_MS = 40;
const POP_OVERSHOOT = 1.7;
// the sight: a red line from the button flicking onto the next target
const SIGHT_WIDTH = 10;
const SIGHT_FLICKER_MS = 30;
// each shot: the wisp at SHOT_SIZE of its size, a muzzle flash at the button
const SHOT_SIZE = 0.6;
const MUZZLE_BURST = 0.15;
const MUZZLE_MS = 160;
// each hit: the target bursts apart (swelling BURST_GROW and fading over
// BURST_MS), a flash, a bang, a jolt and coins sprayed round it
const BURST_GROW = 0.9;
const BURST_MS = 200;
const HIT_FLASH = 0.35;
const HIT_FLASH_MS = 280;
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const HIT_COINS: [number, number] = [6, 10];
const SPRAY_R: [number, number] = [60, 220];
// the last: a huge blast and a ring of coins
const FINAL_SHAKE = 2.6;
const FINAL_COINS = 30;
const FINAL_RING: [number, number] = [140, 360];
const BLAST_SCALE = 1.7;
const SPARK_REACH = 340;
const SPARK_SIZE = 20;

interface Target extends Point {
  r: number;
  popAt: number;
  firedAt: number;
  hitAt: number;
  // performance.now() of its shot and its hit, once they happen
  shotAt: number | null;
  struckAt: number | null;
}

// red and white rings round a red middle, cartoon-outlined; drawn once
const SPRITE_HALF = 128;
let sprite: HTMLCanvasElement | null = null;

function bullseyeSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE_HALF * 2;
  const ctx = sprite.getContext("2d")!;
  const outline = SPRITE_HALF * 0.06;
  const rings = 5;
  for (let i = 0; i < rings; i++) {
    const r = (SPRITE_HALF - outline) * (1 - i / rings);
    ctx.beginPath();
    ctx.arc(SPRITE_HALF, SPRITE_HALF, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? COLOR.red : COLOR.white;
    ctx.fill();
    ctx.lineWidth = outline;
    ctx.strokeStyle = COLOR.black;
    ctx.stroke();
  }
  return sprite;
}

function drawTarget(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number,
): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(bullseyeSprite(), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// a back-eased pop from 0 to 1 that overshoots before settling
function popScale(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const s = POP_OVERSHOOT;
  const v = u - 1;
  return 1 + (s + 1) * v ** 3 + s * v ** 2;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.bullseyeEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { popMs, aimMs, travelMs, gapMs, holdMs, mergeMs } =
        CONFIG.bullseyeEvent;
      const button = getButtonCenter(context.isGroundFloor);
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      // the turret sweeps round the button through the rest, then the big
      // one dead center
      const spots = coverSpots(area, TARGETS - 1).sort(
        (a, b) =>
          Math.atan2(a.y - button.y, a.x - button.x) -
          Math.atan2(b.y - button.y, b.x - button.x),
      );
      spots.push(center);
      const allPopped = (TARGETS - 1) * POP_STAGGER_MS + popMs;
      let firedAt = allPopped + aimMs;
      const targets: Target[] = spots.map((spot, i) => {
        if (i > 0) firedAt += lerp(gapMs, (i - 1) / (TARGETS - 2));
        return {
          ...spot,
          r: TARGET_R * (i === TARGETS - 1 ? FINAL_SIZE : 1),
          popAt: i * POP_STAGGER_MS,
          firedAt,
          hitAt: firedAt + travelMs,
          shotAt: null,
          struckAt: null,
        };
      });
      const last = targets[targets.length - 1];
      const startedAt = performance.now();

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.hitAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            targets.forEach((target, i) => {
              if (target.shotAt === null && ms >= target.firedAt) fire(target);
              if (target.struckAt === null && ms >= target.hitAt)
                strike(target, i, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const target of targets) {
              const { x, y, r, struckAt } = target;
              if (struckAt === null)
                drawTarget(
                  ctx,
                  x,
                  y,
                  r * popScale((ms - target.popAt) / popMs),
                  1,
                );
              else {
                const t = (now - struckAt) / BURST_MS;
                if (t < 1)
                  drawTarget(ctx, x, y, r * (1 + BURST_GROW * t), 1 - t);
              }
            }
            // the sight, flicking onto whichever target's next
            const next = targets.find((target) => target.shotAt === null);
            if (next && ms >= next.firedAt - aimMs) {
              const on = Math.floor(ms / SIGHT_FLICKER_MS) % 2 === 0;
              ctx.globalAlpha = on ? 0.95 : 0.5;
              ctx.strokeStyle = COLOR.red;
              ctx.lineWidth = SIGHT_WIDTH;
              ctx.beginPath();
              ctx.moveTo(button.x, button.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
            for (const target of targets) {
              if (target.shotAt !== null)
                drawWhiteBurst(
                  ctx,
                  button.x,
                  button.y,
                  (now - target.shotAt) / MUZZLE_MS,
                  MUZZLE_BURST,
                );
              if (target.struckAt === null) continue;
              if (target === last)
                drawExplosion(
                  ctx,
                  target.x,
                  target.y,
                  now - target.struckAt,
                  now,
                  BLAST_SCALE,
                  SPARK_REACH,
                  SPARK_SIZE,
                );
              else
                drawWhiteBurst(
                  ctx,
                  target.x,
                  target.y,
                  (now - target.struckAt) / HIT_FLASH_MS,
                  HIT_FLASH,
                );
            }
            ctx.restore();
          },
          // the shots over the coins they knock out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const target of targets) {
              if (ms < target.firedAt || ms > target.hitAt + WISP_TRAIL_MS)
                continue;
              drawWisp(
                ctx,
                (t) => {
                  if (t < target.firedAt || t >= target.hitAt) return null;
                  const u = (t - target.firedAt) / travelMs;
                  return {
                    x: button.x + (target.x - button.x) * u,
                    y: button.y + (target.y - button.y) * u,
                  };
                },
                ms,
                now,
                WISP_SIZE * SHOT_SIZE * (target === last ? 1.5 : 1),
                1,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each shot leaves the button
      function fire(target: Target): void {
        target.shotAt = performance.now();
        playSwoosh();
      }

      // on the frame each shot lands
      function strike(target: Target, index: number, now: number): void {
        target.struckAt = now;
        if (!cover?.isLive()) return;
        if (target === last) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(
            target,
            Array.from({ length: FINAL_COINS }, (_, i) => {
              const angle = (i / FINAL_COINS) * Math.PI * 2;
              const r = lerp(FINAL_RING, Math.random());
              return {
                x: target.x + Math.cos(angle) * r,
                y: target.y + Math.sin(angle) * r,
              };
            }),
          );
          return;
        }
        const t = index / (TARGETS - 2);
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
        cover.launchFrom(
          target,
          Array.from({ length: Math.round(lerp(HIT_COINS, t)) }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = lerp(SPRAY_R, Math.random());
            return {
              x: target.x + Math.cos(angle) * r,
              y: target.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Bullseye", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Bullseye
export function forceBullseyeEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
