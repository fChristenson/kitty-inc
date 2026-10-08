// the "Popcorn" event: it covers its crit, whose click freezes the screen
// while a row of glowing kernels (the wisp) pops up along the clicked
// floor's floor and heats up as the screen rumbles: each twitches and hops on
// its own, at random, ever more often. Then they pop at random, ever faster:
// each with a flash, a pop and a jolt leaps up on its own arc and bursts into
// coins at the top of it. The last leaps highest and blows in a huge blast
// and shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  WISP_TRAIL_MS,
  type Point,
} from "../../../../shared/wisp";
import { FLOOR_W, SIDE_WALL_WIDTH } from "../../../../floors/constants";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../../moneyCover";
import { lerp, clamp01, between } from "../../../../shared/easing";

const KEY = "popcorn";
const REWARD = 3;
const KERNELS = 18;
// the row: along the room's floor, clear of its walls by ROW_MARGIN, each
// kernel at KERNEL_SIZE of a wisp, popping in over APPEAR_MS
const ROW_MARGIN = 60;
const KERNEL_SIZE = 0.6;
const APPEAR_MS = 160;
const APPEAR_STAGGER_MS = 12;
// heating: each kernel twitches up on its own every TWITCH_GAP_MS (shrinking
// as it heats), TWITCH_UP px high (growing) over TWITCH_MS; the screen
// rumbles every RUMBLE_MS
const TWITCH_GAP_MS: [number, number] = [420, 110];
const TWITCH_UP: [number, number] = [6, 34];
const TWITCH_MS: [number, number] = [110, 170];
const RUMBLE_MS = 80;
const RUMBLE: [number, number] = [0.06, 0.3];
// popping: a pop's chance grows through popMs, so they come ever faster;
// each leaps LEAP px up and SIDE px sideways over its jumpMs, then bursts
const LEAP: [number, number] = [170, 420];
const SIDE: [number, number] = [30, 150];
const POP_BURST = 0.15;
const POP_BURST_MS = 200;
const POP_SHAKE: [number, number] = [0.25, 0.7];
const PUFF_BURST = 0.22;
const PUFF_BURST_MS = 260;
const PUFF_COINS = 2;
const PUFF_SPREAD = 80;
const JUMP_SIZE = 0.7;
// the last: the highest leap, a huge blast and a ring of FINAL_COINS
const FINAL_LEAP = 560;
const FINAL_COINS = 16;
const FINAL_RING: [number, number] = [90, 260];
const FINAL_SHAKE = 2.4;
const BLAST_SCALE = 1.6;
const SPARK_REACH = 340;
const SPARK_SIZE = 20;

interface Twitch {
  at: number;
  ms: number;
  up: number;
}

interface Kernel extends Point {
  appearAt: number;
  twitches: Twitch[];
  // ms in that it pops and leaps, landing its burst at apex jumpMs later
  popAt: number;
  apex: Point;
  final: boolean;
  poppedAt: number | null;
  puffedAt: number | null;
}

// its own random hops while it heats up, until it pops
function planTwitches(appearAt: number, popAt: number): Twitch[] {
  const twitches: Twitch[] = [];
  let at = appearAt + Math.random() * TWITCH_GAP_MS[0];
  while (at < popAt) {
    const heat = clamp01(at / popAt);
    const ms = between(TWITCH_MS);
    if (at + ms > popAt) break;
    twitches.push({
      at,
      ms,
      up: lerp(TWITCH_UP, heat) * (0.5 + Math.random()),
    });
    at += ms + lerp(TWITCH_GAP_MS, heat) * (0.4 + Math.random() * 1.2);
  }
  return twitches;
}

// how high a heating kernel's twitches lift it ms in
function twitchLift(kernel: Kernel, ms: number): number {
  for (const t of kernel.twitches) {
    const u = (ms - t.at) / t.ms;
    if (u > 0 && u < 1) return t.up * 4 * u * (1 - u);
  }
  return 0;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.popcornEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { heatMs, popMs, jumpMs, holdMs, mergeMs } = CONFIG.popcornEvent;
      const left = Math.max(area.left, SIDE_WALL_WIDTH) + ROW_MARGIN;
      const right =
        Math.min(area.right, FLOOR_W - SIDE_WALL_WIDTH) - ROW_MARGIN;
      const rowY = Math.min(WORKER_FEET_Y, area.bottom - ROW_MARGIN);
      const ceiling = area.top + ROW_MARGIN;
      // pops pile up toward the end: share √r of the way through popMs
      const pops = Array.from({ length: KERNELS }, () =>
        Math.sqrt(Math.random()),
      );
      const lastIndex = pops.indexOf(Math.max(...pops));
      pops[lastIndex] = 1;
      const kernels: Kernel[] = pops.map((share, i) => {
        const x =
          left + ((i + 0.2 + Math.random() * 0.6) / KERNELS) * (right - left);
        const y = rowY - Math.random() * 10;
        const final = i === lastIndex;
        const popAt = heatMs + popMs * share;
        const appearAt = i * APPEAR_STAGGER_MS;
        return {
          x,
          y,
          appearAt,
          twitches: planTwitches(appearAt + APPEAR_MS, popAt),
          popAt,
          apex: {
            x: Math.min(
              right,
              Math.max(
                left,
                x +
                  (Math.random() < 0.5 ? -1 : 1) * (final ? 0 : between(SIDE)),
              ),
            ),
            y: Math.max(ceiling, y - (final ? FINAL_LEAP : between(LEAP))),
          },
          final,
          poppedAt: null,
          puffedAt: null,
        };
      });
      const last = kernels[lastIndex];
      const startedAt = performance.now();
      let lastRumble = -Infinity;

      // a popped kernel's leap ms in: shooting up, slowing to its apex
      const leapAt = (kernel: Kernel, t: number): Point | null => {
        const u = (t - kernel.popAt) / jumpMs;
        if (u < 0 || u >= 1) return null;
        const rise = 1 - (1 - u) ** 2;
        return {
          x: kernel.x + (kernel.apex.x - kernel.x) * u,
          y: kernel.y + (kernel.apex.y - kernel.y) * rise,
        };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.popAt + jumpMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (ms < last.popAt && now - lastRumble >= RUMBLE_MS) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, clamp01(ms / last.popAt)));
            }
            for (const kernel of kernels) {
              if (kernel.poppedAt === null && ms >= kernel.popAt)
                pop(kernel, now);
              if (kernel.puffedAt === null && ms >= kernel.popAt + jumpMs)
                puff(kernel, now);
            }
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const kernel of kernels) {
              if (kernel.poppedAt !== null)
                drawWhiteBurst(
                  ctx,
                  kernel.x,
                  kernel.y,
                  (now - kernel.poppedAt) / POP_BURST_MS,
                  POP_BURST,
                );
              if (kernel.puffedAt === null) continue;
              if (kernel.final)
                drawExplosion(
                  ctx,
                  kernel.apex.x,
                  kernel.apex.y,
                  now - kernel.puffedAt,
                  now,
                  BLAST_SCALE,
                  SPARK_REACH,
                  SPARK_SIZE,
                );
              else
                drawWhiteBurst(
                  ctx,
                  kernel.apex.x,
                  kernel.apex.y,
                  (now - kernel.puffedAt) / PUFF_BURST_MS,
                  PUFF_BURST,
                );
            }
            ctx.restore();
          },
          // the kernels over the coins they burst into
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const kernel of kernels) {
              const heat = clamp01(ms / kernel.popAt);
              if (kernel.poppedAt === null) {
                const appear = clamp01((ms - kernel.appearAt) / APPEAR_MS);
                const at = {
                  x: kernel.x,
                  y: kernel.y - twitchLift(kernel, ms),
                };
                drawWispHead(
                  ctx,
                  () => at,
                  ms,
                  now,
                  WISP_SIZE * KERNEL_SIZE * appear * (1 + 0.3 * heat),
                  heat,
                );
                continue;
              }
              if (ms > kernel.popAt + jumpMs + WISP_TRAIL_MS) continue;
              drawWisp(
                ctx,
                (t) => leapAt(kernel, t),
                ms,
                now,
                WISP_SIZE * JUMP_SIZE * (kernel.final ? 1.5 : 1),
                1,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame each kernel pops and leaps
      function pop(kernel: Kernel, now: number): void {
        kernel.poppedAt = now;
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, (kernel.popAt - heatMs) / popMs));
      }

      // on the frame its leap tops out and it bursts into coins
      function puff(kernel: Kernel, now: number): void {
        kernel.puffedAt = now;
        if (!cover?.isLive()) return;
        const { apex } = kernel;
        if (kernel.final) {
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
          return;
        }
        cover.launchFrom(
          apex,
          Array.from({ length: PUFF_COINS }, () => ({
            x: apex.x + (Math.random() * 2 - 1) * PUFF_SPREAD,
            y: Math.max(
              ceiling,
              apex.y + (Math.random() * 2 - 1) * PUFF_SPREAD,
            ),
          })),
        );
      }
    },
  },
  { label: "Popcorn", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Popcorn
export function forcePopcornEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
