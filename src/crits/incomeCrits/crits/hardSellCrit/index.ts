// Hard Sell, an income crit: the green amount slams in over a big wisp under
// the readout and slams down on it like a press, again and again, quicker
// and deeper, a share each, the wisp squashing flatter and wider, glitter
// squeezed out of its sides; the last slam crushes it flat, glitter jetting
// out sideways, and the amount shoots up into the readout
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale } from "../shared";

// the amount slamming in over the wisp, shrinking to AMOUNT of its size
const IN_MS = 300;
const AMOUNT = 0.65;
// the wisp BELOW the readout's middle, R round; the amount's half height
// over it (of its font), winding up LIFT px
const BELOW = 340;
const R = 95;
const WISP = WISP_SIZE * 3;
const HALF_TEXT = 0.48;
const LIFT = 240;
// the slams: SLAMS of them from FIRST_MS, the gaps closing, the last wound
// up WIND_UP times as long
const FIRST_MS = 560;
const SLAMS = 6;
const GAPS: [number, number] = [360, 160];
const WIND_UP = 1.8;
const CLIMAX_SHAKE = 2.6;
const POWER: [number, number] = [0.5, 1.2];
const CRUSH_BLAST = 220;
// the amount rising into the readout RISE_MS after the crush, over UP_MS
const RISE_MS = 120;
const UP_MS = 140;
const RISE_STRETCH = 0.35;
// shakes by step: a slam's share (the slams shake themselves), the crush,
// the finale
const SHAKES = [0.2, 0.8, 2.4];

interface State {
  crush: Crush;
  pose: CrushPose;
  last: number;
  finale: number;
}
const states = new WeakMap<Running, State>();
const base: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const squash: Point = { x: 1, y: 1 };
const stretch: Point = { x: 1, y: 1 };
const ORIGIN: Point = { x: 0, y: 0 };
const atOrigin = () => ORIGIN;

registerFloorCrit("hardSellCrit", {
  plan(r, _bars, hit) {
    const crush = planCrush(FIRST_MS, SLAMS, GAPS, WIND_UP, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const last = crush.slams[SLAMS - 1];
    const finale = last + RISE_MS + UP_MS;
    for (const at of crush.slams.slice(0, -1)) hit(0, at, 0);
    hit(0, last, 1);
    hit(0, finale, 2);
    states.set(r, {
      crush,
      pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
      last,
      finale,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { crush, pose, last } = state;
    const now = r.startedAt + ms;
    const to = bars[0];
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    squashScale(pose.crush, squash);
    base.x = to.x;
    base.y = to.y + BELOW + R;
    contact.x = base.x;
    contact.y = base.y - 2 * R * squash.y;
    if (ms < last) {
      ctx.save();
      ctx.translate(base.x, base.y - R * squash.y);
      ctx.scale(squash.x, squash.y);
      drawWispHead(ctx, atOrigin, ms, now, WISP, 0.4 + 0.6 * pose.crush);
      ctx.restore();
      drawCrushStrain(
        ctx,
        contact,
        Math.PI / 2,
        2 * R * squash.x,
        pose.crush,
        R * 1.6,
        now,
      );
      if (pose.press >= 0)
        drawCrushContact(
          ctx,
          contact,
          Math.PI / 2,
          2 * R * squash.x,
          pose.since,
          lerp(POWER[0], POWER[1], pose.press / (SLAMS - 2)),
          now,
        );
    }
    drawCrushBurst(ctx, contact, Math.PI / 2, 2 * R, ms - last, now);
    drawDetonation(ctx, contact, ms - last, CRUSH_BLAST, now);
    // the amount: slammed in over the wisp, squashing and stretching as it
    // presses, then stretched up into the readout
    const font = r.flashFont * AMOUNT;
    crusherScale(crush, ms, stretch);
    const hover = contact.y - font * HALF_TEXT * stretch.y - pose.lift * LIFT;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, base.x, p),
        lerp(0, hover, p),
        r.flashFont * lerp(1, AMOUNT, p),
      );
    } else if (ms < last + RISE_MS) {
      drawText(ctx, r.glyphs, r.label, base.x, hover, font, {
        sx: stretch.x,
        sy: stretch.y,
      });
    } else if (ms < state.finale) {
      const p = ((ms - last - RISE_MS) / UP_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, base.x, lerp(hover, to.y, p), font, {
        alpha: 1 - 0.5 * p,
        sx: 1 - RISE_STRETCH * 0.5 * p,
        sy: 1 + RISE_STRETCH * p,
      });
    }
    drawFinale(ctx, to, ms - state.finale, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
