// helpers more than one floor crit kind plays with
import { byHeight, type Point, type Running } from ".";

export const BURST_MS = 100;

// the bar indexes top to bottom, its own bar (0) last
export const ownLast = (bars: Point[]): number[] => [
  ...byHeight(bars).filter((bar) => bar !== 0),
  0,
];

// a bar's half height, in the flash's units
export const BAR_HALF_H = 46;

// a height `above` over the top bar in view, kept below the HUD, and one
// `below` under the lowest, kept on screen
export const skyY = (r: Running, bars: Point[], above: number) =>
  Math.max(Math.min(...bars.map((b) => b.y)) - above, -r.viewportWidth * 0.55);
export const groundY = (r: Running, bars: Point[], below: number) =>
  Math.min(Math.max(...bars.map((b) => b.y)) + below, r.viewportWidth * 0.9);

// a meteor shower's meteor or a volcano's blob: a curve from a, pulled
// towards c, onto b, at p 0..1
export const quadratic = (a: Point, c: Point, b: Point, p: number): Point => ({
  x: (1 - p) ** 2 * a.x + 2 * (1 - p) * p * c.x + p * p * b.x,
  y: (1 - p) ** 2 * a.y + 2 * (1 - p) * p * c.y + p * p * b.y,
});

// the number thrown off the top, then a meteor tearing in from the top
// corner, faster and faster, into one bar
export const METEOR_LIFT_MS = 120;
export const METEOR_SHAKE = 2.4;
export const METEOR_PAYS = "x5";
export const METEOR_FONT = 150;
export const holeHash = (i: number, salt: number) => {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
