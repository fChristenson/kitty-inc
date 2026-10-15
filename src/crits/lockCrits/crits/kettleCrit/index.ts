// Kettle, a lock crit: the number arcs down onto the dark locked floor's lock
// and snaps into a gold kettle there; it heats up, its lid rattling ever
// faster, the body trembling and glowing hotter, light streaking in, steam
// puffing harder from the spout and the rumble rising, until it blows its
// lid: a jet of steam and gold bursts the floor open; then it tips and pours
// its steam down onto the new floor's button: the opened floor's next
// payouts each brew a free tap on it
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import { addFreeTaps } from "../../../buttonCrits/buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { liveEffect } from "../../../../shared/detachedJob";
import { playSpinTick } from "../../../../sound";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  flipUpgradeButton,
  getButtonCenter,
} from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing down onto the lock, the kettle snapping in there
const ARC_MS = 170;
const ARC_RISE = 120;
const SNAP_MS = 110;
const SNAP_GROW = 0.5;
const SNAP_FLASH = 300;
// heating: the lid rattling RATTLES times, quicker and higher, up to
// RATTLE px; the body trembling, glowing and pulling light in
const HEAT_MS = 1200;
const OPEN_MS = ARC_MS + HEAT_MS;
const RATTLES = 16;
const RATTLE = 26;
const LID_TILT = 0.22;
const TREMBLE = 14;
const GLOW = 400;
const STREAKS = 300;
const HOT = 0.75;
// steam puffing from the spout, PUFF_RISE px up, quicker as it heats
const PUFFS = 8;
const PUFF_RISE = 170;
const PUFF_DRIFT = 50;
const PUFF_SIZE = [18, 80] as const;
const PUFF_RATE = [0.0016, 0.0062] as const;
// the climax: the lid flung LID_RISE px up and LID_SIDE away over LID_MS,
// a jet JET_LEN px up for JET_MS, the floor bursting open
const LID_MS = 300;
const LID_RISE = 700;
const LID_SIDE = 220;
const LID_TURNS = 3;
const JET_MS = 280;
const JET_LEN = 520;
const JET_WIDTH = 70;
const OPEN_BLAST = 330;
// the pour: tipping TILT over TILT_MS, then GLOBS of steam and gold, one
// every GLOB_GAP_MS, each crossing to the button in GLOB_MS on an arc
// GLOB_ARC px high
const TILT = 0.75;
const TILT_FROM = OPEN_MS + 60;
const TILT_MS = 110;
const POUR_FROM = TILT_FROM + TILT_MS;
const GLOBS = 26;
const GLOB_GAP_MS = 10;
const GLOB_MS = 220;
const GLOB_ARC = 140;
const GLOB_STEAM = 64;
const GLOB_CORE = 26;
const FIRST_LAND = POUR_FROM + GLOB_MS;
const LAST_LAND = POUR_FROM + (GLOBS - 1) * GLOB_GAP_MS + GLOB_MS;
const LAND_BLAST = 200;
const BUTTON_GLOW = 220;
const FADE_MS = 160;
const TAIL_MS = 900;
// shakes by step: the kettle snapping in, the lid blowing, onto the button
const SHAKES = [0.6, 3.6, 1.6];

// the kettle's sprite, spout to the right, drawn KETTLE px across round
// its body's middle (MID); the lid's, sitting on TOP
const SPRITE = 256;
const KETTLE = 200;
const S = KETTLE / SPRITE;
const MID: Point = { x: 128, y: 140 };
const TOP: Point = { x: 128, y: 80 };
const SPOUT: Point = { x: 246, y: 98 };
const LID_W = 128;
const LID_H = 64;
const LID_BASE = 52;
const OUTLINE = "#4a2600";
let body: HTMLCanvasElement | null = null;
let lid: HTMLCanvasElement | null = null;

function goldFill(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): CanvasGradient {
  const fill = g.createRadialGradient(x, y, 4, x, y, r);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.3, "#fff3b0");
  fill.addColorStop(0.7, "#ffcf1f");
  fill.addColorStop(1, "#f29a00");
  return fill;
}

function buildSprites(): void {
  if (body) return;
  body = document.createElement("canvas");
  body.width = body.height = SPRITE;
  const g = body.getContext("2d")!;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = OUTLINE;
  // the handle round the left
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(70, 112);
  g.bezierCurveTo(10, 96, 6, 190, 64, 186);
  g.stroke();
  g.lineWidth = 12;
  g.strokeStyle = "#e08a00";
  g.stroke();
  // the spout up to the right
  g.beginPath();
  g.moveTo(186, 178);
  g.quadraticCurveTo(226, 168, 236, 104);
  g.lineTo(254, 94);
  g.quadraticCurveTo(244, 150, 194, 140);
  g.closePath();
  g.lineWidth = 10;
  g.strokeStyle = OUTLINE;
  g.stroke();
  g.fillStyle = goldFill(g, 220, 120, 70);
  g.fill();
  // the round body on its flat base
  g.beginPath();
  g.moveTo(56, 204);
  g.bezierCurveTo(30, 120, 78, 76, 128, 76);
  g.bezierCurveTo(178, 76, 226, 120, 200, 204);
  g.quadraticCurveTo(128, 222, 56, 204);
  g.closePath();
  g.stroke();
  g.fillStyle = goldFill(g, 104, 118, 130);
  g.fill();
  g.fillStyle = "#e08a00";
  g.beginPath();
  g.ellipse(128, 206, 70, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // its gloss
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath();
  g.ellipse(92, 124, 13, 30, 0.45, 0, Math.PI * 2);
  g.fill();

  lid = document.createElement("canvas");
  lid.width = LID_W;
  lid.height = LID_H;
  const l = lid.getContext("2d")!;
  l.lineJoin = "round";
  l.strokeStyle = OUTLINE;
  l.lineWidth = 8;
  const lidShape = () => {
    l.beginPath();
    l.ellipse(64, LID_BASE, 50, 22, 0, Math.PI, 0);
    l.closePath();
    l.moveTo(76, 22);
    l.arc(64, 22, 12, 0, Math.PI * 2);
  };
  lidShape();
  l.stroke();
  l.fillStyle = goldFill(l, 54, 30, 56);
  lidShape();
  l.fill();
}

// the opened floor's next `left` payouts each brewing free taps on its button
const flipButton = liveEffect(flipUpgradeButton);
const brews = defineBarEffect<{ floor: Floor; left: number }>({
  onPayout: (v) => {
    if (isFloorMaxed(v.floor)) return undefined;
    addFreeTaps(v.floor, meta.values.taps);
    flipButton(v.floor);
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

interface State {
  charge: Charge;
  // the spout facing the button (1 right, -1 left), the button and the
  // tipped spout's tip from the lock's middle
  face: number;
  button: Point;
  tip: Point;
  rattled: number;
}
const states = new WeakMap<Running, State>();
const WHITE = fadeStops(COLOR.white);
const GOLD = fadeStops(COLOR.heavenlyGold);
const shiver: Point = { x: 0, y: 0 };
const core: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

// the lid's lift (0..1) at heating share u: quickening bounces, higher as
// it heats
function lidBounce(u: number): number {
  return Math.abs(Math.sin(RATTLES * Math.PI * u ** 1.6));
}

function drawKettle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  face: number,
  tilt: number,
  scale: number,
  lift: number,
  lidTilt: number,
  hot: number,
  withLid: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * face);
  ctx.scale(face * S * scale, S * scale);
  ctx.drawImage(body!, -MID.x, -MID.y);
  if (hot > 0) {
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * hot;
    ctx.drawImage(body!, -MID.x, -MID.y);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
  }
  if (withLid) {
    ctx.translate(TOP.x - MID.x, TOP.y - MID.y - lift);
    ctx.rotate(lidTilt);
    ctx.drawImage(lid!, -LID_W / 2, -LID_BASE);
  }
  ctx.restore();
}

registerFloorCrit("kettleCrit", {
  reward(t) {
    const { payouts } = meta.values;
    const left = (brews.get(t.floor)?.left ?? 0) + payouts;
    brews.set(t.floor, { floor: t.floor, left });
    t.flipButton();
    t.punch(`Brewing x${payouts}`);
  },
  plan(r, _bars, hit) {
    buildSprites();
    const lock = getLockCenter();
    const btn = getButtonCenter(false);
    const button = { x: btn.x - lock.x, y: btn.y - lock.y };
    const face = button.x < 0 ? -1 : 1;
    const a = TILT * face;
    const sx = (SPOUT.x - MID.x) * S * face;
    const sy = (SPOUT.y - MID.y) * S;
    const tip = {
      x: sx * Math.cos(a) - sy * Math.sin(a),
      y: sx * Math.sin(a) + sy * Math.cos(a),
    };
    states.set(r, {
      charge: planCharge(ARC_MS, HEAT_MS, {
        bang: false,
        shake: [0.06, 0.7],
        everyMs: [170, 45],
      }),
      face,
      button,
      tip,
      rattled: 0,
    });
    hit(0, ARC_MS, 0);
    hit(0, OPEN_MS, 1);
    hit(0, FIRST_LAND, 2);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { face, button, tip } = state;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
        { alpha: 1 - p * p },
      );
      return;
    }
    tickCharge(state.charge, ms, r.shake);
    const fade = 1 - clamp01((ms - LAST_LAND) / FADE_MS);
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;

    if (ms < OPEN_MS) {
      // heating
      const u = (ms - ARC_MS) / HEAT_MS;
      const c = chargeAt(state.charge, ms);
      trembleAt(c, ms, TREMBLE, shiver);
      core.x = lock.x + shiver.x;
      core.y = lock.y + shiver.y;
      const bounce = lidBounce(u);
      const rattles = Math.floor(RATTLES * u ** 1.6);
      if (rattles > state.rattled) {
        state.rattled = rattles;
        playSpinTick();
      }
      drawChargeStreaks(ctx, core, c, STREAKS, ms);
      drawChargeGlow(ctx, core, c, GLOW, now);
      const snap = clamp01((ms - ARC_MS) / SNAP_MS);
      const grow = 1 + SNAP_GROW * (1 - snap) ** 2;
      drawKettle(
        ctx,
        core.x,
        core.y,
        face,
        0,
        grow,
        bounce * RATTLE * (0.25 + 0.75 * c) / S,
        LID_TILT * (0.3 + 0.7 * c) * Math.sin(u * RATTLES * 1.3),
        HOT * c,
        true,
      );
      // steam puffing from the spout, harder as it heats
      ctx.globalCompositeOperation = "lighter";
      const phase =
        (ms - ARC_MS) * lerp(PUFF_RATE[0], PUFF_RATE[1], c);
      const sx = core.x + (SPOUT.x - MID.x) * S * face;
      const sy = core.y + (SPOUT.y - MID.y) * S;
      for (let i = 0; i < PUFFS; i++) {
        const p = (phase + i / PUFFS) % 1;
        ctx.globalAlpha = alpha * (1 - p) * (0.25 + 0.6 * c);
        drawGlow(
          ctx,
          WHITE,
          sx + face * PUFF_DRIFT * p + 8 * Math.sin(p * 9 + i),
          sy - PUFF_RISE * p,
          lerp(PUFF_SIZE[0], PUFF_SIZE[1], p) * (0.5 + 0.5 * c),
        );
      }
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
      if (snap < 1) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * (1 - snap);
        drawGlow(ctx, WHITE, lock.x, lock.y, SNAP_FLASH);
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = previous;
      }
      return;
    }

    // blown open: the kettle tipping towards the button and pouring
    const tilt = TILT * clamp01((ms - TILT_FROM) / TILT_MS);
    ctx.globalAlpha = alpha * fade;
    if (fade > 0)
      drawKettle(ctx, lock.x, lock.y, face, tilt, 1, 0, 0, HOT * 0.4, false);
    ctx.globalAlpha = alpha;

    // the jet blasting up out of it
    const jet = (ms - OPEN_MS) / JET_MS;
    if (jet < 1) {
      at.x = lock.x;
      at.y = lock.y + (TOP.y - MID.y) * S;
      to.x = at.x;
      to.y = at.y - JET_LEN * Math.min(1, jet * 4);
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawBeam(ctx, at, to, JET_WIDTH * (1 - 0.5 * jet), 1 - jet * jet);
      endLightBatch(ctx);
      ctx.globalAlpha = alpha * (1 - jet);
      drawGlow(ctx, WHITE, to.x, to.y, JET_WIDTH * 2.4);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }

    // the lid flung off
    const fly = (ms - OPEN_MS) / LID_MS;
    if (fly < 1) {
      const x = lock.x - face * LID_SIDE * fly;
      const y = lock.y + (TOP.y - MID.y) * S - LID_RISE * fly;
      ctx.save();
      ctx.globalAlpha = alpha * (1 - fly * fly * fly);
      ctx.translate(x, y);
      ctx.rotate(-face * LID_TURNS * Math.PI * 2 * fly);
      ctx.scale(S, S);
      ctx.drawImage(lid!, -LID_W / 2, -LID_BASE);
      ctx.restore();
    }

    // steam and gold pouring onto the button
    if (ms >= POUR_FROM && ms < LAST_LAND) {
      const fx = lock.x + tip.x;
      const fy = lock.y + tip.y;
      const bx = lock.x + button.x;
      const by = lock.y + button.y;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < GLOBS; i++) {
        const u = (ms - POUR_FROM - i * GLOB_GAP_MS) / GLOB_MS;
        if (u < 0) break;
        if (u >= 1) continue;
        const x = lerp(fx, bx, u) + 6 * Math.sin(i * 2.3 + ms * 0.02);
        const y = lerp(fy, by, u) - GLOB_ARC * 4 * u * (1 - u);
        ctx.globalAlpha = alpha * 0.55;
        drawGlow(ctx, WHITE, x, y, GLOB_STEAM * (0.7 + 0.5 * u));
        ctx.globalAlpha = alpha;
        drawGlow(ctx, GOLD, x, y, GLOB_CORE);
      }
      ctx.globalCompositeOperation = previous;
    }

    // the button soaking it up
    if (ms >= FIRST_LAND) {
      at.x = lock.x + button.x;
      at.y = lock.y + button.y;
      const soak = clamp01((ms - FIRST_LAND) / (LAST_LAND - FIRST_LAND));
      const glow = ms < LAST_LAND ? soak : 1 - clamp01((ms - LAST_LAND) / 200);
      if (glow > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * glow;
        drawGlow(ctx, GOLD, at.x, at.y, BUTTON_GLOW);
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = previous;
      }
      drawDetonation(ctx, at, ms - FIRST_LAND, LAND_BLAST, now);
    }
    drawDetonation(ctx, lock, ms - OPEN_MS, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
