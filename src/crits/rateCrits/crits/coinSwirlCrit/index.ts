// Coin Swirl, a rate crit: round every bar's readout coins and bills come
// sweeping in from all sides and swirl down into it like water down a
// plughole, a few then a flood, faster and tighter, the readout's glow
// swelling and trembling; it swallows the last and bursts in a blast,
// turning over; readout after readout, quicker each, its own last and
// biggest: every bar pays more and more for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
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
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// a swirl: COINS coins (its own OWN_COINS) from REACH px out, each spiralling
// in SPIN rad over SWIRL_MS, launched over FILL_MS (quicker each, its own
// OWN_FILL_MS) a trickle then a flood; the next STAGGER_MS on (closing)
const READOUT = 0.6;
const COINS = 46;
const OWN_COINS = 90;
const REACH: [number, number] = [260, 480];
const SQUASH = 0.55;
const SPIN = 7;
const SWIRL_MS = 260;
const FILL_MS: [number, number] = [420, 260];
const OWN_FILL_MS = 520;
const STAGGER_MS: [number, number] = [150, 70];
const COIN = 26;
const COIN_SPIN = 0.03;
const GLOW = 180;
const OWN_GLOW = 280;
const TREMBLE = 10;
const BLAST = 170;
const OWN_BLAST = 420;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.1, 3];

interface Swirl {
  bar: number;
  own: boolean;
  start: number;
  done: number;
  // live: its readout
  at: Point;
}
interface State {
  swirls: Swirl[];
  // each coin's swirl, when it launches, its angle and reach
  swirlOf: Uint8Array;
  launches: Float32Array;
  angles: Float32Array;
  reach: Float32Array;
  sprites: CoinBurstSprite[];
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };

// a swirling bar: from `from` it pays more and more, up to payout times as
// much at `until`, then back to normal
const swirls = defineBarEffect<{ from: number; until: number }>({
  payout: (s, now) =>
    1 + (meta.values.payout - 1) * clamp01((now - s.from) / (s.until - s.from)),
  ended: (s, now) => now >= s.until,
});

registerFloorCrit("coinSwirlCrit", {
  reward(t) {
    t.flipRate();
    swirls.set(t.floor, {
      from: t.now,
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
    });
    t.punch(`Up to x${meta.values.payout} Pay`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const list: Swirl[] = [];
    const swirlOf: number[] = [];
    const launches: number[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const fill = own ? OWN_FILL_MS : lerp(FILL_MS[0], FILL_MS[1], u);
      const count = own ? OWN_COINS : COINS;
      for (let i = 0; i < count; i++) {
        swirlOf.push(k);
        // a trickle, then a flood
        launches.push(t + fill * Math.sqrt(i / count));
      }
      const done = t + fill + SWIRL_MS;
      list.push({ bar, own, start: t, done, at: { x: 0, y: 0 } });
      hit(bar, done, own ? 2 : 1);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], u);
    });
    const n = launches.length;
    states.set(r, {
      swirls: list,
      swirlOf: Uint8Array.from(swirlOf),
      launches: Float32Array.from(launches),
      angles: Float32Array.from(
        { length: n },
        (_, i) => holeHash(i, 8410) * Math.PI * 2,
      ),
      reach: Float32Array.from({ length: n }, (_, i) =>
        lerp(REACH[0], REACH[1], holeHash(i, 8411)),
      ),
      sprites: Array.from({ length: n }, (_, i) => ({
        kind: i % 5 === 0 ? "bill" : "coin",
        spinFrame: 0,
        axisAngle: (holeHash(i, 8412) - 0.5) * Math.PI,
      })),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const { swirls: list, swirlOf, launches, angles, reach, sprites } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.5 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    for (const s of list) {
      const bar = bars[s.bar];
      s.at.x = bar.x + half * READOUT;
      s.at.y = bar.y;
      // the readout's glow swelling and trembling as it swallows
      if (ms >= s.start && ms < s.done) {
        const c = clamp01((ms - s.start) / (s.done - s.start));
        trembleAt(c, ms, TREMBLE, shiver);
        shiver.x += s.at.x;
        shiver.y += s.at.y;
        drawChargeGlow(ctx, shiver, c, s.own ? OWN_GLOW : GLOW, now);
      }
      drawDetonation(ctx, s.at, ms - s.done, s.own ? OWN_BLAST : BLAST, now);
    }
    const transform = ctx.getTransform();
    beginCoinBatch(ctx);
    for (let i = 0; i < launches.length; i++) {
      const u = (ms - launches[i]) / SWIRL_MS;
      if (u < 0 || u >= 1) continue;
      const s = list[swirlOf[i]];
      // spiralling in, faster and tighter
      const r0 = reach[i] * (1 - u) ** 1.3;
      const a = angles[i] + SPIN * u * u;
      sprites[i].spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(
        ctx,
        sprites[i],
        s.at.x + Math.cos(a) * r0,
        s.at.y + Math.sin(a) * r0 * SQUASH,
        COIN,
        transform,
      );
    }
    endCoinBatch(ctx);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
