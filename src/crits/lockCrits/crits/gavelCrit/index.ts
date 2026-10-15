// Gavel, a lock crit ("going once, going twice, sold!"): the number drops onto
// the dark locked floor's lock and swells into a ball of glitter; a giant
// gavel of light rises over it, trembling and glowing, and swings down on
// it: once, twice, each a contact line, cracks, the ball squashing flat and
// glitter squirting out, each wind-up higher and quicker; the third, swung
// up highest, crushes it flat and the lock bursts open; the shockwave rolls
// down onto the floor below, its workers each going up a perma tier
import meta from "./meta";
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  drawSlab,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { smoothstep } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  celebrateWorkerBoost,
  getRenderedWorkerCount,
  promoteWorkerPermaTier,
} from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number dropping onto the lock, shrinking into the ball
const DROP_MS = 220;
const DROP_SHRINK = 0.3;
// the ball: R px round, resting REST px over the lock's price
const R = 90;
const REST = 46;
const WISP = WISP_SIZE * 2.6;
const GROW_MS = 100;
const GLINTS = 10;
const GLINT_STEP = (Math.PI * 2) / GLINTS;
const GLINT_SPIN = 0.004;
const GLINT_SIZE = 22;
const LINGER_MS = 50;
// the gavel: its handle HANDLE px long from a pivot right of the ball, its
// head HEAD long and THICK across, swung up LIFT_A rad at a full wind-up
const HANDLE = 320;
const HANDLE_W = 26;
const HEAD = 190;
const THICK = 92;
const BAND = 12;
const LIFT_A = 1.95;
const APPEAR_AT = 120;
const APPEAR_MS = 200;
const FADE_AFTER = 60;
const FADE_MS = 220;
const TREMBLE = 16;
// the slams: the gaps closing, the last wound up WIND_UP as long
const FIRST_MS = 640;
const SLAMS = 3;
const GAPS: [number, number] = [460, 300];
const WIND_UP = 1.3;
const CLIMAX_SHAKE = 3.2;
const POWER: [number, number] = [0.6, 1];
// the lock's price jolted down by each slam, washed white
const JOLT: [number, number] = [14, 26];
const JOLT_MS = 150;
// the opening, and the shockwave rolling down onto the floor below
const OPEN_GAP_MS = 30;
const OPEN_BLAST = 420;
const WAVE_MS = 230;
const LAND_MS = 300;
const WAVE_LINE: [number, number] = [70, 24];
const WAVE_GLINTS = 14;
const WAVE_GLINT = 30;
const TAIL_MS = Math.max(LAND_MS, DETONATION_MS - WAVE_MS);
// shakes by step: a slam's jolt (the slams shake themselves), the opening,
// the shockwave landing
const SHAKES = [0.3, 1.4, 1.2];
const DOWN = Math.PI / 2;

const LOCK = getLockCenter();
// the floor's middle, from the lock
const MID_DX = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - LOCK.x;
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

interface State {
  crush: Crush;
  pose: CrushPose;
  last: number;
  openAt: number;
}
const states = new WeakMap<Running, State>();
const squash: Point = { x: 1, y: 1 };
const scale: Point = { x: 1, y: 1 };
const shiver: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const pivot: Point = { x: 0, y: 0 };
const hub: Point = { x: 0, y: 0 };
const face: Point = { x: 0, y: 0 };
const back: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
const BALL: Point = { x: 0, y: -R };
const ballAt = () => BALL;

registerFloorCrit("gavelCrit", {
  // every worker on the open floor under the one it opened up a perma tier
  reward(t) {
    const below = t.floors[t.floors.indexOf(t.floor) - 1];
    if (!below?.unlocked) return;
    for (let i = 0; i < getRenderedWorkerCount(below); i++) {
      for (let k = 0; k < meta.values.permaTiers; k++)
        promoteWorkerPermaTier(below, i);
      celebrateWorkerBoost(below, i, t.now);
    }
  },
  plan(r, _bars, hit) {
    const crush = planCrush(FIRST_MS, SLAMS, GAPS, WIND_UP, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
      lift: [0.5, 0.78],
      hold: 0.25,
    });
    const last = crush.slams[SLAMS - 1];
    const openAt = last + OPEN_GAP_MS;
    for (let k = 0; k < SLAMS - 1; k++) hit(0, crush.slams[k], 0);
    hit(0, openAt, 1);
    hit(0, openAt + WAVE_MS, 2);
    r.play.hideBars?.([0]);
    states.set(r, {
      crush,
      pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
      last,
      openAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { crush, pose, last, openAt } = state;
    const now = r.startedAt + ms;
    const lock = bars[0];
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    squashScale(pose.crush, squash);
    const baseY = lock.y - REST;
    contact.x = lock.x;
    contact.y = baseY - 2 * R * squash.y;
    // how far into the slams the next wind-up is, 0 the first to 1 the last
    const level = (pose.press + 1) / (SLAMS - 1);

    // the lock's price, knocked down by each slam
    if (ms < openAt) {
      let jolt = 0;
      let wash = 0;
      if (pose.press >= 0 && pose.since < JOLT_MS) {
        wash = (1 - pose.since / JOLT_MS) ** 2;
        jolt = lerp(JOLT[0], JOLT[1], pose.press / (SLAMS - 1)) * wash;
      }
      ctx.save();
      ctx.translate(lock.x, lock.y + jolt);
      r.play.drawBar?.(ctx, 0, wash);
      ctx.restore();
    }

    // the ball, squashed flat from its foot, glitter turning round it
    if (ms >= DROP_MS && ms < last + LINGER_MS) {
      const grow = clamp01((ms - DROP_MS) / GROW_MS);
      ctx.save();
      ctx.translate(lock.x, baseY);
      ctx.scale(squash.x, squash.y);
      drawWispHead(ctx, ballAt, ms, now, WISP * grow, 0.4 + 0.6 * pose.crush);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      const spin = now * GLINT_SPIN;
      for (let i = 0; i < GLINTS; i++) {
        const a = spin + i * GLINT_STEP;
        stampGlimmer(
          ctx,
          Math.cos(a) * R * 0.75,
          -R + Math.sin(a) * R * 0.75,
          GLINT_SIZE * grow * (0.7 + 0.3 * Math.sin(now * 0.02 + i)),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      ctx.restore();
    }

    // cracks spreading as it's crushed, each slam's contact line and squirts
    if (ms < last && pose.press >= 0) {
      const width = 2 * R * squash.x;
      drawCrushStrain(ctx, contact, DOWN, width, pose.crush, R * 1.4, now);
      drawCrushContact(
        ctx,
        contact,
        DOWN,
        width,
        pose.since,
        lerp(POWER[0], POWER[1], pose.press / (SLAMS - 2)),
        now,
      );
    }

    // the gavel: swung up about its pivot, trembling and glowing as it's
    // wound up, its head stretching as it drives down and squashing on contact
    const appear = smoothstep(clamp01((ms - APPEAR_AT) / APPEAR_MS));
    const alpha = appear * (1 - clamp01((ms - last - FADE_AFTER) / FADE_MS));
    if (alpha > 0) {
      const theta = pose.lift * appear * LIFT_A;
      const c = ms < last ? pose.lift * lerp(0.5, 1, level) : 0;
      trembleAt(c, ms, TREMBLE, shiver);
      const dx = -Math.cos(theta);
      const dy = -Math.sin(theta);
      // the head's axis, its striking face down at rest
      const px = dy;
      const py = -dx;
      pivot.x = contact.x + HANDLE + shiver.x;
      pivot.y = contact.y - HEAD / 2 + shiver.y;
      hub.x = pivot.x + dx * HANDLE;
      hub.y = pivot.y + dy * HANDLE;
      crusherScale(crush, ms, scale);
      const len = HEAD * scale.y;
      const thick = THICK * scale.x;
      face.x = hub.x + (px * HEAD) / 2;
      face.y = hub.y + (py * HEAD) / 2;
      back.x = face.x - px * len;
      back.y = face.y - py * len;
      if (c > 0) {
        const gx = (face.x + back.x) / 2;
        const gy = (face.y + back.y) / 2;
        const previous = ctx.globalCompositeOperation;
        const base = ctx.globalAlpha;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = base * alpha * c * 0.8;
        drawGlow(ctx, GOLD, gx, gy, HEAD * (0.8 + 0.6 * c));
        ctx.globalAlpha = base * alpha * c;
        drawGlow(ctx, WHITE, gx, gy, HEAD * 0.35 * (1 + c));
        ctx.globalAlpha = base;
        ctx.globalCompositeOperation = previous;
      }
      drawBeam(ctx, pivot, hub, HANDLE_W, alpha * 0.9);
      drawSlab(ctx, face, back, thick, alpha, now);
      // a band round the head near each end
      for (let k = 0; k < 2; k++) {
        const u = k ? 0.82 : 0.18;
        const bx = face.x - px * len * u;
        const by = face.y - py * len * u;
        from.x = bx - dx * thick * 0.62;
        from.y = by - dy * thick * 0.62;
        to.x = bx + dx * thick * 0.62;
        to.y = by + dy * thick * 0.62;
        drawBeam(ctx, from, to, BAND, alpha);
      }
    }

    // sold: the ball crushed flat, the lock bursting open
    drawCrushBurst(ctx, contact, DOWN, 2 * R, ms - last, now);
    blast.x = lock.x;
    blast.y = baseY;
    drawDetonation(ctx, blast, ms - openAt, OPEN_BLAST, now);

    // the shockwave rolling down onto the floor below and spreading along it
    const age = ms - openAt;
    if (age >= 0 && age < WAVE_MS + LAND_MS) {
      const midX = lock.x + MID_DX;
      const floorY = lock.y + FLOOR_H;
      const wide = r.play.barHalfWidth;
      let x: number;
      let y: number;
      let half: number;
      let line: number;
      let a: number;
      if (age < WAVE_MS) {
        const u = age / WAVE_MS;
        x = lerp(lock.x, midX, u);
        y = lerp(baseY, floorY, u * (0.35 + 0.65 * u));
        half = lerp(R * 1.6, wide * 0.6, u);
        line = WAVE_LINE[0];
        a = 1;
      } else {
        const u = (age - WAVE_MS) / LAND_MS;
        x = midX;
        y = floorY;
        half = lerp(wide * 0.6, wide * 1.05, 1 - (1 - u) ** 3);
        line = lerp(WAVE_LINE[0], WAVE_LINE[1], u);
        a = 1 - u;
      }
      from.x = x - half;
      from.y = y;
      to.x = x + half;
      to.y = y;
      drawBeam(ctx, from, to, line * (0.4 + 0.6 * a), a);
      const previous = ctx.globalCompositeOperation;
      const base = ctx.globalAlpha;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = base * a * 0.7;
      drawGlow(ctx, GOLD, x, y, half, 0.18);
      if (age >= WAVE_MS) {
        ctx.globalAlpha = base * a * a;
        drawGlow(ctx, WHITE, x, y, half * 0.7, 0.25);
      }
      ctx.globalAlpha = base;
      beginLightBatch(ctx);
      for (let i = 0; i < WAVE_GLINTS; i++) {
        const s = (i / (WAVE_GLINTS - 1)) * 2 - 1;
        stampGlimmer(
          ctx,
          x + s * half,
          y + Math.sin(now * 0.03 + i) * 8,
          WAVE_GLINT * a * (0.6 + 0.4 * (1 - Math.abs(s))),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    // the number dropping onto the lock
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, lock.x, p),
        lerp(0, baseY - R, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
