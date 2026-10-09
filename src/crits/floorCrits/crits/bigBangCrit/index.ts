// the Big Bang floor crit: the whole screen collapses into the number, the
// building shrinking to a speck in the middle as glitter rushes in; a beat of
// black with one point of light, then it bangs: the screen blasts back out
// past full size in a white flash and every bar in view slams into place in a
// run of blasts, its own bar last and biggest
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { setScreenZoom } from "../../../../shared/screenZoom";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const BB_IN_MS = 260;
const BB_COLLAPSE_MS = 620;
const BB_SPECK_MS = BB_IN_MS + BB_COLLAPSE_MS;
const BB_DARK_MS = 300;
const BB_BANG_MS = BB_SPECK_MS + BB_DARK_MS;
const BB_OUT_MS = 380;
const BB_SETTLED_MS = BB_BANG_MS + BB_OUT_MS;
// the zoom: down to a speck, then out past full size and back
const BB_SPECK = 0.02;
const BB_OVERSHOOT = 1.13;
const BB_SETTLE = 0.15;
const BB_STREAM = 50;
const BB_STREAM_REACH = 0.8;
const BB_STREAM_SIZE = 30;
const BB_POINT = 120;
const BB_FLASH_MS = 300;
const BB_RUMBLE_MS = 100;
const BB_RUMBLE: [number, number] = [0.3, 1];
const BB_BANG = 460;
const BB_BANG_SHAKE = 3;
const BB_KICKED_BANG = 1e6;
// landing: a bar every BB_BAR_MS from the top, a run of blasts along each
const BB_BAR_MS = 90;
const BB_RUN = 4;
const BB_OWN_RUN = 7;
const BB_EVERY_MS = 45;
const BB_BLAST = 140;
const BB_OWN_BLAST = 170;
const BB_BOOM = 420;
// shakes by step: a landing blast, the last one
const BB_SHAKES = [1, 1, 3];
const BB_TAIL_MS = 1100;

function zoomAt(ms: number): number {
  if (ms < BB_IN_MS) return 1;
  if (ms < BB_SPECK_MS)
    return lerp(1, BB_SPECK, ((ms - BB_IN_MS) / BB_COLLAPSE_MS) ** 2);
  if (ms < BB_BANG_MS) return BB_SPECK;
  if (ms >= BB_SETTLED_MS) return 1;
  const u = (ms - BB_BANG_MS) / BB_OUT_MS;
  return BB_SPECK + BB_OVERSHOOT * (1 - (1 - u) ** 3) - BB_SETTLE * u ** 4;
}

const landAt = (k: number) => BB_SETTLED_MS + k * BB_BAR_MS;
const runOf = (bar: number) => (bar === 0 ? BB_OWN_RUN : BB_RUN);
const boomAt = (bars: Point[]) =>
  landAt(bars.length - 1) + BB_OWN_RUN * BB_EVERY_MS;
const runSpot = (r: Running, bars: Point[], bar: number, j: number) =>
  along(r, bars, bar, (j / (runOf(bar) - 1)) * 2 - 1);

const zoomed = new WeakSet<Running>();

registerFloorCrit("bigBangCrit", {
  plan(r, bars, hit) {
    zoomed.add(r);
    setScreenZoom((now) => zoomAt(now - r.startedAt));
    ownLast(bars).forEach((bar, k) => {
      for (let j = 0; j < runOf(bar); j++)
        hit(bar, landAt(k) + j * BB_EVERY_MS, 1);
    });
    hit(0, boomAt(bars), 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    if (ms >= BB_SETTLED_MS && zoomed.has(r)) {
      zoomed.delete(r);
      setScreenZoom(null);
    }
    if (ms < BB_SPECK_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * zoomAt(ms) * (ms < BB_IN_MS ? 1 : 0.6),
      );

    // the rumble building as it collapses, then the bang
    if (ms >= BB_IN_MS && ms < BB_SPECK_MS) {
      const due = Math.floor((ms - BB_IN_MS) / BB_RUMBLE_MS) + 1;
      while (r.kicked < due) {
        r.kicked++;
        r.shake(lerp(...BB_RUMBLE, clamp01((ms - BB_IN_MS) / BB_COLLAPSE_MS)));
      }
    }
    if (ms >= BB_BANG_MS && r.kicked < BB_KICKED_BANG) {
      r.kicked = BB_KICKED_BANG;
      r.shake(BB_BANG_SHAKE);
      playExplosion();
    }

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    // glitter rushing into the collapse
    if (ms >= BB_IN_MS && ms < BB_SPECK_MS) {
      const reach = r.viewportWidth * BB_STREAM_REACH;
      for (let i = 0; i < BB_STREAM; i++) {
        const u = ((ms - BB_IN_MS) * 0.0025 + holeHash(i, 620)) % 1;
        const a = holeHash(i, 621) * Math.PI * 2;
        const d = (1 - u) * reach;
        stampGlimmer(
          ctx,
          Math.cos(a) * d,
          Math.sin(a) * d,
          BB_STREAM_SIZE * u,
          now * 0.004 + i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    // the one point of light in the dark
    if (ms >= BB_SPECK_MS && ms < BB_BANG_MS) {
      const pulse = 0.6 + 0.4 * Math.sin(ms * 0.05);
      ctx.globalAlpha = pulse;
      drawGlow(ctx, glowStops(COLOR.white), 0, 0, BB_POINT * pulse);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = previous;
    const flash = 1 - (ms - BB_BANG_MS) / BB_FLASH_MS;
    if (ms >= BB_BANG_MS && flash > 0) {
      const w = r.viewportWidth;
      ctx.globalAlpha = flash;
      ctx.fillStyle = COLOR.white;
      ctx.fillRect(-w, -w * 2, w * 2, w * 4);
      ctx.globalAlpha = 1;
    }
    drawDetonation(ctx, { x: 0, y: 0 }, ms - BB_BANG_MS, BB_BANG, now);

    ownLast(bars).forEach((bar, k) => {
      for (let j = 0; j < runOf(bar); j++)
        drawDetonation(
          ctx,
          runSpot(r, bars, bar, j),
          ms - landAt(k) - j * BB_EVERY_MS,
          bar === 0 ? BB_OWN_BLAST : BB_BLAST,
          now,
        );
    });
    drawDetonation(ctx, bars[0], ms - boomAt(bars), BB_BOOM, now);
  },
  tailMs: BB_TAIL_MS,
  shake: (step) => BB_SHAKES[step] ?? BB_SHAKES[1],
});
