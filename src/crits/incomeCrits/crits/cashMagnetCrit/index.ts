// Cash Magnet, an income crit: the green amount bursts into a spray of coins
// and bills strewn all over the screen under the total, twitching towards
// it; the readout starts to pull, a few coins yanked up into it on bowed
// paths, then more and more, a flood, piling into a crust round it that
// swells and trembles, a share every few; it takes the last, collapses to a
// point and bursts: the finale
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import {
  planSnaps,
  snapAt,
  type Snap,
} from "../../../../shared/animationStyles/pull";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

// the coins: COINS of them flung over FLING_MS onto the screen under the
// total, EDGE px in from its sides, from TOP to BOTTOM px under it
const BURST_MS = 110;
const COINS = 160;
const FLING_MS = 220;
const EDGE = 80;
const TOP = 260;
const BOTTOM = 1400;
const COIN = 44;
const COIN_SPIN = 0.03;
// the pull: from PULL_MS on to the last in, over PULL_FOR_MS, onto a crust
// CRUST px round the readout, trembling up to TREMBLE px; a share every
// COINS / SHARES coins in
const PULL_MS = BURST_MS + FLING_MS + 60;
const PULL_FOR_MS = 1200;
const CRUST: [number, number] = [30, 90];
const TREMBLE = 12;
const SHARES = 8;
const GLOW = 320;
// collapsing over COLLAPSE_MS, then the finale
const COLLAPSE_MS = 90;
const BURST_BLAST = 240;
const POP = 120;
// shakes by step: a share, the finale
const SHAKES = [0.7, 2.6];

interface State {
  snaps: Snap[];
  sprites: CoinBurstSprite[];
  sizes: Float32Array;
  shares: number[];
  lastIn: number;
  endMs: number;
  from: Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const coin: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

registerFloorCrit("cashMagnetCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const half = r.viewportWidth / 2 - EDGE;
    const snaps = planSnaps(
      COINS,
      { left: -half - to.x, right: half - to.x, top: TOP, bottom: BOTTOM },
      1,
      PULL_MS,
      PULL_MS + PULL_FOR_MS,
      CRUST,
    );
    const shares: number[] = [];
    for (let k = 1; k <= SHARES; k++) {
      const at =
        snaps[Math.min(COINS - 1, Math.round((k * COINS) / SHARES) - 1)].landMs;
      shares.push(at);
      hit(0, at);
    }
    const lastIn = snaps[COINS - 1].landMs;
    const endMs = lastIn + COLLAPSE_MS;
    hit(0, endMs, 1);
    states.set(r, {
      snaps,
      sprites: snaps.map((_, i) => ({
        kind: i % 5 === 0 ? "bill" : "coin",
        spinFrame: 0,
        axisAngle: (holeHash(i, 7710) - 0.5) * Math.PI,
      })),
      sizes: Float32Array.from(
        snaps,
        (_, i) => COIN * (0.8 + 0.4 * holeHash(i, 7711)),
      ),
      shares,
      lastIn,
      endMs,
      from: { x: -to.x, y: -to.y },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { snaps, sprites, sizes, lastIn, endMs } = state;
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.translate(to.x, to.y);
    drawDetonation(ctx, state.from, ms - BURST_MS, BURST_BLAST, now);
    // the readout's pull swelling and trembling as it swallows
    const c = clamp01((ms - PULL_MS) / (lastIn - PULL_MS));
    trembleAt(c, ms, TREMBLE, shiver);
    if (ms >= PULL_MS && ms < endMs) drawChargeGlow(ctx, shiver, c, GLOW, now);
    for (let k = 0; k < state.shares.length; k++)
      drawDetonation(ctx, ORIGIN, ms - state.shares[k], POP, now);
    if (ms >= BURST_MS && ms < endMs) {
      const flung = (ms - BURST_MS) / FLING_MS;
      const collapse = clamp01((ms - lastIn) / COLLAPSE_MS) ** 2;
      const base = ctx.getTransform();
      beginCoinBatch(ctx);
      for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i];
        if (flung < 1)
          flingOut(state.from, snap.from, holeHash(i, 7712), flung, coin);
        else {
          snapAt(snap, ms, shiver, sizes[i], coin);
          if (ms >= snap.landMs) {
            coin.x *= 1 - collapse;
            coin.y *= 1 - collapse;
          }
        }
        sprites[i].spinFrame = ms * COIN_SPIN + i;
        drawCoinBurstFrame(ctx, sprites[i], coin.x, coin.y, sizes[i], base);
      }
      endCoinBatch(ctx);
    }
    ctx.restore();
    drawFinale(ctx, to, ms - endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
