// the inspiral floor crit: the number splits into two wisps orbiting each
// other in the middle of the screen, spiralling closer and faster; every half
// turn sends a gravity wave rippling out, every bar in view stretching and
// squeezing as it passes, harder each time; then they merge in a flash and
// the bars blow outward from the middle, its own bar last and biggest
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";

const IS_IN_MS = 260;
const IS_SPIRAL_MS = 1300;
const IS_MERGE_MS = IS_IN_MS + IS_SPIRAL_MS;
// the orbit: its radius of the viewport, tilt, how its radius and turn chirp
const IS_RADIUS = 0.3;
const IS_TILT = 0.6;
const IS_SHRINK = 0.25;
const IS_TURN = 26;
const IS_TURN_EASE = 0.6;
// the waves: px a ms, a bar's stretch from the first to the last, how wide a
// wave's swell and its ripples are
const IS_WAVE_SPEED = 2.4;
const IS_AMP: [number, number] = [0.04, 0.2];
const IS_SWELL = 140;
const IS_RIPPLE = 40;
const IS_STRAIN_FLASH = 3;
const IS_SQUEEZE = 2;
const IS_RING_REACH = 1.3;
const IS_RING_WIDTH: [number, number] = [20, 50];
const IS_RING_ALPHA = 0.6;
const IS_RING_SEGMENTS = 24;
const IS_WAVE_SHAKE: [number, number] = [0.3, 1.3];
// after the merge, a run of blasts along each bar, a bar every IS_BAR_MS out
// from the middle, its own bar's run longer and last
const IS_FLASH_MS = 260;
const IS_MERGE_BLAST = 460;
const IS_MERGE_SHAKE = 3;
const IS_KICKED_MERGE = 1e6;
const IS_RUN_AT = IS_MERGE_MS + 80;
const IS_BAR_MS = 60;
const IS_RUN = 5;
const IS_OWN_RUN = 7;
const IS_EVERY_MS = 45;
const IS_BLAST = 140;
const IS_OWN_BLAST = 170;
const IS_BOOM = 420;
const IS_JOLT_MS = 90;
const IS_JOLT = 0.3;
const IS_JOLT_DROP = 20;
const IS_HIT_FLASH_MS = 140;
// shakes by step: a run's blast, the last one
const IS_SHAKES = [1, 1, 3];
const IS_TAIL_MS = 1100;

const spiral = (ms: number) => clamp01((ms - IS_IN_MS) / IS_SPIRAL_MS);
const turnAt = (ms: number) => IS_TURN * (1 - (1 - spiral(ms)) ** IS_TURN_EASE);

// a wave every half turn
const WAVES: number[] = [];
for (let t = IS_IN_MS, sent = 0; t < IS_MERGE_MS; t += 8) {
  const n = Math.floor(turnAt(t) / Math.PI);
  if (n > sent) {
    WAVES.push(t);
    sent = n;
  }
}
const ampOf = (k: number) => lerp(...IS_AMP, k / (WAVES.length - 1));

const RING = Array.from({ length: IS_RING_SEGMENTS + 1 }, (_, i) => {
  const a = (i / IS_RING_SEGMENTS) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

// how much bar `at` is stretched across (and squeezed up) at ms
function strainAt(at: Point, ms: number): number {
  const d = Math.hypot(at.x, at.y);
  let s = 0;
  for (let k = 0; k < WAVES.length; k++) {
    const off = (ms - WAVES[k]) * IS_WAVE_SPEED - d;
    if (off < -IS_SWELL * 3) break;
    if (off > IS_SWELL * 3) continue;
    s +=
      ampOf(k) * Math.exp(-((off / IS_SWELL) ** 2)) * Math.sin(off / IS_RIPPLE);
  }
  return s;
}

// the bars out from the middle, its own bar last
const outward = (bars: Point[]) => [
  ...bars
    .map((b, i) => ({ i, d: Math.hypot(b.x, b.y) }))
    .filter((b) => b.i !== 0)
    .sort((a, b) => a.d - b.d)
    .map((b) => b.i),
  0,
];
const runOf = (bar: number) => (bar === 0 ? IS_OWN_RUN : IS_RUN);
const runAt = (k: number) => IS_RUN_AT + k * IS_BAR_MS;
const boomAt = (bars: Point[]) =>
  runAt(bars.length - 1) + IS_OWN_RUN * IS_EVERY_MS;
const runSpot = (r: Running, bars: Point[], bar: number, j: number) =>
  along(r, bars, bar, (j / (runOf(bar) - 1)) * 2 - 1);

const hidden = new WeakSet<Running>();

registerFloorCrit("inspiralCrit", {
  plan(_r, bars, hit) {
    outward(bars).forEach((bar, k) => {
      for (let j = 0; j < runOf(bar); j++)
        hit(bar, runAt(k) + j * IS_EVERY_MS, 1);
    });
    hit(0, boomAt(bars), 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = outward(bars);
    if (ms < IS_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, 0, (ms / IS_IN_MS) ** 2),
      );

    // a jolt on every wave sent, then the merge
    if (ms < IS_MERGE_MS) {
      while (r.kicked < WAVES.length && WAVES[r.kicked] <= ms) {
        r.shake(lerp(...IS_WAVE_SHAKE, r.kicked / (WAVES.length - 1)));
        r.kicked++;
      }
    } else if (r.kicked < IS_KICKED_MERGE) {
      r.kicked = IS_KICKED_MERGE;
      r.shake(IS_MERGE_SHAKE);
      playExplosion();
    }

    // the bars, drawn here stretching while the waves run through them
    const far = Math.max(...bars.map((b) => Math.hypot(b.x, b.y)));
    const quiet =
      WAVES[WAVES.length - 1] + (far + IS_SWELL * 3) / IS_WAVE_SPEED;
    const warping = ms >= IS_IN_MS && ms < quiet;
    if (warping && !hidden.has(r)) {
      hidden.add(r);
      r.play.hideBars?.(bars.map((_, i) => i));
    } else if (!warping && hidden.has(r)) {
      hidden.delete(r);
      r.play.hideBars?.(null);
    }
    if (warping && r.play.drawBar)
      order.forEach((bar, k) => {
        const at = bars[bar];
        const s = strainAt(at, ms);
        // its run's blasts landing while it's still drawn here
        let latest = -Infinity;
        for (let j = 0; j < runOf(bar); j++) {
          const t = runAt(k) + j * IS_EVERY_MS;
          if (t <= ms) latest = t;
        }
        const jolt = Math.exp(-(ms - latest) / IS_JOLT_MS);
        const hitFlash = 1 - (ms - latest) / IS_HIT_FLASH_MS;
        ctx.save();
        ctx.translate(at.x, at.y + IS_JOLT_DROP * jolt);
        ctx.scale(1 + s, (1 - IS_SQUEEZE * s) * (1 - IS_JOLT * jolt));
        r.play.drawBar!(
          ctx,
          bar,
          clamp01(Math.max(Math.abs(s) * IS_STRAIN_FLASH, hitFlash)),
        );
        ctx.restore();
      });

    // the waves rippling out
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    const reach = r.viewportWidth * IS_RING_REACH;
    for (let k = 0; k < WAVES.length; k++) {
      const radius = (ms - WAVES[k]) * IS_WAVE_SPEED;
      if (radius <= 0 || radius >= reach) continue;
      const width = lerp(...IS_RING_WIDTH, k / (WAVES.length - 1));
      const alpha = IS_RING_ALPHA * (1 - radius / reach);
      for (let i = 0; i < IS_RING_SEGMENTS; i++) {
        from.x = RING[i].x * radius;
        from.y = RING[i].y * radius;
        to.x = RING[i + 1].x * radius;
        to.y = RING[i + 1].y * radius;
        drawBeam(ctx, from, to, width, alpha);
      }
    }
    ctx.globalCompositeOperation = previous;

    // the two wisps spiralling in
    if (ms >= IS_IN_MS && ms < IS_MERGE_MS) {
      const u = spiral(ms);
      const radius = r.viewportWidth * IS_RADIUS;
      for (const side of [1, -1])
        drawWisp(
          ctx,
          (t) => {
            const d = radius * (1 - spiral(t)) ** IS_SHRINK;
            const a = turnAt(t);
            return {
              x: side * Math.cos(a) * d,
              y: side * Math.sin(a) * d * IS_TILT,
            };
          },
          ms,
          now,
          WISP_SIZE * (1 + u),
          u,
        );
    }

    const flash = 1 - (ms - IS_MERGE_MS) / IS_FLASH_MS;
    if (ms >= IS_MERGE_MS && flash > 0) {
      const w = r.viewportWidth;
      ctx.globalAlpha = flash;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(-w, -w * 2, w * 2, w * 4);
      ctx.globalAlpha = 1;
    }
    drawDetonation(ctx, { x: 0, y: 0 }, ms - IS_MERGE_MS, IS_MERGE_BLAST, now);

    order.forEach((bar, k) => {
      for (let j = 0; j < runOf(bar); j++)
        drawDetonation(
          ctx,
          runSpot(r, bars, bar, j),
          ms - runAt(k) - j * IS_EVERY_MS,
          bar === 0 ? IS_OWN_BLAST : IS_BLAST,
          now,
        );
    });
    drawDetonation(ctx, bars[0], ms - boomAt(bars), IS_BOOM, now);
  },
  tailMs: IS_TAIL_MS,
  shake: (step) => IS_SHAKES[step] ?? IS_SHAKES[1],
});
