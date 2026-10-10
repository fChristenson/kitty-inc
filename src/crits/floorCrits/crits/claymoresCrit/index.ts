// the claymores floor crit: the number scatters into mines stuck on the ends
// of the bars in view; the left ones fire top to bottom, each a muzzle flash
// and a fan of pellets rattling blasts along its bar, then the right ones
// bottom to top, quicker; last its own bar's two fire at once, the rattles
// meeting in the middle in a huge blast
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const CM_IN_MS = 220;
const CM_FIRST_MS = CM_IN_MS + 60;
// the left ends' gaps top to bottom, then the right ends' bottom to top
const CM_LEFT_GAP_MS = 180;
const CM_RIGHT_GAP_MS = 120;
const CM_FINAL_DELAY_MS = 200;
// a mine sits this far in from its bar's end
const CM_END_IN = 20;
const CM_MINE = 0.7;
const CM_FUSE = 60;
const CM_MUZZLE_MS = 120;
const CM_MUZZLE = 320;
const CM_KICK = 0.8;
// the pellets' spray, the length of its bar (half for its own) over this long
const CM_SPRAY_MS = 200;
const CM_PELLETS = 6;
const CM_PELLET = 10;
const CM_PELLET_LEN = 70;
const CM_PELLET_FAN = 90;
// a rattle: blasts from the mine's end along its bar, one every CM_STEP_MS
const CM_RATTLE = 7;
const CM_REACH = 1.9;
const CM_OWN_RATTLE = 4;
const CM_STEP_MS = 45;
const CM_HIT_MS = 30;
const CM_BLAST = 130;
const CM_OWN_BLAST = 150;
const CM_BOOM = 440;
const CM_CLUSTER = [-0.5, 0.5, -1, 1];
const CM_CLUSTER_MS = 45;
const CM_CLUSTER_BLAST = 170;
const CM_KICKED_BOOM = 1e6;
// shakes by step: a blast, the meeting in the middle
const CM_SHAKES = [0.4, 3];
const CM_TAIL_MS = 1000;

interface Mine {
  bar: number;
  right: boolean;
  at: number;
  // its rattle's blasts along its bar
  sides: number[];
}
interface Field {
  mines: Mine[];
  boom: number;
}
const fields = new WeakMap<Running, Field>();

const blastAt = (m: Mine, k: number) => m.at + CM_HIT_MS + k * CM_STEP_MS;

function planField(bars: Point[]): Field {
  const order = ownLast(bars);
  const others = order.slice(0, -1);
  const rattle = (right: boolean, n: number, reach: number) =>
    Array.from({ length: n }, (_, k) => {
      const side = -1 + (k / Math.max(1, n - 1)) * reach;
      return right ? -side : side;
    });
  const mines: Mine[] = [
    ...others.map((bar, k) => ({
      bar,
      right: false,
      at: CM_FIRST_MS + k * CM_LEFT_GAP_MS,
      sides: rattle(false, CM_RATTLE, CM_REACH),
    })),
    ...[...others].reverse().map((bar, k) => ({
      bar,
      right: true,
      at: CM_FIRST_MS + others.length * CM_LEFT_GAP_MS + k * CM_RIGHT_GAP_MS,
      sides: rattle(true, CM_RATTLE, CM_REACH),
    })),
  ];
  const final =
    (mines.length ? mines[mines.length - 1].at : CM_FIRST_MS) +
    CM_FINAL_DELAY_MS;
  // its own bar's two, racing in to meet in the middle
  const ownReach = 1 - 1 / CM_OWN_RATTLE;
  for (const right of [false, true])
    mines.push({
      bar: 0,
      right,
      at: final,
      sides: rattle(right, CM_OWN_RATTLE, ownReach),
    });
  return { mines, boom: final + CM_HIT_MS + CM_OWN_RATTLE * CM_STEP_MS };
}

registerFloorCrit("claymoresCrit", {
  plan(r, bars, hit) {
    const field = planField(bars);
    fields.set(r, field);
    for (const m of field.mines)
      m.sides.forEach((_, k) => hit(m.bar, blastAt(m, k), 0));
    hit(0, field.boom, 1);
    CM_CLUSTER.forEach((_, k) =>
      hit(0, field.boom + (k + 1) * CM_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const field = fields.get(r);
    if (!field) return;
    const now = r.startedAt + ms;
    const { mines, boom } = field;
    const hw = r.play.barHalfWidth;
    if (ms < CM_IN_MS) {
      const p = (ms / CM_IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, 0, lerp(r.flashFont, 0, p));
    }

    // a kick as each fires, then the meeting's bang
    while (r.kicked < mines.length && mines[r.kicked].at <= ms) {
      r.shake(CM_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < CM_KICKED_BOOM) {
      r.kicked = CM_KICKED_BOOM;
      playExplosion();
    }

    mines.forEach((m, i) => {
      const dir = m.right ? -1 : 1;
      const b = bars[m.bar];
      const spot = { x: b.x - dir * (hw - CM_END_IN), y: b.y };
      if (ms >= CM_IN_MS && ms < m.at)
        drawLitFuse(
          ctx,
          spot,
          (ms - CM_IN_MS) / (m.at - CM_IN_MS),
          CM_FUSE,
          now,
        );
      drawWispBetween(
        ctx,
        (t) => {
          const p = clamp01(t / CM_IN_MS);
          return { x: spot.x * p, y: spot.y * p };
        },
        ms,
        now,
        WISP_SIZE * CM_MINE,
        0.5,
        0,
        m.at,
      );
      drawMuzzleFlash(
        ctx,
        spot,
        m.right ? Math.PI : 0,
        (ms - m.at) / CM_MUZZLE_MS,
        CM_MUZZLE,
      );
      const t = ms - m.at;
      if (t >= 0 && t < CM_SPRAY_MS) {
        const u = t / CM_SPRAY_MS;
        const reach = (m.bar === 0 ? hw : 2 * hw) * u;
        for (let p = 0; p < CM_PELLETS; p++) {
          const head = {
            x: spot.x + dir * reach * (0.8 + 0.2 * holeHash(p, 990 + i)),
            y: spot.y + (holeHash(p, 991 + i) - 0.5) * CM_PELLET_FAN * u,
          };
          drawBeam(
            ctx,
            { x: head.x - dir * CM_PELLET_LEN, y: head.y },
            head,
            CM_PELLET,
            1 - u,
          );
        }
      }
      m.sides.forEach((side, k) =>
        drawDetonation(
          ctx,
          along(r, bars, m.bar, side),
          ms - blastAt(m, k),
          m.bar === 0 ? CM_OWN_BLAST : CM_BLAST,
          now,
        ),
      );
    });
    drawDetonation(ctx, bars[0], ms - boom, CM_BOOM, now);
    CM_CLUSTER.forEach((side, k) =>
      drawDetonation(
        ctx,
        along(r, bars, 0, side),
        ms - boom - (k + 1) * CM_CLUSTER_MS,
        CM_CLUSTER_BLAST,
        now,
      ),
    );
  },
  tailMs: CM_TAIL_MS,
  shake: (step) => CM_SHAKES[step] ?? CM_SHAKES[0],
});
