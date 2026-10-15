// Pay Dirt, a rate crit: the number spins into a drill that dives onto the
// top bar's readout and bites in, stalling and grinding, sparks gushing out
// both sides, then bores down through it in shoves, a jolt and a blast each;
// it punches out underneath and drops onto the next bar down, quicker every
// bar, its own the longest grind; each readout it punches through turns
// over: the bar's next payouts double up, x2, x4, x8
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawDrillHead,
  drawDrillSpray,
} from "../../../../shared/animationStyles/drill";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import {
  registerFloorCrit,
  byHeight,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { BAR_HALF_H, holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// each bar: dropped onto over DROP_MS, stalled STALL_MS, bored through in
// SHOVES shoves of SHOVE_MS (its own OWN_SHOVES); QUICK times as long by the
// last bar
const DROP_MS = 80;
const STALL_MS = 140;
const OWN_STALL_MS = 260;
const SHOVES = 2;
const OWN_SHOVES = 4;
const SHOVE_MS = 90;
const QUICK = 0.55;
// the share of a shove spent lunging
const LUNGE = 0.4;
// it bites the bar's top edge, punches out PAST px under its bottom one
const PAST = 20;
const SIZE = 90;
const OWN_SIZE = 120;
const TIP = WISP_SIZE * 0.8;
const SPRAY = 70;
const OWN_SPRAY = 95;
const SPRAY_FADE_MS = 140;
const JUDDER_STALL = 16;
const JUDDER_BORE = 7;
const JUDDER_MS = 16;
const TURN_GRIND = 0.06;
const TURN = 0.03;
const RUMBLE_MS = 70;
const RUMBLE_SHAKE = 0.7;
const SHOVE_BLAST = 80;
const THROUGH_BLAST = 160;
const OWN_BLAST = 300;
// shakes by step: a shove, a bar punched through, its own
const SHAKES = [0.6, 1.2, 2.8];

type Kind = "drop" | "hold" | "lunge";
interface Leg {
  kind: Kind;
  startMs: number;
  endMs: number;
  // the bars it runs from and to (-1: the flash's middle), and the heights
  // off their middles
  fromBar: number;
  fromY: number;
  toBar: number;
  toY: number;
}
interface Bite {
  bar: number;
  own: boolean;
  bite: number;
  gives: number;
  through: number;
}
interface Blast {
  bar: number;
  y: number;
  ms: number;
  size: number;
}
interface Plan {
  legs: Leg[];
  bites: Bite[];
  blasts: Blast[];
  rumbles: number[];
  endMs: number;
}
const plans = new WeakMap<Running, Plan>();
// the bars this frame and the plan the tip follows
let frameBars: Point[] = [];
let current: Plan | null = null;
const tip: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// each bar's next payouts doubling up, `left` to go
const doubles = defineBarEffect<{ n: number; left: number }>({
  payout: (run) => 2 ** run.n,
  onPayout: (run) =>
    run.left > 1 ? { n: run.n + 1, left: run.left - 1 } : undefined,
});

const barX = (bar: number) => (bar < 0 ? 0 : frameBars[bar].x);
const barY = (bar: number) => (bar < 0 ? 0 : frameBars[bar].y);

// the tip at ms: a pure function of ms, so its wisp's trail follows it
function tipAt(ms: number): Point {
  const { legs } = current!;
  let k = 0;
  while (k < legs.length - 1 && ms >= legs[k].endMs) k++;
  const leg = legs[k];
  const u = clamp01((ms - leg.startMs) / (leg.endMs - leg.startMs || 1));
  if (leg.kind === "drop") {
    const e = u * u;
    tip.x = lerp(barX(leg.fromBar), barX(leg.toBar), e);
    tip.y = lerp(barY(leg.fromBar) + leg.fromY, barY(leg.toBar) + leg.toY, e);
    return tip;
  }
  const e = leg.kind === "lunge" ? smoothstep(clamp01(u / LUNGE)) : 0;
  const judder =
    (holeHash(Math.floor(ms / JUDDER_MS), 3301) - 0.5) *
    (leg.kind === "hold" ? JUDDER_STALL : JUDDER_BORE);
  tip.x = barX(leg.toBar) + judder;
  tip.y = barY(leg.toBar) + lerp(leg.fromY, leg.toY, e);
  return tip;
}

registerFloorCrit("payDirtCrit", {
  reward(t) {
    t.flipRate();
    doubles.set(t.floor, {
      n: 1,
      left: t.own ? meta.values.ownPayouts : meta.values.payouts,
    });
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const legs: Leg[] = [];
    const bites: Bite[] = [];
    const blasts: Blast[] = [];
    const rumbles: number[] = [];
    let t = 0;
    let fromBar = -1;
    let fromY = 0;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const s = lerp(1, QUICK, k / Math.max(1, order.length - 1));
      const drop = k === 0 ? IN_MS : DROP_MS * s;
      const top = -BAR_HALF_H;
      const bottom = BAR_HALF_H + PAST;
      legs.push({
        kind: "drop",
        startMs: t,
        endMs: t + drop,
        fromBar,
        fromY,
        toBar: bar,
        toY: top,
      });
      t += drop;
      const bite = t;
      const stall = own ? OWN_STALL_MS : STALL_MS * s;
      legs.push({
        kind: "hold",
        startMs: t,
        endMs: t + stall,
        fromBar: bar,
        fromY: top,
        toBar: bar,
        toY: top,
      });
      for (let ms = t + RUMBLE_MS; ms < t + stall; ms += RUMBLE_MS)
        rumbles.push(ms);
      t += stall;
      const gives = t;
      const shoves = own ? OWN_SHOVES : SHOVES;
      const shove = SHOVE_MS * s;
      let y = top;
      for (let j = 0; j < shoves; j++) {
        const next = lerp(top, bottom, (j + 1) / shoves);
        legs.push({
          kind: "lunge",
          startMs: t,
          endMs: t + shove,
          fromBar: bar,
          fromY: y,
          toBar: bar,
          toY: next,
        });
        const landed = t + shove * LUNGE;
        const last = j === shoves - 1;
        hit(bar, landed, last ? (own ? 2 : 1) : 0);
        blasts.push({
          bar,
          y: next,
          ms: landed,
          size: last ? (own ? OWN_BLAST : THROUGH_BLAST) : SHOVE_BLAST,
        });
        t += shove;
        y = next;
      }
      bites.push({ bar, own, bite, gives, through: t - shove * (1 - LUNGE) });
      fromBar = bar;
      fromY = bottom;
    });
    plans.set(r, {
      legs,
      bites,
      blasts,
      rumbles,
      endMs: bites[bites.length - 1].through,
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    frameBars = bars;
    current = plan;
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
    while (r.kicked < plan.rumbles.length && ms >= plan.rumbles[r.kicked]) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }
    // the gush out of the bar it's grinding
    for (const b of plan.bites) {
      const since = ms - b.bite;
      if (since < 0 || ms > b.through + SPRAY_FADE_MS) continue;
      const fade = ms > b.through ? 1 - (ms - b.through) / SPRAY_FADE_MS : 1;
      const hard =
        ms < b.gives
          ? 1
          : lerp(
              0.9,
              b.own ? 1.6 : 1.3,
              clamp01((ms - b.gives) / (b.through - b.gives)),
            );
      spot.x = bars[b.bar].x;
      spot.y = bars[b.bar].y - BAR_HALF_H;
      drawDrillSpray(
        ctx,
        spot,
        Math.PI / 2,
        since,
        hard * fade,
        b.own ? OWN_SPRAY : SPRAY,
        now,
      );
    }
    if (ms < plan.endMs) {
      const { legs } = plan;
      let k = 0;
      while (k < legs.length - 1 && ms >= legs[k].endMs) k++;
      const leg = legs[k];
      tipAt(ms);
      drawDrillHead(
        ctx,
        tip,
        Math.PI / 2,
        leg.toBar === 0 ? OWN_SIZE : SIZE,
        ms * (leg.kind === "drop" ? TURN : TURN_GRIND),
        now,
      );
      drawWisp(ctx, tipAt, ms, now, TIP, 1);
    }
    for (const b of plan.blasts) {
      spot.x = bars[b.bar].x;
      spot.y = bars[b.bar].y + b.y;
      drawDetonation(ctx, spot, ms - b.ms, b.size, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
