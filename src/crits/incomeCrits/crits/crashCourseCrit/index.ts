// Crash Course, an income crit: the number shrinks away while two huge wisps
// light up at the screen's sides, trembling and blazing hotter; meanwhile
// pairs of wisps rocket in from both sides, flat out, and smash into each
// other on the total, a blast and a share each, the pairs closing up; then
// the two huge ones tear in on wide arcs and meet head-on in the middle of
// the readout: the biggest blast and the rest of the pay
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const FIRST_MS = 90;
const PAIRS = 7;
// the pairs launching GAPS_MS apart (closing), each FLY_MS in (quickening)
const GAPS_MS: [number, number] = [200, 70];
const FLY_MS: [number, number] = [280, 160];
// they launch SIDE_OUT px past the screen's sides, DROP px under the total
// (spread by DROP_SPREAD), bowed BOW px down
const SIDE_OUT = 40;
const DROP = 260;
const DROP_SPREAD = 300;
const BOW = 120;
const WISP = WISP_SIZE * 1.1;
const BLAST = 190;
// the two huge ones: WAIT_IN px in from the sides at the number's height,
// lit at LIGHT_MS, trembling up to TREMBLE px, tearing in over FINAL_MS on
// arcs ARC px high, GO_GAP_MS after the last pair
const WAIT_IN = 70;
const LIGHT_MS = 150;
const TREMBLE = 14;
const FINAL_MS = 240;
const ARC = 260;
const GO_GAP_MS = 50;
const BIG = WISP_SIZE * 2.3;
// shakes by step: a pair, the head-on crash
const SHAKES = [0.9, 2.8];

interface Pair {
  launch: number;
  land: number;
  to: Point;
  paths: ((ms: number) => Point)[];
}
interface Course {
  pairs: Pair[];
  go: number;
  land: number;
  bigs: ((ms: number) => Point)[];
  launches: number[];
}
const courses = new WeakMap<Running, Course>();

// a wisp flying flat out from `from`, bowed down, onto `to`
function flight(
  from: Point,
  to: Point,
  launch: number,
  land: number,
  bow: number,
) {
  const at: Point = { x: 0, y: 0 };
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2 + bow;
  return (ms: number): Point => {
    const t = clamp01((ms - launch) / (land - launch)) ** 2;
    const u = 1 - t;
    at.x = u * u * from.x + 2 * u * t * cx + t * t * to.x;
    at.y = u * u * from.y + 2 * u * t * cy + t * t * to.y;
    return at;
  };
}

function planCourse(to: Point, viewportWidth: number): Course {
  const half = viewportWidth / 2;
  const pairs: Pair[] = [];
  const launches: number[] = [];
  let t = FIRST_MS;
  for (let k = 0; k < PAIRS; k++) {
    const u = k / (PAIRS - 1);
    const land = t + lerp(FLY_MS[0], FLY_MS[1], u);
    const spot = readoutSpot(to, k, 517);
    const paths = [-1, 1].map((side, i) =>
      flight(
        {
          x: side * (half + SIDE_OUT),
          y: to.y + DROP + DROP_SPREAD * holeHash(k * 2 + i, 518),
        },
        spot,
        t,
        land,
        BOW,
      ),
    );
    pairs.push({ launch: t, land, to: spot, paths });
    launches.push(t);
    t += lerp(GAPS_MS[0], GAPS_MS[1], u);
  }
  const go = pairs[PAIRS - 1].land + GO_GAP_MS;
  const land = go + FINAL_MS;
  launches.push(go);
  const bigs = [-1, 1].map((side) => {
    const wait: Point = { x: side * (half - WAIT_IN), y: 0 };
    const fly = flight(wait, to, go, land, -ARC);
    const at: Point = { x: 0, y: 0 };
    return (ms: number): Point => {
      if (ms >= go) return fly(ms);
      const shiver = TREMBLE * clamp01((ms - LIGHT_MS) / (go - LIGHT_MS)) ** 2;
      at.x = wait.x + Math.sin(ms * 0.9) * shiver;
      at.y = wait.y + Math.cos(ms * 1.3) * shiver;
      return at;
    };
  });
  return { pairs, go, land, bigs, launches };
}

registerFloorCrit("crashCourseCrit", {
  plan(r, bars, hit) {
    const course = planCourse(bars[0], r.viewportWidth);
    courses.set(r, course);
    for (const p of course.pairs) hit(0, p.land);
    hit(0, course.land, 1);
  },
  draw(ctx, r, ms, bars) {
    const course = courses.get(r);
    if (!course) return;
    const now = r.startedAt + ms;
    drawNumberShrink(ctx, r, ms);
    while (
      r.kicked < course.launches.length &&
      ms >= course.launches[r.kicked]
    ) {
      playSwoosh();
      r.kicked++;
    }
    const { pairs, go, land } = course;
    for (let k = 0; k < pairs.length; k++) {
      const p = pairs[k];
      drawWispBetween(ctx, p.paths[0], ms, now, WISP, 0.7, p.launch, p.land);
      drawWispBetween(ctx, p.paths[1], ms, now, WISP, 0.7, p.launch, p.land);
      drawDetonation(ctx, p.to, ms - p.land, BLAST, now);
    }
    // the huge ones blazing hotter as they wait, white-hot as they tear in
    const heat = ms < go ? clamp01((ms - LIGHT_MS) / (go - LIGHT_MS)) : 1;
    const size = BIG * (0.6 + 0.4 * heat);
    drawWispBetween(ctx, course.bigs[0], ms, now, size, heat, LIGHT_MS, land);
    drawWispBetween(ctx, course.bigs[1], ms, now, size, heat, LIGHT_MS, land);
    drawFinale(ctx, bars[0], ms - land, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
