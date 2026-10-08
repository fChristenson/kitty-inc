// the racer in shared/fps's world, seen from behind and a little above: a
// small spaceship hovering over the road, a wedge-hulled delta wing ridged
// down its spine with exhausts in its thick tail, with its shadow on the
// road; returns where its exhausts are, for the flames
import { fillFpsQuad, fpsSight, type Fps, type FpsPoint } from "../fps";

export interface RaceShipLook {
  wing: string;
  shadow: string;
}

export interface RaceShipPose {
  // its tail's middle, on the road below it
  x: number;
  z: number;
  // how high it hovers over the road
  hover: number;
  // a bank to one side, -1..1
  bank?: number;
}

// its size, in screen widths: the wing's half span and length, the hull's
// ridge above and keel below the wing at the tail, the side exhausts' share
// of the half span out and the exhausts' radius
const SPAN = 0.3;
const LONG = 0.75;
const RIDGE = 0.1;
const KEEL = 0.07;
const EXHAUST_OUT = 0.45;
const EXHAUST_R = 0.028;
// how far a bank tips the wingtips up and down
const TIP = 0.06;
const SHADOW = 0.25;
// the right-hand slope, shaded away from the light
const SHADE = 0.25;

export function drawRaceShip(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  look: RaceShipLook,
  { x, z, hover, bank = 0 }: RaceShipPose,
): FpsPoint[] {
  fillFpsQuad(
    ctx,
    fps,
    [
      [x - SPAN * 0.8, 0, z],
      [x + SPAN * 0.8, 0, z],
      [x, 0, z + LONG * 0.8],
    ],
    look.shadow,
    SHADOW,
  );
  const y = hover;
  const tip = bank * TIP;
  const ridge = (along: number) => y + RIDGE * (1 - along / LONG);
  const left: [number, number, number][] = [
    [x - SPAN, y + tip, z],
    [x, ridge(0), z],
    [x, y, z + LONG],
  ];
  const right: [number, number, number][] = [
    [x + SPAN, y - tip, z],
    [x, ridge(0), z],
    [x, y, z + LONG],
  ];
  // the hull's two slopes from the wingtips up to its spine, nose ahead
  fillFpsQuad(ctx, fps, left, look.wing);
  fillFpsQuad(ctx, fps, right, look.wing);
  fillFpsQuad(ctx, fps, right, look.shadow, SHADE);
  // its tail: the wing's thick back edge, ridge on top and keel below, with
  // an exhaust in the middle and one out each side
  fillFpsQuad(
    ctx,
    fps,
    [
      [x - SPAN, y + tip, z],
      [x, ridge(0), z],
      [x + SPAN, y - tip, z],
      [x, y - KEEL, z],
    ],
    look.wing,
  );
  const out = 1 - EXHAUST_OUT;
  const mid = (RIDGE - KEEL) / 2;
  const engines: FpsPoint[] = [];
  ctx.fillStyle = look.shadow;
  for (const [ex, ey] of [
    [x - SPAN * EXHAUST_OUT, y + tip * EXHAUST_OUT + mid * out],
    [x, y + mid],
    [x + SPAN * EXHAUST_OUT, y - tip * EXHAUST_OUT + mid * out],
  ]) {
    const at = fpsSight(fps, ex, ey, z);
    if (!at) continue;
    engines.push(at);
    ctx.beginPath();
    ctx.arc(at.x, at.y, EXHAUST_R * at.s, 0, Math.PI * 2);
    ctx.fill();
  }
  return engines;
}
