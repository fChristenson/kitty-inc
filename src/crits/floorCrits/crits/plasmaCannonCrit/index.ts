// the plasma cannon floor crit: the number flies to the top corner and swells
// into a crackling ball of plasma, then fires heavy plasma shots down into
// the bars in view, each a big blast throwing arcs along its bar that pop in
// blasts; the last, fattest shot into its own bar and a huge blast
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { createBolt, drawBolt, type Bolt } from "../../../../shared/lightning";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
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

const PC_IN_MS = 220;
const PC_CHARGE_MS = PC_IN_MS + 240;
const PC_SHOTS = 7;
const PC_EVERY_MS = 120;
const PC_LAST_DELAY_MS = 80;
const PC_FLY_MS = 110;
// the cannon: across from the middle (of the viewport's width) and over the
// top bar, swelling as it charges
const PC_CANNON_X = -0.38;
const PC_ABOVE = 300;
const PC_CANNON: [number, number] = [1, 2.5];
const PC_SHOT = 1.6;
const PC_LAST_SHOT = 2.6;
const PC_KICK = 0.5;
// each shot's two arcs along its bar, how far (of the bar), popping a blast
// each after the impact
const PC_ARC: [number, number] = [0.3, 0.5];
const PC_ARC_MS = 160;
const PC_ARC_SCALE = 0.7;
const PC_POP_MS = 45;
const PC_BLAST = 190;
const PC_POP = 110;
const PC_BOOM = 440;
const PC_LAST_POP = 170;
const PC_KICKED_BOOM = 1e6;
// shakes by step: a blast, the last one
const PC_SHAKES = [0.7, 3];
const PC_TAIL_MS = 1000;

interface Shot {
  bar: number;
  side: number;
  // where along the bar its two arcs reach
  arcs: number[];
  bolts: Bolt[];
  fired: number;
  last: boolean;
}
const cannons = new WeakMap<Running, Shot[]>();

const landAt = (s: Shot) => s.fired + PC_FLY_MS;
const popAt = (s: Shot, j: number) => landAt(s) + (j + 1) * PC_POP_MS;

function planShots(bars: Point[]): Shot[] {
  // round the other bars top to bottom, then its own last
  const order = ownLast(bars);
  const others = order.length > 1 ? order.slice(0, -1) : order;
  return Array.from({ length: PC_SHOTS }, (_, i) => {
    const last = i === PC_SHOTS - 1;
    const side = last ? 0 : (holeHash(i, 920) * 2 - 1) * 0.6;
    const arcs = [-1, 1].map((s) => {
      const reach = lerp(...PC_ARC, holeHash(i, 921 + s));
      return Math.max(-1, Math.min(1, side + s * reach));
    });
    return {
      bar: last ? 0 : others[i % others.length],
      side,
      arcs,
      bolts: arcs.map(() => createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 1)),
      fired: PC_CHARGE_MS + i * PC_EVERY_MS + (last ? PC_LAST_DELAY_MS : 0),
      last,
    };
  });
}

registerFloorCrit("plasmaCannonCrit", {
  plan(r, bars, hit) {
    const shots = planShots(bars);
    cannons.set(r, shots);
    for (const s of shots) {
      hit(s.bar, landAt(s), s.last ? 1 : 0);
      s.arcs.forEach((_, j) => hit(s.bar, popAt(s, j), 0));
    }
  },
  draw(ctx, r, ms, bars) {
    const shots = cannons.get(r);
    if (!shots) return;
    const now = r.startedAt + ms;
    const cannon = {
      x: r.viewportWidth * PC_CANNON_X,
      y: skyY(r, bars, PC_ABOVE),
    };
    const boom = landAt(shots[PC_SHOTS - 1]);
    if (ms < PC_IN_MS) {
      const p = (ms / PC_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        cannon.x * p,
        cannon.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // a kick on every shot fired, then the last one's bang
    while (r.kicked < PC_SHOTS && shots[r.kicked].fired <= ms) {
      r.shake(PC_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < PC_KICKED_BOOM) {
      r.kicked = PC_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= PC_IN_MS && ms < boom) {
      const charge = clamp01((ms - PC_IN_MS) / (PC_CHARGE_MS - PC_IN_MS));
      drawWisp(
        ctx,
        () => cannon,
        ms,
        now,
        WISP_SIZE * lerp(...PC_CANNON, charge),
        charge,
      );
    }

    for (const s of shots) {
      const to = s.last ? bars[0] : along(r, bars, s.bar, s.side);
      drawWispBetween(
        ctx,
        (t) => {
          const p = clamp01((t - s.fired) / PC_FLY_MS);
          return { x: lerp(cannon.x, to.x, p), y: lerp(cannon.y, to.y, p) };
        },
        ms,
        now,
        WISP_SIZE * (s.last ? PC_LAST_SHOT : PC_SHOT),
        1,
        s.fired,
        landAt(s),
      );
      const t = ms - landAt(s);
      s.arcs.forEach((side, j) => {
        const end = along(r, bars, s.bar, side);
        if (t >= 0 && t < PC_ARC_MS) {
          // its ends kept on the bar as it scrolls
          const bolt = s.bolts[j];
          bolt.from.x = to.x;
          bolt.from.y = to.y;
          bolt.to.x = end.x;
          bolt.to.y = end.y;
          drawBolt(ctx, bolt, 1 - t / PC_ARC_MS, PC_ARC_SCALE);
        }
        drawDetonation(
          ctx,
          end,
          ms - popAt(s, j),
          s.last ? PC_LAST_POP : PC_POP,
          now,
        );
      });
      drawDetonation(ctx, to, t, s.last ? PC_BOOM : PC_BLAST, now);
    }
  },
  tailMs: PC_TAIL_MS,
  shake: (step) => PC_SHAKES[step] ?? PC_SHAKES[0],
});
