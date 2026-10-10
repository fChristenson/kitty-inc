// the rods floor crit: the number shoots up off the top and gold rods drop
// from orbit, each straight down through every bar in view in its column, a
// blast on each bar it punches through top to bottom, quicker and quicker;
// then a fat one down the middle through every bar into its own, a huge blast
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, skyY } from "../../critPlayer/shared";

const RD_IN_MS = 220;
const RD_FIRST_MS = RD_IN_MS + 60;
const RD_RODS = 9;
// the gaps between rods, quickening, then before the fat one
const RD_GAP_MS: [number, number] = [130, 50];
const RD_LAST_GAP_MS = 140;
// px per ms, from this far over the top bar, and how far past the lowest it
// keeps going
const RD_SPEED = 9;
const RD_ABOVE = 500;
const RD_PAST = 400;
const RD_REACH = 0.85;
const RD_ROD = 22;
const RD_FAT = 64;
const RD_ROD_LEN = 260;
const RD_GLINT = 1.6;
// the hole it punched glows on this long once it's through
const RD_HOLE_MS = 300;
const RD_BLAST = 140;
const RD_FAT_BLAST = 200;
const RD_BOOM = 440;
const RD_CLUSTER = [-0.5, 0.5, -1, 1];
const RD_CLUSTER_MS = 45;
const RD_CLUSTER_BLAST = 170;
const RD_KICKED_BOOM = 1e6;
// shakes by step: a punch, the fat rod's punch, its own bar
const RD_SHAKES = [0.4, 0.8, 3];
const RD_TAIL_MS = 1000;

interface Rod {
  side: number;
  at: number;
  fat: boolean;
  // when it punches through each bar, by bar
  through: number[];
  // when it's past everything
  gone: number;
}
interface Drop {
  rods: Rod[];
  // where the rods drop from and fall past, from its own bar's height
  from: number;
  past: number;
  boom: number;
}
const drops = new WeakMap<Running, Drop>();

function planDrop(r: Running, bars: Point[]): Drop {
  const own = bars[0].y;
  const from = skyY(r, bars, RD_ABOVE) - own;
  const past = Math.max(...bars.map((b) => b.y)) + RD_PAST - own;
  const reach = (y: number) => (y - own - from) / RD_SPEED;
  const rods: Rod[] = [];
  let clock = RD_FIRST_MS;
  for (let k = 0; k <= RD_RODS; k++) {
    const fat = k === RD_RODS;
    rods.push({
      side: fat ? 0 : (holeHash(k, 1010) * 2 - 1) * RD_REACH,
      at: clock,
      fat,
      through: bars.map((b) => clock + reach(b.y)),
      gone: clock + reach(fat ? own : own + past),
    });
    clock +=
      k < RD_RODS - 1
        ? lerp(...RD_GAP_MS, k / Math.max(1, RD_RODS - 2))
        : RD_LAST_GAP_MS;
  }
  return { rods, from, past, boom: rods[RD_RODS].through[0] };
}

const top = { x: 0, y: 0 };
const tip = { x: 0, y: 0 };

registerFloorCrit("rodsCrit", {
  plan(r, bars, hit) {
    const drop = planDrop(r, bars);
    drops.set(r, drop);
    for (const rod of drop.rods)
      rod.through.forEach((at, bar) => {
        if (rod.fat && bar === 0) return;
        hit(bar, at, rod.fat ? 1 : 0);
      });
    hit(0, drop.boom, 2);
    RD_CLUSTER.forEach((_, k) =>
      hit(0, drop.boom + (k + 1) * RD_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const drop = drops.get(r);
    if (!drop) return;
    const now = r.startedAt + ms;
    const own = bars[0].y;
    const from = own + drop.from;
    if (ms < RD_IN_MS) {
      const p = (ms / RD_IN_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, 0, lerp(0, from, p), r.flashFont, {
        along: Math.PI / 2,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    if (ms >= drop.boom && r.kicked < RD_KICKED_BOOM) {
      r.kicked = RD_KICKED_BOOM;
      playExplosion();
    }

    for (const rod of drop.rods) {
      const t = ms - rod.at;
      if (t < 0 || ms >= rod.gone + RD_HOLE_MS) continue;
      const x = along(r, bars, 0, rod.side).x;
      const end = rod.fat ? own : own + drop.past;
      const y = Math.min(end, from + RD_SPEED * t);
      const width = rod.fat ? RD_FAT : RD_ROD;
      const hole = 1 - clamp01((ms - rod.gone) / RD_HOLE_MS);
      top.x = tip.x = x;
      top.y = from;
      tip.y = y;
      drawBeam(ctx, top, tip, width * 0.5, 0.6 * hole);
      if (y >= end) continue;
      top.y = y - RD_ROD_LEN;
      drawBeam(ctx, top, tip, width, 1);
      ctx.globalCompositeOperation = "lighter";
      stampGlimmer(ctx, x, y, width * RD_GLINT, ms * 0.02, COLOR.white);
      ctx.globalCompositeOperation = "source-over";
    }
    for (const rod of drop.rods)
      for (let bar = 0; bar < bars.length; bar++) {
        if (rod.fat && bar === 0) continue;
        const since = ms - rod.through[bar];
        if (since < 0 || since >= 1000) continue;
        drawDetonation(
          ctx,
          along(r, bars, bar, rod.side),
          since,
          rod.fat ? RD_FAT_BLAST : RD_BLAST,
          now,
        );
      }
    drawDetonation(ctx, bars[0], ms - drop.boom, RD_BOOM, now);
    for (let k = 0; k < RD_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, RD_CLUSTER[k]),
        ms - drop.boom - (k + 1) * RD_CLUSTER_MS,
        RD_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: RD_TAIL_MS,
  shake: (step) => RD_SHAKES[step] ?? RD_SHAKES[0],
});
