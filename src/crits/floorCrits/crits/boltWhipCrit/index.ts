// the bolt whip floor crit: the number flies to the side as a crackling wisp
// holding a bolt like a whip and cracks it across the bars in view, its tip
// lashing along each one end to end in a rattle of blasts, quicker each
// crack; then it raises it high and cracks it straight down onto its own bar
// in a giant bolt and a huge blast
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { ownLast } from "../../critPlayer/shared";

const BW_IN_MS = 220;
const BW_FIRST_MS = BW_IN_MS + 80;
const BW_CRACKS = 6;
// each crack's lash and the gap after it, quickening
const BW_LASH_MS: [number, number] = [170, 90];
const BW_GAP_MS: [number, number] = [130, 60];
const BW_FADE_MS = 80;
const BW_REACH = 0.9;
const BW_BLASTS = 4;
// the hand: past its own bar's right end, over the bars' middle
const BW_HAND_OUT = 220;
const BW_HAND_UP = 170;
const BW_HAND_MAX = 0.42;
const BW_RAISE = 260;
const BW_RAISE_MS = 120;
const BW_SWING_MS = 160;
const BW_BOLT = 1.2;
const BW_STRIKE = 0.8;
const BW_BIG_BOLT = 2.6;
const BW_BIG_STRIKE = 2.4;
const BW_BIG_MS = 220;
const BW_BLAST = 150;
const BW_BOOM = 440;
const BW_CLUSTER = [-0.5, 0.5, -1, 1];
const BW_CLUSTER_MS = 45;
const BW_CLUSTER_BLAST = 170;
const BW_KICKED_BOOM = 1e6;
// shakes by step: a blast along a lash, its own bar
const BW_SHAKES = [0.5, 3];
const BW_TAIL_MS = 1000;

interface Crack {
  bar: number;
  at: number;
  ms: number;
  from: number;
  to: number;
  // its blasts' places along the bar and times
  sides: number[];
  times: number[];
  bolt: Bolt;
}
interface Whip {
  cracks: Crack[];
  raise: number;
  boom: number;
  big: Bolt;
  // the wisp holding it, moved every frame
  hand: Point;
  handAt: () => Point;
}
const whips = new WeakMap<Running, Whip>();

function planWhip(bars: Point[]): Whip {
  const others = ownLast(bars).slice(0, -1);
  const order = others.length
    ? [...others, ...[...others].reverse()]
    : [0, 0, 0];
  // every bar cracked at least once
  const n = Math.min(Math.max(BW_CRACKS, others.length), order.length);
  let clock = BW_FIRST_MS;
  const cracks = order.slice(0, n).map((bar, i): Crack => {
    const u = i / Math.max(1, n - 1);
    const ms = lerp(...BW_LASH_MS, u);
    const at = clock;
    clock += ms + lerp(...BW_GAP_MS, u);
    const from = i % 2 ? BW_REACH : -BW_REACH;
    const steps = Array.from(
      { length: BW_BLASTS },
      (_, k) => (k + 0.5) / BW_BLASTS,
    );
    return {
      bar,
      at,
      ms,
      from,
      to: -from,
      sides: steps.map((s) => lerp(from, -from, s)),
      times: steps.map((s) => at + s * ms),
      bolt: createBolt({ x: 0, y: 0 }, { x: 600, y: 0 }, 1),
    };
  });
  const hand = { x: 0, y: 0 };
  return {
    cracks,
    raise: clock,
    boom: clock + BW_SWING_MS,
    big: createBolt({ x: 0, y: 0 }, { x: 0, y: 900 }, 3),
    hand,
    handAt: () => hand,
  };
}

registerFloorCrit("boltWhipCrit", {
  plan(r, bars, hit) {
    const whip = planWhip(bars);
    whips.set(r, whip);
    for (const c of whip.cracks) for (const at of c.times) hit(c.bar, at, 0);
    hit(0, whip.boom, 1);
    BW_CLUSTER.forEach((_, k) =>
      hit(0, whip.boom + (k + 1) * BW_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const whip = whips.get(r);
    if (!whip) return;
    const now = r.startedAt + ms;
    const { cracks, raise, boom, big, hand } = whip;
    let middle = 0;
    for (const b of bars) middle += b.y;
    middle /= bars.length;
    const lift = clamp01((ms - (raise - BW_RAISE_MS)) / BW_RAISE_MS);
    hand.x = Math.min(
      along(r, bars, 0, 1).x + BW_HAND_OUT,
      r.viewportWidth * BW_HAND_MAX,
    );
    hand.y = middle - BW_HAND_UP - BW_RAISE * lift * lift * (3 - 2 * lift);
    if (ms < BW_IN_MS) {
      const p = (ms / BW_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        hand.x * p,
        hand.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= boom && r.kicked < BW_KICKED_BOOM) {
      r.kicked = BW_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= BW_IN_MS && ms < boom)
      drawWisp(ctx, whip.handAt, ms, now, WISP_SIZE);
    for (const c of cracks) {
      const t = ms - c.at;
      if (t < 0 || t >= c.ms + BW_FADE_MS) continue;
      const tip = along(r, bars, c.bar, lerp(c.from, c.to, clamp01(t / c.ms)));
      c.bolt.from.x = hand.x;
      c.bolt.from.y = hand.y;
      c.bolt.to.x = tip.x;
      c.bolt.to.y = tip.y;
      const fade = t < c.ms ? 1 : 1 - (t - c.ms) / BW_FADE_MS;
      drawBolt(ctx, c.bolt, fade, BW_BOLT);
      drawStrike(ctx, c.bolt.to, fade * BW_STRIKE, 1, now);
    }
    const t = ms - boom;
    if (t >= -BW_SWING_MS / 4 && t < BW_BIG_MS) {
      const fade = t < 0 ? 1 : 1 - t / BW_BIG_MS;
      big.from.x = hand.x;
      big.from.y = hand.y;
      big.to.x = bars[0].x;
      big.to.y = bars[0].y;
      drawBolt(ctx, big, fade, BW_BIG_BOLT);
      drawStrike(ctx, big.to, fade, BW_BIG_STRIKE, now);
    }
    for (const c of cracks)
      for (let k = 0; k < c.times.length; k++) {
        const since = ms - c.times[k];
        if (since < 0 || since >= 1000) continue;
        drawDetonation(
          ctx,
          along(r, bars, c.bar, c.sides[k]),
          since,
          BW_BLAST,
          now,
        );
      }
    drawDetonation(ctx, bars[0], ms - boom, BW_BOOM, now);
    for (let k = 0; k < BW_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, BW_CLUSTER[k]),
        ms - boom - (k + 1) * BW_CLUSTER_MS,
        BW_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: BW_TAIL_MS,
  shake: (step) => BW_SHAKES[step] ?? BW_SHAKES[0],
});
