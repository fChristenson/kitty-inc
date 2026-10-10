// the arc chain income crit: the number bursts into coins hanging in the
// air; a bolt chains from coin to coin, each coin it hits firing a bolt up
// into the total, quicker and quicker; the last fires one giant bolt into
// the middle
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const COINS = 10;
const FLING_MS = 200;
const FIRST_MS = FLING_MS + 80;
const GAP_MS: [number, number] = [110, 50];
const GIANT_DELAY_MS = 90;
const BOLT_MS = 110;
const GIANT_MS = 220;
// how long a coin lingers after it's zapped
const LINGER_MS = 40;
// the coins: either side of the total, from just over the flash's spot up
// to under the total
const NEAR = 120;
const SPREAD = 360;
const LOW = 60;
const HIGH = 260;
const JITTER_Y = 80;
const BOB = 8;
const BOB_RATE = 0.01;
const COIN = 34;
const COIN_SPIN = 0.02;
const LINK = 1;
const UP = 1.2;
const STRIKE = 0.9;
const GIANT = 2.8;
const GIANT_STRIKE = 2.2;
const OPEN_BLAST = 240;
const STRIKE_BLAST = 180;
const ZAP_KICK = 0.4;
// shakes by step: a coin's bolt up, the giant
const SHAKES = [0.7, 2.4];

interface Chain {
  coins: Point[];
  zapAt: number[];
  links: Bolt[];
  ups: Bolt[];
  spots: Point[];
  giant: Bolt;
  giantAt: number;
}
const chains = new WeakMap<Running, Chain>();
const sprites: CoinBurstSprite[] = Array.from({ length: COINS }, (_, i) => ({
  kind: "coin",
  spinFrame: 0,
  axisAngle: (holeHash(i, 201) - 0.5) * Math.PI,
}));
const origin: Point = { x: 0, y: 0 };

function planChain(to: Point): Chain {
  const coins: Point[] = [];
  for (let k = 0; k < COINS; k++)
    coins.push({
      x: to.x + (k % 2 ? 1 : -1) * (NEAR + holeHash(k, 202) * SPREAD),
      y:
        lerp(-LOW, to.y + HIGH, k / (COINS - 1)) +
        (holeHash(k, 203) - 0.5) * JITTER_Y,
    });
  const zapAt = [FIRST_MS];
  for (let k = 1; k < COINS; k++)
    zapAt.push(zapAt[k - 1] + lerp(GAP_MS[0], GAP_MS[1], k / (COINS - 1)));
  const spots = coins.map((_, k) => readoutSpot(to, k, 204));
  return {
    coins,
    zapAt,
    links: coins.map((c, k) =>
      createBolt(k === 0 ? origin : coins[k - 1], c, 1),
    ),
    ups: coins.map((c, k) => createBolt(c, spots[k], 1)),
    spots,
    giant: createBolt(coins[COINS - 1], to, 3),
    giantAt: zapAt[COINS - 1] + GIANT_DELAY_MS,
  };
}

registerFloorCrit("arcChainCrit", {
  plan(r, bars, hit) {
    const chain = planChain(bars[0]);
    chains.set(r, chain);
    for (let k = 0; k < COINS - 1; k++) hit(0, chain.zapAt[k]);
    hit(0, chain.giantAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const chain = chains.get(r);
    if (!chain) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { coins, zapAt, links, ups, spots } = chain;
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms, OPEN_BLAST, now);
    while (r.kicked < COINS && ms >= zapAt[r.kicked]) {
      r.kicked++;
      r.shake(ZAP_KICK);
    }
    const fling = 1 - (1 - clamp01(ms / FLING_MS)) ** 3;
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let k = 0; k < COINS; k++) {
      if (ms >= zapAt[k] + LINGER_MS) continue;
      const sprite = sprites[k];
      sprite.spinFrame = ms * COIN_SPIN + k;
      drawCoinBurstFrame(
        ctx,
        sprite,
        coins[k].x * fling,
        coins[k].y * fling + Math.sin(ms * BOB_RATE + k) * BOB,
        COIN,
        base,
      );
    }
    endCoinBatch(ctx);
    for (let k = 0; k < COINS; k++) {
      const t = ms - zapAt[k];
      if (t >= 0 && t < BOLT_MS) {
        const fade = 1 - t / BOLT_MS;
        drawBolt(ctx, links[k], fade, LINK);
        if (k < COINS - 1) {
          drawBolt(ctx, ups[k], fade, UP);
          drawStrike(ctx, coins[k], fade, STRIKE, now);
        }
      }
      if (k < COINS - 1) drawDetonation(ctx, spots[k], t, STRIKE_BLAST, now);
    }
    const g = ms - chain.giantAt;
    if (g >= 0 && g < GIANT_MS) {
      drawBolt(ctx, chain.giant, 1 - g / GIANT_MS, GIANT);
      drawStrike(ctx, to, 1 - g / GIANT_MS, GIANT_STRIKE, now);
    }
    drawFinale(ctx, to, g, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
