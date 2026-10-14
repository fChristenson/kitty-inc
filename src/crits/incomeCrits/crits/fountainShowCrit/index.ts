// Fountain Show, an income crit: the green amount arcs down under the total
// and bursts into a row of five coin fountains; like a fountain show they
// jet arcs of coins up onto the readout in a wave left to right, crossing
// over, then quicker back right to left, a pop on the total as each lands;
// then every jet fires at once, all of them bending into one geyser of
// coins that pours into the middle of the total and bursts across it
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  registerFloorCrit,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

// the amount arcing down to the fountains' row, BASIN under the total
const DOWN_MS = 200;
const BASIN = 620;
const ARCH = 220;
const OPEN_BLAST = 130;
// the five nozzles GAP apart; each jet pours COINS over EMIT_MS, each coin
// flying FLIGHT_MS on an arc ARC over the total onto its spot on it
const NOZZLES = 5;
const GAP = 170;
const COINS = 36;
const EMIT_MS = 180;
const FLIGHT_MS = 320;
const ARC = 150;
const SPREAD = 26;
const COIN = 24;
const COIN_SPIN = 0.02;
// the first wave left to right, a jet every WAVE_GAPS[0] ms, crossing over
// onto the far side of the total; the second back, quicker, straight up
const FIRST_MS = DOWN_MS + 120;
const WAVE_GAPS = [100, 60];
const WAVE_PAUSE_MS = 60;
const SPOT_GAP = 140;
const POP_BLAST = 110;
// the finale: every jet at once, FINALE_COINS each over FINALE_EMIT_MS, all
// onto the middle
const FINALE_PAUSE_MS = 120;
const FINALE_COINS = 70;
const FINALE_EMIT_MS = 280;
const FINALE_COIN = 30;
const IN_BLAST = 220;
// shakes by step: a jet landing, the geyser in, the last blast
const SHAKES = [0.5, 1.4, 2.6];

interface Jet {
  nozzle: number;
  // its spot on the total, from the total's middle
  spot: number;
  startMs: number;
  emitMs: number;
  coins: number;
  size: number;
}
// one coin: its jet and when it leaves its nozzle
interface Coin {
  jet: Jet;
  bornMs: number;
  wobble: number;
  sprite: CoinBurstSprite;
}
interface Show {
  jets: Jet[];
  coins: Coin[];
  finaleMs: number;
  endMs: number;
}

// the wave jets first, then the finale's
function planShow(): Show {
  const jets: Jet[] = [];
  let t = FIRST_MS;
  const add = (nozzle: number, spot: number, finale: boolean) =>
    jets.push({
      nozzle,
      spot,
      startMs: t,
      emitMs: finale ? FINALE_EMIT_MS : EMIT_MS,
      coins: finale ? FINALE_COINS : COINS,
      size: finale ? FINALE_COIN : COIN,
    });
  for (let k = 0; k < NOZZLES; k++, t += WAVE_GAPS[0])
    add(k, (NOZZLES - 1) / 2 - k, false);
  t += WAVE_PAUSE_MS;
  for (let k = NOZZLES - 1; k >= 0; k--, t += WAVE_GAPS[1])
    add(k, k - (NOZZLES - 1) / 2, false);
  t += FINALE_PAUSE_MS;
  const finaleMs = t;
  for (let k = 0; k < NOZZLES; k++) add(k, 0, true);
  const coins: Coin[] = [];
  for (const jet of jets)
    for (let i = 0; i < jet.coins; i++) {
      const k = coins.length;
      coins.push({
        jet,
        bornMs: jet.startMs + (i / jet.coins) * jet.emitMs,
        wobble: (holeHash(k, 2011) - 0.5) * SPREAD,
        sprite: {
          kind: k % 5 === 0 ? "bill" : "coin",
          spinFrame: 0,
          axisAngle: (holeHash(k, 2010) - 0.5) * Math.PI,
        },
      });
    }
  return {
    jets,
    coins,
    finaleMs,
    endMs: finaleMs + FINALE_EMIT_MS + FLIGHT_MS,
  };
}

const SHOW = planShow();
const shows = new WeakSet<Running>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("fountainShowCrit", {
  plan(r, _bars, hit) {
    shows.add(r);
    const waves = SHOW.jets.filter((jet) => jet.startMs < SHOW.finaleMs);
    for (const jet of waves) hit(0, jet.startMs + FLIGHT_MS);
    hit(0, SHOW.finaleMs + FLIGHT_MS, 1);
    hit(0, SHOW.endMs, 2);
  },
  draw(ctx, r, ms, bars) {
    if (!shows.has(r)) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const by = to.y + BASIN;

    if (ms < DOWN_MS) {
      const p = (ms / DOWN_MS) ** 2;
      const cx = to.x / 2 - ARCH;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        2 * (1 - p) * p * cx + p * p * to.x,
        2 * (1 - p) * p * (by / 2) + p * p * by,
        r.flashFont,
      );
    }
    spot.x = to.x;
    spot.y = by;
    drawDetonation(ctx, spot, ms - DOWN_MS, OPEN_BLAST, now);
    // the pops on the total under the streams pouring into it
    for (const jet of SHOW.jets) {
      if (jet.startMs >= SHOW.finaleMs) break;
      spot.x = to.x + jet.spot * SPOT_GAP;
      spot.y = to.y;
      drawDetonation(ctx, spot, ms - jet.startMs - FLIGHT_MS, POP_BLAST, now);
    }
    drawDetonation(ctx, to, ms - SHOW.finaleMs - FLIGHT_MS, IN_BLAST, now);

    if (ms >= FIRST_MS && ms < SHOW.endMs) {
      const base = ctx.getTransform();
      const cy = to.y - ARC * 2;
      beginCoinBatch(ctx);
      for (let k = 0; k < SHOW.coins.length; k++) {
        const coin = SHOW.coins[k];
        const u = (ms - coin.bornMs) / FLIGHT_MS;
        if (u < 0 || u >= 1) continue;
        const { jet } = coin;
        const fx = to.x + (jet.nozzle - (NOZZLES - 1) / 2) * GAP;
        const tx = to.x + jet.spot * SPOT_GAP;
        const cx = (fx + tx) / 2;
        const v = 1 - u;
        coin.sprite.spinFrame = ms * COIN_SPIN + k;
        drawCoinBurstFrame(
          ctx,
          coin.sprite,
          v * v * fx + 2 * v * u * cx + u * u * tx + coin.wobble * u,
          v * v * by + 2 * v * u * cy + u * u * to.y,
          jet.size,
          base,
        );
      }
      endCoinBatch(ctx);
    }
    drawFinale(ctx, to, ms - SHOW.endMs, now);
  },
  tailMs: DETONATION_MS + 200,
  shake: (step) => SHAKES[step],
});
