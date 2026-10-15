// Power Line, a rate crit: a bolt cracks up out of the street into the
// bottom bar's readout, then a crackling arc reaches up from it to the
// readout above and a bolt cracks across, and the next, chaining up the
// building, quicker each, every readout struck turning over and staying
// wired to the last by a live arc; then a giant bolt splits the sky down
// onto its own readout and every arc flares: each bar runs faster with
// every payout it makes for a while
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
import { drawLightningArc } from "../../../../shared/animationStyles/lightningArc";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 120;
// the readouts READOUT of a bar's half width out; the first bolt from STREET
// px under the bottom one; each link reaching over REACH_MS, then striking,
// GAPS_MS apart (closing)
const READOUT = 0.6;
const STREET = 700;
const REACH_MS = 120;
const GAPS_MS: [number, number] = [230, 90];
const BOLT_MS = 130;
const BOLT = 1.4;
const STRIKE = 1.1;
// the giant bolt SKY px over its own readout, GIANT_GAP_MS after the last
// link; the arcs flaring FLARE times as thick, then fading over FADE_MS
const SKY = 1500;
const GIANT_GAP_MS = 160;
const GIANT = 3;
const GIANT_STRIKE = 2.2;
const FLARE = 2;
const FADE_MS = 300;
const ARC = 0.9;
const BLAST = 150;
const OWN_BLAST = 400;
// shakes by step: -, a bar, its own
const SHAKES = [0.4, 1.1, 3];

interface Link {
  bar: number;
  // where it reaches from, its readout, live
  from: Point;
  to: Point;
  reachAt: number;
  strikeAt: number;
  bolt: Bolt;
}
interface State {
  links: Link[];
  own: Point;
  sky: Point;
  giant: Bolt;
  giantAt: number;
}
const states = new WeakMap<Running, State>();

// a ratcheting bar: k notches faster, a notch more each payout, `left` left
const ratchets = defineBarEffect<{ left: number; k: number }>({
  speed: (v) => 1 + meta.values.step * v.k,
  onPayout: (v) => (v.left > 1 ? { left: v.left - 1, k: v.k + 1 } : undefined),
});

registerFloorCrit("powerLineCrit", {
  reward(t) {
    t.flipRate();
    ratchets.set(t.floor, {
      left: meta.values.payouts * (t.own ? 2 : 1),
      k: 1,
    });
    t.punch(`+${Math.round(meta.values.step * 100)}% Speed a Payout`);
  },
  plan(r, bars, hit) {
    // the others bottom up, then its own
    const order = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort((p, q) => bars[q].y - bars[p].y);
    const links: Link[] = [];
    let t = IN_MS + REACH_MS;
    let from: Point = { x: 0, y: 0 };
    order.forEach((bar, k) => {
      const to: Point = { x: 0, y: 0 };
      if (k === 0) from = { x: 0, y: 0 };
      links.push({
        bar,
        from,
        to,
        reachAt: t - REACH_MS,
        strikeAt: t,
        bolt: createBolt(from, to, 2),
      });
      hit(bar, t, 1);
      from = to;
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, order.length - 1));
    });
    const last = links[links.length - 1];
    const giantAt = (last ? last.strikeAt : IN_MS) + GIANT_GAP_MS;
    hit(0, giantAt, 2);
    const own: Point = { x: 0, y: 0 };
    const sky: Point = { x: 0, y: 0 };
    states.set(r, { links, own, sky, giant: createBolt(sky, own, 3), giantAt });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    const { links, own, sky, giantAt } = state;
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
    for (let k = 0; k < links.length; k++) {
      const link = links[k];
      const bar = bars[link.bar];
      link.to.x = bar.x + half * READOUT;
      link.to.y = bar.y;
      // the first one cracks up out of the street under it
      if (k === 0) {
        link.from.x = link.to.x;
        link.from.y = link.to.y + STREET;
      }
    }
    own.x = bars[0].x + half * READOUT;
    own.y = bars[0].y;
    sky.x = own.x;
    sky.y = own.y - SKY;
    // the live arcs: reaching up to the next readout, then wired to it
    const flare = 1 + (FLARE - 1) * clamp01(1 - Math.abs(ms - giantAt) / 120);
    const fade = 1 - clamp01((ms - giantAt) / FADE_MS);
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 1; k < links.length; k++) {
      const link = links[k];
      if (ms < link.reachAt || fade <= 0) continue;
      const reach = clamp01((ms - link.reachAt) / REACH_MS);
      drawLightningArc(
        ctx,
        link.from,
        link.to,
        fade,
        ARC * flare,
        now,
        k,
        reach,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < links.length; k++) {
      const link = links[k];
      const dt = ms - link.strikeAt;
      if (dt >= 0 && dt < BOLT_MS) {
        const f = 1 - dt / BOLT_MS;
        drawBolt(ctx, link.bolt, f, BOLT);
        drawStrike(ctx, link.to, f, STRIKE, now);
      }
      drawDetonation(ctx, link.to, dt, BLAST, now);
    }
    const dt = ms - giantAt;
    if (dt >= 0 && dt < BOLT_MS * 1.6) {
      const f = 1 - dt / (BOLT_MS * 1.6);
      drawBolt(ctx, state.giant, f, GIANT);
      drawStrike(ctx, own, f, GIANT_STRIKE, now);
    }
    drawDetonation(ctx, own, dt, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
