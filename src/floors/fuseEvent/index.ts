// the "Fuse" event: it covers its crit, whose click freezes the screen while
// the wisp, as a fizzing spark, races in from the screen's side along a
// wiggling fuse, ever faster, burning it away behind it, until it reaches the
// button: KABOOM, a huge blast and shake that sprays coins across the whole
// screen, then they sweep into the total. Pays floor income × floor number
// × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSlamExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion } from "../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  coverSpots,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "fuse";
const COINS = 70;
const REWARD = 3;
// the fuse starts this far off the screen's side and wiggles WAVES times,
// up to WIGGLE px either way, tapering to straight at both ends
const START_OUT = 40;
const WAVES = 3.5;
const WIGGLE = 70;
const STEPS = 80;
// the spark races along it ever faster: its share of the way is u^BURN_EASE
const BURN_EASE = 1.8;
// the unburnt fuse: a dark cord under a dim gold glow
const CORD_LAYERS = [
  [9, COLOR.heavenlyGold, 0.25],
  [4, COLOR.heavenlyGold, 0.7],
] as const;
// the blast
const SHAKE = 2.6;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 380;
const SPARK_SIZE = 22;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.fuseEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { burnMs, holdMs, mergeMs } = CONFIG.fuseEvent;
      let boomAt: number | null = null;
      let fuse: Point[] = [];
      const startedAt = performance.now();
      // the spark's share of the way along the fuse, ms in
      const burnt = (ms: number) => clamp01(ms / burnMs) ** BURN_EASE;
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: burnMs + holdMs + mergeMs, mergeMs },
        {
          layout: (area) => coverSpots(area, COINS),
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect || fuse.length === 0) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (boomAt === null && ms >= burnMs) boom();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawCord(ctx, fuse, burnt(ms));
            drawWisp(
              ctx,
              (t) => (t < 0 || t > burnMs ? null : pointAlong(fuse, burnt(t))),
              ms,
              now,
              WISP_SIZE,
              1,
            );
            if (boomAt !== null) {
              const end = fuse[fuse.length - 1];
              drawExplosion(
                ctx,
                end.x,
                end.y,
                now - boomAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area, button } = cover;
      // in from whichever side is farther from the button
      const fromLeft = button.x - area.left > area.right - button.x;
      const start = {
        x: fromLeft ? area.left - START_OUT : area.right + START_OUT,
        y: area.top + (area.bottom - area.top) * (0.25 + Math.random() * 0.5),
      };
      fuse = planFuse(start, button);
      playSwoosh();

      // on the frame the spark reaches the button
      function boom(): void {
        if (!cover?.isLive()) return;
        boomAt = performance.now();
        playSlamExplosion();
        shakeScreen(SHAKE);
        cover.launch(cover.spots);
      }
      setTimeout(() => {
        if (boomAt === null) boom();
      }, burnMs + holdMs);
    },
  },
  { label: "Fuse", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Fuse
export function forceFuseEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// a wiggling line from start to end, straight at both ends
function planFuse(start: Point, end: Point): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const nx = -dy / length;
  const ny = dx / length;
  const phase = Math.random() * Math.PI * 2;
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const s = i / STEPS;
    const wiggle =
      WIGGLE *
      Math.sin(s * WAVES * Math.PI * 2 + phase) *
      Math.sin(Math.PI * s);
    return {
      x: start.x + dx * s + nx * wiggle,
      y: start.y + dy * s + ny * wiggle,
    };
  });
}

// the point share s (0..1) of the way along the fuse's points
function pointAlong(fuse: Point[], s: number): Point {
  const at = s * (fuse.length - 1);
  const i = Math.min(fuse.length - 2, Math.floor(at));
  const f = at - i;
  return {
    x: fuse[i].x + (fuse[i + 1].x - fuse[i].x) * f,
    y: fuse[i].y + (fuse[i + 1].y - fuse[i].y) * f,
  };
}

// what's left of the fuse past the spark
function drawCord(
  ctx: CanvasRenderingContext2D,
  fuse: Point[],
  s: number,
): void {
  if (s >= 1) return;
  const from = pointAlong(fuse, s);
  const first = Math.ceil(s * (fuse.length - 1));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [width, color, alpha] of CORD_LAYERS) {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    for (let i = first; i < fuse.length; i++) ctx.lineTo(fuse[i].x, fuse[i].y);
    ctx.stroke();
  }
  ctx.restore();
}
