// Brim Over, a button crit: a river of coins pours out of the sky onto the
// top button in view, pooling on it in a swelling glow until it brims over
// and the river spills off its edge down onto the next button, and the next,
// down the building, each pour thicker and quicker, every button landing a
// blast as it fills and turning over: each of its next taps also pays out
// the top floor; then a torrent crashes straight down onto its own button
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
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
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the river out of the sky: from SKY px over the first button, and over its
// own for the torrent
const SKY = 1000;
const SKY_X = -0.25;
// each pour POUR_MS long and COINS_PER_MS thick (quicker and thicker each),
// the next spilling over once BRIM of it has landed
const POUR_MS: [number, number] = [420, 220];
const COINS_PER_MS: [number, number] = [0.07, 0.17];
const BRIM = 0.6;
// the torrent onto its own: TORRENT_MS of TORRENT_PER_MS, TORRENT_GAP_MS on
const TORRENT_MS = 360;
const TORRENT_PER_MS = 0.26;
const TORRENT_GAP_MS = 60;
// the coins land within LAND of the button's width, spill off EDGE of it
const LAND = 0.38;
const EDGE = 0.45;
const JITTER = 26;
// gravity, px/ms²
const G = 0.006;
const COIN = 22;
const COIN_SPIN = 0.025;
const GLOW = 220;
const OWN_GLOW = 300;
const FULL_BLAST = 170;
const OWN_BLAST = 340;
// shakes by step: the first coins in, a button full, its own
const SHAKES = [0.4, 1.1, 2.8];

interface Coin {
  bar: number;
  launchMs: number;
  landMs: number;
  // from the button it lands on: where it's dropped from, its drift
  fx: number;
  fy: number;
  vx: number;
  size: number;
  sprite: CoinBurstSprite;
}
interface Pour {
  bar: number;
  firstMs: number;
  fullMs: number;
}
interface State {
  coins: Coin[];
  pours: Pour[];
}
const states = new WeakMap<Running, State>();
const top: Point = { x: 0, y: 0 };

// the top floor that's open
function topFloor<T extends { unlocked: boolean }>(floors: T[]): T | null {
  for (let i = floors.length - 1; i >= 0; i--)
    if (floors[i].unlocked) return floors[i];
  return null;
}

// each tap also paying out the top floor
const pourTaps = defineTapPerk("Pour", (t) => {
  const floor = topFloor(t.floors);
  if (floor) t.payout(floor, 1);
});

registerFloorCrit("brimOverCrit", {
  reward(t) {
    pourTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars).slice(0, -1);
    const coins: Coin[] = [];
    const pours: Pour[] = [];
    let k = 0;
    // a stream from (fx, fy) off the button, `ms` long from `start`
    const pour = (
      bar: number,
      fx: number,
      fy: number,
      start: number,
      ms: number,
      perMs: number,
    ): Pour => {
      const fall = -BTN_H / 2 - fy;
      const flight = Math.sqrt((2 * Math.max(1, fall)) / G);
      const n = Math.max(1, Math.round(ms * perMs));
      for (let i = 0; i < n; i++, k++) {
        const tx = (holeHash(k, 2810) * 2 - 1) * LAND * BTN_W;
        const x0 = fx + (holeHash(k, 2811) * 2 - 1) * JITTER;
        const launchMs = start + (i / n) * ms;
        coins.push({
          bar,
          launchMs,
          landMs: launchMs + flight,
          fx: x0,
          fy,
          vx: (tx - x0) / flight,
          size: COIN * lerp(0.8, 1.2, holeHash(k, 2812)),
          sprite: {
            kind: k % 6 === 0 ? "bill" : "coin",
            spinFrame: 0,
            axisAngle: (holeHash(k, 2813) - 0.5) * Math.PI,
          },
        });
      }
      return { bar, firstMs: start + flight, fullMs: start + ms + flight };
    };
    let t = IN_MS;
    order.forEach((bar, j) => {
      const u = j / Math.max(1, order.length - 1);
      const ms = lerp(POUR_MS[0], POUR_MS[1], u);
      const prev = order[j - 1];
      // out of the sky, or spilling off the edge of the button above
      const fx =
        prev === undefined
          ? SKY_X * BTN_W
          : bars[prev].x - bars[bar].x + EDGE * BTN_W;
      const fy =
        prev === undefined ? -SKY : bars[prev].y - bars[bar].y - BTN_H / 2;
      const p = pour(
        bar,
        fx,
        fy,
        t,
        ms,
        lerp(COINS_PER_MS[0], COINS_PER_MS[1], u),
      );
      pours.push(p);
      hit(bar, p.firstMs, 0);
      hit(bar, p.fullMs, 1);
      t = p.firstMs + ms * BRIM;
    });
    const torrent = pour(
      0,
      0,
      -SKY,
      order.length ? t + TORRENT_GAP_MS : IN_MS,
      TORRENT_MS,
      TORRENT_PER_MS,
    );
    pours.push(torrent);
    hit(0, torrent.firstMs, 0);
    hit(0, torrent.fullMs, 2);
    states.set(r, { coins, pours });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // each button's pool glowing as it fills, then its blast once full
    for (const p of state.pours) {
      const b = bars[p.bar];
      top.x = b.x;
      top.y = b.y - BTN_H / 2;
      const own = p.bar === 0;
      if (ms >= p.firstMs && ms < p.fullMs)
        drawChargeGlow(
          ctx,
          top,
          clamp01((ms - p.firstMs) / (p.fullMs - p.firstMs)),
          own ? OWN_GLOW : GLOW,
          now,
        );
      drawDetonation(
        ctx,
        top,
        ms - p.fullMs,
        own ? OWN_BLAST : FULL_BLAST,
        now,
      );
    }
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    const { coins } = state;
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      if (ms < coin.launchMs || ms >= coin.landMs) continue;
      const t = ms - coin.launchMs;
      const button = bars[coin.bar];
      coin.sprite.spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(
        ctx,
        coin.sprite,
        button.x + coin.fx + coin.vx * t,
        button.y + coin.fy + (G * t * t) / 2,
        coin.size,
        base,
      );
    }
    endCoinBatch(ctx);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
