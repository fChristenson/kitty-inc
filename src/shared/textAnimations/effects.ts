// text animations: a library of letter effects to pick from when a letter (a
// digit in the total, a 7 in a floor's label, a dropping digit) puts on a show.
// Each effect poses one letter ms into it, writing into a LetterPose (no
// allocation); drawLetter draws the pose over where the letter sits, its own
// colour blending to gold and back. Every effect has its hit at landMs (the
// moment for a shake, a sound, drawGlitterBurst) and is back at rest by ms.
// See tmp/_playground/textEffects.html for every effect side by side
import { COLOR } from "../../palette";
import { clamp01, easeIn, easeOut, easeOutCubic, smoothstep } from "../easing";
import { drawSlamText, SLAM_GOLD } from "../eventEndSlam";
import { drawGlow, fadeStops } from "../glowSprite";
import { hash01, stampGlimmer } from "../twinkle";

export interface LetterPose {
  // offset from where the letter sits, in letter heights
  dx: number;
  dy: number;
  // scale; a negative sx is the letter's back, mid-flip
  sx: number;
  sy: number;
  rotation: number;
  // 0 its own colour, 1 gold
  gold: number;
  alpha: number;
  // what it shows: a rolling or flipping letter passes through others
  char: string;
}

export function createLetterPose(char = ""): LetterPose {
  return { dx: 0, dy: 0, sx: 1, sy: 1, rotation: 0, gold: 0, alpha: 1, char };
}

export interface TextEffect {
  readonly name: string;
  readonly about: string;
  // its hit: the letter landing back
  readonly landMs: number;
  // back at rest, its own colour again
  readonly ms: number;
  pose(ms: number, char: string, out: LetterPose): void;
}

// gold rising to the hit, held, then fading back
const GOLD_IN_MS = 200;
export const GOLD_HOLD_MS = 450;
export const GOLD_FADE_MS = 400;
// the squash on landing
const SQUASH_MS = 120;
// edge-on, a flipping letter keeps a sliver, never vanishing
const MIN_FACE = 0.06;

// a flip's face turns of the way round: 1 facing, -1 its back, never 0
export function spinFace(turns: number): number {
  const face = Math.cos(turns * Math.PI * 2);
  return face < 0 ? Math.min(face, -MIN_FACE) : Math.max(face, MIN_FACE);
}

function goldAt(ms: number, landMs: number): number {
  if (ms < landMs) return clamp01(ms / Math.min(GOLD_IN_MS, landMs));
  return 1 - clamp01((ms - landMs - GOLD_HOLD_MS) / GOLD_FADE_MS);
}

const isDigit = (char: string): boolean => char >= "0" && char <= "9";
const DIGIT_CHARS = "0123456789";
// a digit `back` places before char, wrapping; anything else stays itself
function digitBefore(char: string, back: number): string {
  if (!isDigit(char)) return char;
  return DIGIT_CHARS[(((Number(char) - back) % 10) + 10) % 10];
}

function effect(
  name: string,
  about: string,
  landMs: number,
  body: (ms: number, out: LetterPose, char: string) => void,
  squashOnLand = true,
): TextEffect {
  return {
    name,
    about,
    landMs,
    ms: landMs + GOLD_HOLD_MS + GOLD_FADE_MS,
    pose(ms, char, out) {
      out.dx = out.dy = out.rotation = out.gold = 0;
      out.sx = out.sy = out.alpha = 1;
      out.char = char;
      // a letter waiting its turn rests
      if (ms < 0) return;
      body(ms, out, char);
      out.gold = goldAt(ms, landMs);
      if (squashOnLand && ms >= landMs) {
        const q = Math.exp(-(ms - landMs) / SQUASH_MS);
        out.sx *= 1 + 0.35 * q;
        out.sy *= 1 - 0.3 * q;
      }
    },
  };
}

// flies up out of the text half as big again, spins seven times round its
// upright axis, slams back
export const flipSlam = effect(
  "Flip slam",
  "flies out half as big again, spins 7 times on its upright axis, slams back",
  990,
  (ms, out) => {
    const rise = easeOutCubic(clamp01(ms / 180));
    const fall = easeIn(clamp01((ms - 880) / 110));
    const up = rise * (1 - fall);
    const size = 1 + 0.5 * up;
    out.dy = -0.9 * up;
    out.sx = size * spinFace(7 * smoothstep(clamp01((ms - 180) / 700)));
    out.sy = size;
  },
);

// a quick hop up, growing, and a slam back
export const jumpSlam = effect(
  "Jump slam",
  "hops up growing, hangs a beat, slams back",
  350,
  (ms, out) => {
    const rise = easeOutCubic(clamp01(ms / 200));
    const drop = easeIn(clamp01((ms - 260) / 90));
    const up = rise * (1 - drop);
    out.dy = -0.6 * up;
    out.sx = out.sy = 1 + 0.4 * up;
  },
);

// falls in from above, big, speeding up, and lands
export const dropIn = effect(
  "Drop in",
  "falls in from above, big and shrinking, speeding up, and lands",
  260,
  (ms, out) => {
    const fall = clamp01(ms / 260) ** 2;
    out.dy = -2.6 * (1 - fall);
    out.sx = out.sy = 1.8 - 0.8 * fall;
  },
);

// tossed up like a coin, flipping head over heels, caught back in place
export const coinToss = effect(
  "Coin toss",
  "tossed up high flipping head over heels five times, lands back",
  700,
  (ms, out) => {
    const u = clamp01(ms / 700);
    const up = 4 * u * (1 - u);
    const size = 1 + 0.3 * up;
    out.dy = -1.6 * up;
    out.sx = size;
    out.sy = size * spinFace(5 * u);
  },
);

// hits from the camera: huge and faint, slamming down to size
export const zoomPunch = effect(
  "Zoom punch",
  "punches in from the camera, three times the size, slamming down to size",
  180,
  (ms, out) => {
    const u = clamp01(ms / 180);
    out.sx = out.sy = 3.2 - 2.2 * easeIn(u);
    out.alpha = Math.min(1, 0.25 + u);
  },
);

// a slot reel: rolls through the digits twice round, braking onto itself
export const slotRoll = effect(
  "Slot roll",
  "rolls through the digits twice round like a reel, braking onto itself",
  600,
  (ms, out, char) => {
    const u = clamp01(ms / 600);
    const pos = 20 * easeOutCubic(u);
    const step = Math.floor(pos);
    out.char = digitBefore(char, 20 - step);
    out.dy = -0.35 * (pos - step) * (1 - u);
    out.sy = 1 + 0.5 * (1 - u);
  },
);

// stretched wide like a rubber band, then snapping tall and wobbling still
export const rubberSnap = effect(
  "Rubber snap",
  "stretches wide, then snaps tall and wobbles still like a rubber band",
  140,
  (ms, out) => {
    const w =
      ms < 140
        ? easeOut(ms / 140)
        : Math.exp(-(ms - 140) / 180) * Math.cos((ms - 140) / 40);
    out.sx = 1 + 0.8 * w;
    out.sy = 1 - 0.45 * w;
  },
  false,
);

// whirls up turning round and round, and drops back
export const tornado = effect(
  "Tornado",
  "whirls up turning three times round, and drops back",
  650,
  (ms, out) => {
    const u = clamp01(ms / 650);
    const up = Math.sin(Math.PI * u);
    out.dy = -0.8 * up;
    out.rotation = 3 * Math.PI * 2 * smoothstep(u);
    out.sx = out.sy = 1 + 0.4 * up;
  },
);

// thrown out sideways like a boomerang, flipping, and back
export const boomerang = effect(
  "Boomerang",
  "flung out sideways flipping on its upright axis, curving back in",
  650,
  (ms, out) => {
    const u = clamp01(ms / 650);
    const swing = Math.sin(Math.PI * u);
    const size = 1 + 0.3 * swing;
    out.dx = 2 * swing;
    out.dy = -0.7 * swing;
    out.sx = size * spinFace(4 * u);
    out.sy = size;
  },
);

// two quick pumps, like a heartbeat
export const heartbeat = effect(
  "Heartbeat",
  "two quick pumps, big then smaller, like a heartbeat",
  110,
  (ms, out) => {
    const beat =
      ms < 220
        ? 0.6 * Math.sin((Math.PI * ms) / 220)
        : ms >= 260 && ms < 460
          ? 0.35 * Math.sin((Math.PI * (ms - 260)) / 200)
          : 0;
    out.sx = out.sy = 1 + beat;
  },
  false,
);

// bounces in place, each hop lower, squashing on every landing
const JELLY_HOPS: readonly (readonly [number, number, number])[] = [
  [0, 180, 0.7],
  [180, 320, 0.35],
  [320, 420, 0.15],
];
export const jelly = effect(
  "Jelly",
  "bounces three times in place, lower each time, squashing on each landing",
  180,
  (ms, out) => {
    let landed = -1;
    for (const [from, to, high] of JELLY_HOPS) {
      if (ms >= to) {
        landed = to;
        continue;
      }
      if (ms >= from) {
        const v = (ms - from) / (to - from);
        out.dy = -high * 4 * v * (1 - v);
      }
      break;
    }
    if (landed >= 0) {
      const q = Math.exp(-(ms - landed) / 90);
      out.sx = 1 + 0.4 * q;
      out.sy = 1 - 0.35 * q;
    }
  },
  false,
);

// a split-flap board: flips over and over through the digits onto itself
const FLAPS = 6;
export const flipBoard = effect(
  "Flip board",
  "flaps over and over like a station board, through the digits onto itself",
  520,
  (ms, out, char) => {
    if (ms >= 520) return;
    const flap = (Math.max(0, ms) / 520) * FLAPS;
    const step = Math.floor(flap);
    out.char = digitBefore(char, FLAPS - step);
    out.sy = Math.abs(spinFace((flap - step) / 2));
  },
);

export const TEXT_EFFECTS: readonly TextEffect[] = [
  flipSlam,
  jumpSlam,
  dropIn,
  coinToss,
  zoomPunch,
  slotRoll,
  rubberSnap,
  tornado,
  boomerang,
  heartbeat,
  jelly,
  flipBoard,
];

// one letter in its pose, centred at cx, cy where it sits (ctx's font,
// textBaseline top): its own fill blending to gold
export function drawLetter(
  ctx: CanvasRenderingContext2D,
  pose: LetterPose,
  cx: number,
  cy: number,
  height: number,
  fill: string,
  strokeColor: string,
  strokeWidth: number,
  tabular: boolean,
): void {
  ctx.save();
  ctx.globalAlpha *= pose.alpha;
  ctx.translate(cx + pose.dx * height, cy + pose.dy * height);
  if (pose.rotation !== 0) ctx.rotate(pose.rotation);
  ctx.scale(pose.sx, pose.sy);
  ctx.textAlign = "center";
  const top = -height / 2;
  if (pose.gold < 1)
    drawSlamText(
      ctx,
      null,
      pose.char,
      0,
      top,
      height,
      fill,
      strokeColor,
      strokeWidth,
      tabular,
      0,
      true,
    );
  if (pose.gold > 0) {
    ctx.globalAlpha *= pose.gold;
    drawSlamText(
      ctx,
      null,
      pose.char,
      0,
      top,
      height,
      SLAM_GOLD,
      strokeColor,
      strokeWidth,
      tabular,
      0,
      true,
    );
  }
  ctx.restore();
}

// the hit's burst: a gold flash and glitter flung out round (cx, cy), sized
// to letters height tall, wide stretching it sideways over a group
export const GLITTER_BURST_MS = 550;
const GLITTER = 20;
const GLITTER_REACH = 2.1; // of the letters' height
const GLITTER_SIZE = 0.45;
const FLASH_MS = 240;
const FLASH_R = 1.8;
const FLASH = fadeStops(COLOR.heavenlyGold);
const GLITTER_ANGLE = Array.from(
  { length: GLITTER },
  (_, k) => ((k + hash01(k, 1) * 0.6) / GLITTER) * Math.PI * 2,
);
const GLITTER_REACHES = Array.from(
  { length: GLITTER },
  (_, k) => 0.45 + 0.55 * hash01(k, 2),
);
export function drawGlitterBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  height: number,
  since: number,
  wide = 1,
): void {
  if (since < 0 || since >= GLITTER_BURST_MS) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (since < FLASH_MS) {
    ctx.globalAlpha = 1 - since / FLASH_MS;
    drawGlow(ctx, FLASH, cx, cy, height * FLASH_R * wide, 1 / wide);
    ctx.globalAlpha = 1;
  }
  const u = since / GLITTER_BURST_MS;
  const reach = height * GLITTER_REACH * easeOutCubic(u);
  for (let k = 0; k < GLITTER; k++) {
    const r = reach * GLITTER_REACHES[k];
    stampGlimmer(
      ctx,
      cx + Math.cos(GLITTER_ANGLE[k]) * r * wide,
      cy + Math.sin(GLITTER_ANGLE[k]) * r * 0.75,
      height * GLITTER_SIZE * (1 - u),
      k + u * 2,
      k % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  ctx.restore();
}
