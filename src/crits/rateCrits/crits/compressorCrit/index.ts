// Compressor, a rate crit: a wisp sits at every bar's right end and one tall
// slab of light slides in beside them all and pushes without letting up, the
// wisps squashing, bulging and buckling, trembling harder, glitter oozing out
// above and below, giving in jolts closer and closer; they crumble, the
// pressure blasting along every bar, and each readout turns over: the bar
// runs faster for good, its own the most
import meta from "./meta";
import {
  crumbleAt,
  crumbleBits,
  drawCrumbleDust,
  drawPressGrind,
  drawSlab,
  planPress,
  pressAt,
  pressWarp,
  tickPress,
  type Press,
  type PressPose,
  type PressWarp,
} from "../../../../shared/animationStyles/crush";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
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
import { bottomBarY, topBarY } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the wisps IN from the bars' right ends, R round; the slab ramming in from
// SLIDE px out over SLIDE_MS, faster and faster, the wisps squashing IMPACT
// more on the hit, then the press
const IN = 70;
const R = 60;
const WISP = WISP_SIZE * 1.8;
const SLIDE = 560;
const SLIDE_MS = 260;
const IMPACT = 0.45;
const IMPACT_MS = 90;
const IMPACT_THROB = 0.5;
// each give lurches the slab LURCH px further in, settling over LURCH_MS
const LURCH = 26;
const LURCH_MS = 70;
const PRESS_MS = 1400;
const GIVES = 5;
const CRUMBLE_SHAKE = 2.6;
// each wisp a ball of GLINTS glimmers round its head, warped by the press,
// buckling its own way
const GLINTS = 9;
const GLINT = 26;
const THICK = 56;
// the slab bowing BOW px in between the wisps (END_BOW of that at its ends),
// shuddering BOW_SHUDDER, throbbing GIVE_THROB thicker at a give; the wisps
// squashing SQUASH of their width
const BOW = 70;
const END_BOW = 0.6;
const BOW_SHUDDER = 8;
const GIVE_THROB = 0.35;
const THROB_MS = 140;
const SQUASH = 0.65;
const PAST = 120;
const TREMBLE = 8;
const GRIND = 2.6 * R;
// the crumble: the slab blasting on through the wisps and along the bars,
// faster and faster, PAST_LEFT past their left ends over THROUGH_MS, the
// pressure blasting along each bar behind it, each readout turning over as
// it passes, SHOCK_EVERY ms apart top down
const PAST_LEFT = 140;
const THROUGH_MS = 260;
const FADE_MS = 160;
const BLAST_MS = 360;
const BLAST = 70;
const SHOCK_EVERY = 20;
const DUST = 160;
const DUST_MS = 700;
const HIT_BLAST = 90;
const OWN_HIT_BLAST = 170;
const TAIL_MS = 1000;
// shakes by step: a give's jolt (the press rumbles itself), a bar, its own
const SHAKES = [0.2, 0.5, 1];

interface Ball {
  bar: number;
  bend: number;
  at: number;
}
interface State {
  press: Press;
  pose: PressPose;
  balls: Ball[];
}
const states = new WeakMap<Running, State>();
const BITS = crumbleBits(GLINTS, R, 2 * R, 8100);
const warp: PressWarp = { a: 0, h: 0, turn: 0, widen: 1 };
const shiver: Point = { x: 0, y: 0 };
const ball: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
// the slab's bend points, reused frame to frame
const slab: Point[] = [];
function setSpot(n: number, x: number, y: number): number {
  if (n >= slab.length) slab.push({ x: 0, y: 0 });
  slab[n].x = x;
  slab[n].y = y;
  return n + 1;
}
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const atHead = () => head;

registerFloorCrit("compressorCrit", {
  // faster for good, its own more
  reward(t) {
    t.floor.incomeIntervalSeconds /= t.own
      ? meta.values.ownSpeed
      : meta.values.speed;
  },
  plan(r, bars, hit) {
    const press = planPress(IN_MS + SLIDE_MS, PRESS_MS, GIVES, {
      depth: 1,
      crumbleShake: CRUMBLE_SHAKE,
      bang: false,
    });
    for (const at of press.gives) hit(0, at, 0);
    hit(0, press.startMs, 0);
    // the slab passes the readouts this far into its run through
    const half = r.play.barHalfWidth;
    const contact = half - IN + R - 2 * R * (1 - pressWarp(1, 0, 1, 0, warp).h);
    const passes = Math.sqrt(contact / (contact + half + PAST_LEFT));
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const balls = order.map((bar, k) => ({
      bar,
      bend: k % 2 ? 1 : -1,
      at: press.crumbleMs + THROUGH_MS * passes + k * SHOCK_EVERY,
    }));
    for (const b of balls) hit(b.bar, b.at, b.bar === 0 ? 2 : 1);
    states.set(r, {
      press,
      pose: { crush: 0, strain: 0, since: Infinity },
      balls,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { press, pose } = state;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickPress(press, ms, r.shake);
    pressAt(press, ms, pose);
    trembleAt(pose.strain, ms, TREMBLE, shiver);
    const crumbled = ms >= press.crumbleMs;
    const hitBy =
      ms >= press.startMs ? Math.exp(-(ms - press.startMs) / IMPACT_MS) : 0;
    const lurch = crumbled ? 0 : Math.exp(-pose.since / LURCH_MS);
    const k = Math.min(1, pose.crush + IMPACT * hitBy + 0.1 * lurch);
    const half = r.play.barHalfWidth;
    const ram = clamp01((ms - IN_MS) / SLIDE_MS);
    const show = clamp01((ms - IN_MS) / 80);
    // pressed from the right: the contact `squash` of the wisp's width in
    const squash = pressWarp(k, 0, 1, 0, warp).h;
    const right = bars[0].x + half - IN + R;
    const contactX = right - 2 * R * (1 - squash);
    for (const b of state.balls) {
      const bar = bars[b.bar];
      if (crumbled || ms < IN_MS) continue;
      // the ball's glimmers, warped across (up and down) and along (left)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let g = 0; g < GLINTS; g++) {
        const bit = BITS[g];
        pressWarp(k, bit.x / R, -bit.y / (2 * R), b.bend, warp);
        stampGlimmer(
          ctx,
          right - 2 * R + warp.h * 2 * R + shiver.x * 0.5,
          bar.y + warp.a * R + shiver.y * 0.5,
          GLINT * warp.widen,
          g + b.bar,
          g % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
      pressWarp(k, 0, 0.5, b.bend, warp);
      head.x = right - 2 * R + warp.h * 2 * R + shiver.x * 0.5;
      head.y = bar.y + warp.a * R + shiver.y * 0.5;
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.scale(1 - SQUASH * k, warp.widen * (1 + 0.2 * k));
      ctx.translate(-head.x, -head.y);
      drawWispHead(ctx, atHead, ms, now, WISP, 0.3 + 0.7 * pose.strain);
      ctx.restore();
    }
    // the slab, the full height of the bars: held at every wisp, bowing in
    // between them and at its ends, harder as it strains, throbbing thicker
    // at the hit and every give; once they crumble it blasts on through
    const since = ms - press.crumbleMs;
    const through = clamp01(since / THROUGH_MS) ** 2;
    const run = contactX - (bars[0].x - half) + PAST_LEFT;
    const held =
      contactX +
      THICK / 2 +
      (1 - ram * ram) * SLIDE -
      LURCH * lurch -
      through * run +
      shiver.x;
    const bow = crumbled
      ? 0
      : BOW * k + BOW_SHUDDER * pose.strain * Math.sin(ms * 0.8);
    const thick =
      THICK *
      (1 +
        IMPACT_THROB * hitBy +
        GIVE_THROB * Math.max(0, 1 - pose.since / THROB_MS));
    const alpha = show * (1 - clamp01((since - THROUGH_MS) / FADE_MS));
    const balls = state.balls;
    let n = 0;
    n = setSpot(n, held - bow * END_BOW, topBarY(bars) - PAST);
    for (let i = 0; i < balls.length; i++) {
      const y = bars[balls[i].bar].y;
      n = setSpot(n, held, y);
      if (i < balls.length - 1)
        n = setSpot(n, held - bow, (y + bars[balls[i + 1].bar].y) / 2);
    }
    n = setSpot(n, held - bow * END_BOW, bottomBarY(bars) + PAST);
    for (let i = 0; i < n - 1; i++)
      drawSlab(ctx, slab[i], slab[i + 1], thick, alpha, now);
    for (const b of state.balls) {
      const bar = bars[b.bar];
      if (ms >= press.startMs && !crumbled) {
        spot.x = contactX;
        spot.y = bar.y;
        drawPressGrind(ctx, spot, Math.PI, GRIND, pose, ms, now);
      }
      if (crumbled) {
        ball.x = contactX - R;
        ball.y = bar.y + R;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        beginLightBatch(ctx);
        for (let g = 0; g < GLINTS; g++) {
          crumbleAt(BITS[g], ball, since, spot);
          stampGlimmer(
            ctx,
            spot.x,
            spot.y,
            GLINT * Math.max(0, 1 - since / DUST_MS),
            g,
            g % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
        endLightBatch(ctx);
        ctx.restore();
        ball.y = bar.y;
        drawCrumbleDust(ctx, ball, DUST, since);
        // the pressure blasting along the bar behind the slab
        const u = since / BLAST_MS;
        if (u < 1) {
          from.x = ball.x;
          from.y = to.y = bar.y;
          to.x = Math.max(bar.x - half, held);
          drawBeam(ctx, from, to, BLAST, 1 - u);
        }
      }
      drawDetonation(
        ctx,
        bar,
        ms - b.at,
        b.bar === 0 ? OWN_HIT_BLAST : HIT_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
