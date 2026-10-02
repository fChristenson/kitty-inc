// the "Scratch" event: it covers its crit, whose click freezes the screen
// while claw marks rake across the clicked floor's income bar, swipe after
// swipe, ever faster, each three glowing tears ripping in with a whoosh and a
// jolt, until the bar is covered in them. They blaze and tremble, then burst
// into coins all at once in a huge blast and shake, and the coins sweep into
// the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSlamExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import type { Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { getIncomeBarBox } from "../incomePanel";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "scratch";
const REWARD = 4;
const SWIPES = 16;
const CLAWS = 3;
// each swipe: CLAWS tears GAP px apart, LENGTH px long, at most WIDTH px
// thick, bowed BOW of their length, centered round the bar (spilling SPILL
// px past it) at a random slant within SLANT rad of diagonal; each claw
// ripping in RAKE_MS after the one before it
const GAP = 34;
const LENGTH: [number, number] = [220, 380];
const WIDTH = 16;
const BOW = 0.12;
const SPILL = 60;
const SLANT = 0.5;
const RAKE_MS = 18;
// each tear: a gold glow GLOW of its width round a white core, fading from
// a flash to EMBER while the rest come in
const GLOW = 2.6;
const EMBER = 0.7;
const FLASH_MS = 160;
// each swipe: a puff at its end and a jolt
const PUFF = 0.15;
const PUFF_MS = 160;
const SWIPE_SHAKE: [number, number] = [0.3, 1];
// the charge: the tears blaze back up and tremble TREMBLE px as the screen
// rumbles, then all burst: COINS_PER_TEAR coins from each, a huge blast
const TREMBLE = 5;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 0.7];
const COINS_PER_TEAR = 1;
const SPRAY: [number, number] = [40, 200];
const FINAL_COINS = 16;
const FINAL_RING: [number, number] = [140, 380];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 420;
const SPARK_SIZE = 22;
const TEAR_BURST = 0.18;
const TEAR_BURST_MS = 260;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const between = (range: [number, number]) => lerp(range, Math.random());

interface Tear {
  from: Point;
  to: Point;
  // the bow's sideways push at its middle
  bow: Point;
  at: number;
  rakeMs: number;
}

interface Swipe {
  at: number;
  end: Point;
  tears: Tear[];
  firedAt: number | null;
}

// a tear's spine point share u along it
function spine(tear: Tear, u: number): Point {
  const lift = 4 * u * (1 - u);
  return {
    x: tear.from.x + (tear.to.x - tear.from.x) * u + tear.bow.x * lift,
    y: tear.from.y + (tear.to.y - tear.from.y) * u + tear.bow.y * lift,
  };
}

// a tapered tear from its start to `reach` along it, `width` at its thickest
function traceTear(
  ctx: CanvasRenderingContext2D,
  tear: Tear,
  reach: number,
  width: number,
  jitter: Point,
): void {
  const steps = 10;
  const dx = tear.to.x - tear.from.x;
  const dy = tear.to.y - tear.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * reach;
    const p = spine(tear, u);
    // pointed at both ends, thickest a third of the way in
    const w = (width / 2) * Math.sin(Math.PI * Math.min(1, u ** 0.8));
    left.push({ x: p.x + nx * w + jitter.x, y: p.y + ny * w + jitter.y });
    right.push({ x: p.x - nx * w + jitter.x, y: p.y - ny * w + jitter.y });
  }
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.scratchEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { firstSwipeMs, gapMs, chargeMs, holdMs, mergeMs } =
        CONFIG.scratchEvent;
      const box = getIncomeBarBox(context.isGroundFloor);
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

      let at = firstSwipeMs;
      const swipes: Swipe[] = Array.from({ length: SWIPES }, (_, k) => {
        const mid = {
          x: box.x - SPILL + Math.random() * (box.width + SPILL * 2),
          y: box.y - SPILL / 2 + Math.random() * (box.height + SPILL),
        };
        // raking down one way or the other across it
        const angle =
          (Math.random() < 0.5 ? 1 : 3) * (Math.PI / 4) +
          (Math.random() * 2 - 1) * SLANT;
        const dir = { x: Math.cos(angle), y: Math.sin(angle) };
        const across = { x: -dir.y, y: dir.x };
        const length = between(LENGTH);
        const bowSide = Math.random() < 0.5 ? -1 : 1;
        const tears = Array.from({ length: CLAWS }, (_, c) => {
          const off = (c - (CLAWS - 1) / 2) * GAP;
          const reach = length * (c === 1 ? 1 : 0.85);
          const base = { x: mid.x + across.x * off, y: mid.y + across.y * off };
          return {
            from: { x: base.x - (dir.x * reach) / 2, y: base.y - (dir.y * reach) / 2 },
            to: { x: base.x + (dir.x * reach) / 2, y: base.y + (dir.y * reach) / 2 },
            bow: {
              x: across.x * bowSide * reach * BOW,
              y: across.y * bowSide * reach * BOW,
            },
            at: at + c * RAKE_MS,
            rakeMs: lerp(gapMs, k / (SWIPES - 1)) * 0.8,
          };
        });
        const swipe = { at, end: tears[1].to, tears, firedAt: null };
        at += lerp(gapMs, k / (SWIPES - 1));
        return swipe;
      });
      const tears = swipes.flatMap((swipe) => swipe.tears);
      const lastTear = tears[tears.length - 1];
      const chargeFrom = lastTear.at + lastTear.rakeMs;
      const blastAt = chargeFrom + chargeMs;
      const startedAt = performance.now();
      let blastedAt: number | null = null;
      let lastRumble = -Infinity;

      const drawTears = (ctx: CanvasRenderingContext2D, ms: number) => {
        const charge = clamp01((ms - chargeFrom) / chargeMs);
        const shake = TREMBLE * charge;
        const glow = (draw: (tear: Tear, reach: number, alpha: number) => void) => {
          for (const tear of tears) {
            const reach = clamp01((ms - tear.at) / tear.rakeMs);
            if (reach <= 0) continue;
            const flash = Math.max(0, 1 - (ms - tear.at - tear.rakeMs) / FLASH_MS);
            draw(tear, reach, Math.max(EMBER + (1 - EMBER) * charge, Math.min(1, flash)));
          }
        };
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = COLOR.heavenlyGold;
        glow((tear, reach, alpha) => {
          ctx.globalAlpha = 0.45 * alpha;
          ctx.beginPath();
          traceTear(ctx, tear, reach, WIDTH * GLOW * (1 + 0.5 * charge), {
            x: Math.sin(ms * 1.3 + tear.at) * shake,
            y: Math.sin(ms * 1.7 + tear.at) * shake,
          });
          ctx.fill();
        });
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = COLOR.white;
        glow((tear, reach, alpha) => {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          traceTear(ctx, tear, reach, WIDTH, {
            x: Math.sin(ms * 1.3 + tear.at) * shake,
            y: Math.sin(ms * 1.7 + tear.at) * shake,
          });
          ctx.fill();
        });
        ctx.restore();
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: blastAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            swipes.forEach((swipe, k) => {
              if (swipe.firedAt === null && ms >= swipe.at) swiped(swipe, k, now);
            });
            if (ms >= chargeFrom && ms < blastAt && now - lastRumble >= RUMBLE_MS) {
              lastRumble = now;
              shakeScreen(lerp(RUMBLE, (ms - chargeFrom) / chargeMs));
            }
            if (blastedAt === null && ms >= blastAt) blast(now);
            ctx.save();
            ctx.translate(rect.left, rect.top);
            if (blastedAt === null) drawTears(ctx, ms);
            for (const swipe of swipes) {
              if (swipe.firedAt === null) continue;
              const t = (now - swipe.firedAt - swipe.tears[1].rakeMs) / PUFF_MS;
              if (t > 0) drawWhiteBurst(ctx, swipe.end.x, swipe.end.y, t, PUFF);
            }
            if (blastedAt !== null) {
              for (const tear of tears) {
                const mid = spine(tear, 0.5);
                drawWhiteBurst(ctx, mid.x, mid.y, (now - blastedAt) / TEAR_BURST_MS, TEAR_BURST);
              }
              drawExplosion(
                ctx,
                center.x,
                center.y,
                now - blastedAt,
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

      // on the frame each swipe starts raking in
      function swiped(swipe: Swipe, k: number, now: number): void {
        swipe.firedAt = now;
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SWIPE_SHAKE, k / (SWIPES - 1)));
      }

      // on the frame every tear bursts into coins
      function blast(now: number): void {
        blastedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
        for (const tear of tears) {
          for (let i = 0; i < COINS_PER_TEAR; i++) {
            const from = spine(tear, 0.2 + Math.random() * 0.6);
            const angle = Math.random() * Math.PI * 2;
            const r = between(SPRAY);
            cover.launchFrom(from, [
              { x: from.x + Math.cos(angle) * r, y: from.y + Math.sin(angle) * r },
            ]);
          }
        }
        cover.launchFrom(
          center,
          Array.from({ length: FINAL_COINS }, (_, i) => {
            const angle = (i / FINAL_COINS) * Math.PI * 2;
            const r = between(FINAL_RING);
            return {
              x: center.x + Math.cos(angle) * r,
              y: center.y + Math.sin(angle) * r,
            };
          }),
        );
      }
    },
  },
  { label: "Scratch", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Scratch
export function forceScratchEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
