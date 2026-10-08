// the starBirth floor crit: a glitter cloud collapsing into a star firing jets through the bars
import { drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

// a cloud of glitter swirling in on itself round the number's column into a
// newborn star that ignites, firing jets straight up and down into every bar
const BIRTH_SPECKS = 320;
const BIRTH_COLLAPSE_MS = 900;
const BIRTH_IGNITE_MS = 1000;
// the cloud's spread, of the viewport's width
const BIRTH_CLOUD: [number, number] = [0.12, 0.6];
const BIRTH_SPECK_SIZE = 16;
const BIRTH_STAR_SIZE = 2.5;
const BIRTH_BLAST = 170;
const BIRTH_SHAKE = 2.2;
// jets: how fast they shoot (viewport widths a second) and how wide
const JET_SPEED = 3;
const JET_WIDTH = 40;
const JET_BLAST = 150;
const JET_SHAKE = 1;
const JET_FADE_MS = 300;
const BIRTH_TAIL_MS = 500;
// the star sits in the bars' column, at the number's height
const birthStar = (bars: Point[]): Point => ({ x: bars[0].x, y: 0 });
const jetHits = (r: Running, y: number) =>
  BIRTH_IGNITE_MS + (Math.abs(y) / (r.viewportWidth * JET_SPEED)) * 1000;

// a white ray from a to b with a soft halo
function drawRay(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.globalAlpha = alpha * 0.3;
  ctx.lineWidth = JET_WIDTH * 3;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = JET_WIDTH;
  ctx.stroke();
  ctx.restore();
}

registerFloorCrit("starBirthCrit", {
  plan(r, bars, hit) {
    bars.forEach((b, bar) => hit(bar, jetHits(r, b.y)));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const star = birthStar(bars);
    if (ms < BIRTH_IGNITE_MS) {
      // the number drawn into the cloud's heart as it starts to swirl
      const gulp = clamp01(ms / 200);
      if (gulp < 1)
        drawText(
          ctx,
          r.glyphs,
          r.label,
          star.x * gulp,
          0,
          r.flashFont * (1 - gulp),
        );
      // the cloud swirling in, faster as it shrinks
      const u = clamp01(ms / BIRTH_COLLAPSE_MS);
      const shrink = 1 - u * u;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < BIRTH_SPECKS; i++) {
        const radius =
          w * lerp(BIRTH_CLOUD[0], BIRTH_CLOUD[1], holeHash(i, 71)) * shrink;
        const a =
          holeHash(i, 72) * Math.PI * 2 +
          (ms / 1000) * (2 + (w * 1.3) / Math.max(radius, w * 0.05));
        stampGlimmer(
          ctx,
          star.x + Math.cos(a) * radius,
          star.y + Math.sin(a) * radius * 0.5,
          BIRTH_SPECK_SIZE,
          a,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.restore();
    }
    // the star swelling as the cloud falls in, then igniting
    const lastJet = Math.max(...bars.map((b) => jetHits(r, b.y)));
    drawWispBetween(
      ctx,
      () => star,
      ms,
      now,
      WISP_SIZE * (0.5 + BIRTH_STAR_SIZE * clamp01(ms / BIRTH_IGNITE_MS) ** 2),
      clamp01(ms / BIRTH_IGNITE_MS),
      0,
      lastJet + JET_FADE_MS,
    );
    const since = ms - BIRTH_IGNITE_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(BIRTH_SHAKE);
    }
    drawDetonation(ctx, star, since, BIRTH_BLAST, now);
    // its jets shooting straight up and down through the bars
    if (since >= 0) {
      const reach = (since / 1000) * w * JET_SPEED;
      const fade = clamp01(1 - (ms - lastJet) / JET_FADE_MS);
      for (const dir of [-1, 1])
        drawRay(ctx, star, { x: star.x, y: star.y + dir * reach }, fade);
    }
    for (const b of bars)
      drawDetonation(ctx, b, ms - jetHits(r, b.y), JET_BLAST, now);
  },
  tailMs: BIRTH_TAIL_MS,
  shake: () => JET_SHAKE,
});
