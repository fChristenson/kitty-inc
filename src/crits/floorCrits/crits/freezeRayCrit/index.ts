// the freeze ray floor crit: the number turns into a nozzle in the top
// corner and a beam of frost sweeps down the bars in view, icing each one
// over; then it dives onto the top bar and the ice shatters down the
// building bar by bar in bursts of glitter
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { smoothstep } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
} from "../../critPlayer";
import { skyY, BAR_HALF_H, holeHash } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const FRZ_IN_MS = 400;
// the nozzle: this far over the top bar, this far left (of the viewport's
// width)
const FRZ_ABOVE = 260;
const FRZ_SIDE = 0.45;
const FRZ_NOZZLE = 1.2;
const FRZ_FONT = 60;
// the beam's sweep down the bars, from this far over the top one to this
// far under the bottom one, and past their right ends
const FRZ_SWEEP_FROM_MS = FRZ_IN_MS + 150;
const FRZ_SWEEP_MS = 900;
const FRZ_OVERSHOOT = 140;
const FRZ_PAST = 100;
const FRZ_BEAM = 60;
const FRZ_FLAKES = 16;
// the ice round a bar: its margin, how fast it forms, its glints
const FRZ_ICE_PAD = 22;
const FRZ_ICE_MS = 150;
const FRZ_GLINTS = 10;
// the dive onto the top bar after the sweep, then a bar shattering every so
// often down the building
const FRZ_SMASH_GAP_MS = 400;
const FRZ_DIVE_MS = 220;
const FRZ_DIVER = 1.6;
const FRZ_SHATTER_MS = 140;
const FRZ_SHARDS = 30;
const FRZ_SHARD_MS = 900;
const FRZ_SHARD_SPEED = 1.6;
const FRZ_SHARD_LIFT: [number, number] = [0.3, 1.2];
const FRZ_SHARD_FALL = 0.0013;
const FRZ_SHARD = 26;
const FRZ_BLAST = 220;
const FRZ_BOOM = 320;
// shakes by step: freezing, shattering, the last bar shattering
const FRZ_SHAKES = [0.3, 0.9, 2.4];
const FRZ_TAIL_MS = 1100;

const FROST = fadeStops(COLOR.white);
const SMASH_AT = FRZ_SWEEP_FROM_MS + FRZ_SWEEP_MS + FRZ_SMASH_GAP_MS;

const nozzleAt = (r: Running, bars: Point[]): Point => ({
  x: -r.viewportWidth * FRZ_SIDE,
  y: skyY(r, bars, FRZ_ABOVE),
});

// the beam's sweep from over the top bar to under the bottom one
function sweepSpan(bars: Point[]) {
  const ys = bars.map((b) => b.y);
  return {
    from: Math.min(...ys) - FRZ_OVERSHOOT,
    to: Math.max(...ys) + FRZ_OVERSHOOT,
  };
}
const frozeAt = (bars: Point[], bar: number) => {
  const span = sweepSpan(bars);
  return (
    FRZ_SWEEP_FROM_MS +
    (FRZ_SWEEP_MS * (bars[bar].y - span.from)) / (span.to - span.from)
  );
};
// when bar k down from the top shatters
const breakAt = (k: number) => SMASH_AT + k * FRZ_SHATTER_MS;

function drawIce(
  ctx: CanvasRenderingContext2D,
  r: Running,
  bar: Point,
  on: number,
  salt: number,
  now: number,
): void {
  const w = r.play.barHalfWidth + FRZ_ICE_PAD;
  const h = BAR_HALF_H + FRZ_ICE_PAD;
  ctx.fillStyle = `rgba(235,245,255,${0.7 * on})`;
  ctx.strokeStyle = `rgba(255,255,255,${on})`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(bar.x - w, bar.y - h, w * 2, h * 2, h);
  ctx.fill();
  ctx.stroke();
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = on;
  drawGlow(ctx, FROST, bar.x, bar.y, w * 1.2, 0.35);
  for (let i = 0; i < FRZ_GLINTS; i++)
    stampGlimmer(
      ctx,
      bar.x + (holeHash(i, salt) - 0.5) * 2 * w,
      bar.y + (holeHash(i, salt + 1) - 0.5) * 2 * BAR_HALF_H,
      18,
      now * 0.002 + i,
      COLOR.white,
    );
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// the ice bursting off a bar in glitter shards, msSince it shattered
function drawShards(
  ctx: CanvasRenderingContext2D,
  r: Running,
  bar: Point,
  msSince: number,
  salt: number,
  now: number,
): void {
  if (msSince < 0 || msSince > FRZ_SHARD_MS) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  ctx.globalAlpha = 1 - msSince / FRZ_SHARD_MS;
  for (let i = 0; i < FRZ_SHARDS; i++) {
    const vx = (holeHash(i, salt) - 0.5) * FRZ_SHARD_SPEED;
    const vy = -lerp(...FRZ_SHARD_LIFT, holeHash(i, salt + 1));
    stampGlimmer(
      ctx,
      bar.x +
        (holeHash(i, salt + 2) - 0.5) * 2 * r.play.barHalfWidth +
        vx * msSince,
      bar.y + vy * msSince + FRZ_SHARD_FALL * msSince * msSince,
      FRZ_SHARD,
      now * 0.006 + i,
      i % 3 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  ctx.globalAlpha = 1;
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

registerFloorCrit("freezeRayCrit", {
  plan(_r, bars, hit) {
    const order = byHeight(bars);
    order.forEach((bar, k) => {
      hit(bar, frozeAt(bars, bar), 0);
      hit(bar, breakAt(k), k === order.length - 1 ? 2 : 1);
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const nozzle = nozzleAt(r, bars);
    if (ms < FRZ_IN_MS) {
      const p = smoothstep(ms / FRZ_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        nozzle.x * p,
        nozzle.y * p,
        lerp(r.flashFont, FRZ_FONT, p),
      );
    }
    if (ms >= FRZ_IN_MS && ms < SMASH_AT - FRZ_DIVE_MS)
      drawWisp(ctx, () => nozzle, ms, now, WISP_SIZE * FRZ_NOZZLE, 0.6);
    // the frost beam sweeping down past the bars' right ends
    const sweep = ms - FRZ_SWEEP_FROM_MS;
    if (sweep >= 0 && sweep < FRZ_SWEEP_MS) {
      const span = sweepSpan(bars);
      const to = {
        x: bars[0].x + r.play.barHalfWidth + FRZ_PAST,
        y: lerp(span.from, span.to, sweep / FRZ_SWEEP_MS),
      };
      drawBeam(ctx, nozzle, to, FRZ_BEAM, 0.7);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < FRZ_FLAKES; i++) {
        const u = (holeHash(i, 81) + ms * 0.002) % 1;
        stampGlimmer(
          ctx,
          lerp(nozzle.x, to.x, u) + (holeHash(i, 82) - 0.5) * FRZ_BEAM,
          lerp(nozzle.y, to.y, u) + (holeHash(i, 83) - 0.5) * FRZ_BEAM,
          22,
          now * 0.004 + i,
          COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    const order = byHeight(bars);
    order.forEach((bar, k) => {
      const on = clamp01((ms - frozeAt(bars, bar)) / FRZ_ICE_MS);
      if (on > 0 && ms < breakAt(k))
        drawIce(ctx, r, bars[bar], on, 90 + bar * 7, now);
      drawShards(ctx, r, bars[bar], ms - breakAt(k), 120 + bar * 7, now);
      const last = k === order.length - 1;
      drawDetonation(
        ctx,
        bars[bar],
        ms - breakAt(k),
        last ? FRZ_BOOM : FRZ_BLAST,
        now,
      );
    });
    // the dive from the nozzle onto the top bar
    const top = bars[order[0]];
    drawWispBetween(
      ctx,
      (t) => {
        if (t < SMASH_AT - FRZ_DIVE_MS) return null;
        const p = clamp01((t - SMASH_AT + FRZ_DIVE_MS) / FRZ_DIVE_MS) ** 2;
        return { x: lerp(nozzle.x, top.x, p), y: lerp(nozzle.y, top.y, p) };
      },
      ms,
      now,
      WISP_SIZE * FRZ_DIVER,
      1,
      SMASH_AT - FRZ_DIVE_MS,
      SMASH_AT,
    );
    if (ms >= SMASH_AT && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }
  },
  tailMs: FRZ_TAIL_MS,
  shake: (step) => FRZ_SHAKES[step] ?? FRZ_SHAKES[1],
});
