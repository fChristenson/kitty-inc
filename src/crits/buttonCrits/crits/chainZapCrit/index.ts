// Chain Zap, a button crit: a spark crackles up on the top button's left end
// and a bolt chains down the column button to button, arcing out to the left
// between them, each jump a flash, a crack and a jolt turning the button
// over, quicker, thicker and forkier each time; at the bottom it arcs back up
// into the sky and a giant forked bolt cracks down into the crit's own
// button: each of its next taps also pays out the floor above
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
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
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";

const IN_MS = 140;
// the spark builds on the top button's end, which it strikes at CHARGE_MS
const CHARGE_MS = 380;
// the first jump's gap, each next one QUICKEN as long, down to MIN_GAP_MS
const FIRST_GAP_MS = 190;
const QUICKEN = 0.75;
const MIN_GAP_MS = 55;
const BOLT_MS = 150;
const FLASH_MS = 130;
// the chain's legs swing out this far left of the buttons' ends, every other
// one shallower
const SIDE = BTN_W * 0.32;
const SHALLOW = 0.55;
// after the last jump: the arc up to the sky, the sky gathering, the giant
const RISE_GAP_MS = 50;
const RISE_MS = 160;
const GIANT_GAP_MS = 90;
const GIANT_MS = 320;
const GIANT_WIDTH = 2.8;
// the sky point, this many viewport widths over the top button, left of them
const SKY = 0.7;
const SKY_SIDE = BTN_W * 0.7;
const GIANT_BLAST = 230;
// the chain left crackling fades this long after the giant lands
const LINGER_MS = 140;
// sparks thrown left off each struck end, px per ms
const SPARKS = 8;
const SPARK = 34;
const SPARK_MS = 180;
const SPARK_SPEED = 1.2;
// the charge: light pulled into the spark from the left, crackles off it
const PULLED = 12;
const PULL_REACH = 240;
const CRACKLES = 2;
const CRACKLE_TICK_MS = 50;
const JOLT = 6;
// shakes by step: a jolt on its own button, a jump, the giant
const SHAKES = [0.8, 1.1, 3];

interface State {
  // the buttons top to bottom, each one's left end, and when it's struck
  order: number[];
  ends: Point[];
  hitAt: Float32Array;
  // sides[j], out left between ends[j] and ends[j + 1], the legs through it
  sides: Point[];
  legsOut: Bolt[];
  legsIn: Bolt[];
  sky: Point;
  // its own button's place in order
  own: number;
  giant: Bolt;
  riseAt: number;
  giantAt: number;
}

const states = new WeakMap<Running, State>();
const spark: Point = { x: 0, y: 0 };
const crackle: Point = { x: 0, y: 0 };
const textOpts = { alpha: 1 };

// each tap also paying out the open floor above
const zapTaps = defineTapPerk("Zap", (t) => {
  const above = t.floors[t.floors.indexOf(t.floor) + 1];
  if (above?.unlocked) t.payout(above, 1);
});

// the ends, the side points and the sky point off the buttons this frame
function place(
  r: Running,
  bars: Point[],
  order: number[],
  ends: Point[],
  sides: Point[],
  sky: Point,
): void {
  let left = Infinity;
  for (let k = 0; k < order.length; k++) {
    const bar = bars[order[k]];
    ends[k].x = bar.x - BTN_W / 2;
    ends[k].y = bar.y;
    if (ends[k].x < left) left = ends[k].x;
  }
  for (let j = 0; j < sides.length; j++) {
    const a = ends[j];
    const b = ends[j + 1];
    sides[j].x = Math.min(a.x, b.x) - SIDE * (j % 2 ? SHALLOW : 1);
    sides[j].y = (a.y + b.y) / 2;
  }
  sky.x = left - SKY_SIDE;
  sky.y = ends[0].y - r.viewportWidth * SKY;
}

// its forks all turned to the left, away from the buttons
function leftForks(bolt: Bolt): Bolt {
  for (const fork of bolt.forks)
    if (Math.cos(fork.angle) > 0) fork.angle = Math.PI - fork.angle;
  return bolt;
}

// the spark charging on `at`: trembling, light streaking in, crackles
// snapping off it, its flare swelling
function drawCharge(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  now: number,
): void {
  const c = clamp01(ms / CHARGE_MS);
  spark.x = at.x + (Math.random() * 2 - 1) * JOLT * c;
  spark.y = at.y + (Math.random() * 2 - 1) * JOLT * c;
  for (let i = 0; i < PULLED; i++) {
    const p = (ms * (0.002 + 0.004 * c) + hash01(i, 5121)) % 1;
    const angle = Math.PI * (0.5 + hash01(i, 5122));
    const d = PULL_REACH * (1 - p);
    stampGlimmer(
      ctx,
      at.x + Math.cos(angle) * d,
      at.y + Math.sin(angle) * d,
      12 + 20 * p * (0.4 + 0.6 * c),
      i,
      i % 2 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  const tick = Math.floor(ms / CRACKLE_TICK_MS);
  for (let i = 0; i < CRACKLES; i++) {
    const key = tick * 3 + i;
    const angle = Math.PI * (0.5 + hash01(key, 5123));
    const d = 40 + 120 * c * hash01(key, 5124);
    crackle.x = spark.x + Math.cos(angle) * d;
    crackle.y = spark.y + Math.sin(angle) * d;
    drawLightningArc(ctx, spark, crackle, 0.5 + 0.5 * c, 0.3 + 0.4 * c, now, i);
  }
  drawStrike(ctx, spark, 0.35 + 0.65 * c, 0.5 + 1.8 * c * c, now);
}

registerFloorCrit("chainZapCrit", {
  reward(t) {
    zapTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const n = order.length;
    const hitAt = new Float32Array(n);
    let at = CHARGE_MS;
    let gap = FIRST_GAP_MS;
    for (let k = 0; k < n; k++) {
      hitAt[k] = at;
      hit(order[k], at, order[k] === 0 ? 0 : 1);
      at += gap;
      gap = Math.max(MIN_GAP_MS, gap * QUICKEN);
    }
    const riseAt = hitAt[n - 1] + RISE_GAP_MS;
    const giantAt = riseAt + RISE_MS + GIANT_GAP_MS;
    hit(0, giantAt, 2);
    const ends = order.map(() => ({ x: 0, y: 0 }));
    const sides = ends.slice(1).map(() => ({ x: 0, y: 0 }));
    const sky = { x: 0, y: 0 };
    place(r, bars, order, ends, sides, sky);
    const own = order.indexOf(0);
    states.set(r, {
      order,
      ends,
      hitAt,
      sides,
      // forkier down the chain
      legsOut: sides.map((side, j) =>
        leftForks(createBolt(ends[j], side, Math.min(j + 1, 3))),
      ),
      legsIn: sides.map((side, j) => createBolt(side, ends[j + 1], 0)),
      sky,
      own,
      giant: leftForks(createBolt(sky, ends[own], 4)),
      riseAt,
      giantAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const { order, ends, hitAt, sides, legsOut, legsIn, sky, own, giant } = s;
    const { riseAt, giantAt } = s;
    place(r, bars, order, ends, sides, sky);
    if (ms < IN_MS) {
      textOpts.alpha = 1 - ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.5 * (ms / IN_MS)),
        textOpts,
      );
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms < CHARGE_MS) drawCharge(ctx, ends[0], ms, now);

    // each jump a bright blink, then left crackling, thicker with every
    // jump, till the giant lands
    const fade = 1 - clamp01((ms - giantAt) / LINGER_MS);
    let landed = 0;
    while (landed < hitAt.length && ms >= hitAt[landed]) landed++;
    for (let j = 0; j < legsOut.length; j++) {
      const since = ms - hitAt[j + 1];
      if (since < 0) break;
      if (since < BOLT_MS) {
        const alpha = 1 - 0.6 * (since / BOLT_MS);
        const width = 0.8 + 0.14 * j;
        drawBolt(ctx, legsOut[j], alpha, width);
        drawBolt(ctx, legsIn[j], alpha, width);
      } else if (fade > 0) {
        const width = 0.35 + 0.08 * landed;
        drawBolt(ctx, legsOut[j], 0.45 * fade, width, COLOR.white);
        drawBolt(ctx, legsIn[j], 0.45 * fade, width, COLOR.white);
      }
    }

    // a flare and a spray of sparks off every struck end
    for (let k = 0; k < landed; k++) {
      const since = ms - hitAt[k];
      if (since >= SPARK_MS) continue;
      const end = ends[k];
      if (since < FLASH_MS)
        drawStrike(ctx, end, 1 - since / FLASH_MS, 1.4 + 0.12 * k, now);
      const life = 1 - since / SPARK_MS;
      for (let i = 0; i < SPARKS; i++) {
        const key = i + k * 13;
        const angle = Math.PI * (0.5 + hash01(key, 7311));
        const d = SPARK_SPEED * since * (0.6 + 0.4 * hash01(key, 7312));
        stampGlimmer(
          ctx,
          end.x + Math.cos(angle) * d,
          end.y + Math.sin(angle) * d,
          SPARK * life,
          key,
          i % 2 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
    }

    // the arc racing back up from the bottom into the sky, which gathers
    const rise = ms - riseAt;
    if (rise >= 0 && fade > 0) {
      const reach = clamp01(rise / RISE_MS);
      drawLightningArc(
        ctx,
        ends[ends.length - 1],
        sky,
        fade,
        1.5,
        now,
        7,
        1 - (1 - reach) * (1 - reach),
      );
    }
    const g = ms - giantAt;
    if (rise >= RISE_MS && g < 0)
      drawStrike(
        ctx,
        sky,
        1,
        1.2 + 2 * clamp01((rise - RISE_MS) / GIANT_GAP_MS),
        now,
      );
    if (g >= -40 && g < GIANT_MS) {
      drawBolt(ctx, giant, 1 - clamp01(g / GIANT_MS), GIANT_WIDTH);
      if (g >= 0) drawStrike(ctx, ends[own], 1 - g / GIANT_MS, 3.2, now);
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, ends[own], g, GIANT_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
