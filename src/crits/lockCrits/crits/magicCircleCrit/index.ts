// Magic Circle, a lock crit: the number lands under the dark locked floor's
// lock, where a ring of light is drawn flat round it in one fast stroke, then
// its inner rings, a hexagram in a hexagon and beads of light; the circle
// turns, quicker every turn, each a jolt and a flash, light streaming up off
// its rim into the lock as it trembles and glows; a pillar of light erupts up
// through the lock and blows it open, and the circle slides flat onto the
// new floor's button and flashes there: a cat summoned onto it, perma tiers up
import meta from "./meta";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
} from "../../../../shared/animationStyles/summon";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  celebrateWorkerBoost,
  getRenderedWorkerCount,
  promoteWorkerPermaTier,
  recruitWorker,
} from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";

const LOCK = getLockCenter();
const BTN = getButtonCenter(false);
const TAU = Math.PI * 2;
// the number arcing down onto the circle's middle
const ARC_MS = 160;
const ARC_RISE = 110;
// the circle: flat on the ground GROUND px under the lock, RADIUS across
const GROUND = FLOOR_H * 0.3;
const RADIUS = (FLOOR_X_MAX - FLOOR_X_MIN) * 0.3;
const SQUASH = 0.3;
const ERUPT_MS = ARC_MS + 1180;
const SUMMON = planSummon(ARC_MS, ERUPT_MS, 6, summonLook(6));
const REVS = SUMMON.revs;
// each turn's jolt: the lock knocked down JOLT px, a ring of light flung out
const JOLT_MS = 150;
const JOLT: [number, number] = [6, 20];
const FLING = 0.4;
// the lock trembling and glowing as it charges
const TREMBLE = 14;
const LOCK_GLOW = 300;
// light streaming off the rim up into the lock, CYCLES trips by the eruption
const STREAKS = 18;
const CYCLES = 6;
const STREAK = 22;
// the pillar up through the lock, the blast blowing it open
const PILLAR = FLOOR_H * 1.4;
const OPEN_BLAST = 480;
const ERUPT_FLASH_MS = 220;
// the circle sliding flat onto the button, snapping on, flashing, fading
const SLIDE_AT = ERUPT_MS + 80;
const SLIDE_MS = 210;
const LAND_AT = SLIDE_AT + SLIDE_MS;
const HOLD_MS = 340;
const BUTTON_R = 190;
const SPIN = 0.018;
const BEADS = 6;
const TRAIL = 8;
const BUTTON_BLAST = 240;
// shakes by step: a turn, the eruption, the circle landing on the button
const SHAKES = [0.7, 3.4, 1.4];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const center: Point = { x: 0, y: 0 };
const button: Point = { x: 0, y: 0 };
const lockAt: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// a flat ring of light, `r` px across its middle
function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  width: number,
): void {
  if (r <= 0 || width <= 0) return;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * SQUASH, 0, 0, TAU);
  ctx.lineWidth = width;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = width / 3;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
}

// a flat hexagram and the hexagon round it, turned a0
function hexagram(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  a0: number,
  width: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = a0 + (i * TAU) / 6;
    const ax = x + Math.cos(a) * r;
    const ay = y + Math.sin(a) * r * SQUASH;
    const b = a + TAU / 3;
    const c = a + TAU / 6;
    ctx.moveTo(ax, ay);
    ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r * SQUASH);
    ctx.moveTo(ax, ay);
    ctx.lineTo(x + Math.cos(c) * r, y + Math.sin(c) * r * SQUASH);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
}

registerFloorCrit("magicCircleCrit", {
  // a cat summoned onto the floor it opened, arriving perma tiers up
  reward(t) {
    let cat = recruitWorker(t.floor, FLOOR_X_MAX, t.now);
    if (cat === null) {
      if (getRenderedWorkerCount(t.floor) === 0) return;
      cat = 0;
    }
    for (let k = 0; k < meta.values.permaTiers; k++)
      promoteWorkerPermaTier(t.floor, cat);
    celebrateWorkerBoost(t.floor, cat, t.now);
    t.punch("Summoned!");
  },
  plan(r, _bars, hit) {
    hit(0, ARC_MS, 0);
    for (const rev of REVS) hit(0, rev, 0);
    hit(0, ERUPT_MS, 1);
    hit(0, LAND_AT, 2);
    r.play.hideBars?.([0]);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const lock = bars[0];
    center.x = lock.x;
    center.y = lock.y + GROUND;
    button.x = lock.x + BTN.x - LOCK.x;
    button.y = lock.y + BTN.y - LOCK.y;

    // the last turn come round, and how fresh its jolt is
    let turned = -1;
    while (turned + 1 < REVS.length && ms >= REVS[turned + 1]) turned++;
    const since = turned >= 0 ? ms - REVS[turned] : JOLT_MS;
    const wash = since < JOLT_MS ? (1 - since / JOLT_MS) ** 2 : 0;
    const level = turned >= 0 ? (turned + 1) / REVS.length : 0;
    const charge = clamp01((ms - ARC_MS) / (ERUPT_MS - ARC_MS));

    // the lock, trembling, knocked down each turn, washed white as it charges
    if (ms < ERUPT_MS) {
      trembleAt(charge, ms, TREMBLE, shiver);
      lockAt.x = lock.x + shiver.x;
      lockAt.y = lock.y + shiver.y + lerp(JOLT[0], JOLT[1], level) * wash;
      ctx.save();
      ctx.translate(lockAt.x, lockAt.y);
      r.play.drawBar?.(ctx, 0, Math.max(wash, charge * charge * 0.7));
      ctx.restore();
      drawChargeGlow(ctx, lockAt, charge, LOCK_GLOW, now);
    }

    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        center.x * p,
        center.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.65 * p),
      );
    }

    drawSummon(ctx, SUMMON, ms, center, RADIUS);

    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";

    // each turn's flash: a ring flung out off the rim, the circle lit white
    if (wash > 0 && ms < ERUPT_MS) {
      ctx.globalAlpha = alpha * wash;
      ring(
        ctx,
        center.x,
        center.y,
        RADIUS * (1 + FLING * (1 - wash)),
        RADIUS * (0.02 + 0.05 * level) * wash,
      );
      drawGlow(
        ctx,
        WHITE,
        center.x,
        center.y,
        RADIUS * (0.7 + 0.4 * level),
        SQUASH,
      );
      ctx.globalAlpha = alpha;
    }

    // light streaming up off the rim into the lock, a trickle to a flood
    if (ms >= SUMMON.marksMs && ms < ERUPT_MS) {
      const u = clamp01((ms - SUMMON.marksMs) / (ERUPT_MS - SUMMON.marksMs));
      const travel = u * (1 + 2 * u) * CYCLES;
      const turn = ms * 0.002;
      beginLightBatch(ctx);
      for (let i = 0; i < STREAKS; i++) {
        if (hash01(i, 7301) > 0.25 + u) continue;
        const phase = (travel + hash01(i, 7302)) % 1;
        const a = hash01(i, 7303) * TAU + turn;
        const sx = center.x + Math.cos(a) * RADIUS;
        const sy = center.y + Math.sin(a) * RADIUS * SQUASH;
        const p = phase * phase;
        stampGlimmer(
          ctx,
          lerp(sx, lockAt.x, p),
          lerp(sy, lockAt.y, p),
          STREAK * (0.6 + 0.7 * u) * (1 - 0.5 * phase),
          i + ms * 0.02,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
    }

    // the eruption's white-out round the lock
    const erupted = ms - ERUPT_MS;
    if (erupted >= 0 && erupted < ERUPT_FLASH_MS) {
      const f = 1 - erupted / ERUPT_FLASH_MS;
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, WHITE, lock.x, lock.y, OPEN_BLAST * (0.6 + 0.4 * f));
      drawGlow(ctx, GOLD, center.x, center.y, RADIUS * 1.4, SQUASH);
      ctx.globalAlpha = alpha;
    }

    // the circle sliding flat onto the button, snapping on, flashing there
    if (ms >= SLIDE_AT && ms < LAND_AT + HOLD_MS) {
      const u = clamp01((ms - SLIDE_AT) / SLIDE_MS);
      const p = u * u;
      const x = lerp(center.x, button.x, p);
      const y = lerp(center.y, button.y, p);
      const rad = lerp(RADIUS * 0.85, BUTTON_R, p);
      const held = Math.max(0, ms - LAND_AT) / HOLD_MS;
      const fade = clamp01((ms - SLIDE_AT) / 50) * (1 - held);
      const spin = ms * SPIN;
      ctx.globalAlpha = alpha * fade;
      ring(ctx, x, y, rad, rad * 0.05);
      ring(ctx, x, y, rad * 0.72, rad * 0.03);
      hexagram(ctx, x, y, rad * 0.72, spin, rad * 0.025);
      beginLightBatch(ctx);
      for (let i = 0; i < BEADS; i++) {
        const a = (i * TAU) / BEADS - spin * 1.5;
        stampGlimmer(
          ctx,
          x + Math.cos(a) * rad,
          y + Math.sin(a) * rad * SQUASH,
          rad * 0.12,
          i + 40,
          COLOR.white,
        );
      }
      // its wake along the slide
      if (u < 1)
        for (let k = 1; k <= TRAIL; k++) {
          const w = Math.max(0, p - k * 0.05);
          stampGlimmer(
            ctx,
            lerp(center.x, button.x, w),
            lerp(center.y, button.y, w),
            rad * 0.25 * (1 - k / (TRAIL + 1)),
            k,
            k % 2 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
      endLightBatch(ctx);
      if (held > 0) {
        const f = (1 - held) ** 2;
        ctx.globalAlpha = alpha * f;
        ring(ctx, x, y, rad * (1 + 0.7 * held), rad * 0.08 * f);
        drawGlow(ctx, WHITE, x, y, rad * 1.2, 0.5);
      }
      ctx.globalAlpha = alpha;
    }
    ctx.globalCompositeOperation = previous;

    drawSummonPillar(ctx, SUMMON, ms, center, RADIUS, PILLAR);
    drawDetonation(ctx, lock, erupted, OPEN_BLAST, now);
    drawDetonation(ctx, button, ms - LAND_AT, BUTTON_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
