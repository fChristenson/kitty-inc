// Cat Face, a floor crit: the number bursts into hundreds of gold dots
// streaming out on swirls, faster and faster, drawing one giant cat's face
// over the building: the head with its two pointed ears, then each eye, the
// nose and mouth, the whiskers, a click and a jolt as each part completes;
// the finished face blazes and trembles, its eyes flash white, and it
// pounces: its pieces break into dot showers diving into the bars down the
// building, each a flash with its levels, quicker each, and the glowing
// eyes slam into its own bar last in the biggest blast
import { COLOR } from "../../../../palette";
import {
  SHAPES,
  shapeFill,
  shapeOutline,
  type Shape,
} from "../../../../shared/animationStyles/drawing";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 110;
// the face FACE_PAD px past half the bars' span from its middle to its
// edge, between MIN_FACE and the screen (whiskers reach REACH of it)
const FACE_PAD = 110;
const MIN_FACE = 220;
const REACH = 1.3;
// dots per part, each flying FLY_MS out of the number on a SWIRL bend,
// landing over FILL_MS, quicker and quicker (by FILL_EASE)
const HEAD_DOTS = 170;
const EYE_DOTS = 44;
const NOSE_DOTS = 18;
const MOUTH_DOTS = 8;
const WHISKER_DOTS = 11;
const FLY_MS = 150;
const SWIRL = 0.55;
const FILL_MS = 820;
const FILL_EASE = 0.55;
const DOT = 20;
// drawn, it blazes over BLAZE_MS, throbbing THROB_HZ, trembling up to
// TREMBLE px and swelling by SWELL; its eyes flash EYE_FLASH_AT into it
const BLAZE_MS = 240;
const THROB_HZ = 9;
const TREMBLE = 8;
const SWELL = 0.08;
const EYE_FLASH_AT = 0.55;
const EYE_FLASH_MS = 200;
const EYE_FLASH = 260;
const EYE_GLOW = 150;
// the pounce: showers into the other bars STRIKE_GAP_MS apart (closing),
// each dot diving DIVE_MS, launched up to STAGGER_MS early; the eyes
// OWN_AFTER_MS after the last
const STRIKE_GAP_MS: [number, number] = [80, 35];
const DIVE_MS = 110;
const STAGGER_MS = 60;
const OWN_AFTER_MS = 110;
const SPREAD = 0.8;
const EYE_SPREAD = 0.35;
const FLASH = 280;
const FLASH_MS = 220;
const OWN_BLAST = 430;
const GLOW = 2.6;
// shakes by step: a bar, its own; jolts as each part completes and the eyes
// flash
const SHAKES = [1, 3];
const CLICK_SHAKE: [number, number] = [0.3, 0.7];
const EYE_SHAKE = 1.2;

// parts: the head, each eye, the nose and mouth, the whiskers
const EYE_L = 1;
const EYE_R = 2;
const PARTS = 5;

interface State {
  // the face's middle off its own bar, and its size
  offX: number;
  offY: number;
  size: number;
  // every dot local to the face's middle: its part, landing, bend, launch
  // into its strike, and where it hits that bar
  xs: Float32Array;
  ys: Float32Array;
  part: Uint8Array;
  lands: Float32Array;
  bend: Float32Array;
  launch: Float32Array;
  strike: Uint8Array;
  hx: Float32Array;
  hy: Float32Array;
  // when each part is drawn (a click); the strikes, its own last
  done: Float32Array;
  strikeBar: Uint8Array;
  strikeAt: Float32Array;
  drawnMs: number;
  eyeFlashMs: number;
  pounceMs: number;
}
const states = new WeakMap<Running, State>();
const face: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const GOLD_FLASH = fadeStops(COLOR.heavenlyGold);
const WHITE_FLASH = fadeStops(COLOR.white, 0.3);

// an almond eye, its outer corner tilted up by `tilt`
const eyeShape = (tilt: number): Shape => {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return [
    Array.from({ length: 32 }, (_, k) => {
      const t = (k / 32) * Math.PI * 2;
      const u = Math.cos(t);
      const v = Math.sin(t) * 0.62 * Math.abs(Math.sin(t)) ** 0.25;
      return { x: u * cos - v * sin, y: u * sin + v * cos };
    }),
  ];
};
const NOSE: Shape = [
  [
    { x: -1, y: -0.6 },
    { x: 1, y: -0.6 },
    { x: 0, y: 0.7 },
  ],
];
// in face units: each eye's middle, size and tilt; the nose, the mouth's
// two arcs; each whisker's root and tip heights
const EYE_X = 0.4;
const EYE_Y = 0.08;
const EYE = 0.21;
const EYE_TILT = 0.25;
const NOSE_Y = 0.36;
const NOSE_SIZE = 0.1;
const MOUTH_Y = 0.47;
const MOUTH_R = 0.08;
const WHISKER_ROOT = 0.3;
const WHISKER_ROOTS = [0.4, 0.45, 0.5];
const WHISKER_TIPS = [0.26, 0.45, 0.64];
const WHISKER_BOW = 0.04;

registerFloorCrit("catFaceCrit", {
  plan(r, bars, hit) {
    const base = bars[0];
    const half = r.play.barHalfWidth;
    let top = Infinity;
    let bottom = -Infinity;
    let column = 0;
    for (const bar of bars) {
      top = Math.min(top, bar.y);
      bottom = Math.max(bottom, bar.y);
      column += bar.x;
    }
    column /= bars.length;
    const wide = (r.viewportWidth * 0.48) / REACH;
    const size = Math.min(
      wide,
      Math.max(MIN_FACE, (bottom - top) / 2 + FACE_PAD),
    );
    const edge = r.viewportWidth / 2 - size * REACH;
    const cx = Math.max(-edge, Math.min(edge, column));
    const cy = (top + bottom) / 2;

    // the dots part by part, local to the face's middle
    const xs: number[] = [];
    const ys: number[] = [];
    const part: number[] = [];
    const add = (p: Point, k: number) => {
      xs.push(p.x);
      ys.push(p.y);
      part.push(k);
    };
    const origin = { x: 0, y: 0 };
    for (const p of shapeOutline(SHAPES.catHead, HEAD_DOTS, origin, size))
      add(p, 0);
    for (const side of [-1, 1])
      for (const p of shapeFill(
        eyeShape(-side * EYE_TILT),
        EYE_DOTS,
        { x: side * EYE_X * size, y: EYE_Y * size },
        EYE * size,
      ))
        add(p, side < 0 ? EYE_L : EYE_R);
    for (const p of shapeFill(
      NOSE,
      NOSE_DOTS,
      { x: 0, y: NOSE_Y * size },
      NOSE_SIZE * size,
    ))
      add(p, 3);
    for (const side of [-1, 1])
      for (let k = 0; k < MOUTH_DOTS; k++) {
        const a = (k / (MOUTH_DOTS - 1)) * Math.PI;
        add(
          {
            x: (side * MOUTH_R - Math.cos(a) * MOUTH_R) * size,
            y: (MOUTH_Y + Math.sin(a) * MOUTH_R * 0.8) * size,
          },
          3,
        );
      }
    for (let w = 0; w < WHISKER_TIPS.length; w++)
      for (const side of [-1, 1])
        for (let k = 0; k < WHISKER_DOTS; k++) {
          const u = k / (WHISKER_DOTS - 1);
          add(
            {
              x: side * lerp(WHISKER_ROOT, REACH, u) * size,
              y:
                (lerp(WHISKER_ROOTS[w], WHISKER_TIPS[w], u) -
                  WHISKER_BOW * 4 * u * (1 - u)) *
                size,
            },
            4,
          );
        }

    const n = xs.length;
    const lands = new Float32Array(n);
    const bend = new Float32Array(n);
    const done = new Float32Array(PARTS);
    for (let i = 0; i < n; i++) {
      lands[i] = IN_MS + FLY_MS + FILL_MS * (i / n) ** FILL_EASE;
      bend[i] = (holeHash(i, 5101) * 2 - 1) * SWIRL;
      done[part[i]] = lands[i];
    }
    const drawnMs = lands[n - 1];
    const pounceMs = drawnMs + BLAZE_MS;

    // the other bars top to bottom, then its own
    const order = ownLast(bars);
    const m = order.length - 1;
    const strikeBar = Uint8Array.from(order);
    const strikeAt = new Float32Array(m + 1);
    let t = pounceMs + DIVE_MS + STAGGER_MS;
    for (let k = 0; k < m; k++) {
      strikeAt[k] = t;
      hit(order[k], t, 0);
      t += lerp(STRIKE_GAP_MS[0], STRIKE_GAP_MS[1], k / Math.max(1, m - 1));
    }
    strikeAt[m] = m > 0 ? strikeAt[m - 1] + OWN_AFTER_MS : t;
    hit(0, strikeAt[m], 1);

    // the eyes into its own bar; everything else top to bottom, shared out
    // evenly over the other bars
    const strike = new Uint8Array(n);
    const rest: number[] = [];
    for (let i = 0; i < n; i++)
      if (part[i] === EYE_L || part[i] === EYE_R || m === 0) strike[i] = m;
      else rest.push(i);
    rest.sort((a, b) => ys[a] - ys[b]);
    for (let j = 0; j < rest.length; j++)
      strike[rest[j]] = Math.min(m - 1, Math.floor((j * m) / rest.length));
    const launch = new Float32Array(n);
    const hx = new Float32Array(n);
    const hy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      launch[i] =
        strikeAt[strike[i]] - DIVE_MS - holeHash(i, 5102) * STAGGER_MS;
      const spread = strike[i] === m ? EYE_SPREAD : SPREAD;
      hx[i] = (holeHash(i, 5103) * 2 - 1) * half * spread;
      hy[i] = (holeHash(i, 5104) - 0.5) * 36;
    }

    states.set(r, {
      offX: cx - base.x,
      offY: cy - base.y,
      size,
      xs: Float32Array.from(xs),
      ys: Float32Array.from(ys),
      part: Uint8Array.from(part),
      lands,
      bend,
      launch,
      strike,
      hx,
      hy,
      done,
      strikeBar,
      strikeAt,
      drawnMs,
      eyeFlashMs: drawnMs + BLAZE_MS * EYE_FLASH_AT,
      pounceMs,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { xs, ys, part, lands, bend, launch, strike, hx, hy, done } = state;
    const { strikeBar, strikeAt, drawnMs, eyeFlashMs, pounceMs, size } = state;
    const own = strikeAt.length - 1;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    // a click and a jolt as each part is drawn, rising, then the eyes' flash
    while (r.kicked < PARTS && ms >= done[r.kicked]) {
      const u = r.kicked / (PARTS - 1);
      playSpinTick(1 + 0.8 * u);
      r.shake(lerp(CLICK_SHAKE[0], CLICK_SHAKE[1], u));
      r.kicked++;
    }
    if (r.kicked === PARTS && ms >= eyeFlashMs) {
      playSpinTick(2);
      r.shake(EYE_SHAKE);
      r.kicked++;
    }

    face.x = bars[0].x + state.offX;
    face.y = bars[0].y + state.offY;
    const blaze = clamp01((ms - drawnMs) / BLAZE_MS);
    const throb =
      blaze > 0
        ? 0.5 + 0.5 * Math.sin((ms / 1000) * THROB_HZ * Math.PI * 2)
        : 0;
    const swell = 1 + SWELL * blaze;
    trembleAt(blaze, ms, TREMBLE, shiver);
    const fx = face.x + shiver.x;
    const fy = face.y + shiver.y;
    // the eyes glow on until they dive, flaring as the rest leaves
    const eyesGo = strikeAt[own] - DIVE_MS - STAGGER_MS;
    const leaving = clamp01((ms - pounceMs) / Math.max(1, eyesGo - pounceMs));

    if (blaze > 0 && ms < pounceMs + DIVE_MS)
      drawChargeGlow(
        ctx,
        face,
        blaze * (1 - clamp01((ms - pounceMs) / DIVE_MS)),
        size * GLOW,
        now,
      );

    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the eyes' glow, then their flash
    if (blaze > 0 && ms < eyesGo + DIVE_MS) {
      const flash = (ms - eyeFlashMs) / EYE_FLASH_MS;
      for (let side = -1; side <= 1; side += 2) {
        const ex = fx + side * EYE_X * size * swell;
        const ey = fy + EYE_Y * size * swell;
        ctx.globalAlpha = blaze * (0.6 + 0.4 * throb);
        drawGlow(ctx, GOLD_FLASH, ex, ey, EYE_GLOW * (1 + 0.8 * leaving));
        if (flash >= 0 && flash < 1) {
          ctx.globalAlpha = 1 - flash;
          drawGlow(ctx, WHITE_FLASH, ex, ey, EYE_FLASH * (0.6 + 0.6 * flash));
        }
      }
      ctx.globalAlpha = 1;
    }

    if (ms >= IN_MS) {
      const dot = DOT * (1 + 0.5 * blaze + 0.25 * throb);
      const eyeWhite = ms >= eyeFlashMs;
      for (let i = 0; i < xs.length; i++) {
        const land = lands[i];
        if (ms < land - FLY_MS) break;
        const go = launch[i];
        if (ms >= go + DIVE_MS) continue;
        const x = fx + xs[i] * swell;
        const y = fy + ys[i] * swell;
        if (ms < land) {
          // streaming out of the number on a bend
          const u = 1 - (land - ms) / FLY_MS;
          const b = bend[i];
          const cx = x / 2 - y * b;
          const cy = y / 2 + x * b;
          const v = 1 - u;
          stampGlimmer(
            ctx,
            2 * v * u * cx + u * u * x,
            2 * v * u * cy + u * u * y,
            DOT * 0.8,
            i,
            COLOR.heavenlyGold,
          );
          continue;
        }
        const p = part[i];
        const eye = p === EYE_L || p === EYE_R;
        if (ms < go) {
          stampGlimmer(
            ctx,
            x,
            y,
            eye ? dot * (1 + 0.4 * leaving) : dot,
            i + ms * 0.004,
            blaze > 0.5 || i % 3 === 0 || (eye && eyeWhite)
              ? COLOR.white
              : COLOR.heavenlyGold,
          );
          continue;
        }
        // diving into its bar, snapping on
        const u = ((ms - go) / DIVE_MS) ** 2;
        const bar = bars[strikeBar[strike[i]]];
        stampGlimmer(
          ctx,
          lerp(x, bar.x + hx[i], u),
          lerp(y, bar.y + hy[i], u),
          (eye ? DOT * 1.7 : DOT * 1.3) * (1 - 0.3 * u),
          i,
          i % 2 === 0 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
    }

    // a cheap flash on each other bar as its shower lands
    for (let k = 0; k < own; k++) {
      const since = ms - strikeAt[k];
      if (since < 0 || since >= FLASH_MS) continue;
      const f = since / FLASH_MS;
      const bar = bars[strikeBar[k]];
      ctx.globalAlpha = 1 - f;
      drawGlow(ctx, GOLD_FLASH, bar.x, bar.y, FLASH * (0.6 + 0.9 * f));
      drawGlow(ctx, WHITE_FLASH, bar.x, bar.y, FLASH * 0.45 * (1 - 0.5 * f));
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    // the eyes' slam, the biggest blast
    at.x = bars[0].x;
    at.y = bars[0].y;
    drawDetonation(ctx, at, ms - strikeAt[own], OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
