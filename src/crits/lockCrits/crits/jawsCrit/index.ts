// Jaws, a lock crit: the number drops onto the dark locked floor's lock and
// swells into a ball of glitter; a slab of light slams down on it from above
// and another up from below, and they bite down without letting up, the
// ball squashing and bulging, trembling harder, glitter oozing out of the
// sides, giving in jolts closer and closer, until it crumbles in a burst
// and the floor bursts open; the crumbs pour onto the opened floor's bar:
// its first payout is a huge one
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import {
  crumbleAt,
  crumbleFrom,
  drawCrumbleDust,
  drawPressGrind,
  drawSlab,
  planPress,
  pressAt,
  pressWarp,
  tickPress,
  type CrumbleBit,
  type Press,
  type PressPose,
  type PressWarp,
} from "../../../../shared/animationStyles/crush";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 160;
const ARC_RISE = 120;
// the ball: BEADS of glitter BALL px round
const BEADS = 70;
const BALL = 120;
const BEAD = 26;
// the slabs slamming in OPEN px from it over SLAM_MS, then biting for
// PRESS_MS, giving GIVES times; SLAB px either side, THICK
const SLAM_MS = 140;
const OPEN = 600;
const PRESS_MS = 1050;
const GIVES = 6;
const SLAB = 230;
const THICK = 50;
const TREMBLE = 10;
const JUDDER = 5;
const GRIND = 300;
// after the crumble: the crumbs flung out for SCATTER_MS, then pouring onto
// the bar over POUR_MS (STAGGER_MS apart)
const SCATTER_MS = 200;
const POUR_MS = 170;
const STAGGER_MS = 2;
const SLAM_BLAST = 160;
const OPEN_BLAST = 440;
const BAR_BLAST = 240;
const DUST = 360;
// shakes by step: a give or the slam, the floor bursting open, onto its bar
const SHAKES = [0.4, 3, 1.4];

interface Bead {
  a: number;
  h: number;
  bend: number;
}
// the ball's beads as parts of a pressed target 2 BALL tall
const BEAD_PARTS: Bead[] = Array.from({ length: BEADS }, (_, i) => {
  const angle = holeHash(i, 9310) * Math.PI * 2;
  const d = Math.sqrt(holeHash(i, 9311));
  return {
    a: Math.cos(angle) * d,
    h: 0.5 + 0.5 * Math.sin(angle) * d,
    bend: i % 2 ? 0.6 : -0.6,
  };
});
const warp: PressWarp = { a: 0, h: 0, turn: 0, widen: 1 };
const BITS: CrumbleBit[] = crumbleFrom(
  BEAD_PARTS.map((p) => {
    pressWarp(1, p.a, p.h, p.bend, warp);
    return { x: warp.a * BALL, y: BALL - warp.h * BALL * 2 };
  }),
  BALL,
  9320,
);

interface State {
  press: Press;
  pose: PressPose;
  slamAt: number;
  openAt: number;
  landAt: number;
  bar: Point;
  barHalf: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const bead: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const grind: Point = { x: 0, y: 0 };
const crumb: Point = { x: 0, y: 0 };

// a pressed bar: its next payout pays this many at once, then it's spent
const pressed = defineBarEffect<number>({
  payout: (times) => times,
  onPayout: () => undefined,
});

registerFloorCrit("jawsCrit", {
  reward(t) {
    t.flipRate();
    pressed.set(t.floor, meta.values.payout);
    t.punch(`x${meta.values.payout} Payout`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const slamAt = ARC_MS + SLAM_MS;
    const press = planPress(slamAt, PRESS_MS, GIVES, { depth: 1, bang: false });
    hit(0, slamAt, 0);
    for (const at of press.gives) hit(0, at, 0);
    const openAt = press.crumbleMs;
    hit(0, openAt, 1);
    const landAt = openAt + SCATTER_MS + (BEADS - 1) * STAGGER_MS + POUR_MS;
    hit(0, landAt, 2);
    const box = getIncomeBarBox(false);
    states.set(r, {
      press,
      pose: { crush: 0, strain: 0, since: Infinity },
      slamAt,
      openAt,
      landAt,
      bar: {
        x: box.x + box.width / 2 - lock.x,
        y: box.y + box.height / 2 - lock.y,
      },
      barHalf: box.width / 2,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { press, pose, slamAt, openAt } = state;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
      return;
    }
    tickPress(press, ms, r.shake);
    pressAt(press, ms, pose);
    trembleAt(pose.strain, ms, TREMBLE, shiver);
    const k = pose.crush;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    // the jaws' gap: the ball's height as the press squashes it from both
    // ends, centred on the lock
    const half = BALL * pressWarp(k, 0, 1, 0, warp).h;
    if (ms < openAt) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BEAD_PARTS.length; i++) {
        const p = BEAD_PARTS[i];
        pressWarp(k, p.a, p.h, p.bend, warp);
        const judder = JUDDER * pose.strain * Math.sin(ms * 0.9 + i);
        bead.x = warp.a * BALL + judder + shiver.x * 0.5;
        bead.y = half - warp.h * BALL * 2 + shiver.y * 0.3;
        stampGlimmer(
          ctx,
          bead.x,
          bead.y,
          BEAD * warp.widen,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      // the slabs slamming in from above and below, then biting
      const slam = clamp01((ms - ARC_MS) / SLAM_MS) ** 2;
      const gap = lerp(OPEN, 0, slam);
      for (let dir = -1; dir <= 1; dir += 2) {
        const y = dir * (half + gap + THICK / 2) + shiver.y;
        a.x = -SLAB + shiver.x;
        b.x = SLAB + shiver.x;
        a.y = b.y = y;
        drawSlab(ctx, a, b, THICK, 1, now);
        if (ms >= slamAt) {
          grind.x = shiver.x;
          grind.y = dir * half + shiver.y;
          drawPressGrind(
            ctx,
            grind,
            (-dir * Math.PI) / 2,
            GRIND,
            pose,
            ms,
            now,
          );
        }
      }
    }
    drawDetonation(ctx, ORIGIN, ms - slamAt, SLAM_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    drawCrumbleDust(ctx, ORIGIN, DUST, ms - openAt);
    // the crumbs flung out, then pouring onto the opened floor's bar
    const since = ms - openAt;
    if (since >= 0 && ms < state.landAt) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BITS.length; i++) {
        const pour = since - SCATTER_MS - i * STAGGER_MS;
        crumbleAt(
          BITS[i],
          ORIGIN,
          Math.min(since, SCATTER_MS + i * STAGGER_MS),
          crumb,
        );
        if (pour >= POUR_MS) continue;
        if (pour > 0) {
          const u = (pour / POUR_MS) ** 2;
          crumb.x = lerp(
            crumb.x,
            state.bar.x + (holeHash(i, 9312) * 2 - 1) * state.barHalf * 0.8,
            u,
          );
          crumb.y = lerp(crumb.y, state.bar.y, u);
        }
        stampGlimmer(
          ctx,
          crumb.x,
          crumb.y,
          BEAD,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
