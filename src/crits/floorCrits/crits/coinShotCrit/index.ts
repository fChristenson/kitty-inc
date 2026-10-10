// the coin shot floor crit: the number flips a handful of gold coins up over
// the bars in view and turns into a gun at the side; one shot hits a coin,
// which pings and ricochets the shot on into the next coin and down onto two
// bars in blasts, coin to coin, quicker and quicker; the last coin bends it
// into its own bar in a fat beam and a huge blast
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const CS_IN_MS = 220;
const CS_COINS = 8;
// the coins flipped up from the middle, hanging between the bars
const CS_FLIP_FROM_MS = CS_IN_MS / 2;
const CS_FLIP_MS = 220;
const CS_FLIP_LIFT = 220;
const CS_COIN = 40;
const CS_SPIN = 0.02;
const CS_COIN_REACH = 0.8;
const CS_COIN_JITTER = 60;
// a lone bar's coins hang this far over it
const CS_LONE_ABOVE = 160;
// the shot: off the gun, then coin to coin, quicker and quicker
const CS_SHOT_MS = CS_IN_MS + CS_FLIP_MS + 40;
const CS_GAP_MS: [number, number] = [110, 50];
const CS_GUN_X = -0.44;
const CS_GUN_DOWN = 100;
const CS_GUN = 1;
const CS_MUZZLE_MS = 120;
const CS_MUZZLE = 320;
const CS_KICK = 0.8;
const CS_PING_KICK = 0.3;
// its beams, each fading over CS_BEAM_MS, and the last fat one into its bar
const CS_BEAM_MS = 140;
const CS_CHAIN = 26;
const CS_RICOCHET = 22;
const CS_FAT_MS = 260;
const CS_FAT = 70;
const CS_FLARE = 70;
const CS_FLARE_MS = 160;
const CS_POP = 80;
const CS_HIT_MS = 20;
const CS_BLAST = 160;
const CS_BOOM_MS = 30;
const CS_BOOM = 440;
const CS_CLUSTER = [-0.5, 0.5, -1, 1];
const CS_CLUSTER_MS = 45;
const CS_CLUSTER_BLAST = 170;
const CS_KICKED_BOOM = 1e6;
// shakes by step: a blast, the huge one
const CS_SHAKES = [0.5, 3];
const CS_TAIL_MS = 1000;

interface Coin {
  // the bars over and under it, and how far between them
  above: number;
  below: number;
  side: number;
  dy: number;
  at: number;
  // the bars it ricochets onto, and where along each
  shots: { bar: number; side: number }[];
  sprite: CoinBurstSprite;
  // where it hangs this frame
  spot: Point;
}
interface Chain {
  coins: Coin[];
  boom: number;
}
const chains = new WeakMap<Running, Chain>();

function planChain(bars: Point[]): Chain {
  const order = byHeight(bars);
  const gaps =
    order.length > 1
      ? order.slice(1).map((below, i) => [order[i], below])
      : [[order[0], order[0]]];
  let clock = CS_SHOT_MS;
  const coins = Array.from({ length: CS_COINS }, (_, k): Coin => {
    const [above, below] = gaps[Math.floor((k * gaps.length) / CS_COINS)];
    const at = clock;
    clock += lerp(...CS_GAP_MS, k / (CS_COINS - 1));
    const last = k === CS_COINS - 1;
    const targets = above === below ? [above] : [above, below];
    return {
      above,
      below,
      side: (holeHash(k, 980) * 2 - 1) * CS_COIN_REACH,
      dy: (holeHash(k, 981) - 0.5) * CS_COIN_JITTER,
      at,
      shots: last
        ? []
        : targets.map((bar, j) => ({
            bar,
            side: (holeHash(k * 2 + j, 982) * 2 - 1) * 0.85,
          })),
      sprite: { kind: "coin", spinFrame: 0, axisAngle: 0 },
      spot: { x: 0, y: 0 },
    };
  });
  return { coins, boom: coins[CS_COINS - 1].at + CS_BOOM_MS };
}

const placeCoin = (r: Running, bars: Point[], c: Coin): void => {
  const a = along(r, bars, c.above, c.side);
  const y =
    c.above === c.below
      ? a.y - CS_LONE_ABOVE
      : (bars[c.above].y + bars[c.below].y) / 2;
  c.spot.x = a.x;
  c.spot.y = y + c.dy;
};

const fade = (t: number, ms: number) => (t >= 0 && t < ms ? 1 - t / ms : 0);

registerFloorCrit("coinShotCrit", {
  plan(r, bars, hit) {
    const chain = planChain(bars);
    chains.set(r, chain);
    for (const c of chain.coins)
      for (const s of c.shots) hit(s.bar, c.at + CS_HIT_MS, 0);
    hit(0, chain.boom, 1);
    CS_CLUSTER.forEach((_, k) =>
      hit(0, chain.boom + (k + 1) * CS_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const chain = chains.get(r);
    if (!chain) return;
    const now = r.startedAt + ms;
    const { coins, boom } = chain;
    const gun = {
      x: r.viewportWidth * CS_GUN_X,
      y: bars.reduce((sum, b) => sum + b.y, 0) / bars.length + CS_GUN_DOWN,
    };
    if (ms < CS_IN_MS) {
      const p = (ms / CS_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        gun.x * p,
        gun.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // the gun's kick, a jolt at every ping, then the huge one's bang
    if (r.kicked === 0 && ms >= CS_SHOT_MS) {
      r.shake(CS_KICK);
      r.kicked = 1;
    }
    while (
      r.kicked >= 1 &&
      r.kicked <= CS_COINS &&
      coins[r.kicked - 1].at <= ms
    ) {
      r.shake(CS_PING_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < CS_KICKED_BOOM) {
      r.kicked = CS_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= CS_IN_MS && ms < boom)
      drawWisp(ctx, () => gun, ms, now, WISP_SIZE * CS_GUN);
    for (const c of coins) placeCoin(r, bars, c);
    const first = coins[0].spot;
    drawMuzzleFlash(
      ctx,
      gun,
      Math.atan2(first.y - gun.y, first.x - gun.x),
      (ms - CS_SHOT_MS) / CS_MUZZLE_MS,
      CS_MUZZLE,
    );
    for (let k = 0; k < CS_COINS; k++) {
      const c = coins[k];
      const chained = fade(ms - c.at, CS_BEAM_MS);
      if (chained <= 0) continue;
      drawBeam(ctx, k ? coins[k - 1].spot : gun, c.spot, CS_CHAIN, chained);
      for (const s of c.shots)
        drawBeam(
          ctx,
          c.spot,
          along(r, bars, s.bar, s.side),
          CS_RICOCHET,
          chained,
        );
    }
    const last = coins[CS_COINS - 1];
    const fat = fade(ms - last.at, CS_FAT_MS);
    if (fat > 0) drawBeam(ctx, last.spot, bars[0], CS_FAT, fat);

    // the coins flipping up and hanging, spinning, until shot
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let k = 0; k < CS_COINS; k++) {
      const c = coins[k];
      if (ms >= c.at) continue;
      const p = clamp01((ms - CS_FLIP_FROM_MS) / CS_FLIP_MS);
      if (p <= 0) continue;
      const to = c.spot;
      const e = p * p * (3 - 2 * p);
      const lift = 4 * e * (1 - e) * CS_FLIP_LIFT;
      c.sprite.spinFrame = ms * CS_SPIN + k;
      drawCoinBurstFrame(
        ctx,
        c.sprite,
        to.x * e,
        to.y * e - lift,
        CS_COIN,
        base,
      );
    }
    endCoinBatch(ctx);

    for (const c of coins) {
      const flare = fade(ms - c.at, CS_FLARE_MS);
      if (flare > 0) drawBeamFlare(ctx, c.spot, CS_FLARE, flare, now);
      drawDetonation(ctx, c.spot, ms - c.at, CS_POP, now);
      for (const s of c.shots)
        drawDetonation(
          ctx,
          along(r, bars, s.bar, s.side),
          ms - c.at - CS_HIT_MS,
          CS_BLAST,
          now,
        );
    }
    drawDetonation(ctx, bars[0], ms - boom, CS_BOOM, now);
    for (let k = 0; k < CS_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, CS_CLUSTER[k]),
        ms - boom - (k + 1) * CS_CLUSTER_MS,
        CS_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: CS_TAIL_MS,
  shake: (step) => CS_SHAKES[step] ?? CS_SHAKES[0],
});
