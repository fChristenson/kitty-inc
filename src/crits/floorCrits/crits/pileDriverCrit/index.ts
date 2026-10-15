// Pile Driver, a floor crit: the number bursts into a wisp on top of every
// bar in view, each trembling harder as its turn nears; one huge slab of
// light winds up over the top one and slams down, crushing it flat in a
// white-hot contact line and a jet of glitter, then whips up and over onto
// the next, and the next, down the building, quicker, higher and harder
// each, levels on every bar it crushes; the last wind-up is the highest and
// the slam onto its own bar the hardest
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawSlab,
  planCrush,
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
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash } from "../../critPlayer/shared";

const IN_MS = 140;
const POP = 90;
// each wisp R round on top of its bar, up to SPREAD of its half width off
// its middle, trembling up to SHIVER px in the TENSE_MS before its slam
const R = 50;
const SPREAD = 0.5;
const SHIVER = 10;
const TENSE_MS = 300;
const WISP = WISP_SIZE * 1.6;
// the slams: from FIRST_MS, the gaps closing, the last wound up WIND_UP
// times as long; the slab SLAB px wide, THICK px, winding up LIFT px
const FIRST_MS = IN_MS + 260;
const GAPS: [number, number] = [240, 100];
const WIND_UP = 1.9;
const SLAB = 260;
const THICK = 46;
const LIFT = 260;
const POWER: [number, number] = [0.5, 1.2];
const BURST = 320;
const BLAST = 140;
const OWN_BLAST = 380;
// shakes by step (the slams shake themselves): a bar, its own
const SHAKES = [0.2, 0.6];

interface State {
  crush: Crush;
  pose: CrushPose;
  // the bars in the order they're hit (its own last), each wisp's offset
  order: number[];
  dx: number[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const next: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const stretch: Point = { x: 1, y: 1 };
const atHead = () => head;

registerFloorCrit("pileDriverCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[p].y - bars[q].y);
    order.push(0);
    const crush = planCrush(FIRST_MS, order.length, GAPS, WIND_UP, {
      bang: true,
    });
    order.forEach((bar, k) => hit(bar, crush.slams[k], bar === 0 ? 1 : 0));
    states.set(r, {
      crush,
      pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
      order,
      dx: order.map((_, k) => (holeHash(k, 8110) * 2 - 1) * half * SPREAD),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { crush, pose, order, dx } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    const { slams } = crush;
    const last = slams.length - 1;
    // the wisps waiting their turn, and each crushed one's contact and burst
    for (let k = 0; k < order.length; k++) {
      const bar = bars[order[k]];
      spot.x = bar.x + dx[k];
      spot.y = bar.y - BAR_HALF_H - R;
      if (ms >= IN_MS && ms < slams[k]) {
        const tense = clamp01(1 - (slams[k] - ms) / TENSE_MS) ** 2;
        head.x = spot.x + Math.sin(ms * 0.9 + k) * SHIVER * tense;
        head.y = spot.y + Math.cos(ms * 1.1 + k) * SHIVER * tense * 0.5;
        drawWispHead(
          ctx,
          atHead,
          ms,
          now,
          WISP * (k === last ? 1.3 : 1),
          tense,
        );
      }
      drawDetonation(ctx, spot, ms - IN_MS, POP, now);
      const since = ms - slams[k];
      if (since >= 0) {
        const power = lerp(POWER[0], POWER[1], k / Math.max(1, last));
        spot.y += R;
        drawCrushContact(ctx, spot, Math.PI / 2, SLAB, since, power, now);
        // the full burst is the climax's alone
        if (k === last)
          drawCrushBurst(ctx, spot, Math.PI / 2, BURST * power, since, now);
        drawDetonation(
          ctx,
          spot,
          since,
          order[k] === 0 ? OWN_BLAST : BLAST,
          now,
        );
      }
    }
    // the slab: over the wisp it slams next, swinging over from the last
    if (ms >= IN_MS && pose.press < last) {
      const k = pose.press + 1;
      const to = bars[order[k]];
      next.x = to.x + dx[k];
      next.y = to.y - BAR_HALF_H;
      if (k > 0) {
        const from = bars[order[k - 1]];
        const u = clamp01(
          (ms - slams[k - 1]) / ((slams[k] - slams[k - 1]) * 0.6),
        );
        const e = u * u * (3 - 2 * u);
        next.x = lerp(from.x + dx[k - 1], next.x, e);
        next.y = lerp(from.y - BAR_HALF_H, next.y, e);
      }
      crusherScale(crush, ms, stretch);
      const y =
        next.y -
        R * 2 -
        (THICK / 2) * stretch.y -
        pose.lift * LIFT * (k === last ? 1.4 : 1);
      a.x = next.x - (SLAB / 2) * stretch.x;
      b.x = next.x + (SLAB / 2) * stretch.x;
      a.y = b.y = y;
      drawSlab(ctx, a, b, THICK * stretch.y, 1, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
