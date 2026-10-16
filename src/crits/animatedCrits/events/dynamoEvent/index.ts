// the "Dynamo" event (charge; a free floor): it covers its crit, whose click
// freezes the screen while a big gold dynamo wheel (a spoked ring of light)
// pops up beside the dark locked floor and starts turning, a crawl spinning
// up to a blur; sparks fly off its rim, light streams up off every bar into
// its hub and the whine and rumble rise, the wheel trembling and glowing
// white-hot, jolting with a flash at each speed it passes. At the top it
// overloads and discharges one huge bolt into the lock: the floor blows open
// in the biggest blast and hardest shake, unlocked for free as the screen
// unfreezes. Then the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSpinTick } from "../../../../sound";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
} from "../../../../shared/animationStyles/lightning";
import { clamp01, lerp, type Range } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { shakeScreen } from "../../../../shared/screenShake";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "dynamo";
const TAU = Math.PI * 2;
// the wheel RADIUS of the screen's width (within RADIUS_PX), GAP floors clear
// of the lock and SIDE of the width off its middle
const RADIUS = 0.24;
const RADIUS_PX: Range = [40, 150];
const GAP = 0.6;
const SIDE = 0.16;
const SPOKES = 8;
// its spin, rad/ms, from a crawl to a blur; GHOSTS trailing copies blur it
const SPIN: Range = [0.0008, 0.07];
const GHOSTS = 4;
const TREMBLE = 14;
const GLOW = 2.8;
const REACH = 0.38;
// the speeds (as charge) it jolts at, each kicking it JOLT_PX for JOLT_MS
const JOLTS = [0.2, 0.45, 0.72];
const CURVE = 2;
const JOLT_PX = 16;
const JOLT_MS = 170;
const JOLT_SHAKE: Range = [0.9, 1.8];
// rim sparks: SPARKS flung SPARK_REACH px off over SPARK_MS each
const SPARKS = 48;
const SPARK_MS = 320;
const SPARK_REACH = 150;
const SPARK = 22;
// the streams up off the bars, as Fully Charged's
const STREAM = 8;
const CYCLE_MS = 650;
const ACCEL = 4;
const SPECK = 24;
const MAX_BARS = 6;
// the whine: a tick each quarter turn, at least TICK_GAP ms apart
const TICK_GAP = 45;
const TICK_RATE: Range = [0.6, 2.2];
// the overload: the wheel bursting over POP_MS, the bolt crackling BOLT_MS
const POP_MS = 140;
const BOLT_MS = 320;
const BOLT_SCALE = 2.4;
const STRIKE_SCALE = 3;
const LOCK_GLOW = 0.5;
const OPEN_BLAST = 300;
const OPEN_SHAKE = 3.6;

// the wheel in one color, built once: a soft wide pass under a crisp one
function makeWheel(r: number, color: string): HTMLCanvasElement {
  const pad = Math.ceil(r * 0.25);
  const size = Math.ceil(2 * (r + pad));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  const c = size / 2;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineCap = "round";
  const passes: [number, number][] = [
    [2.6, 0.22],
    [1, 1],
  ];
  for (const [wide, alpha] of passes) {
    g.globalAlpha = alpha;
    g.lineWidth = r * 0.13 * wide;
    g.beginPath();
    g.arc(c, c, r * 0.93, 0, TAU);
    g.stroke();
    g.lineWidth = r * 0.05 * wide;
    g.beginPath();
    g.arc(c, c, r * 0.6, 0, TAU);
    g.stroke();
    g.lineWidth = r * 0.06 * wide;
    g.beginPath();
    for (let i = 0; i < SPOKES; i++) {
      const a = (i / SPOKES) * TAU;
      g.moveTo(c + Math.cos(a) * r * 0.2, c + Math.sin(a) * r * 0.2);
      g.lineTo(c + Math.cos(a) * r * 0.9, c + Math.sin(a) * r * 0.9);
    }
    g.stroke();
    g.beginPath();
    g.arc(c, c, r * 0.2 * (wide > 1 ? 1.5 : 1), 0, TAU);
    g.fill();
  }
  return canvas;
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  at: Point,
  angle: number,
  scale: number,
  alpha: number,
): void {
  if (alpha <= 0 || scale <= 0) return;
  const half = sprite.width / 2;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha);
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(sprite, -half, -half);
  ctx.restore();
}

export const forceDynamoEvent = registerWispEvent(
  KEY,
  meta.label,
  () => meta.chance,
  (floor, context, area) => {
    const { firstMs, chargeMs, strikeMs, holdMs, mergeMs } = meta.values;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const width = Math.max(1, area.right - area.left);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const r = Math.min(RADIUS_PX[1], Math.max(RADIUS_PX[0], width * RADIUS));
    // below the lock if it fits, else above it; always on screen
    let hubY = lock.y + FLOOR_H * (0.5 + GAP) + r;
    if (hubY + r > area.bottom) hubY = lock.y - FLOOR_H * (0.5 + GAP) - r;
    hubY = Math.min(Math.max(hubY, area.top + r), area.bottom - r);
    const hubX = Math.min(
      Math.max(lock.x - width * SIDE, area.left + r),
      area.right - r,
    );
    const hub: Point = { x: hubX, y: hubY };
    const gold = makeWheel(r, COLOR.heavenlyGold);
    const white = makeWheel(r, COLOR.white);
    const bolt = createBolt(hub, lock, 3);

    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const sources: Point[] = bars.length
      ? bars.map((b) => b.center)
      : [{ x: lock.x, y: area.bottom - FLOOR_H * 0.5 }];
    const spread = bars[0]?.box.width ?? width * 0.6;
    const charge = planCharge(firstMs, chargeMs, {
      curve: CURVE,
      climaxShake: 2.2,
    });
    const climaxMs = firstMs + chargeMs;
    const openAt = climaxMs + strikeMs;
    const trips = (ms: number) => {
      const t = Math.max(0, ms - firstMs);
      return (t + ((ACCEL - 1) * t * t) / (2 * chargeMs)) / CYCLE_MS;
    };

    // the spin, stepped each frame
    let angle = 0;
    let lastMs = 0;
    let lastQuarter = 0;
    let lastTickAt = 0;
    let spin = 0;
    // the latest jolt: when, and which way it kicked
    let joltAt = -Infinity;
    let joltDir = 1;

    const due: number[] = [];
    for (let i = 0; i < JOLTS.length; i++)
      due.push(firstMs + chargeMs * JOLTS[i] ** (1 / CURVE));
    due.push(openAt);
    const beats = createBeats(
      due,
      (ms) => ms,
      (_, i, now) => {
        if (i < JOLTS.length) {
          joltAt = now;
          joltDir = i % 2 ? -1 : 1;
          cover!.burst(hub, 0.7 + 0.35 * i);
          if (cover!.isLive())
            shakeScreen(lerp(JOLT_SHAKE, i / (JOLTS.length - 1)));
          return;
        }
        cover!.blast(lock);
        if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
      },
    );

    const shiver: Point = { x: 0, y: 0 };
    const at: Point = { x: 0, y: 0 };
    const spot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          const c = chargeAt(charge, Math.min(ms, climaxMs));
          spin = ms < firstMs || ms > climaxMs ? 0 : lerp(SPIN, c);
          angle += spin * Math.min(50, Math.max(0, ms - lastMs));
          lastMs = ms;
          if (cover?.isLive()) {
            if (tickCharge(charge, ms)) cover.burst(hub, 1.8);
            const quarter = Math.floor(angle / (Math.PI / 2));
            if (
              spin > 0 &&
              quarter !== lastQuarter &&
              now - lastTickAt >= TICK_GAP
            ) {
              playSpinTick(lerp(TICK_RATE, c));
              lastTickAt = now;
            }
            lastQuarter = quarter;
          }
          beats.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > openAt + DETONATION_MS) return;
          const c = chargeAt(charge, Math.min(ms, climaxMs));
          if (ms < climaxMs) {
            // where the wheel sits: trembling, kicked by the latest jolt
            trembleAt(c, ms, TREMBLE, shiver);
            const jt = clamp01((now - joltAt) / JOLT_MS);
            const kick = JOLT_PX * (1 - jt) * (1 - jt) * joltDir;
            at.x = hub.x + shiver.x + kick;
            at.y = hub.y + shiver.y - kick * 0.5;
            const grow = clamp01(ms / firstMs);
            const scale = 0.55 + 0.45 * (1 - (1 - grow) * (1 - grow));
            spot.x = lock.x;
            spot.y = lock.y;
            drawChargeGlow(ctx, spot, c * c, width * LOCK_GLOW * 0.4, now);

            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            beginLightBatch(ctx);
            // the light streaming up off the bars into the hub
            if (ms >= firstMs) {
              const trip = trips(ms);
              for (let b = 0; b < sources.length; b++)
                for (let i = 0; i < STREAM; i++) {
                  const seed = hash01(i, b + 5210);
                  if (trip + seed < 1) continue;
                  const u = (trip + seed) % 1;
                  const fromX =
                    sources[b].x + (hash01(i, b + 5211) - 0.5) * spread * 0.8;
                  const e = u * u;
                  stampGlimmer(
                    ctx,
                    fromX + (at.x - fromX) * e,
                    sources[b].y + (at.y - sources[b].y) * e,
                    SPECK * (1 - 0.5 * e),
                    i + b * STREAM,
                    i % 3 ? COLOR.heavenlyGold : COLOR.white,
                  );
                }
            }
            endLightBatch(ctx);
            ctx.globalCompositeOperation = previous;

            drawChargeGlow(ctx, at, c, r * GLOW, now);
            // the wheel, blurred by trailing copies as it spins up
            const blur = clamp01((spin - SPIN[1] * 0.15) / (SPIN[1] * 0.5));
            if (blur > 0) {
              const step = Math.min(spin * 16, (TAU / SPOKES) * 0.5) / GHOSTS;
              ctx.globalCompositeOperation = "lighter";
              for (let g = 1; g <= GHOSTS; g++)
                drawWheel(
                  ctx,
                  gold,
                  at,
                  angle - g * step,
                  scale,
                  0.5 * blur * (1 - g / (GHOSTS + 1)),
                );
              ctx.globalCompositeOperation = previous;
            }
            drawWheel(ctx, gold, at, angle, scale, grow);
            // white-hot as it charges, flashing white at each jolt
            drawWheel(
              ctx,
              white,
              at,
              angle,
              scale,
              Math.max(c * c * c, 1 - jt),
            );

            if (ms >= firstMs) {
              ctx.globalCompositeOperation = "lighter";
              beginLightBatch(ctx);
              // sparks flung off the rim along its turn
              const rim = r * scale * 0.93;
              for (let i = 0; i < SPARKS; i++) {
                if (hash01(i, 5301) > 0.12 + 0.88 * c) continue;
                const period = SPARK_MS * (0.7 + 0.6 * hash01(i, 5302));
                const clock = ms + hash01(i, 5303) * period;
                const life = Math.floor(clock / period);
                const u = (clock % period) / period;
                const a = hash01(i, life + 5304) * TAU;
                const cos = Math.cos(a);
                const sin = Math.sin(a);
                const d = u * SPARK_REACH * (0.4 + c);
                stampGlimmer(
                  ctx,
                  at.x + cos * rim - sin * d + cos * d * 0.3,
                  at.y + sin * rim + cos * d + sin * d * 0.3 + u * u * 30,
                  SPARK * (1 - u) * (0.6 + 0.6 * c),
                  i,
                  i % 4 ? COLOR.heavenlyGold : COLOR.white,
                );
              }
              endLightBatch(ctx);
              ctx.globalCompositeOperation = previous;
              drawChargeStreaks(ctx, at, c, width * REACH, ms);
            }
          } else {
            // the overload: the wheel bursting white, the bolt into the lock
            const pop = (ms - climaxMs) / POP_MS;
            if (pop < 1) {
              drawChargeGlow(ctx, hub, 1 - pop, r * GLOW * (1 + pop), now);
              drawWheel(ctx, white, hub, angle, 1 + 0.5 * pop, 1 - pop);
            }
            const fade = 1 - (ms - climaxMs) / BOLT_MS;
            if (fade > 0) {
              drawBolt(ctx, bolt, fade, BOLT_SCALE);
              drawStrike(ctx, hub, fade, STRIKE_SCALE * 0.7, now);
              drawStrike(ctx, lock, fade, STRIKE_SCALE, now);
            }
          }
          drawDetonation(ctx, lock, ms - openAt, OPEN_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
