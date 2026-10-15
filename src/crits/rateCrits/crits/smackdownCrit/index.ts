// Smackdown, a rate crit: a ball of glitter sits on top of every bar over its
// readout, a slab of light hovering over each; the slabs slam down in a wave
// rolling down the building, round after round, quicker and deeper, the balls
// squashing flatter, glitter squirting out of every contact; the last round
// winds up highest and smashes every ball flat, its own last and hardest,
// glitter jetting out along the bar, and each readout turns over: the bar's
// next payouts pay big, a little less each
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  crushAt,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  drawSlab,
  planCrush,
  squashScale,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
} from "../../../floorCrits/critPlayer";
import { BAR_HALF_H, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// ROUNDS slams from FIRST_MS, the gaps closing over GAPS_MS, the last wound
// up WIND_UP times as long; each bar STAGGER_MS after the one above it
const FIRST_MS = 420;
const ROUNDS = 5;
const GAPS_MS: [number, number] = [330, 140];
const WIND_UP = 1.8;
const STAGGER_MS = 32;
// each ball R round (its own OWN_R), GLINTS glimmers turning on its rim
const R = 46;
const OWN_R = 66;
const GLINTS = 10;
const GLINT = 24;
const SPIN = 0.004;
const WISP = WISP_SIZE * 1.3;
// each slab WIDE of its ball's radius either side, THICK px, wound up LIFT px
// over the ball at the top of each wind-up
const WIDE = 2.4;
const THICK = 34;
const OWN_THICK = 48;
const LIFT = 210;
const SHOW_MS = 120;
const FADE_MS = 200;
// the flattened ball hangs on GONE_MS before it's jetted away
const GONE_MS = 60;
const STRAIN = 170;
const BURST_BLAST = 110;
const OWN_BLAST = 280;
const TAIL_MS = DETONATION_MS;
// shakes by step: a slam, a ball smashed, its own
const SHAKES = [0.3, 0.9, 2.8];

interface Ball {
  bar: number;
  own: boolean;
  delay: number;
}
interface State {
  crush: Crush;
  balls: Ball[];
  // the last slam, from each ball's own clock
  lastMs: number;
}
const states = new WeakMap<Running, State>();
const pose: CrushPose = { crush: 0, lift: 0, since: Infinity, press: -1 };
const squash: Point = { x: 1, y: 1 };
const centre: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const atCentre = () => centre;

// the bar's next payouts, `left` of `of` to go: the first pays the full
// multiple, each after it a share less
const smacks = defineBarEffect<{ left: number; of: number }>({
  payout: (run) => 1 + ((meta.values.payout - 1) * run.left) / run.of,
  onPayout: (run) =>
    run.left > 1 ? { left: run.left - 1, of: run.of } : undefined,
});

registerFloorCrit("smackdownCrit", {
  reward(t) {
    t.flipRate();
    const payouts = t.own ? meta.values.ownPayouts : meta.values.payouts;
    smacks.set(t.floor, { left: payouts, of: payouts });
  },
  plan(r, bars, hit) {
    const crush = planCrush(FIRST_MS, ROUNDS, GAPS_MS, WIND_UP, {
      bang: false,
    });
    const last = crush.slams.length - 1;
    const balls = ownLast(bars).map((bar, k) => ({
      bar,
      own: bar === 0,
      delay: k * STAGGER_MS,
    }));
    for (const b of balls)
      crush.slams.forEach((slam, k) =>
        hit(b.bar, slam + b.delay, k < last ? 0 : b.own ? 2 : 1),
      );
    states.set(r, { crush, balls, lastMs: crush.slams[last] });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const { crush, balls, lastMs } = state;
    const show = clamp01((ms - IN_MS) / SHOW_MS);
    if (show <= 0) return;
    // the balls' glitter, all in one batch
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = show;
    beginLightBatch(ctx);
    for (const b of balls) {
      const since = ms - b.delay - lastMs;
      if (since >= GONE_MS) continue;
      crushAt(crush, ms - b.delay, pose);
      squashScale(pose.crush, squash);
      const bar = bars[b.bar];
      const radius = b.own ? OWN_R : R;
      const cy = bar.y - BAR_HALF_H - radius * squash.y;
      for (let g = 0; g < GLINTS; g++) {
        const a = (g / GLINTS) * Math.PI * 2 + ms * SPIN;
        stampGlimmer(
          ctx,
          bar.x + Math.cos(a) * radius * squash.x,
          cy + Math.sin(a) * radius * squash.y,
          GLINT * (b.own ? 1.3 : 1),
          g + b.bar * GLINTS,
          g % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    for (const b of balls) {
      const own = b.own;
      const local = ms - b.delay;
      const since = local - lastMs;
      crushAt(crush, local, pose);
      squashScale(pose.crush, squash);
      const bar = bars[b.bar];
      const radius = own ? OWN_R : R;
      const base = bar.y - BAR_HALF_H;
      const top = base - 2 * radius * squash.y;
      // the wisp at the ball's heart, squashed with it
      if (since < GONE_MS) {
        centre.x = bar.x;
        centre.y = base - radius * squash.y;
        ctx.save();
        ctx.translate(centre.x, centre.y);
        ctx.scale(squash.x, squash.y);
        ctx.translate(-centre.x, -centre.y);
        drawWispHead(
          ctx,
          atCentre,
          ms,
          now,
          WISP * (own ? 1.4 : 1),
          pose.crush,
          show,
        );
        ctx.restore();
      }
      // the slab, wound up off the ball's top and slammed onto it
      const thick = own ? OWN_THICK : THICK;
      const y = top - thick / 2 - LIFT * pose.lift;
      const half = WIDE * radius;
      left.x = bar.x - half;
      right.x = bar.x + half;
      left.y = right.y = y;
      drawSlab(
        ctx,
        left,
        right,
        thick,
        show * (1 - clamp01(since / FADE_MS)),
        now,
      );
      contact.x = bar.x;
      contact.y = top;
      const width = 2 * radius * squash.x;
      if (pose.press >= 0 && since < 0)
        drawCrushContact(
          ctx,
          contact,
          Math.PI / 2,
          width,
          pose.since,
          (pose.press + 1) / ROUNDS + (own ? 0.4 : 0),
          now,
        );
      if (own && since < 0)
        drawCrushStrain(
          ctx,
          contact,
          Math.PI / 2,
          width,
          pose.crush,
          STRAIN,
          now,
        );
      // smashed flat: glitter jetting out along the bar
      contact.y = base;
      drawCrushBurst(ctx, contact, Math.PI / 2, width, since, now);
      drawDetonation(ctx, contact, since, own ? OWN_BLAST : BURST_BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
