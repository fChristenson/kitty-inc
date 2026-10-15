// the "Perfume" event (spray; free hires): it covers its crit, whose click
// freezes the screen while a big perfume bottle swings in at the side, its
// nozzle a wisp; every squeeze of its rubber bulb hisses a cone of glittering
// gold mist across one floor in view, coating it till it flashes with a jolt
// and a worker is hired on it, floor after floor, the squeezes quickening;
// then the bottle trembles, glowing, its bulb swelling fit to burst as the
// screen rumbles, and one huge squeeze mists every floor in view at once,
// all of them flashing in a huge blast with the last hire. Then the crit's
// tier pays out
import meta from "./meta";
import {
  playBloop,
  playBoostEventStream,
  playSwoosh,
} from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { findFloorLines } from "../../onScreenWorkers";

const KEY = "perfume";
const MAX_HIRES = 5;
// the bottle's scale, how far in from the screen's right its middle rests,
// and where its nozzle tip sits in its own drawing
const SCALE = 1.15;
const INSET = 140;
const NOZZLE_X = -48;
const NOZZLE_Y = -108;
const BULB_X = 82;
const BULB_Y = -10;
// how far the bottle swings in from, and its tilt as it does
const SWING_FROM = 300;
const SWING_TILT = 0.7;
// a floor's coat sits this far above where its workers stand
const LIFT = 55;
const COAT_H = 120;
const FLASH_MS = 220;
const FINAL_FLASH_MS = 420;
const FORM_MS = 300;
const DROPLET = WISP_SIZE * 0.75;
const BIG_DROPLET = WISP_SIZE * 1.05;
const MIST = WISP_SIZE * 2;
const NOZZLE = 0.5;
// droplets droop this share of their reach (as the spray lib drops them), so
// each cone is aimed this high over the floor's far end
const DROOP = 0.35;
const SWAY = 0.05;
const RUMBLES = 6;
const SQUEEZE_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const GOLD = fadeStops(COLOR.heavenlyGold);

interface Squeeze {
  hire: RewardHire;
  at: Point;
  coat: Point;
  starts: number;
  hits: number;
  spray: Spray;
}

interface Mist {
  coat: Point;
  spray: Spray;
}

interface Look {
  ctx: CanvasRenderingContext2D;
  body: Path2D;
  shine: Path2D;
  metal: Path2D;
  tube: Path2D;
  glass: CanvasGradient;
  liquid: CanvasGradient;
  bulb: CanvasGradient;
}

let paths: Pick<Look, "body" | "shine" | "metal" | "tube"> | null = null;

// the bottle's shapes, built once; its gradients once per canvas
function lookFor(ctx: CanvasRenderingContext2D, look: Look | null): Look {
  if (look && look.ctx === ctx) return look;
  if (!paths) {
    const body = new Path2D();
    body.moveTo(-56, -42);
    body.quadraticCurveTo(-62, -64, -30, -68);
    body.lineTo(30, -68);
    body.quadraticCurveTo(62, -64, 56, -42);
    body.lineTo(60, 50);
    body.quadraticCurveTo(60, 72, 38, 72);
    body.lineTo(-38, 72);
    body.quadraticCurveTo(-60, 72, -60, 50);
    body.closePath();
    body.rect(-15, -90, 30, 24);
    const shine = new Path2D();
    shine.moveTo(-42, -40);
    shine.quadraticCurveTo(-48, 10, -40, 52);
    shine.moveTo(-28, -56);
    shine.lineTo(-14, -60);
    const metal = new Path2D();
    metal.rect(-20, -102, 40, 14);
    metal.rect(-12, -118, 24, 16);
    metal.rect(NOZZLE_X + 2, NOZZLE_Y - 4, -NOZZLE_X - 14, 8);
    const tube = new Path2D();
    tube.moveTo(12, -110);
    tube.bezierCurveTo(44, -118, BULB_X, -88, BULB_X, BULB_Y - 28);
    paths = { body, shine, metal, tube };
  }
  const glass = ctx.createLinearGradient(-60, 0, 60, 0);
  glass.addColorStop(0, "#F472B6A0");
  glass.addColorStop(0.45, "#FFFFFF70");
  glass.addColorStop(1, "#9333EA90");
  const liquid = ctx.createLinearGradient(0, -30, 0, 72);
  liquid.addColorStop(0, "#FDE68A");
  liquid.addColorStop(0.4, COLOR.heavenlyGold);
  liquid.addColorStop(1, COLOR.amber);
  const bulb = ctx.createRadialGradient(-9, -11, 2, 0, 0, 34);
  bulb.addColorStop(0, "#FDA4AF");
  bulb.addColorStop(0.55, COLOR.fullHouseCrimson);
  bulb.addColorStop(1, "#881337");
  return { ctx, ...paths, glass, liquid, bulb };
}

// the bottle centred at (x, y) tilted by rot; the bulb squashed to sx × sy,
// the liquid down to `level`, alpha fading it all
function drawBottle(
  ctx: CanvasRenderingContext2D,
  look: Look,
  x: number,
  y: number,
  rot: number,
  sx: number,
  sy: number,
  level: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(SCALE, SCALE);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = COLOR.black;
  ctx.lineWidth = 11;
  ctx.stroke(look.tube);
  ctx.strokeStyle = "#881337";
  ctx.lineWidth = 6;
  ctx.stroke(look.tube);
  ctx.fillStyle = look.glass;
  ctx.fill(look.body);
  ctx.save();
  ctx.clip(look.body);
  ctx.fillStyle = look.liquid;
  ctx.fillRect(-70, level, 140, 150 - level);
  ctx.restore();
  ctx.strokeStyle = COLOR.black;
  ctx.lineWidth = 5;
  ctx.stroke(look.body);
  ctx.strokeStyle = "#FFFFFFB0";
  ctx.lineWidth = 6;
  ctx.stroke(look.shine);
  ctx.fillStyle = COLOR.gold;
  ctx.fill(look.metal);
  ctx.strokeStyle = COLOR.black;
  ctx.lineWidth = 4;
  ctx.stroke(look.metal);
  ctx.translate(BULB_X, BULB_Y);
  ctx.scale(sx, sy);
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 30, 0, 0, Math.PI * 2);
  ctx.fillStyle = look.bulb;
  ctx.fill();
  ctx.lineWidth = 4 / Math.max(sx, sy);
  ctx.stroke();
  ctx.restore();
}

export const forcePerfumeEvent = registerWispEvent(
  KEY,
  "Perfume",
  () => meta.chance,
  (floor, context, area) => {
    const { swingMs, squeezeMs, windUpMs, burstMs, holdMs, mergeMs } =
      meta.values;
    const hires = findRewardHires(floor, context)
      .sort((a, b) => a.y - b.y)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;

    // every floor in view, for the last squeeze to mist
    const lines: number[] = [];
    for (const feet of findFloorLines(floor, context.getOnScreenFloors)) {
      const y = feet - LIFT;
      if (y > area.top + 30 && y < area.bottom - 30) lines.push(y);
    }
    if (lines.length === 0) for (const h of hires) lines.push(h.y - LIFT);

    const bx = area.right - INSET;
    const midY = (lines[0] + lines[lines.length - 1]) / 2;
    const by = Math.min(
      area.bottom - 90,
      Math.max(area.top - NOZZLE_Y * SCALE + 30, midY - NOZZLE_Y * SCALE),
    );
    const nozzle: Point = { x: bx + NOZZLE_X * SCALE, y: by + NOZZLE_Y * SCALE };
    const coatX = (area.left + nozzle.x) / 2;
    const coatW = nozzle.x - area.left;
    const planMist = (
      coatY: number,
      startMs: number,
      endMs: number,
      spread: number,
      flightMs: number,
    ): Spray => {
      const farX = area.left + 80;
      const reach = Math.hypot(farX - nozzle.x, coatY - nozzle.y);
      const aim = Math.atan2(coatY - nozzle.y - reach * DROOP, farX - nozzle.x);
      return planSpray(
        nozzle,
        (ms) => aim + SWAY * Math.sin(ms * 0.03),
        { startMs, endMs, reach, spread, flightMs },
      );
    };

    // a squeeze for each hire but the last, top floor first, quickening
    let clock = swingMs;
    const squeezes: Squeeze[] = [];
    for (let k = 0; k < hires.length - 1; k++) {
      const hire = hires[k];
      const ms = lerp(squeezeMs, k / Math.max(1, hires.length - 2));
      const coat: Point = { x: coatX, y: hire.y - LIFT };
      squeezes.push({
        hire,
        at: { x: hire.x, y: hire.y - LIFT },
        coat,
        starts: clock,
        hits: clock + ms,
        spray: planMist(coat.y, clock, clock + ms, 0.1, 300),
      });
      clock += ms * 1.35;
    }
    const windUpAt = clock;
    const burstAt = windUpAt + windUpMs;
    const finalAt = burstAt + burstMs;
    const endAt = finalAt + FINAL_FLASH_MS;
    const lastHire = hires[hires.length - 1];
    const lastAt: Point = { x: lastHire.x, y: lastHire.y - LIFT };
    const mists: Mist[] = lines.map((y) => ({
      coat: { x: coatX, y },
      spray: planMist(y, burstAt, finalAt, 0.16, 260),
    }));

    const live: Point = { x: 0, y: 0 };
    const nozzleAt = () => live;
    let look: Look | null = null;
    const rumbleAt: number[] = [];
    for (let i = 1; i <= RUMBLES; i++)
      rumbleAt.push(windUpAt + windUpMs * Math.sqrt(i / (RUMBLES + 1)));

    const squeezing = createBeats(
      squeezes,
      (s) => s.starts,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SQUEEZE_SHAKE);
      },
    );
    const hitting = createBeats(
      squeezes,
      (s) => s.hits,
      (s, k) => {
        giveHire(s.hire);
        cover!.burst(s.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, squeezes.length - 1)));
      },
    );
    const rumbling = createBeats(
      rumbleAt,
      (ms) => ms,
      (_, i) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(0.2 + 0.1 * i);
      },
    );
    const bursting = createBeats(
      [burstAt, finalAt],
      (ms) => ms,
      (_, i) => {
        if (i === 0) {
          if (cover!.isLive()) playSwoosh();
          return;
        }
        giveHire(lastHire);
        for (const m of mists) cover!.burst(m.coat, 1);
        cover!.blast(lastAt);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          squeezing.tick(ms, now);
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt) return;

          // each floor's coat: building as it's misted, flashing as it's hit,
          // lingering faintly till the last squeeze coats them all again
          for (let k = 0; k < squeezes.length; k++) {
            const s = squeezes[k];
            if (ms < s.starts || ms > finalAt) continue;
            const flash = ms > s.hits ? 1 - clamp01((ms - s.hits) / FLASH_MS) : 0;
            const coverage =
              ms <= s.hits
                ? clamp01((ms - s.starts - 80) / (s.hits - s.starts - 80))
                : 0.35 + 0.65 * flash;
            drawSprayCoat(ctx, s.coat, coatW, COAT_H, coverage, flash);
            if (ms > s.hits) continue;
            drawSpray(ctx, s.spray, ms, now, DROPLET);
            drawSprayMist(ctx, s.coat, ms - s.starts, 1, MIST, now);
          }
          if (ms >= burstAt) {
            const flash =
              ms > finalAt ? 1 - clamp01((ms - finalAt) / FINAL_FLASH_MS) : 0;
            const coverage =
              ms <= finalAt ? clamp01((ms - burstAt) / burstMs) : flash;
            for (let k = 0; k < mists.length; k++) {
              const m = mists[k];
              drawSprayCoat(ctx, m.coat, coatW * 1.1, COAT_H * 1.3, coverage, flash);
              if (ms > finalAt) continue;
              drawSpray(ctx, m.spray, ms, now, BIG_DROPLET);
              drawSprayMist(ctx, m.coat, ms - burstAt, 1, MIST * 1.4, now);
            }
          }

          // the bottle: swinging in, kicking back at each squeeze, trembling
          // and glowing hotter, its bulb crushed by each squeeze and swelling
          if (ms > finalAt + 300) return;
          const swing = 1 - easeOutBack(clamp01(ms / swingMs));
          const windUp = clamp01((ms - windUpAt) / windUpMs);
          const heat = Math.max(clamp01(ms / finalAt) * 0.5, windUp);
          let kick = 0;
          let crush = 0;
          for (let k = 0; k < squeezes.length; k++) {
            const s = squeezes[k];
            if (ms < s.starts || ms > s.hits + 200) continue;
            const p = (ms - s.starts) / (s.hits - s.starts);
            kick = Math.exp(-(ms - s.starts) / 90);
            crush = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85);
          }
          if (ms >= burstAt) {
            const p = (ms - burstAt) / burstMs;
            kick = 1.6 * Math.exp(-(ms - burstAt) / 120);
            crush = p < 0.2 ? p / 0.2 : Math.max(0, 1 - (p - 0.2) / 0.8);
          }
          const tremble = 1 + 3 * heat + 6 * windUp * windUp;
          const x =
            bx + SWING_FROM * swing + 10 * kick + Math.sin(now * 0.09) * tremble;
          const y = by + Math.cos(now * 0.113) * tremble * 0.6;
          const rot = SWING_TILT * swing + 0.07 * kick;
          const swell = 1 + 0.15 * heat + 0.55 * windUp * windUp;
          const sx = swell * (1 - 0.5 * crush);
          const sy = swell * (1 + 0.15 * crush);
          const fade = 1 - clamp01((ms - finalAt) / 300);
          const level = lerp(
            [-30, 40],
            ms >= burstAt
              ? 0.7 + 0.3 * clamp01((ms - burstAt) / burstMs)
              : heat * 0.7,
          );

          if (heat > 0) {
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = (0.25 + 0.6 * heat) * fade;
            drawGlow(ctx, GOLD, x, y, 110 * SCALE * (1 + 0.5 * heat));
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = previous;
          }
          look = lookFor(ctx, look);
          drawBottle(ctx, look, x, y, rot, sx, sy, level, fade);
          if (ms > finalAt) return;
          const c = Math.cos(rot) * SCALE;
          const n = Math.sin(rot) * SCALE;
          live.x = x + c * NOZZLE_X - n * NOZZLE_Y;
          live.y = y + n * NOZZLE_X + c * NOZZLE_Y;
          drawWispHead(
            ctx,
            nozzleAt,
            ms,
            now,
            WISP_SIZE * NOZZLE * (1 + 0.6 * heat),
            heat,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
