// the airstrike floor crit: the number shoots off the edge and a jet screams
// back across the top, dropping a string of blinking bombs that arc down
// onto the bars in view, its sonic boom shaking the building
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
} from "../../critPlayer";
import { skyY, BAR_HALF_H } from "../../critPlayer/shared";

const AIR_IN_MS = 250;
const AIR_FLY_MS = 900;
const AIR_BOOM_AT = 0.55;
const AIR_FONT = 120;
// the jet's height over the top bar, and where it flies from and to (of the
// viewport's width either side of the middle)
const AIR_ABOVE = 350;
const AIR_EDGE = 0.65;
const AIR_BOB = 40;
const AIR_CONTRAIL = 420;
const AIR_CONTRAIL_WIDTH = 26;
const AIR_JET = 1.5;
const AIR_BOMBS_PER_BAR = 2;
// how far ahead of where it's dropped a bomb lands, its fall time and the
// extra per bar further down
const AIR_LEAD = 140;
const AIR_FALL_MS = 320;
const AIR_FALL_PER_BAR_MS = 110;
const AIR_FUSE = 50;
const AIR_BOMB = 0.8;
const AIR_BLAST = 160;
const AIR_BOOM_SHAKE = 1.6;
const AIR_SHAKE = 0.9;
const AIR_TAIL_MS = 1000;

const jetY = (r: Running, bars: Point[]) => skyY(r, bars, AIR_ABOVE);
const jetX = (r: Running, ms: number) =>
  r.viewportWidth *
  lerp(AIR_EDGE, -AIR_EDGE, clamp01((ms - AIR_IN_MS) / AIR_FLY_MS));

// bomb i: its bar, where it's dropped from (along the bars' span, right to
// left), when, and how long it falls
function bombs(r: Running, bars: Point[]) {
  const order = byHeight(bars);
  const count = AIR_BOMBS_PER_BAR * bars.length;
  const half = r.play.barHalfWidth - 60;
  const w = r.viewportWidth;
  return Array.from({ length: count }, (_, i) => {
    const k = i % order.length;
    const x =
      bars[0].x + half + AIR_LEAD - (i / Math.max(1, count - 1)) * 2 * half;
    return {
      bar: order[k],
      x,
      drop: AIR_IN_MS + (AIR_FLY_MS * (AIR_EDGE * w - x)) / (2 * AIR_EDGE * w),
      fall: AIR_FALL_MS + k * AIR_FALL_PER_BAR_MS,
    };
  });
}

registerFloorCrit("airstrikeCrit", {
  plan(r, bars, hit) {
    for (const b of bombs(r, bars)) hit(b.bar, b.drop + b.fall);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const y0 = jetY(r, bars);
    if (ms < AIR_IN_MS) {
      const p = smoothstep(ms / AIR_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        r.viewportWidth * AIR_EDGE * p,
        y0 * p,
        lerp(r.flashFont, AIR_FONT, p),
        { sx: 1 + 0.6 * p },
      );
    }
    if (ms >= AIR_IN_MS + AIR_FLY_MS * AIR_BOOM_AT && r.kicked === 0) {
      r.kicked = 1;
      r.shake(AIR_BOOM_SHAKE);
      playExplosion();
    }
    const jet = (t: number): Point => ({
      x: jetX(r, t),
      y: y0 + AIR_BOB * Math.sin((t - AIR_IN_MS) * 0.004),
    });
    if (ms >= AIR_IN_MS && ms < AIR_IN_MS + AIR_FLY_MS) {
      const at = jet(ms);
      drawBeam(
        ctx,
        at,
        { x: at.x + AIR_CONTRAIL, y: at.y },
        AIR_CONTRAIL_WIDTH,
        0.35,
      );
    }
    drawWispBetween(
      ctx,
      jet,
      ms,
      now,
      WISP_SIZE * AIR_JET,
      1,
      AIR_IN_MS,
      AIR_IN_MS + AIR_FLY_MS,
    );
    for (const b of bombs(r, bars)) {
      const to = { x: b.x - AIR_LEAD, y: bars[b.bar].y - BAR_HALF_H };
      const at = (t: number): Point => {
        const p = clamp01((t - b.drop) / b.fall);
        return { x: lerp(b.x, to.x, p), y: y0 + (to.y - y0) * p * p };
      };
      if (ms >= b.drop && ms < b.drop + b.fall)
        drawLitFuse(ctx, at(ms), (ms - b.drop) / b.fall, AIR_FUSE, now);
      drawWispBetween(
        ctx,
        at,
        ms,
        now,
        WISP_SIZE * AIR_BOMB,
        0.6,
        b.drop,
        b.drop + b.fall,
      );
      drawDetonation(ctx, to, ms - b.drop - b.fall, AIR_BLAST, now);
    }
  },
  tailMs: AIR_TAIL_MS,
  shake: () => AIR_SHAKE,
});
