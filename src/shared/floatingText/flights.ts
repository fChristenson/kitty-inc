// flights: text (or a sprite) travelling from where it appears to its target,
// like a bubble's multiplier flying into a floor's bar or a bar's "+N Lvl"
// flying to the floor's label. Each effect poses the text ms into its flight
// from `from` to `to` into a FloatPose (no allocation), arriving on `to` at
// effect.ms, the moment the target takes the hit. Draw with applyFloatPose,
// then the text centred on (0, 0). Text moves like our coins (shared/coinFlip):
// one solid piece on one smooth arch onto its target, its trick a single solid
// flip or spin; never grown, shrunk, stretched or bent as the effect, never
// steered through sharp turns. See tmp/_playground/floatingText.html
import { bezier } from "../curves";
import { clamp01, easeIn, easeOut, smoothstep } from "../easing";
import { spinFace } from "../textAnimations";
import type { Point } from "../wisp";

export interface FloatPose {
  x: number;
  y: number;
  // the text's size, times its own
  scale: number;
  // squash and stretch, and flips (a negative sx is its back)
  sx: number;
  sy: number;
  rotation: number;
  alpha: number;
}

export function createFloatPose(): FloatPose {
  return { x: 0, y: 0, scale: 1, sx: 1, sy: 1, rotation: 0, alpha: 1 };
}

export interface FloatEffect {
  readonly name: string;
  readonly about: string;
  // its arrival: on `to`, the target takes the hit
  readonly ms: number;
  pose(ms: number, from: Point, to: Point, out: FloatPose): void;
}

// the flight's line, worked out once per pose into one scratch: its length
// and the unit normal to it pointing up the screen
interface Line {
  dx: number;
  dy: number;
  dist: number;
  nx: number;
  ny: number;
}
const line: Line = { dx: 0, dy: 0, dist: 0, nx: 0, ny: -1 };
const p0: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };

function measure(from: Point, to: Point): Line {
  line.dx = to.x - from.x;
  line.dy = to.y - from.y;
  line.dist = Math.hypot(line.dx, line.dy) || 1;
  line.nx = line.dy / line.dist;
  line.ny = -line.dx / line.dist;
  if (line.ny > 0) {
    line.nx = -line.nx;
    line.ny = -line.ny;
  }
  return line;
}

function flight(
  name: string,
  about: string,
  ms: number,
  body: (u: number, from: Point, to: Point, out: FloatPose, l: Line) => void,
): FloatEffect {
  return {
    name,
    about,
    ms,
    pose(t, from, to, out) {
      out.x = from.x;
      out.y = from.y;
      out.scale = out.sx = out.sy = out.alpha = 1;
      out.rotation = 0;
      body(clamp01(t / ms), from, to, out, measure(from, to));
    },
  };
}

// up in a high arc, swelling huge and flipping, then smashing into the target
export const arcSmash = flight(
  "Arc smash",
  "arcs up high swelling huge and flipping twice, then smashes into its target",
  420,
  (u, from, to, out, l) => {
    p0.x = (from.x + to.x) / 2;
    p0.y = Math.min(from.y, to.y) - 0.9 * l.dist;
    bezier(from, p0, to, u ** 1.6, at);
    out.x = at.x;
    out.y = at.y;
    out.scale =
      u < 0.55
        ? 1 + 1.8 * easeOut(u / 0.55)
        : 2.8 - 2.1 * easeIn((u - 0.55) / 0.45);
    out.sx = spinFace(2 * smoothstep(u));
  },
);

// arcs high flipping over and over like a tossed coin
export const flipArc = flight(
  "Flip arc",
  "tossed high like a coin, flipping five times, swelling as it goes over",
  560,
  (u, from, to, out, l) => {
    p0.x = (from.x + to.x) / 2 + l.nx * 0.9 * l.dist;
    p0.y = (from.y + to.y) / 2 + l.ny * 0.9 * l.dist;
    bezier(from, p0, to, u, at);
    out.x = at.x;
    out.y = at.y;
    out.sx = spinFace(5 * u);
    out.scale = 1 + 0.9 * Math.sin(Math.PI * u);
  },
);

// thrown up high spinning round like a tornado, then slammed down in
export const tornado = flight(
  "Tornado",
  "thrown up high whirling round three times, huge, then slammed down in",
  560,
  (u, from, to, out, l) => {
    p0.x = (from.x + to.x) / 2;
    p0.y = Math.min(from.y, to.y) - 1.1 * l.dist;
    // up fast to near the top, then slammed down the rest of the way
    const v =
      u < 0.7 ? 0.6 * easeOut(u / 0.7) : 0.6 + 0.4 * easeIn((u - 0.7) / 0.3);
    bezier(from, p0, to, v, at);
    out.x = at.x;
    out.y = at.y;
    out.rotation = Math.PI * 2 * 3 * smoothstep(u);
    out.scale = 1 + 1.5 * Math.sin(Math.PI * Math.min(1, u / 0.85));
  },
);

export const FLOAT_EFFECTS: readonly FloatEffect[] = [
  arcSmash,
  flipArc,
  tornado,
];

// candidates on trial in the playground, not picked in the game yet

// a low arch turning one full cartwheel backwards
export const cartwheel = flight(
  "Cartwheel",
  "a low arch turning one full cartwheel backwards",
  520,
  (u, from, to, out, l) => {
    p0.x = (from.x + to.x) / 2 + l.nx * 0.7 * l.dist;
    p0.y = (from.y + to.y) / 2 + l.ny * 0.7 * l.dist;
    bezier(from, p0, to, u, at);
    out.x = at.x;
    out.y = at.y;
    out.rotation = -Math.PI * 2 * smoothstep(u);
  },
);

// arcs over flipping head over heels, top over bottom
export const headOverHeels = flight(
  "Head over heels",
  "arcs over flipping head over heels four times",
  560,
  (u, from, to, out, l) => {
    p0.x = (from.x + to.x) / 2 + l.nx * 0.9 * l.dist;
    p0.y = (from.y + to.y) / 2 + l.ny * 0.9 * l.dist;
    bezier(from, p0, to, u, at);
    out.x = at.x;
    out.y = at.y;
    out.sy = spinFace(4 * u);
  },
);

export const CANDIDATE_FLIGHTS: readonly FloatEffect[] = [
  cartwheel,
  headOverHeels,
];

export function pickFloatEffect(): FloatEffect {
  return FLOAT_EFFECTS[Math.floor(Math.random() * FLOAT_EFFECTS.length)];
}

// moves ctx onto the pose: draw the text centred on (0, 0) after, between
// ctx.save() and ctx.restore()
export function applyFloatPose(
  ctx: CanvasRenderingContext2D,
  pose: FloatPose,
): void {
  ctx.globalAlpha *= pose.alpha;
  ctx.translate(pose.x, pose.y);
  if (pose.rotation !== 0) ctx.rotate(pose.rotation);
  ctx.scale(pose.scale * pose.sx, pose.scale * pose.sy);
}
