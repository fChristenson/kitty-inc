// Storm Cloud, a button crit: a dark cloud boils up beside the top of the
// button column, flickering inside and rumbling, light pulled into it; forked
// bolts crack down out of it onto every button top to bottom, each a white
// flash, a crack and a jolt, quicker and quicker, the cloud flaring brighter
// at each; then it swells, trembling and strobing, and one massive
// multi-forked bolt slams into the crit's own button: each of its next taps
// also pays out every open floor below it, down to the ground
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
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";

const IN_MS = 140;
// the cloud boils up till the first strike
const BOIL_MS = 380;
// the first strike's gap, each next one QUICKEN as long, down to MIN_GAP_MS
const FIRST_GAP_MS = 170;
const QUICKEN = 0.72;
const MIN_GAP_MS = 50;
// a strike blinks BOLT_MS, then hangs faint for AFTERGLOW_MS
const BOLT_MS = 110;
const AFTERGLOW_MS = 240;
const FLASH_MS = 120;
// the cloud's flare at each strike
const PULSE_MS = 150;
// after the last strike: the cloud swelling and strobing, then the giant
const GATHER_MS = 240;
const GATHER_PULSES = 5;
const GIANT_MS = 340;
const GIANT_WIDTH = 3.2;
const GIANT_FORKS = 6;
const LEG_WIDTH = 1.4;
const GIANT_BLAST = 250;
// the cloud: its middle this far left of the buttons' ends and over the top
// one, its puffs spread over CLOUD_R, swelling by SWELL as it gathers
const CLOUD_R = 120;
const CLOUD_SIDE = BTN_W * 0.75;
const CLOUD_UP = BTN_H * 1.3;
const SWELL = 0.4;
const TREMBLE = 8;
const PUFF_X = [-1, -0.55, -0.05, 0.45, 0.8, -0.3, 0.25];
const PUFF_Y = [0.15, -0.3, -0.45, -0.25, 0.15, 0.25, 0.3];
const PUFF_S = [0.7, 0.9, 1.05, 0.9, 0.7, 0.85, 0.8];
const PUFFS = PUFF_X.length;
const BODY = fadeStops("#1a1233", 0.35);
const INNER = fadeStops("#7a5cff");
const CORE = fadeStops("#e4eaff");
// the inner flicker's tick, quickening as it gathers
const FLICKER_SLOW_MS = 60;
const FLICKER_FAST_MS = 22;
const RUMBLE_MS = 70;
// sparks thrown left off each struck end, px per ms
const SPARKS = 9;
const SPARK = 30;
const SPARK_MS = 170;
const SPARK_SPEED = 1.3;
// light pulled into the cloud as it boils and gathers
const PULLED = 14;
const PULL_REACH = 300;
// shakes by step: its own button's strike, strikes harder down the column,
// the giant
const SHAKES = [0.8, 0.9, 1, 1.15, 1.3, 3.2];
const GIANT_STEP = SHAKES.length - 1;

interface State {
  // the buttons top to bottom, each one's left end, and when it's struck
  order: number[];
  ends: Point[];
  hitAt: Float32Array;
  // each strike's root under the cloud (its x across it) and its bolt
  roots: Point[];
  rootX: Float32Array;
  strikes: Bolt[];
  cloud: Point;
  // its own button's place in order
  own: number;
  giantRoot: Point;
  legRoots: Point[];
  giant: Bolt;
  legs: Bolt[];
  giantAt: number;
  rumbleTick: number;
}

const states = new WeakMap<Running, State>();
const arcA: Point = { x: 0, y: 0 };
const arcB: Point = { x: 0, y: 0 };
const textOpts = { alpha: 1 };

// each tap also paying out the next open floors below
const strikeTaps = defineTapPerk("Strike", (t) => {
  let left = meta.values.floors;
  for (let k = t.floors.indexOf(t.floor) - 1; k >= 0 && left > 0; k--) {
    const below = t.floors[k];
    if (!below.unlocked) continue;
    t.payout(below, 1);
    left--;
  }
});

// the ends, the cloud and the bolts' roots off the buttons this frame
function place(bars: Point[], s: State): void {
  const { order, ends, roots, rootX, cloud, giantRoot, legRoots } = s;
  let left = Infinity;
  for (let k = 0; k < order.length; k++) {
    const bar = bars[order[k]];
    ends[k].x = bar.x - BTN_W / 2;
    ends[k].y = bar.y;
    if (ends[k].x < left) left = ends[k].x;
  }
  cloud.x = left - CLOUD_SIDE;
  cloud.y = ends[0].y - CLOUD_UP;
  for (let k = 0; k < roots.length; k++) {
    roots[k].x = cloud.x + rootX[k] * CLOUD_R;
    roots[k].y = cloud.y + CLOUD_R * 0.4;
  }
  giantRoot.x = cloud.x;
  giantRoot.y = cloud.y + CLOUD_R * 0.3;
  for (let i = 0; i < legRoots.length; i++) {
    legRoots[i].x = cloud.x + (i % 2 ? 0.75 : -0.75) * CLOUD_R;
    legRoots[i].y = cloud.y + CLOUD_R * 0.2;
  }
}

// its forks all turned to the left, away from the buttons
function leftForks(bolt: Bolt): Bolt {
  for (const fork of bolt.forks)
    if (Math.cos(fork.angle) > 0) fork.angle = Math.PI - fork.angle;
  return bolt;
}

registerFloorCrit("stormCloudCrit", {
  reward(t) {
    strikeTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const n = order.length;
    const hitAt = new Float32Array(n);
    let at = BOIL_MS;
    let gap = FIRST_GAP_MS;
    for (let k = 0; k < n; k++) {
      hitAt[k] = at;
      hit(order[k], at, order[k] === 0 ? 0 : 1 + Math.min(k, 3));
      at += gap;
      gap = Math.max(MIN_GAP_MS, gap * QUICKEN);
    }
    const giantAt = hitAt[n - 1] + GATHER_MS;
    hit(0, giantAt, GIANT_STEP);
    const ends = order.map(() => ({ x: 0, y: 0 }));
    const roots = order.map(() => ({ x: 0, y: 0 }));
    const rootX = new Float32Array(n);
    for (let k = 0; k < n; k++) rootX[k] = (Math.random() * 2 - 1) * 0.75;
    const giantRoot = { x: 0, y: 0 };
    const legRoots = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const own = order.indexOf(0);
    const s: State = {
      order,
      ends,
      hitAt,
      roots,
      rootX,
      // forkier down the column
      strikes: roots.map((root, k) =>
        leftForks(createBolt(root, ends[k], 1 + Math.min(k, 2))),
      ),
      cloud: { x: 0, y: 0 },
      own,
      giantRoot,
      legRoots,
      giant: leftForks(createBolt(giantRoot, ends[own], GIANT_FORKS)),
      legs: legRoots.map((root) => leftForks(createBolt(root, ends[own], 2))),
      giantAt,
      rumbleTick: -1,
    };
    place(bars, s);
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    place(bars, s);
    const { ends, hitAt, roots, strikes, cloud, own, giant, legs } = s;
    const n = hitAt.length;
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

    const boil = clamp01(ms / BOIL_MS);
    const grow = 1 - (1 - boil) * (1 - boil) * (1 - boil);
    const lastAt = hitAt[n - 1];
    const gather = clamp01((ms - lastAt) / GATHER_MS);
    const g = ms - s.giantAt;
    // the cloud spent once the giant lands
    const fade = 1 - clamp01(g / GIANT_MS);
    let landed = 0;
    while (landed < n && ms >= hitAt[landed]) landed++;
    const pulse =
      landed > 0 ? Math.max(0, 1 - (ms - hitAt[landed - 1]) / PULSE_MS) : 0;

    // the rumble, rising as it boils and again as it gathers
    const rumble = Math.floor(ms / RUMBLE_MS);
    if (rumble > s.rumbleTick && g < 0) {
      s.rumbleTick = rumble;
      if (ms < BOIL_MS) r.shake(0.15 + 0.35 * boil);
      else if (ms >= lastAt) r.shake(0.4 + 0.8 * gather);
    }

    // the cloud: rising as it boils, swelling and trembling as it gathers,
    // blown out wider by the giant as it fades
    const scale =
      (0.3 + 0.7 * grow) *
      (1 + SWELL * gather * gather) *
      (1 + 0.3 * (1 - fade));
    const shiver = TREMBLE * (gather + 0.4 * pulse) * fade;
    const cx = cloud.x + (Math.random() * 2 - 1) * shiver;
    const cy =
      cloud.y + (1 - grow) * CLOUD_R * 0.6 + (Math.random() * 2 - 1) * shiver;
    const alpha = ctx.globalAlpha;
    const reach = CLOUD_R * scale;
    if (fade > 0) {
      ctx.globalAlpha = alpha * 0.9 * grow * fade;
      for (let i = 0; i < PUFFS; i++) {
        const wobble = 1 + 0.08 * Math.sin(now * 0.006 + i * 1.7);
        drawGlow(
          ctx,
          BODY,
          cx + PUFF_X[i] * reach,
          cy + PUFF_Y[i] * reach,
          reach * PUFF_S[i] * wobble,
        );
      }
    }

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);

    // lit inside: puffs flickering at random, faster as it gathers, flaring
    // at each strike, blazing white as the giant leaves
    if (fade > 0) {
      const blaze = g >= 0 ? fade : 0;
      const level = 0.2 + 0.35 * grow + 0.9 * pulse + 0.8 * gather + blaze;
      const tick = Math.floor(
        ms / (FLICKER_SLOW_MS - (FLICKER_SLOW_MS - FLICKER_FAST_MS) * gather),
      );
      for (let i = 0; i < PUFFS; i++) {
        const v = hash01(tick * 7 + i, 9101);
        if (v < 0.45 - 0.3 * gather && pulse < 0.3 && blaze === 0) continue;
        ctx.globalAlpha = alpha * Math.min(1, level * v) * grow;
        drawGlow(
          ctx,
          INNER,
          cx + PUFF_X[i] * reach,
          cy + PUFF_Y[i] * reach,
          reach * PUFF_S[i] * 0.8,
        );
      }
      const strobe = Math.abs(
        Math.sin(gather * gather * GATHER_PULSES * Math.PI),
      );
      ctx.globalAlpha =
        alpha *
        Math.min(1, 0.7 * pulse + gather * (0.3 + 0.7 * strobe) + blaze);
      drawGlow(ctx, CORE, cx, cy, reach * (0.5 + 0.4 * gather + 0.4 * blaze));
      ctx.globalAlpha = alpha;

      // crackles leaping between its puffs, more as it gathers
      if (g < 0) {
        const crackles = 1 + Math.round(2 * gather);
        for (let c = 0; c < crackles; c++) {
          const key = tick * 3 + c;
          const i = Math.floor(hash01(key, 9201) * PUFFS);
          const j =
            (i + 1 + Math.floor(hash01(key, 9202) * (PUFFS - 1))) % PUFFS;
          arcA.x = cx + PUFF_X[i] * reach;
          arcA.y = cy + PUFF_Y[i] * reach;
          arcB.x = cx + PUFF_X[j] * reach;
          arcB.y = cy + PUFF_Y[j] * reach;
          drawLightningArc(
            ctx,
            arcA,
            arcB,
            (0.4 + 0.6 * gather) * grow,
            0.4 + 0.4 * gather,
            now,
            c,
          );
        }
      }
    }

    // light streaking into it from all round as it boils and gathers
    const pull = ms < BOIL_MS ? boil : g < 0 ? gather : 0;
    if (pull > 0)
      for (let i = 0; i < PULLED; i++) {
        const p = (ms * (0.003 + 0.006 * pull) + hash01(i, 9301)) % 1;
        const angle = Math.PI * 2 * hash01(i, 9302);
        const d = PULL_REACH * (1 - p) + reach * 0.3;
        stampGlimmer(
          ctx,
          cx + Math.cos(angle) * d,
          cy + Math.sin(angle) * d,
          10 + 20 * p * (0.4 + 0.6 * pull),
          i,
          i % 2 ? COLOR.white : COLOR.heavenlyGold,
        );
      }

    // each strike a blink-fast forked bolt, a flash at both ends and sparks,
    // then hanging faint
    for (let k = 0; k < landed; k++) {
      const since = ms - hitAt[k];
      if (since < BOLT_MS) {
        drawBolt(ctx, strikes[k], 1 - 0.5 * (since / BOLT_MS), 0.9 + 0.12 * k);
        drawStrike(ctx, roots[k], 1 - since / BOLT_MS, 0.9, now);
      } else if (since < BOLT_MS + AFTERGLOW_MS)
        drawBolt(
          ctx,
          strikes[k],
          0.35 * (1 - (since - BOLT_MS) / AFTERGLOW_MS),
          0.5,
          COLOR.white,
        );
      if (since >= SPARK_MS) continue;
      const end = ends[k];
      if (since < FLASH_MS)
        drawStrike(ctx, end, 1 - since / FLASH_MS, 1.5 + 0.12 * k, now);
      const life = 1 - since / SPARK_MS;
      for (let i = 0; i < SPARKS; i++) {
        const key = i + k * 13;
        const angle = Math.PI * (0.5 + hash01(key, 9311));
        const d = SPARK_SPEED * since * (0.6 + 0.4 * hash01(key, 9312));
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

    // the giant: a massive many-forked bolt and two legs beside it, all
    // slamming into its own button
    if (g >= -40 && g < GIANT_MS) {
      const a = 1 - clamp01(g / GIANT_MS);
      drawBolt(ctx, giant, a, GIANT_WIDTH);
      drawBolt(ctx, legs[0], a, LEG_WIDTH);
      drawBolt(ctx, legs[1], a, LEG_WIDTH);
      if (g >= 0) {
        drawStrike(ctx, ends[own], a, 3.4, now);
        drawStrike(ctx, s.giantRoot, a, 2.4, now);
      }
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    ctx.globalAlpha = alpha;
    drawDetonation(ctx, ends[own], g, GIANT_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
