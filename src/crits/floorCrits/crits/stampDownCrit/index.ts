// Stamp Down, a floor crit: the number lands on its own bar as a heap of
// glitter under a slab of light; the slab winds up and slams down on it
// again and again, quicker and deeper each, stretching as it drives and
// squashing on every contact, the heap squashing flatter and wider, its
// glitter shoved out sideways, cracks of light spreading through it; the
// last winds up highest and crushes it flat, glitter jetting along the bar
// and blown out of it, the shock landing levels on every other bar
import { COLOR } from "../../../../palette";
import {
  crumbleAt,
  crumbleFrom,
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  drawSlab,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
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
import { BAR_HALF_H, holeHash, otherBars } from "../../critPlayer/shared";

const IN_MS = 160;
// the slams: SLAMS of them from FIRST_MS, the gaps closing, the last wound up
// WIND_UP times as long
const FIRST_MS = IN_MS + 380;
const SLAMS = 6;
const GAPS: [number, number] = [380, 170];
const WIND_UP = 1.8;
const CLIMAX_SHAKE = 2.6;
// the heap: SPECKS glimmers over PILE_W either side, PILE_H high, SPECK
// across; each slam shoves them SHOVE px out sideways, settling over
// SHOVE_MS
const SPECKS = 60;
const PILE_W = 170;
const PILE_H = 150;
const SPECK: [number, number] = [22, 38];
const SHOVE = 26;
const SHOVE_MS = 90;
const HEAP_GLOW = 1.6;
const HEAP_GLOW_ALPHA = 0.45;
// the slab: THICK, SPAN either side, lifting LIFT px at the top of a wind-up
const THICK = 60;
const SPAN = 230;
const LIFT = 240;
const POWER: [number, number] = [0.5, 1.2];
const BURST = 560;
const CRUSH_BLAST = 260;
const SHOCK_BLAST = 120;
const SHOCK_GAP_MS = 140;
const SHOCK_EVERY = 70;
const FADE_MS = 200;
const BLOWN_MS = 900;
const TAIL_MS = 1100;
// shakes by step: a slam's jolt (the slams shake themselves), the crush and
// the shock
const SHAKES = [0.2, 0.6];

// the heap's glitter from its base middle, and how it's blown out
const HEAP: Point[] = Array.from({ length: SPECKS }, (_, i) => {
  const u = holeHash(i, 7700) * 2 - 1;
  return {
    x: u * PILE_W,
    y: -(1 - u * u) * PILE_H * Math.sqrt(holeHash(i, 7701)),
  };
});
const SIZES = HEAP.map((_, i) => lerp(SPECK[0], SPECK[1], holeHash(i, 7702)));
const FLAT: Point = squashScale(1, { x: 0, y: 0 });
const BITS = crumbleFrom(
  HEAP.map((c) => ({ x: c.x * FLAT.x, y: c.y * FLAT.y })),
  PILE_W,
  7710,
);
const GOLD = glowStops(COLOR.heavenlyGold);

interface State {
  crush: Crush;
  pose: CrushPose;
  shocks: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
const base: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const squash: Point = { x: 1, y: 1 };
const stretch: Point = { x: 1, y: 1 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("stampDownCrit", {
  plan(r, bars, hit) {
    const crush = planCrush(FIRST_MS, SLAMS, GAPS, WIND_UP, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const last = crush.slams[SLAMS - 1];
    for (const at of crush.slams.slice(0, -1)) hit(0, at, 0);
    hit(0, last, 1);
    const shocks = (bars.length > 1 ? otherBars(bars) : []).map((bar, k) => ({
      bar,
      at: last + SHOCK_GAP_MS + k * SHOCK_EVERY,
    }));
    for (const s of shocks) hit(s.bar, s.at, 1);
    states.set(r, {
      crush,
      pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
      shocks,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { crush, pose } = state;
    const now = r.startedAt + ms;
    const last = crush.slams[SLAMS - 1];
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    squashScale(pose.crush, squash);
    crusherScale(crush, ms, stretch);
    base.x = bars[0].x;
    base.y = bars[0].y - BAR_HALF_H;
    contact.x = base.x;
    contact.y = base.y - PILE_H * squash.y;
    const show = clamp01((ms - IN_MS + 120) / 160);
    const since = ms - last;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (ms < last && show > 0) {
      ctx.globalAlpha = HEAP_GLOW_ALPHA * show;
      drawGlow(
        ctx,
        GOLD,
        base.x,
        base.y - PILE_H * 0.4 * squash.y,
        PILE_W * HEAP_GLOW * squash.x,
      );
      ctx.globalAlpha = show;
      const shove = SHOVE * Math.exp(-pose.since / SHOVE_MS);
      beginLightBatch(ctx);
      for (let i = 0; i < SPECKS; i++) {
        const p = HEAP[i];
        const out = p.x / PILE_W;
        stampGlimmer(
          ctx,
          base.x + p.x * squash.x + out * shove,
          base.y + p.y * squash.y,
          SIZES[i],
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
    } else if (since >= 0 && since < BLOWN_MS) {
      const fade = 1 - since / BLOWN_MS;
      beginLightBatch(ctx);
      for (let i = 0; i < SPECKS; i++) {
        crumbleAt(BITS[i], base, since, spot);
        stampGlimmer(
          ctx,
          spot.x,
          spot.y,
          SIZES[i] * fade,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
    }
    ctx.restore();
    if (ms < last && show > 0)
      drawCrushStrain(
        ctx,
        contact,
        Math.PI / 2,
        PILE_W * 1.4 * squash.x,
        pose.crush,
        PILE_H * 1.2,
        now,
      );
    // the slab, stretching as it drives down and squashing on the contact
    const thick = THICK * stretch.y;
    const y = contact.y - thick / 2 - pose.lift * LIFT;
    left.x = base.x - SPAN * stretch.x;
    right.x = base.x + SPAN * stretch.x;
    left.y = right.y = y;
    drawSlab(
      ctx,
      left,
      right,
      thick,
      show * (1 - clamp01(since / FADE_MS)),
      now,
    );
    if (pose.press >= 0 && ms < last)
      drawCrushContact(
        ctx,
        contact,
        Math.PI / 2,
        PILE_W * 2 * squash.x,
        pose.since,
        lerp(POWER[0], POWER[1], pose.press / (SLAMS - 2)),
        now,
      );
    drawCrushBurst(ctx, base, Math.PI / 2, BURST, since, now);
    drawDetonation(ctx, base, since, CRUSH_BLAST, now);
    for (const s of state.shocks)
      drawDetonation(ctx, bars[s.bar], ms - s.at, SHOCK_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
