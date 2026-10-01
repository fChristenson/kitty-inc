// the "Bullet Hell" event: it covers its crit, whose click freezes the screen
// while the wisp hovers over the clicked floor's button and sprays wisps out
// in whirling spiral arms like a bullet-hell boss, ever faster and denser,
// with arms whirling the other way joining in to criss-cross them; every
// wisp flies dead straight to the screen's edge and pops there into a coin.
// Then the wisp blows in a huge blast, flash, bang and shake, firing one last
// ring of wisps every way at once, and the coins merge into the total. Pays
// floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import {
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { forceTestCrit, getButtonCenter } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "bulletHell";
const REWARD = 4;
// the boss wisp swelling and heating as it fires
const BOSS_GROW = 0.5;
const BOSS_SHUDDER = 5;
// ARMS spiral arms firing RATE wisps a second each, whirling LAPS laps a
// second; the counter-arms join halfway, whirling the other way
const ARMS = 3;
const RATE: [number, number] = [10, 30];
const LAPS: [number, number] = [0.3, 1.1];
const COUNTER_FROM = 0.5;
const COUNTER_RATE = 25;
// each shot flies at SPEED px/ms, BULLET_SIZE big, and pops this far inside
// the screen's edge
const SPEED = 1.8;
const BULLET_SIZE = WISP_SIZE * 0.45;
const EDGE = 20;
// each pop: a small burst, a coin dropped back in, and at most every
// POP_GAP_MS a jolt
const POP_BURST = 0.08;
const POP_BURST_MS = 240;
const POP_SHAKE = 0.25;
const POP_GAP_MS = 90;
const COIN_IN: [number, number] = [30, 110];
// the finale: a ring of RING shots at RING_SPEED
const RING = 28;
const RING_SPEED = 2.4;
const BLAST_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 24;
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

interface Bullet {
  bornAt: number;
  dx: number;
  dy: number;
  speed: number;
  popAt: number;
  end: Point;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.bulletHellEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { emitMs, holdMs, mergeMs } = CONFIG.bulletHellEvent;
      const boss = getButtonCenter(context.isGroundFloor);
      const box = {
        left: area.left + EDGE,
        right: area.right - EDGE,
        top: area.top + EDGE,
        bottom: area.bottom - EDGE,
      };

      // every shot planned up front: where it's fired, and when it pops
      const bullets: Bullet[] = [];
      const fire = (bornAt: number, angle: number, speed: number) => {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const reach = Math.min(
          dx > 0
            ? (box.right - boss.x) / dx
            : dx < 0
              ? (box.left - boss.x) / dx
              : Infinity,
          dy > 0
            ? (box.bottom - boss.y) / dy
            : dy < 0
              ? (box.top - boss.y) / dy
              : Infinity,
        );
        const flight = Math.max(0, reach) / speed;
        bullets.push({
          bornAt,
          dx,
          dy,
          speed,
          popAt: bornAt + flight,
          end: { x: boss.x + dx * reach, y: boss.y + dy * reach },
        });
      };
      const spin = Math.random() < 0.5 ? 1 : -1;
      const start = Math.random() * Math.PI * 2;
      // the arms' turn ms in, whirling ever faster
      const turn = (ms: number) =>
        Math.PI *
        2 *
        (LAPS[0] * (ms / 1000) +
          ((LAPS[1] - LAPS[0]) * (ms / 1000) ** 2) / (2 * (emitMs / 1000)));
      let due = 0;
      let counterDue = 0;
      for (let ms = 0; ms < emitMs; ms++) {
        const u = ms / emitMs;
        due += lerp(RATE, u) / 1000;
        while (due >= 1) {
          due--;
          for (let a = 0; a < ARMS; a++)
            fire(ms, start + spin * turn(ms) + (a / ARMS) * Math.PI * 2, SPEED);
        }
        if (u < COUNTER_FROM) continue;
        counterDue += COUNTER_RATE / 1000;
        while (counterDue >= 1) {
          counterDue--;
          for (let a = 0; a < ARMS; a++)
            fire(
              ms,
              start - spin * turn(ms) + ((a + 0.5) / ARMS) * Math.PI * 2,
              SPEED,
            );
        }
      }
      for (let i = 0; i < RING; i++)
        fire(emitMs, start + (i / RING) * Math.PI * 2, RING_SPEED);
      const pops = [...bullets].sort((a, b) => a.popAt - b.popAt);
      const endMs = pops[pops.length - 1].popAt;

      const startedAt = performance.now();
      let popped = 0;
      let lastJolt = -Infinity;
      let blewAt: number | null = null;
      const bursts: { at: Point; t: number }[] = [];

      const shotAt =
        (b: Bullet) =>
        (ms: number): Point | null => {
          if (ms < b.bornAt || ms >= b.popAt) return null;
          const d = (ms - b.bornAt) * b.speed;
          return { x: boss.x + b.dx * d, y: boss.y + b.dy * d };
        };
      const shots = bullets.map(shotAt);
      const bossAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= emitMs) return null;
        const shudder = BOSS_SHUDDER * (ms / emitMs);
        return {
          x: boss.x + Math.sin(ms * 1.7) * shudder,
          y: boss.y + Math.cos(ms * 2.3) * shudder,
        };
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: endMs + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (blewAt === null && ms >= emitMs) blow(now);
            while (popped < pops.length && ms >= pops[popped].popAt)
              pop(pops[popped++], now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            while (bursts.length && now - bursts[0].t >= POP_BURST_MS)
              bursts.shift();
            for (const burst of bursts)
              drawWhiteBurst(
                ctx,
                burst.at.x,
                burst.at.y,
                (now - burst.t) / POP_BURST_MS,
                POP_BURST,
              );
            if (blewAt !== null) {
              const since = now - blewAt;
              drawExplosion(
                ctx,
                boss.x,
                boss.y,
                since,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
              const flash = 1 - since / FLASH_MS;
              if (flash > 0) {
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = FLASH_ALPHA * flash;
                ctx.fillStyle = COLOR.white;
                ctx.fillRect(
                  area.left,
                  area.top,
                  area.right - area.left,
                  area.bottom - area.top,
                );
              }
            }
            ctx.restore();
          },
          // the boss and its shots over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            bullets.forEach((b, i) => {
              if (ms >= b.bornAt && ms < b.popAt)
                drawWispHead(ctx, shots[i], ms, now, BULLET_SIZE);
            });
            const u = Math.min(1, ms / emitMs);
            drawWisp(ctx, bossAt, ms, now, WISP_SIZE * (1 + BOSS_GROW * u), u);
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame a shot reaches the edge: it pops into a coin
      function pop(b: Bullet, now: number): void {
        bursts.push({ at: b.end, t: now });
        if (!cover?.isLive()) return;
        const back = lerp(COIN_IN, Math.random());
        cover.launchFrom(b.end, [
          { x: b.end.x - b.dx * back, y: b.end.y - b.dy * back },
        ]);
        if (now - lastJolt < POP_GAP_MS) return;
        lastJolt = now;
        playBloop();
        shakeScreen(POP_SHAKE);
      }
      // on the frame the boss blows, firing its last ring
      function blow(now: number): void {
        blewAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
      }
    },
  },
  { label: "Bullet Hell", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Bullet Hell
export function forceBulletHellEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
