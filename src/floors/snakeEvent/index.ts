// the "Snake" event: it covers its crit, whose click freezes the screen while
// the wisp slithers in from off the screen's left edge as the head of a snake
// of coins, like the old Snake game: dead straight runs and sharp right-angle
// turns, ever faster, gobbling small wisps scattered over the screen, each a
// flash, a bloop and a jolt that grows its coin tail longer; the last bite is
// the big wisp on the clicked floor's button, and the whole snake blows in a
// huge blast, flash, bang and shake that flings its coins outward, then they
// merge into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
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

const KEY = "snake";
const REWARD = 4;
// the snack wisps: this many, at least SPREAD px apart and MARGIN px inside
// the screen's edges
const SNACKS = 9;
const SPREAD = 150;
const MARGIN = 90;
const SNACK_SIZE = WISP_SIZE * 0.45;
const FINAL_SIZE = WISP_SIZE * 0.85;
// it slithers in from this far off the screen's left edge, its speed
// climbing to SPEED_UP times its start
const OUT = 60;
const SPEED_UP = 2.6;
// its coin tail: START_COINS long at first, GROW more per snack, a coin
// every GAP px
const START_COINS = 3;
const GROW = 2;
const GAP = 46;
// each bite
const BITE_BURST = 0.18;
const BITE_BURST_MS = 260;
const BITE_SHAKE: [number, number] = [0.2, 0.6];
// the blast: the tail's coins flung up to FLING px outward, less the further
// they are, settling over FLING_MS
const BLAST_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 380;
const SPARK_SIZE = 24;
const FLING = 220;
const FLING_FALLOFF = 380;
const FLING_MS = 300;
const FLING_EASE_MS = 90;
const BURST_COINS = 26;
const BURST_REACH: [number, number] = [60, 300];
const FLASH_MS = 220;
const FLASH_ALPHA = 0.7;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;

// snack spots over the area, spaced apart, visited nearest first from `from`
function pickSnacks(
  area: { left: number; top: number; right: number; bottom: number },
  from: Point,
  avoid: Point,
): Point[] {
  const spots: Point[] = [];
  for (let tries = 0; spots.length < SNACKS && tries < 400; tries++) {
    const spot = {
      x:
        area.left +
        MARGIN +
        Math.random() * (area.right - area.left - MARGIN * 2),
      y:
        area.top +
        MARGIN +
        Math.random() * (area.bottom - area.top - MARGIN * 2),
    };
    const near = (p: Point) => Math.hypot(p.x - spot.x, p.y - spot.y) < SPREAD;
    if (!near(avoid) && !spots.some(near)) spots.push(spot);
  }
  const route: Point[] = [];
  let at = from;
  while (spots.length) {
    let best = 0;
    spots.forEach((spot, i) => {
      if (
        Math.abs(spot.x - at.x) + Math.abs(spot.y - at.y) <
        Math.abs(spots[best].x - at.x) + Math.abs(spots[best].y - at.y)
      )
        best = i;
    });
    at = spots.splice(best, 1)[0];
    route.push(at);
  }
  return route;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.snakeEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { runMs, holdMs, mergeMs } = CONFIG.snakeEvent;
      const button = getButtonCenter(context.isGroundFloor);
      const start = { x: area.left - OUT, y: button.y };
      const targets = [...pickSnacks(area, start, button), button];

      // its route: straight runs with a right-angle turn on the way to each
      // target, alternating which way it goes first
      const points: Point[] = [start];
      const biteAt: number[] = [];
      targets.forEach((target, i) => {
        const at = points[points.length - 1];
        const corner =
          i % 2 === 0 ? { x: target.x, y: at.y } : { x: at.x, y: target.y };
        points.push(corner, target);
      });
      const lengths = [0];
      for (let i = 1; i < points.length; i++)
        lengths.push(
          lengths[i - 1] +
            Math.hypot(
              points[i].x - points[i - 1].x,
              points[i].y - points[i - 1].y,
            ),
        );
      const total = lengths[lengths.length - 1];
      // its point s px along the route (straight back off the screen before it)
      const routeAt = (s: number): Point => {
        if (s <= 0) return { x: start.x + s, y: start.y };
        let i = 1;
        while (i < lengths.length - 1 && lengths[i] < s) i++;
        const span = lengths[i] - lengths[i - 1] || 1;
        const u = Math.min(1, (s - lengths[i - 1]) / span);
        return {
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * u,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * u,
        };
      };
      // how far along it is ms in, speeding up evenly over runMs
      const v0 = (2 * total) / ((1 + SPEED_UP) * runMs);
      const accel = (v0 * (SPEED_UP - 1)) / runMs;
      const distAt = (ms: number) =>
        v0 * Math.min(ms, runMs) + (accel * Math.min(ms, runMs) ** 2) / 2;
      const msAt = (s: number) =>
        (-v0 + Math.sqrt(v0 * v0 + 2 * accel * s)) / accel;
      targets.forEach((_, i) => biteAt.push(msAt(lengths[i * 2 + 2])));
      const blowMs = runMs;
      const flingEnd = blowMs + FLING_MS;
      const blast = button;

      const startedAt = performance.now();
      let bites = 0;
      let coins = START_COINS;
      const bitAt: number[] = [];
      let blewAt: number | null = null;
      const headAt = (ms: number): Point | null =>
        ms < 0 || ms >= blowMs ? null : routeAt(distAt(ms));

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: flingEnd + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            while (bites < targets.length - 1 && ms >= biteAt[bites])
              bite(bites++, now);
            if (blewAt === null && ms >= blowMs) blow(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            bitAt.forEach((at, i) =>
              drawWhiteBurst(
                ctx,
                targets[i].x,
                targets[i].y,
                (now - at) / BITE_BURST_MS,
                BITE_BURST,
              ),
            );
            if (blewAt !== null) {
              const since = now - blewAt;
              drawExplosion(
                ctx,
                blast.x,
                blast.y,
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
          // the snacks and the head over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            targets.forEach((target, i) => {
              if (i < bites || (i === targets.length - 1 && blewAt !== null))
                return;
              const last = i === targets.length - 1;
              drawWispHead(
                ctx,
                () => target,
                ms,
                now,
                last ? FINAL_SIZE : SNACK_SIZE,
                last ? 1 : 0,
              );
            });
            drawWisp(ctx, headAt, ms, now, WISP_SIZE, Math.min(1, ms / runMs));
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // the tail coin k back from the head, from ms in to the end of the fling
      const tailCoin = (k: number, fromMs: number) => {
        const settled = routeAt(total - k * GAP);
        const dx = settled.x - blast.x;
        const dy = settled.y - blast.y;
        const d = Math.hypot(dx, dy) || 1;
        const push = FLING * Math.exp(-d / FLING_FALLOFF);
        return (f: number) => {
          const ms = fromMs + f * (flingEnd - fromMs);
          if (ms <= blowMs) return routeAt(distAt(ms) - k * GAP);
          const out = push * (1 - Math.exp(-(ms - blowMs) / FLING_EASE_MS));
          return {
            x: settled.x + (dx / d) * out,
            y: settled.y + (dy / d) * out,
          };
        };
      };
      cover.trace(
        Array.from({ length: START_COINS }, (_, k) => tailCoin(k + 1, 0)),
        flingEnd,
      );

      // on the frame it gobbles snack i: its tail grows
      function bite(i: number, now: number): void {
        bitAt[i] = now;
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(BITE_SHAKE, i / Math.max(1, targets.length - 2)));
        const ms = now - startedAt;
        cover.trace(
          Array.from({ length: GROW }, (_, g) => tailCoin(coins + g + 1, ms)),
          Math.max(1, flingEnd - ms),
        );
        coins += GROW;
      }
      // on the frame it bites the big wisp on the button: the snake blows
      function blow(now: number): void {
        blewAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        cover.launchFrom(
          blast,
          Array.from({ length: BURST_COINS }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = lerp(BURST_REACH, Math.sqrt(Math.random()));
            return {
              x: blast.x + Math.cos(angle) * r,
              y: blast.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Snake", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Snake
export function forceSnakeEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
