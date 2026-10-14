// Hydraulic, a floor crit: the number lands on its own bar as three columns
// of glitter and a slab of light drops onto them, faster and faster, then
// pushes down without letting up: it sags and trembles harder and harder,
// the columns squashing, bulging and buckling, their glitter shuddering and
// oozing out, cracks spreading; they give in jolts closer and closer until
// they crumble into a burst of glitter and dust, the slab blasting on
// through, the shock landing levels on every other bar
import { COLOR } from "../../../../palette";
import {
  crumbleAt,
  crumbleFrom,
  drawCrumbleDust,
  drawCrushStrain,
  drawPressGrind,
  drawSlab,
  planPress,
  pressAt,
  pressWarp,
  tickPress,
  type CrumbleBit,
  type Press,
  type PressPose,
  type PressWarp,
} from "../../../../shared/animationStyles/crush";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, otherBars } from "../../critPlayer/shared";

const IN_MS = 160;
// the slab lowering DROP px onto the stacks over LOWER_MS, then the press
const LOWER_MS = 360;
const DROP = 360;
const PRESS_MS = 1500;
const GIVES = 6;
const CRUMBLE_SHAKE = 2.6;
// the columns: ROWS beads high and two across, BEAD across, STEP apart, at
// COLUMNS from the bar's middle; HALF the half width they warp over, each
// buckling its BEND
const ROWS = 12;
const ACROSS = [-22, 22];
const BEAD = 30;
const STEP = 15;
const COLUMNS = [-120, 0, 120];
const BENDS = [-1, 0.75, 1];
const HALF = 175;
const TALL = BEAD + (ROWS - 1) * STEP;
const JUDDER = 5;
const COLUMN_GLOW = 110;
const COLUMN_GLOW_ALPHA = 0.4;
// the slab: THICK, SPAN either side, sagging SAG in its middle
const THICK = 60;
const SPAN = 240;
const SAG = 26;
const TREMBLE = 9;
const GRIND = SPAN * 1.7;
const STRAIN = SPAN * 1.6;
// after the crumble: the slab blasting on through over THROUGH_MS, fading
const THROUGH_MS = 120;
const FADE_MS = 200;
const DUST = 420;
const BLOWN_MS = 900;
const CRUMBLE_BLAST = 240;
const SHOCK_BLAST = 110;
const SHOCK_GAP_MS = 140;
const SHOCK_EVERY = 70;
const TAIL_MS = 1100;
// shakes by step: a give's jolt (the press rumbles itself), the crumble and
// the shock
const SHAKES = [0.2, 0.6];

interface Part {
  a: number;
  h: number;
  bend: number;
  seed: number;
}
const PARTS: Part[] = COLUMNS.flatMap((x, s) =>
  Array.from({ length: ROWS * ACROSS.length }, (_, i) => ({
    a: (x + ACROSS[i % ACROSS.length]) / HALF,
    h: (BEAD / 2 + Math.floor(i / ACROSS.length) * STEP) / TALL,
    bend: BENDS[s],
    seed: s * 31 + i,
  })),
);
const GOLD = glowStops(COLOR.heavenlyGold);
const warp: PressWarp = { a: 0, h: 0, turn: 0, widen: 1 };
// the pieces, flung from where the press left them
const BITS: CrumbleBit[] = crumbleFrom(
  PARTS.map((p) => {
    pressWarp(1, p.a, p.h, p.bend, warp);
    return { x: warp.a * HALF, y: -warp.h * TALL };
  }),
  HALF,
  7800,
);

interface State {
  press: Press;
  pose: PressPose;
  shocks: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
const base: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const mid: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const grind: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("hydraulicCrit", {
  plan(r, bars, hit) {
    const press = planPress(IN_MS + LOWER_MS, PRESS_MS, GIVES, {
      depth: 1,
      crumbleShake: CRUMBLE_SHAKE,
      bang: false,
    });
    for (const at of press.gives) hit(0, at, 0);
    hit(0, press.startMs, 0);
    hit(0, press.crumbleMs, 1);
    const shocks = (bars.length > 1 ? otherBars(bars) : []).map((bar, k) => ({
      bar,
      at: press.crumbleMs + SHOCK_GAP_MS + k * SHOCK_EVERY,
    }));
    for (const s of shocks) hit(s.bar, s.at, 1);
    states.set(r, {
      press,
      pose: { crush: 0, strain: 0, since: Infinity },
      shocks,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { press, pose } = state;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickPress(press, ms, r.shake);
    pressAt(press, ms, pose);
    trembleAt(pose.strain, ms, TREMBLE, shiver);
    const k = pose.crush;
    const crumbled = ms >= press.crumbleMs;
    base.x = bars[0].x;
    base.y = bars[0].y - BAR_HALF_H;
    const top = base.y - TALL * pressWarp(k, 0, 1, 0, warp).h;
    const sag = crumbled ? 0 : SAG * k;
    const show = clamp01((ms - IN_MS + 120) / 160);
    if (!crumbled && show > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = COLUMN_GLOW_ALPHA * show;
      for (const x of COLUMNS) {
        pressWarp(k, x / HALF, 0.5, 0, warp);
        drawGlow(
          ctx,
          GOLD,
          base.x + warp.a * HALF + shiver.x * 0.5,
          base.y - warp.h * TALL,
          COLUMN_GLOW * warp.widen,
        );
      }
      ctx.globalAlpha = show;
      beginLightBatch(ctx);
      for (let i = 0; i < PARTS.length; i++) {
        const p = PARTS[i];
        pressWarp(k, p.a, p.h, p.bend, warp);
        const judder = JUDDER * pose.strain * Math.sin(ms * 0.9 + p.seed);
        stampGlimmer(
          ctx,
          base.x + warp.a * HALF + judder + shiver.x * 0.5,
          base.y -
            warp.h * TALL +
            sag * Math.max(0, 1 - Math.abs(warp.a)) * warp.h +
            shiver.y * 0.3,
          BEAD * warp.widen,
          p.seed + warp.turn * 3,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
      grind.x = base.x;
      grind.y = top;
      drawCrushStrain(
        ctx,
        grind,
        Math.PI / 2,
        STRAIN,
        pose.strain * 0.9,
        TALL,
        now,
      );
    }
    // the slab dropping faster and faster, pressing (sagging in its middle),
    // then blasting on through
    const lower = clamp01((ms - IN_MS) / LOWER_MS) ** 2;
    const through = clamp01((ms - press.crumbleMs) / THROUGH_MS) ** 2;
    const y =
      lerp(top - DROP, top, lower) +
      (base.y - top) * through -
      THICK / 2 +
      shiver.y;
    const alpha =
      show * (1 - clamp01((ms - press.crumbleMs - THROUGH_MS) / FADE_MS));
    left.x = base.x - SPAN + shiver.x;
    right.x = base.x + SPAN + shiver.x;
    mid.x = base.x + shiver.x;
    left.y = right.y = y;
    mid.y = y + sag;
    drawSlab(ctx, left, mid, THICK, alpha, now);
    drawSlab(ctx, mid, right, THICK, alpha, now);
    if (ms >= press.startMs && !crumbled) {
      grind.x = base.x + shiver.x;
      grind.y = top + sag;
      drawPressGrind(ctx, grind, Math.PI / 2, GRIND, pose, ms, now);
    }
    const since = ms - press.crumbleMs;
    if (crumbled && since < BLOWN_MS) {
      const fade = 1 - since / BLOWN_MS;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS.length; i++) {
        crumbleAt(BITS[i], base, since, spot);
        stampGlimmer(
          ctx,
          spot.x,
          spot.y,
          BEAD * fade,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
      drawCrumbleDust(ctx, base, DUST, since);
    }
    drawDetonation(ctx, base, since, CRUMBLE_BLAST, now);
    for (const s of state.shocks)
      drawDetonation(ctx, bars[s.bar], ms - s.at, SHOCK_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
