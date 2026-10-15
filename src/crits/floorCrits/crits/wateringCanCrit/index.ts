// Watering Can, a floor crit: the number bursts into a wisp that tears
// along just over the top bar pouring a river of coins and bills down onto
// it, the bar glowing as it fills, then dives down onto the next and sweeps
// back the other way, and the next, quicker each and the river thicker, a
// blast and levels on every bar as its river lands; its own bar last, a
// torrent and the biggest blast
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 130;
// the wisp HOVER px over a bar, from END of its half width to the other end
// over SWEEP_MS (quicker each, its own OWN_SWEEP_MS), diving DIVE_MS onto the
// next, tearing in from IN_FROM px off to the side
const HOVER = 190;
const END = 0.95;
const SWEEP_MS: [number, number] = [200, 130];
const OWN_SWEEP_MS = 240;
const DIVE_MS = 90;
const IN_FROM = 420;
const WISP = WISP_SIZE * 1.4;
// the river: COINS_PER_MS (thicker each, its own OWN_PER_MS) thrown down at
// THROW px/ms under gravity G px/ms², SPRAY px/ms either way
const COINS_PER_MS: [number, number] = [0.16, 0.3];
const OWN_PER_MS = 0.5;
const THROW = 0.6;
const G = 0.012;
const SPRAY = 0.25;
const COIN = 20;
const COIN_SPIN = 0.03;
const GLOW = 200;
const OWN_GLOW = 280;
const BLAST = 170;
const OWN_BLAST = 400;
// shakes by step: a bar, its own
const SHAKES = [0.9, 2.8];

interface Pour {
  bar: number;
  own: boolean;
  start: number;
  end: number;
  landed: number;
}
interface Coin {
  pour: number;
  launch: number;
  // from bars[0]: where it's thrown from, its drift
  x: number;
  y: number;
  vx: number;
  fall: number;
  size: number;
  sprite: CoinBurstSprite;
}
interface State {
  pours: Pour[];
  coins: Coin[];
  wisp: (ms: number) => Point | null;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("wateringCanCrit", {
  plan(r, bars, hit) {
    const base = bars[0];
    const half = r.play.barHalfWidth * END;
    const order = ownLast(bars);
    const legs: { a: Point; b: Point; t0: number; t1: number }[] = [];
    const pours: Pour[] = [];
    const coins: Coin[] = [];
    // the drop from the wisp to the bar's top, and how long a coin takes
    const drop = HOVER - BAR_HALF_H;
    const fall = (-THROW + Math.sqrt(THROW * THROW + 2 * G * drop)) / G;
    let t = IN_MS;
    let n = 0;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const dir = k % 2 ? -1 : 1;
      const y = bars[bar].y - base.y - HOVER;
      const x = bars[bar].x - base.x;
      const a = { x: x - dir * half, y };
      const b = { x: x + dir * half, y };
      const prev = legs[legs.length - 1];
      legs.push({ a: prev ? prev.b : { x: a.x - dir * IN_FROM, y: a.y - IN_FROM / 2 }, b: a, t0: t, t1: t + DIVE_MS });
      t += DIVE_MS;
      const ms = own ? OWN_SWEEP_MS : lerp(SWEEP_MS[0], SWEEP_MS[1], k / Math.max(1, order.length - 2));
      legs.push({ a, b, t0: t, t1: t + ms });
      const perMs = own ? OWN_PER_MS : lerp(COINS_PER_MS[0], COINS_PER_MS[1], k / Math.max(1, order.length - 2));
      const count = Math.round(ms * perMs);
      for (let i = 0; i < count; i++, n++) {
        const u = i / count;
        coins.push({
          pour: k,
          launch: t + u * ms,
          x: lerp(a.x, b.x, u),
          y,
          vx: (holeHash(n, 6510) * 2 - 1) * SPRAY,
          fall,
          size: COIN * lerp(0.8, 1.2, holeHash(n, 6511)),
          sprite: {
            kind: n % 5 === 0 ? "bill" : "coin",
            spinFrame: 0,
            axisAngle: (holeHash(n, 6512) - 0.5) * Math.PI,
          },
        });
      }
      const landed = t + ms + fall;
      pours.push({ bar, own, start: t, end: t + ms, landed });
      hit(bar, landed, own ? 1 : 0);
      t += ms;
    });
    const offset: Point = { x: 0, y: 0 };
    const head: Point = { x: 0, y: 0 };
    const first = legs[0].t0;
    const last = legs[legs.length - 1].t1;
    states.set(r, {
      pours,
      coins,
      offset,
      wisp: (ms) => {
        if (ms < first || ms > last) return null;
        let k = 0;
        while (k < legs.length - 1 && ms > legs[k].t1) k++;
        const leg = legs[k];
        const u = clamp01((ms - leg.t0) / (leg.t1 - leg.t0));
        head.x = offset.x + lerp(leg.a.x, leg.b.x, u);
        head.y = offset.y + lerp(leg.a.y, leg.b.y, u);
        return head;
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    state.offset.x = base.x;
    state.offset.y = base.y;
    const { pours, coins } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.4 * (ms / IN_MS)), {
        alpha: 1 - ms / IN_MS,
      });
    // a whoosh as it tears into each bar
    while (r.kicked < pours.length && ms >= pours[r.kicked].start) {
      playSwoosh();
      r.kicked++;
    }
    for (let k = 0; k < pours.length; k++) {
      const p = pours[k];
      const bar = bars[p.bar];
      spot.x = bar.x;
      spot.y = bar.y;
      if (ms >= p.start && ms < p.landed)
        drawChargeGlow(ctx, spot, clamp01((ms - p.start) / (p.landed - p.start)), p.own ? OWN_GLOW : GLOW, now);
      drawDetonation(ctx, spot, ms - p.landed, p.own ? OWN_BLAST : BLAST, now);
    }
    const transform = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      const t = ms - c.launch;
      if (t < 0 || t >= c.fall) continue;
      c.sprite.spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(
        ctx,
        c.sprite,
        base.x + c.x + c.vx * t,
        base.y + c.y + THROW * t + (G * t * t) / 2,
        c.size,
        transform,
      );
    }
    endCoinBatch(ctx);
    const last = pours[pours.length - 1];
    if (ms <= last.end) drawWisp(ctx, state.wisp, ms, now, WISP, Math.min(1, (r.kicked + 1) / pours.length));
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
