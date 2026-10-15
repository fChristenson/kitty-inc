// Old Faithful, a rate crit: under every bar's readout the ground starts to
// rumble, a glow swelling and coins spitting up in little hops, quicker and
// higher; then a geyser of coins and bills erupts straight up through the
// readout, hundreds of them shooting high and raining back down, a blast and
// the readout turning over; bar after bar up the building, quicker each, its
// own last and biggest: every bar gushes, running much faster for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
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
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// each geyser's vent DOWN px under its readout (READOUT of a bar's half
// width out); building BUILD_MS (quicker each, its own OWN_BUILD_MS), the
// next starting STAGGER_MS on
const READOUT = 0.6;
const DOWN = 70;
const BUILD_MS: [number, number] = [380, 240];
const OWN_BUILD_MS = 440;
const STAGGER_MS: [number, number] = [140, 70];
// gravity px/ms²; the trickle's hops launched at HOP px/ms up (rising), the
// jet's at JET px/ms over JET_MS, SWAY px/ms sideways
const G = 0.012;
const TRICKLE = 14;
const HOP: [number, number] = [0.9, 1.9];
const JET_COINS = 50;
const OWN_JET_COINS = 90;
const JET: [number, number] = [3.3, 4.4];
const JET_MS = 200;
const SWAY = 0.5;
const COIN = 22;
const COIN_SPIN = 0.03;
const GLOW = 130;
const OWN_GLOW = 200;
const BLAST = 160;
const OWN_BLAST = 380;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.2, 3];

interface Geyser {
  bar: number;
  own: boolean;
  start: number;
  erupt: number;
  // its readout and vent, live
  readout: Point;
  vent: Point;
}
interface Coin {
  geyser: number;
  launch: number;
  vx: number;
  vy: number;
  size: number;
  sprite: CoinBurstSprite;
}
interface State {
  geysers: Geyser[];
  coins: Coin[];
}
const states = new WeakMap<Running, State>();

// a gushing bar: speed times as fast till then
const gushes = defineBarEffect<number>({
  speed: () => meta.values.speed,
  ended: (until, now) => now >= until,
});

registerFloorCrit("oldFaithfulCrit", {
  reward(t) {
    t.flipRate();
    gushes.set(t.floor, t.now + (t.own ? meta.values.ownMs : meta.values.ms));
    t.punch(`x${meta.values.speed} Gush`);
  },
  plan(r, bars, hit) {
    // up the building, its own last
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((a, b) => bars[b].y - bars[a].y);
    order.push(0);
    const geysers: Geyser[] = [];
    const coins: Coin[] = [];
    let t = IN_MS;
    let n = 0;
    const coin = (geyser: number, launch: number, vx: number, vy: number) => {
      coins.push({
        geyser,
        launch,
        vx,
        vy,
        size: COIN * lerp(0.8, 1.2, holeHash(n, 9120)),
        sprite: {
          kind: n % 5 === 0 ? "bill" : "coin",
          spinFrame: 0,
          axisAngle: (holeHash(n, 9121) - 0.5) * Math.PI,
        },
      });
      n++;
    };
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const erupt = t + (own ? OWN_BUILD_MS : lerp(BUILD_MS[0], BUILD_MS[1], u));
      // the trickle spitting up quicker and higher, then the jet
      for (let i = 0; i < TRICKLE; i++) {
        const v = (i + 1) / TRICKLE;
        coin(k, t + (erupt - t) * Math.sqrt(v) * 0.9, (holeHash(n, 9122) - 0.5) * SWAY, lerp(HOP[0], HOP[1], v));
      }
      const jet = own ? OWN_JET_COINS : JET_COINS;
      for (let i = 0; i < jet; i++)
        coin(
          k,
          erupt + (i / jet) * JET_MS,
          (holeHash(n, 9123) * 2 - 1) * SWAY,
          lerp(JET[0], JET[1], holeHash(n, 9124)) * (own ? 1.15 : 1),
        );
      geysers.push({ bar, own, start: t, erupt, readout: { x: 0, y: 0 }, vent: { x: 0, y: 0 } });
      hit(bar, erupt, own ? 2 : 1);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], u);
    });
    states.set(r, { geysers, coins });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const { geysers, coins } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.5 * (ms / IN_MS)), {
        alpha: 1 - ms / IN_MS,
      });
    for (let k = 0; k < geysers.length; k++) {
      const g = geysers[k];
      const bar = bars[g.bar];
      g.readout.x = g.vent.x = bar.x + half * READOUT;
      g.readout.y = bar.y;
      g.vent.y = bar.y + DOWN;
      // the vent's glow swelling as it builds
      if (ms >= g.start && ms < g.erupt)
        drawChargeGlow(ctx, g.vent, clamp01((ms - g.start) / (g.erupt - g.start)), g.own ? OWN_GLOW : GLOW, now);
      drawDetonation(ctx, g.readout, ms - g.erupt, g.own ? OWN_BLAST : BLAST, now);
    }
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      const t = ms - c.launch;
      if (t < 0 || t >= (2 * c.vy) / G) continue;
      const vent = geysers[c.geyser].vent;
      c.sprite.spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(ctx, c.sprite, vent.x + c.vx * t, vent.y - c.vy * t + (G * t * t) / 2, c.size, base);
    }
    endCoinBatch(ctx);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
import type { CritMeta } from "../../../critKit/meta";

// a geyser of coins rumbling up under every readout and erupting through it:
// every bar gushes, running much faster for a few seconds
export default {
  label: "Old Faithful",
  chance: 0.03,
  style: "money",
  // how many times as fast a bar runs, for how long (ms; its own ownMs)
  values: { speed: 4, ms: 10_000, ownMs: 20_000 },
  isNew: true,
} satisfies CritMeta;
