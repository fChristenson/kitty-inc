// the portal floor crit: portals open over the top bar and under the lowest;
// the number falls through every bar in view from one to the other, comes
// out of the top again and falls faster, and again, then both implode
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { smoothstep } from "../../../../shared/easing";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
} from "../../critPlayer";
import { skyY, groundY, BAR_HALF_H } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const PORTAL_IN_MS = 300;
const PORTAL_OPEN_MS = 200;
// each fall from one portal to the other, quicker every time
const PORTAL_FALLS_MS = [650, 450, 300];
const PORTAL_GAP_MS = 40;
const PORTAL_FIRST_MS = PORTAL_IN_MS + 80;
const PORTAL_EASE = 1.5;
const PORTAL_FONT = 150;
const PORTAL_ABOVE = 230 + BAR_HALF_H;
const PORTAL_BELOW = 300;
const PORTAL_GLINTS = 20;
const PORTAL_GLINT = 30;
const PORTAL_RX = 200;
const PORTAL_RY = 55;
const PORTAL_FADE = 80;
const PORTAL_STREAK = 250;
const PORTAL_IMPLODE_MS = 80;
const PORTAL_IMPLODE_BLAST = 320;
const PORTAL_IMPLODE_SHAKE = 2.6;
const PORTAL_BLAST = 100;
const PORTAL_TAIL_MS = 1000;

const fallsAt = PORTAL_FALLS_MS.map(
  (_, k) =>
    PORTAL_FIRST_MS +
    PORTAL_FALLS_MS.slice(0, k).reduce((sum, d) => sum + d + PORTAL_GAP_MS, 0),
);
const PORTAL_END_MS =
  fallsAt[fallsAt.length - 1] + PORTAL_FALLS_MS[PORTAL_FALLS_MS.length - 1];

function portals(r: Running, bars: Point[]) {
  const x = bars[0].x;
  const top = { x, y: skyY(r, bars, PORTAL_ABOVE) };
  const bottom = { x, y: groundY(r, bars, PORTAL_BELOW) };
  return {
    top,
    bottom,
    // when fall k passes y
    passes: (k: number, y: number) =>
      fallsAt[k] +
      PORTAL_FALLS_MS[k] *
        clamp01((y - top.y) / (bottom.y - top.y)) ** (1 / PORTAL_EASE),
  };
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  at: Point,
  open: number,
  ms: number,
): void {
  if (open <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < PORTAL_GLINTS; i++) {
    const a = (i / PORTAL_GLINTS) * Math.PI * 2 + ms * 0.006;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * PORTAL_RX * open,
      at.y + Math.sin(a) * PORTAL_RY * open,
      PORTAL_GLINT,
      a,
      i % 2 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

registerFloorCrit("portalCrit", {
  plan(r, bars, hit) {
    const { passes } = portals(r, bars);
    PORTAL_FALLS_MS.forEach((_, k) =>
      bars.forEach((bar, i) => hit(i, passes(k, bar.y), k)),
    );
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { top, bottom, passes } = portals(r, bars);
    if (ms < PORTAL_IN_MS) {
      const p = smoothstep(ms / PORTAL_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        top.x * p,
        top.y * p,
        lerp(r.flashFont, PORTAL_FONT, p),
      );
    }
    const open =
      clamp01((ms - PORTAL_IN_MS + PORTAL_OPEN_MS * 0.75) / PORTAL_OPEN_MS) *
      (ms > PORTAL_END_MS ? 1 - (ms - PORTAL_END_MS) / PORTAL_IMPLODE_MS : 1);
    drawPortal(ctx, top, open, ms);
    drawPortal(ctx, bottom, open, ms);
    const k = fallsAt.findIndex(
      (at, i) => ms >= at && ms < at + PORTAL_FALLS_MS[i],
    );
    if (k >= 0) {
      const u = ((ms - fallsAt[k]) / PORTAL_FALLS_MS[k]) ** PORTAL_EASE;
      const y = lerp(top.y, bottom.y, u);
      const alpha =
        clamp01((y - top.y) / PORTAL_FADE) *
        clamp01((bottom.y - y) / PORTAL_FADE);
      drawBeam(
        ctx,
        { x: top.x, y: Math.max(top.y, y - PORTAL_STREAK * (1 + 0.5 * k)) },
        { x: top.x, y },
        40 + 20 * k,
        0.6 * alpha,
      );
      drawText(ctx, r.glyphs, r.label, top.x, y, PORTAL_FONT, {
        sx: 0.9 - 0.08 * k,
        sy: 1.2 + 0.25 * k,
        alpha,
      });
    }
    if (ms >= PORTAL_END_MS + PORTAL_IMPLODE_MS && r.kicked === 0) {
      r.kicked = 1;
      r.shake(PORTAL_IMPLODE_SHAKE);
      playExplosion();
    }
    const imploded = ms - PORTAL_END_MS - PORTAL_IMPLODE_MS;
    drawDetonation(ctx, top, imploded, PORTAL_IMPLODE_BLAST, now);
    drawDetonation(ctx, bottom, imploded, PORTAL_IMPLODE_BLAST, now);
    PORTAL_FALLS_MS.forEach((_, fall) =>
      bars.forEach((bar) =>
        drawDetonation(
          ctx,
          bar,
          ms - passes(fall, bar.y),
          PORTAL_BLAST * (1 + 0.4 * fall),
          now,
        ),
      ),
    );
  },
  tailMs: PORTAL_TAIL_MS,
  shake: (step) => 0.6 + 0.3 * step,
});
