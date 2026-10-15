// Jigsaw, a lock crit: the number slams onto the dark locked floor and bursts
// into hundreds of gold jigsaw pieces strewn all over it; they put
// themselves together over the lock, edge first: ring after ring leaps up
// and snaps home at once, each with a click, a flash running round its seam
// and a jolt, quicker and quicker, the picture trembling and glowing as it
// fills; the last piece leaps high and slams into the middle, the whole
// picture blazes and bursts the floor open, and its pieces rain into the new
// floor's button: each of its next taps also arms a crit on the floor below
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  BTN_H,
  BTN_W,
  getButtonCenter,
} from "../../../../floors/upgradeButton";
import { isFloorMaxed } from "../../../../gameState";
import { armCritUpgrade } from "../../../floorCrits/upgradeCrit";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number arcing onto the lock and bursting, its pieces flung out over
// SPREAD of the floor's width and height
const ARC_MS = 170;
const ARC_RISE = 120;
const ARRIVE_BLAST = 220;
const FLING_MS = 240;
const SPREAD_W = 0.47;
const SPREAD_H = 0.38;
// the picture: COLS x ROWS pieces CELL px apart, centred on the lock; its
// rings from the edge in, the middle piece held back for last
const COLS = 19;
const ROWS = 11;
const PIECES = COLS * ROWS;
const CELL = 22;
const PANEL_W = COLS * CELL;
const PANEL_H = ROWS * CELL;
const RINGS = 6;
const LAST = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);
// the piece sprite: a BODY square with KNOB tabs (or blanks) on every side,
// on an SPR canvas; drawn at DRAW px
const SPR = 52;
const BODY = 28;
const KNOB = 6;
const KNOB_OUT = KNOB * 0.6;
const DRAW = (SPR * CELL) / BODY;
// the rings leap in from FIRST_MS, the next GAP_MS on, each piece flying up
// to FLY_MS (both shortening) and up to LEAP px high, all landing at once;
// a piece swells POP before it leaps and as it flies
const FIRST_MS = ARC_MS + FLING_MS + 70;
const GAP_MS: [number, number] = [150, 55];
const FLY_MS: [number, number] = [230, 120];
const LEAP = 150;
const POP_MS = 70;
const POP = 0.3;
const FLY_POP = 0.45;
// the last piece: leaves LAST_FLY_MS before it lands LAST_GAP_MS after the
// last ring, rising to HIGH over the lock and slamming straight down
const LAST_GAP_MS = 70;
const LAST_FLY_MS = 260;
const LAST_RISE = 0.55;
const HIGH = FLOOR_H * 0.42;
const LAST_POP = 1.1;
const LAST_SHAKE = 1.8;
const LAST_BLAST = 200;
// each ring's seam flashing round as it lands, its pieces glinting
const SEAM_MS = 150;
const SEAM_W = 26;
const GLINT_MS = 180;
const SPECK = 18;
// the picture trembling TREMBLE px and glowing as it fills, then blazing
// BLAZE_MS and bursting the floor open
const TREMBLE = 10;
const GLOW = 520;
const BLAZE_MS = 170;
const BLAZE = 0.55;
const OPEN_BLAST = 440;
// the pieces raining into the button: leaving up to SPREAD_MS after it
// opens, landing over the last RAIN_SPREAD_MS before RAIN_MS, arcing RISE
const POUR_GAP_MS = 30;
const POUR_SPREAD_MS = 110;
const RAIN_MS = 340;
const RAIN_SPREAD_MS = 80;
const RAIN_RISE = 220;
const BUTTON_BLAST = 260;
// shakes by step: a ring snapping home, the floor bursting, the button
const SHAKES = [0.6, 3.4, 1.4];

interface State {
  // from the lock's middle: where each piece lies, its slot, when it leaves
  // and how long it flies, its sprite
  spotX: Float32Array;
  spotY: Float32Array;
  slotX: Float32Array;
  slotY: Float32Array;
  lift: Float32Array;
  start: Float32Array;
  fly: Float32Array;
  sprite: Uint8Array;
  // where on the button each piece lands, when it leaves and lands
  rainX: Float32Array;
  rainY: Float32Array;
  pourAt: Float32Array;
  rainAt: Float32Array;
  ringLand: Float32Array;
  lastLand: number;
  openAt: number;
  landAt: number;
  button: Point;
  charge: Charge;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const rest: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const lastAt: Point = { x: 0, y: 0 };
const seamA: Point = { x: 0, y: 0 };
const seamB: Point = { x: 0, y: 0 };
// each frame's piece spots, sizes and whether they glint
const drawX = new Float32Array(PIECES);
const drawY = new Float32Array(PIECES);
const drawS = new Float32Array(PIECES);
const glint = new Float32Array(PIECES);

// sprites by shape (tabs out, blanks in) and colour, built at first arm
const COLORS = [COLOR.heavenlyGold, COLOR.goldenTicketYellow];
let sprites: HTMLCanvasElement[] | null = null;

function knobs(g: CanvasRenderingContext2D, off: number, r: number): void {
  const h = SPR / 2;
  const e = BODY / 2 + off;
  g.beginPath();
  g.arc(h + e, h, r, 0, Math.PI * 2);
  g.moveTo(h - e + r, h);
  g.arc(h - e, h, r, 0, Math.PI * 2);
  g.moveTo(h + r, h + e);
  g.arc(h, h + e, r, 0, Math.PI * 2);
  g.moveTo(h + r, h - e);
  g.arc(h, h - e, r, 0, Math.PI * 2);
}

function buildPiece(tabs: boolean, fill: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SPR;
  const g = canvas.getContext("2d")!;
  const lo = (SPR - BODY) / 2;
  const edge = COLOR.amberShadow;
  if (tabs) {
    g.fillStyle = edge;
    g.fillRect(lo, lo, BODY, BODY);
    knobs(g, KNOB_OUT, KNOB + 2);
    g.fill();
    g.fillStyle = fill;
    g.fillRect(lo + 2, lo + 2, BODY - 4, BODY - 4);
    knobs(g, KNOB_OUT, KNOB);
    g.fill();
  } else {
    g.fillStyle = edge;
    g.fillRect(lo, lo, BODY, BODY);
    g.fillStyle = fill;
    g.fillRect(lo + 2, lo + 2, BODY - 4, BODY - 4);
    g.globalCompositeOperation = "destination-out";
    knobs(g, -KNOB_OUT, KNOB);
    g.fill();
    g.globalCompositeOperation = "source-atop";
    g.strokeStyle = edge;
    g.lineWidth = 4;
    knobs(g, -KNOB_OUT, KNOB);
    g.stroke();
  }
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = 0.45;
  g.fillStyle = COLOR.white;
  g.fillRect(lo + 3, lo + 3, BODY - 6, 5);
  return canvas;
}

function getSprites(): HTMLCanvasElement[] {
  if (!sprites) {
    sprites = [];
    for (const tabs of [true, false])
      for (const fill of COLORS) sprites.push(buildPiece(tabs, fill));
  }
  return sprites;
}

// each tap also arming a crit on the open floor below it
const puzzleTaps = defineTapPerk("Puzzle", (t) => {
  const below = t.floors[t.floors.indexOf(t.floor) - 1];
  if (below?.unlocked && !isFloorMaxed(below)) armCritUpgrade(below, "crit");
});

registerFloorCrit("jigsawCrit", {
  reward(t) {
    puzzleTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    getSprites();
    const lock = getLockCenter();
    const btn = getButtonCenter(false);
    const button: Point = { x: btn.x - lock.x, y: btn.y - lock.y };
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const spotX = new Float32Array(PIECES);
    const spotY = new Float32Array(PIECES);
    const slotX = new Float32Array(PIECES);
    const slotY = new Float32Array(PIECES);
    const lift = new Float32Array(PIECES);
    const start = new Float32Array(PIECES);
    const fly = new Float32Array(PIECES);
    const sprite = new Uint8Array(PIECES);
    const rainX = new Float32Array(PIECES);
    const rainY = new Float32Array(PIECES);
    const pourAt = new Float32Array(PIECES);
    const rainAt = new Float32Array(PIECES);
    const ringLand = new Float32Array(RINGS);
    const ringFly = new Float32Array(RINGS);
    let t = FIRST_MS;
    for (let k = 0; k < RINGS; k++) {
      const u = k / (RINGS - 1);
      ringFly[k] = lerp(FLY_MS[0], FLY_MS[1], u);
      ringLand[k] = t + ringFly[k];
      hit(0, ringLand[k], 0);
      t += lerp(GAP_MS[0], GAP_MS[1], u);
    }
    const lastLand = ringLand[RINGS - 1] + LAST_GAP_MS;
    const openAt = lastLand + BLAZE_MS;
    const landAt = openAt + RAIN_MS;
    for (let i = 0; i < PIECES; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const k = Math.min(col, row, COLS - 1 - col, ROWS - 1 - row);
      spotX[i] = mid + (holeHash(i, 4710) * 2 - 1) * width * SPREAD_W;
      spotY[i] = (holeHash(i, 4711) * 2 - 1) * FLOOR_H * SPREAD_H;
      slotX[i] = (col - (COLS - 1) / 2) * CELL;
      slotY[i] = (row - (ROWS - 1) / 2) * CELL;
      lift[i] = holeHash(i, 4712);
      // a sunburst picture: rays of two golds round the middle
      const ray = Math.floor(
        ((Math.atan2(slotY[i], slotX[i] * 0.6) + Math.PI) / (Math.PI * 2)) * 12,
      );
      sprite[i] = ((col + row) % 2) * 2 + (ray % 2);
      if (i === LAST) {
        fly[i] = LAST_FLY_MS;
        start[i] = lastLand - LAST_FLY_MS;
      } else {
        fly[i] = ringFly[k] * (0.7 + 0.3 * holeHash(i, 4713));
        start[i] = ringLand[k] - fly[i];
      }
      rainX[i] = button.x + (holeHash(i, 4714) - 0.5) * BTN_W * 0.7;
      rainY[i] = button.y + (holeHash(i, 4715) - 0.5) * BTN_H * 0.5;
      pourAt[i] = openAt + POUR_GAP_MS + holeHash(i, 4716) * POUR_SPREAD_MS;
      rainAt[i] = landAt - holeHash(i, 4717) * RAIN_SPREAD_MS;
    }
    hit(0, ARC_MS, 0);
    hit(0, lastLand, 0);
    hit(0, openAt, 1);
    hit(0, landAt, 2);
    states.set(r, {
      spotX,
      spotY,
      slotX,
      slotY,
      lift,
      start,
      fly,
      sprite,
      rainX,
      rainY,
      pourAt,
      rainAt,
      ringLand,
      lastLand,
      openAt,
      landAt,
      button,
      charge: planCharge(FIRST_MS, openAt - FIRST_MS, {
        bang: false,
        climaxShake: 0.3,
        shake: [0.05, 0.5],
      }),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state || !sprites) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
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
    }
    // a click as each ring snaps home, higher and higher; the last piece's
    // slam; a swoosh as they rain
    while (r.kicked < RINGS && ms >= state.ringLand[r.kicked]) {
      r.kicked++;
      playSpinTick(1 + r.kicked / RINGS);
    }
    if (r.kicked === RINGS && ms >= state.lastLand) {
      r.kicked++;
      playSpinTick(2.2);
      r.shake(LAST_SHAKE);
    }
    if (r.kicked === RINGS + 1 && ms >= state.openAt + POUR_GAP_MS) {
      r.kicked++;
      playSwoosh();
    }
    tickCharge(state.charge, ms, r.shake);
    const c = ms < state.openAt ? chargeAt(state.charge, ms) : 0;
    trembleAt(c, ms, TREMBLE, shiver);
    ctx.save();
    ctx.translate(lock.x, lock.y);
    drawDetonation(ctx, ORIGIN, ms - ARC_MS, ARRIVE_BLAST, now);
    drawChargeGlow(ctx, shiver, c, GLOW, now);
    if (ms >= ARC_MS) {
      const flung = (ms - ARC_MS) / FLING_MS;
      for (let i = 0; i < PIECES; i++) {
        const since = ms - state.start[i];
        let size = 1;
        let g = 0;
        if (ms >= state.pourAt[i]) {
          const u =
            (ms - state.pourAt[i]) / (state.rainAt[i] - state.pourAt[i]);
          if (u >= 1) {
            drawS[i] = 0;
            continue;
          }
          const e = u * u;
          bit.x = lerp(state.slotX[i] + shiver.x, state.rainX[i], e);
          bit.y =
            lerp(state.slotY[i] + shiver.y, state.rainY[i], e) -
            RAIN_RISE * 4 * u * (1 - u);
          size = 1 + FLY_POP * Math.sin(Math.PI * u);
          g = 1;
        } else if (since >= state.fly[i]) {
          bit.x = state.slotX[i] + shiver.x;
          bit.y = state.slotY[i] + shiver.y;
          g = 1 - (since - state.fly[i]) / GLINT_MS;
        } else if (since >= 0) {
          const u = since / state.fly[i];
          if (i === LAST) {
            if (u < LAST_RISE) {
              const e = u / LAST_RISE;
              bit.x = lerp(state.spotX[i], state.slotX[i], e);
              bit.y = lerp(state.spotY[i], -HIGH, 1 - (1 - e) * (1 - e));
            } else {
              const e = (u - LAST_RISE) / (1 - LAST_RISE);
              bit.x = state.slotX[i];
              bit.y = lerp(-HIGH, state.slotY[i], e * e);
            }
            size = 1 + LAST_POP * (1 - u * u);
          } else {
            // leaping up and snapping down onto its slot
            bit.x = lerp(state.spotX[i], state.slotX[i] + shiver.x, u);
            bit.y =
              lerp(state.spotY[i], state.slotY[i] + shiver.y, u * u) -
              LEAP * (0.6 + 0.4 * state.lift[i]) * 4 * u * (1 - u);
            size = 1 + FLY_POP * Math.sin(Math.PI * u);
          }
          g = 1;
        } else if (flung < 1) {
          rest.x = state.spotX[i];
          rest.y = state.spotY[i];
          flingOut(ORIGIN, rest, state.lift[i], flung, bit);
          g = i % 3 ? 0 : 0.6;
        } else {
          bit.x = state.spotX[i];
          bit.y = state.spotY[i];
          // swelling, ready to leap
          if (since > -POP_MS) size = 1 + POP * (1 + since / POP_MS);
          g = i % 4 ? 0 : 0.5 + 0.5 * Math.sin(now * 0.012 + i);
        }
        drawX[i] = bit.x;
        drawY[i] = bit.y;
        drawS[i] = size;
        glint[i] = g;
        const d = DRAW * size;
        ctx.drawImage(
          sprites[state.sprite[i]],
          bit.x - d / 2,
          bit.y - d / 2,
          d,
          d,
        );
      }
      // the finished picture blazing before it bursts
      if (ms >= state.lastLand && ms < state.openAt) {
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = BLAZE * clamp01((ms - state.lastLand) / BLAZE_MS);
        ctx.fillStyle = COLOR.heavenlyGold;
        ctx.fillRect(
          shiver.x - PANEL_W / 2,
          shiver.y - PANEL_H / 2,
          PANEL_W,
          PANEL_H,
        );
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < PIECES; i++) {
        if (drawS[i] <= 0 || glint[i] <= 0) continue;
        stampGlimmer(
          ctx,
          drawX[i],
          drawY[i],
          SPECK * drawS[i] * glint[i],
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    // each ring's seam flashing round it as it snaps home
    for (let k = 0; k < RINGS; k++) {
      const age = ms - state.ringLand[k];
      if (age < 0 || age >= SEAM_MS) continue;
      const a = 1 - age / SEAM_MS;
      const left = shiver.x - PANEL_W / 2 + (k + 1) * CELL;
      const right = shiver.x + PANEL_W / 2 - (k + 1) * CELL;
      const top = shiver.y - PANEL_H / 2 + (k + 1) * CELL;
      const bottom = shiver.y + PANEL_H / 2 - (k + 1) * CELL;
      if (right <= left || bottom <= top) {
        seamA.x = left - CELL;
        seamB.x = right + CELL;
        seamA.y = seamB.y = shiver.y;
        drawBeam(ctx, seamA, seamB, SEAM_W, a);
        continue;
      }
      seamA.x = left;
      seamA.y = top;
      seamB.x = right;
      seamB.y = top;
      drawBeam(ctx, seamA, seamB, SEAM_W, a);
      seamA.x = right;
      seamA.y = bottom;
      drawBeam(ctx, seamB, seamA, SEAM_W, a);
      seamB.x = left;
      seamB.y = bottom;
      drawBeam(ctx, seamA, seamB, SEAM_W, a);
      seamA.x = left;
      seamA.y = top;
      drawBeam(ctx, seamB, seamA, SEAM_W, a);
    }
    lastAt.x = state.slotX[LAST] + shiver.x;
    lastAt.y = state.slotY[LAST] + shiver.y;
    drawDetonation(ctx, lastAt, ms - state.lastLand, LAST_BLAST, now);
    drawDetonation(ctx, ORIGIN, ms - state.openAt, OPEN_BLAST, now);
    drawDetonation(ctx, state.button, ms - state.landAt, BUTTON_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
