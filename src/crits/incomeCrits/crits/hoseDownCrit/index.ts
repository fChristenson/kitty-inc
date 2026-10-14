// Hose Down, an income crit: the green amount drops low under the total and
// shrinks into a wisp that opens up like a hose, firing a river of coins up
// into the readout, a trickle swelling to a torrent; it strafes from side to
// side under the total quicker and quicker, the river sweeping back and
// forth across the readout against it, a pop and a share every few coins
// in; then it dives in after the last of the river in the huge blast
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

// the amount dropping to BELOW under the total, shrinking into the wisp
const DROP_MS = 200;
const BELOW = 620;
// the hose: firing from FIRE_MS for FIRE_MS_LONG, strafing STRAFE px either
// way, SWEEPS sweeps quickening as u^RUSH; the river across READOUT px of the
// readout the other way
const FIRE_MS = DROP_MS + 60;
const HOSE_MS = 1500;
const STRAFE = 270;
const SWEEPS = 4;
const RUSH = 1.7;
const READOUT = 300;
// the river: COINS coins, the gaps closing as sqrt, each flying FLY_MS on an
// arc LIFT px high, a share every SHARE_EVERY in
const COINS = 150;
const FLY_MS = 300;
const LIFT = 140;
const COIN = 28;
const BILL_EVERY = 5;
const COIN_SPIN = 0.02;
const SHARE_EVERY = 15;
const POP = 100;
// diving in after the river
const DIVE_GAP_MS = 40;
const DIVE_MS = 130;
const IN_BLAST = 260;
const WISP: [number, number] = [1.2, 2.2];
// shakes by step: a share, the wisp in, the finale
const SHAKES = [0.5, 1.4, 2.6];

interface Coin {
  firedAt: number;
  // from the total: where it leaves the hose and where it lands
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  sprite: CoinBurstSprite;
}
interface Plan {
  coins: Coin[];
  pops: Point[];
  popAt: number[];
  diveAt: number;
  inMs: number;
  endMs: number;
  hose: (ms: number) => Point | null;
}
const plans = new WeakMap<Running, Plan>();
const spot: Point = { x: 0, y: 0 };
// the total this frame: the hose reads it
let total: Point = { x: 0, y: 0 };

// the hose's sideways sway at ms (-1..1)
const sway = (ms: number) => {
  const u = clamp01((ms - FIRE_MS) / HOSE_MS);
  return Math.sin(Math.PI * 2 * SWEEPS * u ** RUSH);
};

registerFloorCrit("hoseDownCrit", {
  plan(r, _bars, hit) {
    const coins: Coin[] = [];
    for (let i = 0; i < COINS; i++) {
      const firedAt = FIRE_MS + HOSE_MS * Math.sqrt(i / COINS);
      const s = sway(firedAt);
      coins.push({
        firedAt,
        fx: s * STRAFE,
        fy: BELOW,
        tx: -s * READOUT + (holeHash(i, 3510) * 2 - 1) * 30,
        ty: (holeHash(i, 3511) * 2 - 1) * 25,
        sprite: {
          kind: i % BILL_EVERY === 0 ? "bill" : "coin",
          spinFrame: 0,
          axisAngle: (holeHash(i, 3512) - 0.5) * Math.PI,
        },
      });
    }
    const pops: Point[] = [];
    const popAt: number[] = [];
    for (let i = SHARE_EVERY - 1; i < COINS; i += SHARE_EVERY) {
      pops.push({ x: coins[i].tx, y: coins[i].ty });
      popAt.push(coins[i].firedAt + FLY_MS);
      hit(0, coins[i].firedAt + FLY_MS);
    }
    const diveAt = coins[COINS - 1].firedAt + DIVE_GAP_MS;
    const inMs = diveAt + DIVE_MS;
    const endMs = coins[COINS - 1].firedAt + FLY_MS + 60;
    hit(0, inMs, 1);
    hit(0, Math.max(endMs, inMs + 60), 2);
    const at: Point = { x: 0, y: 0 };
    plans.set(r, {
      coins,
      pops,
      popAt,
      diveAt,
      inMs,
      endMs: Math.max(endMs, inMs + 60),
      hose: (ms) => {
        if (ms < DROP_MS || ms > inMs) return null;
        if (ms < diveAt) {
          at.x = total.x + sway(ms) * STRAFE;
          at.y = total.y + BELOW;
          return at;
        }
        const u = ((ms - diveAt) / DIVE_MS) ** 2;
        at.x = total.x + sway(diveAt) * STRAFE * (1 - u);
        at.y = total.y + BELOW * (1 - u);
        return at;
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    total = to;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y + BELOW, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = plan.coins.length - 1; i >= 0; i--) {
      const coin = plan.coins[i];
      const u = (ms - coin.firedAt) / FLY_MS;
      if (u < 0 || u >= 1) continue;
      coin.sprite.spinFrame = ms * COIN_SPIN + i;
      spot.x = to.x + lerp(coin.fx, coin.tx, u);
      spot.y =
        to.y + lerp(coin.fy, coin.ty, u * (2 - u)) - LIFT * 4 * u * (1 - u);
      drawCoinBurstFrame(ctx, coin.sprite, spot.x, spot.y, COIN, base);
    }
    endCoinBatch(ctx);
    const heat = clamp01((ms - FIRE_MS) / HOSE_MS);
    drawWispBetween(
      ctx,
      plan.hose,
      ms,
      now,
      WISP_SIZE * lerp(WISP[0], WISP[1], heat),
      heat,
      DROP_MS,
      plan.inMs,
    );
    for (let k = 0; k < plan.pops.length; k++) {
      spot.x = to.x + plan.pops[k].x;
      spot.y = to.y + plan.pops[k].y;
      drawDetonation(ctx, spot, ms - plan.popAt[k], POP, now);
    }
    drawDetonation(ctx, to, ms - plan.inMs, IN_BLAST, now);
    drawFinale(ctx, to, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
