// the "Break Shot" event: it covers its crit, whose click freezes the screen
// while a rack of fifteen wisps pops up in a pool-ball triangle on the clicked
// floor and another wisp, as the cue ball, rockets in from off the screen's left
// edge and smashes the rack apart in a huge blast, bang and shake; the wisps
// scatter with real physics, clacking off each other and banking off the
// screen's edges, each hard hit a burst and a jolt; then every wisp pops at
// once in a blast, flash and shake into coins, which merge into the total.
// Pays floor income × floor number × REWARD (see ../moneyCover)
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
  WISP_SIZE,
  WISP_TRAIL_MS,
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
import { lerp, easeOutBack } from "../../../../shared/easing";

const KEY = "breakShot";
const REWARD = 4;
// the balls: R px round, racked GAP px apart with the apex this share of the
// way across the screen, their wisps BALL_SIZE, popping in over POP_IN_MS
const R = 38;
const GAP = 1;
const RACK_AT = 0.58;
const BALL_SIZE = WISP_SIZE * 0.8;
const POP_IN_MS = 140;
// the cue: from this far off the screen's left edge at SPEED px/ms, a little
// off the rack's middle so the break spreads unevenly
const OUT = 80;
const SPEED = 6.5;
const OFF_CENTER = 0.15; // of R
// physics: stepped every STEP_MS; after the break each ball keeps exp(-ms /
// GLIDE_MS) of its speed; the edges bounce back BANK of it
const STEP_MS = 2;
const GLIDE_MS = 1_600;
const BANK = 0.95;
// the break
const BREAK_SHAKE = 2.2;
const BREAK_SCALE = 1.4;
const BREAK_REACH = 320;
const BREAK_SPARK = 20;
const BREAK_COINS = 10;
const BREAK_COIN_REACH: [number, number] = [60, 260];
// later hits at CLACK px/ms or harder: a burst and, at most every
// CLACK_GAP_MS, a jolt
const CLACK = 0.9;
const CLACK_BURST = 0.12;
const CLACK_BURST_MS = 240;
const CLACK_SHAKE = 0.3;
const CLACK_GAP_MS = 70;
// the pop
const POP_SHAKE = 2.8;
const POP_BURST = 0.25;
const POP_BURST_MS = 420;
const POP_COINS = 3;
const POP_COIN_REACH: [number, number] = [30, 180];
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // one point per step, for its wisp's trail
  path: Point[];
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.breakShotEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { popMs, holdMs, mergeMs } = CONFIG.breakShotEvent;
      const width = area.right - area.left;
      const pitch = R * 2 + GAP;
      const apex = {
        x: area.left + width * RACK_AT,
        y: Math.min(
          area.bottom - pitch * 3,
          Math.max(
            area.top + pitch * 3,
            getButtonCenter(context.isGroundFloor).y,
          ),
        ),
      };

      const balls: Ball[] = [];
      for (let row = 0; row < 5; row++)
        for (let j = 0; j <= row; j++) {
          const x = apex.x + row * pitch * Math.sin(Math.PI / 3);
          const y = apex.y + (j - row / 2) * pitch;
          balls.push({ x, y, vx: 0, vy: 0, path: [{ x, y }] });
        }
      const cueStart = {
        x: area.left - OUT,
        y: apex.y + (Math.random() * 2 - 1) * OFF_CENTER * R,
      };
      const cue: Ball = {
        ...cueStart,
        vx: SPEED,
        vy: 0,
        path: [cueStart],
      };
      const all = [cue, ...balls];

      const startedAt = performance.now();
      let simMs = 0;
      let brokeAt: number | null = null;
      let breakPoint: Point | null = null;
      let lastClack = -Infinity;
      let poppedAt: number | null = null;
      const bursts: { x: number; y: number; at: number }[] = [];

      const pathAt =
        (ball: Ball) =>
        (ms: number): Point | null => {
          if (ms < 0 || ms >= popMs) return null;
          const { path } = ball;
          return path[Math.min(path.length - 1, Math.floor(ms / STEP_MS))];
        };
      const wisps = all.map(pathAt);

      // one physics step; hits and bounces stamped at `now`
      const step = (now: number) => {
        const glide = brokeAt === null ? 1 : Math.exp(-STEP_MS / GLIDE_MS);
        for (const b of all) {
          b.vx *= glide;
          b.vy *= glide;
          b.x += b.vx * STEP_MS;
          b.y += b.vy * STEP_MS;
          // the cue comes in from off the screen, so only banks once on it
          const onStage = b !== cue || brokeAt !== null;
          const bank = (at: Point, speed: number) => {
            if (speed >= CLACK) clack(at, now);
          };
          if (onStage && b.x < area.left + R && b.vx < 0) {
            b.x = area.left + R;
            bank({ x: area.left, y: b.y }, -b.vx);
            b.vx *= -BANK;
          }
          if (b.x > area.right - R && b.vx > 0) {
            b.x = area.right - R;
            bank({ x: area.right, y: b.y }, b.vx);
            b.vx *= -BANK;
          }
          if (b.y < area.top + R && b.vy < 0) {
            b.y = area.top + R;
            bank({ x: b.x, y: area.top }, -b.vy);
            b.vy *= -BANK;
          }
          if (b.y > area.bottom - R && b.vy > 0) {
            b.y = area.bottom - R;
            bank({ x: b.x, y: area.bottom }, b.vy);
            b.vy *= -BANK;
          }
        }
        // equal masses: swap their speeds along the line between them
        for (let pass = 0; pass < 2; pass++)
          for (let i = 0; i < all.length; i++)
            for (let j = i + 1; j < all.length; j++) {
              const a = all[i];
              const b = all[j];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const d = Math.hypot(dx, dy);
              if (d >= R * 2 || d === 0) continue;
              const nx = dx / d;
              const ny = dy / d;
              const push = (R * 2 - d) / 2;
              a.x -= nx * push;
              a.y -= ny * push;
              b.x += nx * push;
              b.y += ny * push;
              const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (closing <= 0) continue;
              a.vx -= closing * nx;
              a.vy -= closing * ny;
              b.vx += closing * nx;
              b.vy += closing * ny;
              const at = { x: a.x + nx * R, y: a.y + ny * R };
              if (brokeAt === null && a === cue) breakShot(at, now);
              else if (closing >= CLACK) clack(at, now);
            }
        for (const b of all) b.path.push({ x: b.x, y: b.y });
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: popMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (simMs + STEP_MS <= Math.min(ms, popMs)) {
              simMs += STEP_MS;
              step(now);
            }
            if (poppedAt === null && ms >= popMs) pop(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            while (bursts.length && now - bursts[0].at >= CLACK_BURST_MS)
              bursts.shift();
            for (const burst of bursts)
              drawWhiteBurst(
                ctx,
                burst.x,
                burst.y,
                (now - burst.at) / CLACK_BURST_MS,
                CLACK_BURST,
              );
            if (brokeAt !== null && breakPoint)
              drawExplosion(
                ctx,
                breakPoint.x,
                breakPoint.y,
                now - brokeAt,
                now,
                BREAK_SCALE,
                BREAK_REACH,
                BREAK_SPARK,
              );
            if (poppedAt !== null) {
              const since = now - poppedAt;
              for (const b of all)
                drawWhiteBurst(ctx, b.x, b.y, since / POP_BURST_MS, POP_BURST);
              const flash = 1 - since / FLASH_MS;
              if (flash > 0) {
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = FLASH_ALPHA * flash;
                ctx.fillStyle = COLOR.white;
                ctx.fillRect(
                  area.left,
                  area.top,
                  width,
                  area.bottom - area.top,
                );
              }
            }
            ctx.restore();
          },
          // the wisps over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (ms > popMs + WISP_TRAIL_MS) return;
            // past the pop their trails fade on from where the sim ended
            const at = ms >= popMs ? ms : Math.min(ms, simMs);
            const grow = easeOutBack(Math.min(1, ms / POP_IN_MS));
            ctx.save();
            ctx.translate(rect.left, rect.top);
            wisps.forEach((wisp, i) =>
              i === 0
                ? drawWisp(ctx, wisp, at, now, WISP_SIZE, 1)
                : drawWisp(ctx, wisp, at, now, BALL_SIZE * grow),
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      const spray = (from: Point, count: number, reach: [number, number]) =>
        cover.launchFrom(
          from,
          Array.from({ length: count }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = lerp(reach, Math.sqrt(Math.random()));
            return {
              x: from.x + Math.cos(angle) * r,
              y: from.y + Math.sin(angle) * r,
            };
          }),
        );

      // on the frame the cue smashes into the rack
      function breakShot(at: Point, now: number): void {
        brokeAt = now;
        breakPoint = at;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BREAK_SHAKE);
        spray(at, BREAK_COINS, BREAK_COIN_REACH);
      }
      // on the frame two balls clack hard together
      function clack(at: Point, now: number): void {
        bursts.push({ ...at, at: now });
        if (!cover?.isLive() || now - lastClack < CLACK_GAP_MS) return;
        lastClack = now;
        playBloop();
        shakeScreen(CLACK_SHAKE);
      }
      // on the frame every ball pops into coins
      function pop(now: number): void {
        poppedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(POP_SHAKE);
        for (const b of all) spray(b, POP_COINS, POP_COIN_REACH);
      }
    },
  },
  { label: "Break Shot", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Break Shot
export function forceBreakShotEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
