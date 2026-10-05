// galaxies for events: glitter and wisps orbiting a centre like stars round a
// galactic core, on a tilted disk, the inner ones faster (Kepler), so spiral
// arms wind themselves up on their own. Plan a disk once at arm with
// planDisk, scatter its stars (scatterDisk evenly, scatterArms in spiral
// arms), place one at ms with disk.at, drift one off its own orbit onto
// another's with disk.drift (clumping, capture, merging into a wisp), fling
// one off along disk.heading, and stamp a whole crowd with drawStars
import { COLOR } from "../../palette";
import { stampGlimmer } from "../twinkle";
import { lerp } from "../easing";
import type { Point } from "../wisp";

const TAU = Math.PI * 2;

// a star's orbit: its distance from the centre and its angle at ms 0
export interface Orbit {
  radius: number;
  phase: number;
}

export interface DiskPlan {
  inner: number;
  outer: number;
  // the disk seen tilted: its height as a share of its width, and how far
  // its long axis is turned off level (rad)
  squash?: number;
  tilt?: number;
  // laps a second at the rim, and 1 or -1 for which way it turns
  rimHz?: number;
  spin?: number;
}

export interface Disk {
  center: Point;
  inner: number;
  outer: number;
  // rad per ms at radius r
  omega: (r: number) => number;
  // where an orbit has carried its star by ms
  angle: (orbit: Orbit, ms: number) => number;
  // the point r out at angle a, scaled by `grow` (0 at the centre, 1 full size)
  place: (r: number, a: number, into: Point, grow?: number) => Point;
  at: (orbit: Orbit, ms: number, into: Point, grow?: number) => Point;
  // a star u (0..1) of the way off its own orbit onto `to`'s, matching its
  // spot on it at u 1
  drift: (
    from: Orbit,
    to: Orbit,
    u: number,
    ms: number,
    into: Point,
    grow?: number,
  ) => Point;
  // the way a star on the orbit is heading at ms (rad), for flinging it off
  heading: (orbit: Orbit, ms: number) => number;
}

export function planDisk(
  center: Point,
  { inner, outer, squash = 0.6, tilt = 0, rimHz = 0.9, spin = 1 }: DiskPlan,
): Disk {
  const rim = (rimHz * TAU) / 1000;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const omega = (r: number) => spin * rim * (outer / Math.max(r, 1)) ** 1.5;
  const angle = (o: Orbit, ms: number) => o.phase + omega(o.radius) * ms;
  const place = (r: number, a: number, into: Point, grow = 1): Point => {
    const x = Math.cos(a) * r * grow;
    const y = Math.sin(a) * r * squash * grow;
    into.x = center.x + x * cos - y * sin;
    into.y = center.y + x * sin + y * cos;
    return into;
  };
  return {
    center,
    inner,
    outer,
    omega,
    angle,
    place,
    at: (o, ms, into, grow) => place(o.radius, angle(o, ms), into, grow),
    drift: (from, to, u, ms, into, grow) => {
      const own = angle(from, ms);
      const diff =
        ((((angle(to, ms) - own) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
      return place(
        lerp([from.radius, to.radius], u),
        own + diff * u,
        into,
        grow,
      );
    },
    heading: (o, ms) => {
      const a = angle(o, ms);
      const dx = -Math.sin(a) * spin;
      const dy = Math.cos(a) * squash * spin;
      return Math.atan2(dx * sin + dy * cos, dx * cos - dy * sin);
    },
  };
}

// count stars spread evenly over the disk
export function scatterDisk(disk: Disk, count: number): Orbit[] {
  return Array.from({ length: count }, () => ({
    radius: lerp([disk.inner, disk.outer], Math.sqrt(Math.random())),
    phase: Math.random() * TAU,
  }));
}

// count stars along `arms` spiral arms, each winding `twist` laps from the
// core to the rim, scattered `spread` rad either side of it
export function scatterArms(
  disk: Disk,
  count: number,
  arms = 2,
  twist = 0.6,
  spread = 0.35,
): Orbit[] {
  return Array.from({ length: count }, (_, i) => {
    const t = Math.random();
    const jitter = (Math.random() + Math.random() - 1) * spread;
    return {
      radius: lerp([disk.inner, disk.outer], t),
      phase: ((i % arms) / arms) * TAU + t * twist * TAU + jitter,
    };
  });
}

const star: Point = { x: 0, y: 0 };

// every star in the crowd at ms, `size` px glimmers, white and gold in turn,
// the disk grown `grow` of the way out from its centre
export function drawStars(
  ctx: CanvasRenderingContext2D,
  disk: Disk,
  stars: readonly Orbit[],
  ms: number,
  size: number,
  grow = 1,
  alpha = 1,
): void {
  if (size <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  for (let i = 0; i < stars.length; i++) {
    const o = stars[i];
    const a = disk.angle(o, ms);
    disk.place(o.radius, a, star, grow);
    stampGlimmer(
      ctx,
      star.x,
      star.y,
      size,
      a * 3,
      i % 2 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  ctx.restore();
}
