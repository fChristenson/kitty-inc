// the plasma ball floor crit: the number swells into a crackling ball of
// plasma that drifts slowly down through every bar in view, arcing into each
// as it nears and blasting it as it passes, until it bursts on the ground
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
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
  drawText,
  glowStops,
} from "../../critPlayer";
import { holeHash, skyY, groundY, BAR_HALF_H } from "../../critPlayer/shared";

const PLASMA_IN_MS = 300;
const PLASMA_CHARGE_MS = 500;
const PLASMA_DROP_MS = 1300;
const PLASMA_DROPS_MS = PLASMA_IN_MS + PLASMA_CHARGE_MS;
const PLASMA_BOOM_MS = PLASMA_DROPS_MS + PLASMA_DROP_MS;
const PLASMA_FONT = 60;
const PLASMA_ABOVE = 300;
const PLASMA_BELOW = 300;
const PLASMA_GLOW: [number, number] = [120, 260];
const PLASMA_ORBITERS = 14;
const PLASMA_ORBIT: [number, number] = [40, 110];
const PLASMA_ORBITER = 24;
const PLASMA_SIZE: [number, number] = [1.5, 3.5];
// arcs crackling out to the bars it nears, re-struck every PLASMA_ARC_MS
const PLASMA_ARC_REACH = 320;
const PLASMA_ARCS = 2;
const PLASMA_ARC_MS = 50;
const PLASMA_ARC_KINK = 140;
const PLASMA_ARC_WIDTH = 10;
const PLASMA_BLAST = 170;
const PLASMA_BOOM_BLAST = 440;
const PLASMA_BOOM_SHAKE = 3;
const PLASMA_SHAKE = 1;
const PLASMA_TAIL_MS = 1000;

function column(r: Running, bars: Point[]) {
  const top = skyY(r, bars, PLASMA_ABOVE);
  const bottom = groundY(r, bars, PLASMA_BELOW);
  return {
    x: bars[0].x,
    top,
    bottom,
    yAt: (ms: number) =>
      lerp(top, bottom, clamp01((ms - PLASMA_DROPS_MS) / PLASMA_DROP_MS)),
    passes: (y: number) =>
      PLASMA_DROPS_MS + (PLASMA_DROP_MS * (y - top)) / (bottom - top),
  };
}

registerFloorCrit("plasmaBallCrit", {
  plan(r, bars, hit) {
    const { passes } = column(r, bars);
    bars.forEach((bar, i) => hit(i, passes(bar.y)));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { x, top, bottom, yAt } = column(r, bars);
    if (ms < PLASMA_IN_MS) {
      const p = smoothstep(ms / PLASMA_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * p,
        top * p,
        lerp(r.flashFont, PLASMA_FONT, p),
      );
    }
    if (ms >= PLASMA_BOOM_MS && r.kicked === 0) {
      r.kicked = 1;
      r.shake(PLASMA_BOOM_SHAKE);
      playExplosion();
    }
    if (ms >= PLASMA_IN_MS * 0.6 && ms < PLASMA_BOOM_MS) {
      const at = { x, y: yAt(ms) };
      const grow = clamp01((ms - PLASMA_IN_MS) / PLASMA_CHARGE_MS);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6;
      drawGlow(
        ctx,
        glowStops(COLOR.heavenlyGold),
        at.x,
        at.y,
        lerp(PLASMA_GLOW[0], PLASMA_GLOW[1], grow),
      );
      ctx.globalAlpha = 1;
      for (let j = 0; j < PLASMA_ORBITERS; j++) {
        const a =
          (j / PLASMA_ORBITERS) * Math.PI * 2 + ms * 0.012 * (j % 2 ? 1 : -1.3);
        const reach =
          PLASMA_ORBIT[0] +
          PLASMA_ORBIT[1] * grow * (0.7 + 0.3 * Math.sin(ms * 0.02 + j));
        stampGlimmer(
          ctx,
          at.x + Math.cos(a) * reach,
          at.y + Math.sin(a) * reach,
          PLASMA_ORBITER,
          a,
          j % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalCompositeOperation = previous;
      if (ms >= PLASMA_DROPS_MS)
        bars.forEach((bar, i) => {
          const d = Math.abs(bar.y - at.y);
          if (d > PLASMA_ARC_REACH) return;
          const alpha = 0.9 * (1 - d / PLASMA_ARC_REACH);
          for (let k = 0; k < PLASMA_ARCS; k++) {
            const seed = Math.floor(ms / PLASMA_ARC_MS) * 7 + k + i * 31;
            const end = {
              x:
                bar.x +
                (holeHash(seed, 1801) * 2 - 1) * (r.moment.barHalfWidth - 60),
              y: bar.y + (at.y < bar.y ? -BAR_HALF_H : BAR_HALF_H),
            };
            const mid = {
              x:
                (at.x + end.x) / 2 +
                (holeHash(seed, 1802) - 0.5) * PLASMA_ARC_KINK,
              y:
                (at.y + end.y) / 2 +
                (holeHash(seed, 1803) - 0.5) * PLASMA_ARC_KINK,
            };
            drawBeam(ctx, at, mid, PLASMA_ARC_WIDTH, alpha);
            drawBeam(ctx, mid, end, PLASMA_ARC_WIDTH, alpha);
          }
        });
      drawWisp(
        ctx,
        (t) => ({ x, y: yAt(t) }),
        ms,
        now,
        WISP_SIZE * lerp(PLASMA_SIZE[0], PLASMA_SIZE[1], grow),
        1,
      );
    }
    drawDetonation(
      ctx,
      { x, y: bottom },
      ms - PLASMA_BOOM_MS,
      PLASMA_BOOM_BLAST,
      now,
    );
    bars.forEach((bar) =>
      drawDetonation(
        ctx,
        bar,
        ms -
          (PLASMA_DROPS_MS + (PLASMA_DROP_MS * (bar.y - top)) / (bottom - top)),
        PLASMA_BLAST,
        now,
      ),
    );
  },
  tailMs: PLASMA_TAIL_MS,
  shake: () => PLASMA_SHAKE,
});
