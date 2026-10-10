// the nuke floor crit: the number turns into a bomb dropping slowly past the
// bars, blinking ever faster, hits the ground in a blinding flash and a
// glitter mushroom cloud, and the shockwave blasts up through every bar
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const NUKE_IN_MS = 250;
const NUKE_FALL_MS = 1000;
const NUKE_BOOM_MS = NUKE_IN_MS + NUKE_FALL_MS;
const NUKE_FIRST_MS = 120;
const NUKE_EVERY_MS = 90;
const NUKE_FONT = 40;
// where it drops from (above the top bar, below the HUD) to (below the
// lowest bar, in view), of the viewport's width
const NUKE_SIDE = 60;
const NUKE_ABOVE = 300;
const NUKE_HIGHEST = 0.55;
const NUKE_BELOW = 300;
const NUKE_LOWEST = 0.9;
const NUKE_FUSE = 90;
const NUKE_SIZE = 1.5;
const NUKE_BLAST = 700;
const NUKE_BOOM_SHAKE = 3.2;
const NUKE_FLASH_MS = 260;
const NUKE_FLASH = 0.95;
// the mushroom cloud: a column of glitter rising into a rolling cap
const NUKE_CLOUD_MS = 1500;
const NUKE_RISE_MS = 700;
const NUKE_CLOUD_FADE_MS = 500;
const NUKE_STEM = 30;
const NUKE_STEM_WIDTH = 120;
const NUKE_CAP = 50;
const NUKE_CAP_R: [number, number] = [120, 400];
const NUKE_CAP_FLAT = 0.4;
const NUKE_GLINT = 36;
// the cap rises to this far above the ground (of the viewport's width)
const NUKE_CLOUD_HEIGHT = 1.1;
const NUKE_HIT_BLAST = 190;
const NUKE_SHAKE = 1.2;
const NUKE_TAIL_MS = 1300;

function drop(r: Running, bars: Point[]) {
  const w = r.viewportWidth;
  const x = bars[0].x + NUKE_SIDE;
  return {
    from: {
      x,
      y: Math.max(
        Math.min(...bars.map((b) => b.y)) - NUKE_ABOVE,
        -w * NUKE_HIGHEST,
      ),
    },
    ground: {
      x,
      y: Math.min(
        Math.max(...bars.map((b) => b.y)) + NUKE_BELOW,
        w * NUKE_LOWEST,
      ),
    },
  };
}

registerFloorCrit("nukeCrit", {
  plan(_r, bars, hit) {
    // the shockwave reaches the bars bottom to top
    byHeight(bars)
      .reverse()
      .forEach((bar, k) =>
        hit(bar, NUKE_BOOM_MS + NUKE_FIRST_MS + k * NUKE_EVERY_MS),
      );
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const { from, ground } = drop(r, bars);
    const bombAt = (t: number): Point => {
      const p = clamp01((t - NUKE_IN_MS) / NUKE_FALL_MS);
      return { x: from.x, y: lerp(from.y, ground.y, p * p) };
    };
    if (ms < NUKE_IN_MS) {
      const p = smoothstep(ms / NUKE_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        from.x * p,
        from.y * p,
        lerp(r.flashFont, NUKE_FONT, p),
      );
    }
    if (ms >= NUKE_IN_MS * 0.6 && ms < NUKE_BOOM_MS) {
      const burn = (ms - NUKE_IN_MS) / NUKE_FALL_MS;
      drawLitFuse(ctx, bombAt(ms), burn, NUKE_FUSE, now);
      drawWisp(ctx, bombAt, ms, now, WISP_SIZE * NUKE_SIZE, clamp01(burn));
    }
    const since = ms - NUKE_BOOM_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(NUKE_BOOM_SHAKE);
      playExplosion();
    }
    drawDetonation(ctx, ground, since, NUKE_BLAST, now);
    if (since >= 0 && since < NUKE_CLOUD_MS) {
      const rise = smoothstep(clamp01(since / NUKE_RISE_MS));
      const fade =
        since > NUKE_CLOUD_MS - NUKE_CLOUD_FADE_MS
          ? (NUKE_CLOUD_MS - since) / NUKE_CLOUD_FADE_MS
          : 1;
      const capY = lerp(ground.y, ground.y - w * NUKE_CLOUD_HEIGHT, rise);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = fade;
      for (let i = 0; i < NUKE_STEM; i++)
        stampGlimmer(
          ctx,
          ground.x + (holeHash(i, 1501) - 0.5) * NUKE_STEM_WIDTH,
          lerp(ground.y, capY, i / (NUKE_STEM - 1)),
          NUKE_GLINT,
          since * 0.01 + i,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      for (let i = 0; i < NUKE_CAP; i++) {
        const a = (i / NUKE_CAP) * Math.PI * 2 + since * 0.002;
        const reach =
          NUKE_CAP_R[0] +
          (NUKE_CAP_R[1] - NUKE_CAP_R[0]) *
            rise *
            (0.6 + 0.4 * holeHash(i, 1502));
        stampGlimmer(
          ctx,
          ground.x + Math.cos(a) * reach,
          capY + Math.sin(a) * reach * NUKE_CAP_FLAT,
          NUKE_GLINT * 1.1,
          a,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalAlpha = 1;
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    // the blinding flash over everything
    if (since >= 0 && since < NUKE_FLASH_MS) {
      ctx.fillStyle = COLOR.white;
      ctx.globalAlpha = NUKE_FLASH * (1 - since / NUKE_FLASH_MS);
      ctx.fillRect(-w * 2, -w * 3, w * 4, w * 6);
      ctx.globalAlpha = 1;
    }
    byHeight(bars)
      .reverse()
      .forEach((bar, k) =>
        drawDetonation(
          ctx,
          bars[bar],
          since - NUKE_FIRST_MS - k * NUKE_EVERY_MS,
          NUKE_HIT_BLAST,
          now,
        ),
      );
  },
  tailMs: NUKE_TAIL_MS,
  shake: () => NUKE_SHAKE,
});
