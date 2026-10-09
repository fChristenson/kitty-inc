// the shotgun floor crit: the number flies to the top corner and blasts the
// bars in view with a shotgun: each shot a muzzle flash, a kick and a spread
// of pellets rattling into two bars, working down the building, then a
// double barrel into its own bar and a huge blast
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playBarExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
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

const SG_IN_MS = 240;
const SG_FIRST_MS = SG_IN_MS + 40;
// the gaps between shots, quickening, then the double barrel's two shots
const SG_GAP: [number, number] = [260, 160];
const SG_DOUBLE_MS = 220;
const SG_DOUBLE_GAP_MS = 80;
const SG_PELLETS = 10;
// a pellet's flight: the least, more a px it flies, and a spread on top
const SG_FLY_MS = 60;
const SG_FLY_PER_PX = 0.08;
const SG_FLY_SPREAD_MS = 40;
const SG_SPREAD_Y = 50;
// the muzzle: across (of the viewport's width) and over the top bar
const SG_MUZZLE_X = 0.38;
const SG_ABOVE = 280;
const SG_MUZZLE = 260;
const SG_MUZZLE_MS = 120;
const SG_PELLET = 0.6;
const SG_PELLET_HEAT = 0.8;
const SG_SHOT_RATE = 1.5;
const SG_SHOT_SHAKE: [number, number] = [1, 2];
const SG_BLAST = 110;
const SG_DOUBLE_BLAST = 150;
const SG_BOOM_MS = 60;
const SG_BOOM = 420;
const SG_KICKED_BOOM = 1e6;
// shakes by step: a pellet, the last blast
const SG_SHAKES = [0.4, 3];
const SG_TAIL_MS = 1000;

interface Pellet {
  bar: number;
  side: number;
  dy: number;
  at: number;
}
interface Shot {
  at: number;
  // the bar it's aimed at, for its muzzle flash
  aim: number;
  double: boolean;
  pellets: Pellet[];
}
interface Blasting {
  shots: Shot[];
  boom: number;
}
const guns = new WeakMap<Running, Blasting>();

const muzzleAt = (r: Running, bars: Point[]): Point => ({
  x: r.viewportWidth * SG_MUZZLE_X,
  y: skyY(r, bars, SG_ABOVE),
});

function planShots(r: Running, bars: Point[]): Blasting {
  const order = ownLast(bars);
  const muzzle = muzzleAt(r, bars);
  // two bars a shot, top to bottom, then the double barrel on its own bar
  const aims: { at: number; targets: number[]; double: boolean }[] = [];
  const pairs = order.length - 1;
  let t = SG_FIRST_MS;
  for (let k = 0; k < pairs; k++) {
    aims.push({ at: t, targets: [order[k], order[k + 1]], double: false });
    t += lerp(...SG_GAP, pairs > 1 ? k / (pairs - 1) : 1);
  }
  if (pairs > 0) t += SG_DOUBLE_MS - SG_GAP[1];
  aims.push({ at: t, targets: [0], double: true });
  aims.push({ at: t + SG_DOUBLE_GAP_MS, targets: [0], double: true });

  let last = 0;
  const shots = aims.map((aim, k) => {
    const pellets = Array.from({ length: SG_PELLETS }, (_, i) => {
      const bar = aim.targets[i % aim.targets.length];
      const side = holeHash(k * SG_PELLETS + i, 840) * 2 - 1;
      const to = along(r, bars, bar, side);
      const d = Math.hypot(to.x - muzzle.x, to.y - muzzle.y);
      const at = Math.round(
        aim.at +
          SG_FLY_MS +
          d * SG_FLY_PER_PX +
          holeHash(k * SG_PELLETS + i, 841) * SG_FLY_SPREAD_MS,
      );
      last = Math.max(last, at);
      return {
        bar,
        side,
        dy: (holeHash(k * SG_PELLETS + i, 842) - 0.5) * SG_SPREAD_Y,
        at,
      };
    });
    return { at: aim.at, aim: aim.targets[0], double: aim.double, pellets };
  });
  return { shots, boom: last + SG_BOOM_MS };
}

const landAt = (r: Running, bars: Point[], p: Pellet): Point => {
  const at = along(r, bars, p.bar, p.side);
  at.y += p.dy;
  return at;
};

registerFloorCrit("shotgunCrit", {
  plan(r, bars, hit) {
    const g = planShots(r, bars);
    guns.set(r, g);
    for (const shot of g.shots)
      for (const p of shot.pellets) hit(p.bar, p.at, 0);
    hit(0, g.boom, 1);
  },
  draw(ctx, r, ms, bars) {
    const g = guns.get(r);
    if (!g) return;
    const now = r.startedAt + ms;
    const muzzle = muzzleAt(r, bars);
    if (ms < SG_IN_MS) {
      const p = (ms / SG_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        muzzle.x * p,
        muzzle.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // every shot's kick and bang, then the last blast
    while (r.kicked < g.shots.length && g.shots[r.kicked].at <= ms) {
      r.shake(lerp(...SG_SHOT_SHAKE, r.kicked / (g.shots.length - 1 || 1)));
      playBarExplosion(SG_SHOT_RATE);
      r.kicked++;
    }
    if (ms >= g.boom && r.kicked < SG_KICKED_BOOM) {
      r.kicked = SG_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= SG_IN_MS && ms < g.boom)
      drawWisp(ctx, () => muzzle, ms, now, WISP_SIZE);
    for (const shot of g.shots) {
      const aim = bars[shot.aim];
      drawMuzzleFlash(
        ctx,
        muzzle,
        Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x),
        (ms - shot.at) / SG_MUZZLE_MS,
        SG_MUZZLE,
      );
      for (const p of shot.pellets) {
        const to = landAt(r, bars, p);
        drawWispBetween(
          ctx,
          (t) => {
            const u = clamp01((t - shot.at) / (p.at - shot.at));
            return {
              x: lerp(muzzle.x, to.x, u),
              y: lerp(muzzle.y, to.y, u),
            };
          },
          ms,
          now,
          WISP_SIZE * SG_PELLET,
          SG_PELLET_HEAT,
          shot.at,
          p.at,
        );
        drawDetonation(
          ctx,
          to,
          ms - p.at,
          shot.double ? SG_DOUBLE_BLAST : SG_BLAST,
          now,
        );
      }
    }
    drawDetonation(ctx, bars[0], ms - g.boom, SG_BOOM, now);
  },
  tailMs: SG_TAIL_MS,
  shake: (step) => SG_SHAKES[step] ?? SG_SHAKES[0],
});
