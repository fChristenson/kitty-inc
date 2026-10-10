// the designator floor crit: the number shoots up off the top and a targeting
// dot from orbit darts over the bars in view, hopping spot to spot, quicker
// and quicker; a pillar of light slams down on every spot it marked a beat
// behind it, the strikes chasing it down the building; it stops on its own
// bar and holds, then one giant pillar and a huge blast
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, ownLast, skyY } from "../../critPlayer/shared";

const DS_IN_MS = 220;
const DS_FIRST_MS = DS_IN_MS + 60;
const DS_MARKS = 14;
// the gaps between marks, quickening, and the share of one the dot glides
const DS_GAP_MS: [number, number] = [110, 45];
const DS_GLIDE = 0.6;
const DS_HOME_MS = 80;
const DS_REACH = 0.85;
// how far each mark strays from its run down the building, in bars
const DS_STRAY = 1.2;
// a mark's pillar lands this long after the dot leaves it
const DS_LAG_MS = 160;
const DS_STRIKE_MS = 140;
const DS_HOLD_MS = 260;
const DS_ABOVE = 600;
const DS_LEAN = 160;
const DS_DOT: [number, number] = [30, 90];
const DS_PILLAR = 44;
const DS_PILLAR_FLARE = 100;
const DS_BIG_PILLAR = 150;
const DS_BIG_FLARE = 220;
const DS_BIG_MS = 300;
const DS_BLAST = 160;
const DS_BOOM = 440;
const DS_CLUSTER = [-0.5, 0.5, -1, 1];
const DS_CLUSTER_MS = 45;
const DS_CLUSTER_BLAST = 170;
const DS_KICKED_BOOM = 1e6;
// shakes by step: a pillar, its own bar
const DS_SHAKES = [0.5, 3];
const DS_TAIL_MS = 1000;

interface Mark {
  bar: number;
  side: number;
  at: number;
}
interface Designation {
  marks: Mark[];
  hold: number;
  boom: number;
}
const designations = new WeakMap<Running, Designation>();

function planMarks(bars: Point[]): Designation {
  const order = ownLast(bars);
  const others = order.length > 1 ? order.slice(0, -1) : order;
  const marks: Mark[] = [];
  let clock = DS_FIRST_MS;
  for (let k = 0; k < DS_MARKS; k++) {
    const run = (k / DS_MARKS) * others.length;
    const stray = (holeHash(k, 1101) - 0.5) * DS_STRAY;
    const i = Math.max(0, Math.min(others.length - 1, Math.floor(run + stray)));
    marks.push({
      bar: others[i],
      side: (holeHash(k, 1100) * 2 - 1) * DS_REACH,
      at: clock,
    });
    clock += lerp(...DS_GAP_MS, k / (DS_MARKS - 1));
  }
  return { marks, hold: clock, boom: clock + DS_HOLD_MS };
}

// the dot gliding from mark to mark, then onto the middle of its own bar
const dot = { x: 0, y: 0 };
function dotAt(r: Running, bars: Point[], d: Designation, ms: number): Point {
  const { marks } = d;
  let from = marks[0];
  let to: Mark | null = null;
  for (let k = 1; k < marks.length; k++) {
    if (ms < marks[k].at) {
      to = marks[k];
      break;
    }
    from = marks[k];
  }
  const a = along(r, bars, from.bar, from.side);
  const b = to ? along(r, bars, to.bar, to.side) : bars[0];
  const u = to
    ? clamp01((ms - from.at) / ((to.at - from.at) * DS_GLIDE))
    : clamp01((ms - from.at) / DS_HOME_MS);
  const e = u * u * (3 - 2 * u);
  dot.x = lerp(a.x, b.x, e);
  dot.y = lerp(a.y, b.y, e);
  return dot;
}

const sky = { x: 0, y: 0 };

registerFloorCrit("designatorCrit", {
  plan(r, bars, hit) {
    const d = planMarks(bars);
    designations.set(r, d);
    for (const m of d.marks) hit(m.bar, m.at + DS_LAG_MS, 0);
    hit(0, d.boom, 1);
    DS_CLUSTER.forEach((_, k) => hit(0, d.boom + (k + 1) * DS_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const d = designations.get(r);
    if (!d) return;
    const now = r.startedAt + ms;
    const top = -r.viewportWidth * 1.5;
    if (ms < DS_IN_MS) {
      const p = (ms / DS_IN_MS) ** 2;
      const up = skyY(r, bars, DS_ABOVE);
      drawText(ctx, r.glyphs, r.label, 0, lerp(0, up, p), r.flashFont, {
        along: Math.PI / 2,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    if (ms >= d.boom && r.kicked < DS_KICKED_BOOM) {
      r.kicked = DS_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= DS_IN_MS && ms < d.boom) {
      const at = dotAt(r, bars, d, ms);
      sky.x = at.x + DS_LEAN;
      sky.y = top;
      drawAimLaser(ctx, sky, at);
      const hold = clamp01((ms - d.hold) / DS_HOLD_MS);
      drawBeamFlare(ctx, at, lerp(...DS_DOT, hold), 0.8, now);
    }
    for (const m of d.marks) {
      const since = ms - m.at - DS_LAG_MS;
      if (since < 0 || since >= 1000) continue;
      const spot = along(r, bars, m.bar, m.side);
      if (since < DS_STRIKE_MS) {
        const fade = 1 - since / DS_STRIKE_MS;
        sky.x = spot.x;
        sky.y = top;
        drawBeam(ctx, sky, spot, DS_PILLAR, fade);
        drawBeamFlare(ctx, spot, DS_PILLAR_FLARE, fade, now);
      }
      drawDetonation(ctx, spot, since, DS_BLAST, now);
    }
    const t = ms - d.boom;
    if (t >= 0 && t < DS_BIG_MS) {
      const fade = 1 - t / DS_BIG_MS;
      sky.x = bars[0].x;
      sky.y = top;
      drawBeam(ctx, sky, bars[0], DS_BIG_PILLAR, fade);
      drawBeamFlare(ctx, bars[0], DS_BIG_FLARE, fade, now);
    }
    drawDetonation(ctx, bars[0], t, DS_BOOM, now);
    for (let k = 0; k < DS_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, DS_CLUSTER[k]),
        t - (k + 1) * DS_CLUSTER_MS,
        DS_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: DS_TAIL_MS,
  shake: (step) => DS_SHAKES[step] ?? DS_SHAKES[0],
});
