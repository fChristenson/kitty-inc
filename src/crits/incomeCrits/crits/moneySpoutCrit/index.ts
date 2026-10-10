// the money spout income crit: the number bursts into a spinning spout of
// hundreds of coins twisting up from the middle of the screen, narrowing as
// it climbs, its top swaying across the total and rattling it with blasts as
// the coins pour in; the last of it slams in with the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  registerFloorCrit,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

const COINS = 600;
const POUR_MS = 900;
const RISE_MS = 450;
const END_MS = POUR_MS + RISE_MS;
// rad per ms each coin spins round the spout
const SPIN = 0.012;
// the spout: wide at its foot, narrow at its top, seen from a little above;
// its top swaying across the total
const FOOT = 320;
const TOP = 40;
const WIDTH_SPREAD = 0.3;
const DEPTH = 0.25;
const SWAY = 260;
const SWAY_RATE = 0.006;
const FRONT_COIN = 30;
const BACK_COIN = 24;
const COIN_SPIN = 0.02;
const POP_EVERY_MS = 45;
const POP_JITTER = 120;
const POP_BLAST = 150;
const OPEN_BLAST = 300;
// shakes by step: a pop, the last of it
const SHAKES = [0.5, 2.4];

const phase = Float32Array.from(
  { length: COINS },
  (_, i) => holeHash(i, 141) * Math.PI * 2,
);
const width = Float32Array.from(
  { length: COINS },
  (_, i) => 1 - WIDTH_SPREAD + WIDTH_SPREAD * holeHash(i, 142),
);
const sprites: CoinBurstSprite[] = Array.from({ length: COINS }, (_, i) => ({
  kind: i % 4 === 0 ? "bill" : "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 143) - 0.5) * Math.PI,
}));
const sway = (ms: number) => Math.sin(ms * SWAY_RATE) * SWAY;

interface Spout {
  pops: Point[];
  popAt: number[];
}
const spouts = new WeakMap<Running, Spout>();
const origin: Point = { x: 0, y: 0 };

registerFloorCrit("moneySpoutCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const pops: Point[] = [];
    const popAt: number[] = [];
    for (
      let t = RISE_MS, k = 0;
      t < END_MS - POP_EVERY_MS;
      t += POP_EVERY_MS, k++
    ) {
      pops.push({
        x: to.x + sway(t) + (holeHash(k, 144) - 0.5) * POP_JITTER,
        y: to.y,
      });
      popAt.push(t);
      hit(0, t);
    }
    spouts.set(r, { pops, popAt });
    hit(0, END_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const spout = spouts.get(r);
    if (!spout) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms, OPEN_BLAST, now);
    if (ms < END_MS) {
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      // the back of the spout first, smaller, then its front over it
      for (let side = 0; side < 2; side++)
        for (let i = 0; i < COINS; i++) {
          const born = (i / COINS) * POUR_MS;
          const u = (ms - born) / RISE_MS;
          if (u < 0 || u >= 1) continue;
          const a = phase[i] + (ms - born) * SPIN;
          const sin = Math.sin(a);
          if (sin > 0 !== (side === 1)) continue;
          const radius = lerp(FOOT, TOP, u) * width[i];
          const climb = u * u;
          const coin = sprites[i];
          coin.spinFrame = ms * COIN_SPIN + i;
          drawCoinBurstFrame(
            ctx,
            coin,
            lerp(0, to.x + sway(born + RISE_MS), climb) + Math.cos(a) * radius,
            lerp(0, to.y, u) + sin * radius * DEPTH,
            side === 1 ? FRONT_COIN : BACK_COIN,
            base,
          );
        }
      endCoinBatch(ctx);
    }
    const { pops, popAt } = spout;
    for (let k = 0; k < pops.length; k++)
      drawDetonation(ctx, pops[k], ms - popAt[k], POP_BLAST, now);
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
