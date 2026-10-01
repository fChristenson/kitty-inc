// the "Stream" event: it covers its crit, whose click freezes the screen while
// the button pours a river of coins and bills that winds across the whole
// screen, looping the loop along the way, then flows into the total (see
// ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { randomInt } from "../../utils";
import { playBoostEventStream } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import type { CoinPath } from "../coins";
import {
  canStartMoneyCover,
  FLOW_FLIGHT_MS,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../moneyCover";

const KEY = "stream";
// coins along the whole river while it's full
const COINS_ALONG = 2_000;
const END_PAUSE_MS = 100;
const MARGIN = 110; // keeps the river's middle clear of the screen's edges
// the river wanders this far (of the screen's width + height) before it
// heads for the total
const WANDER: [number, number] = [1.4, 2];
const MIN_TURN_RADIUS = 150;
// px of river per meander, side to side and back
const MEANDER: [number, number] = [500, 1_200];
// how far ahead the river looks for the screen's edge, to swing away in time
const LOOKAHEAD = 240;
const LOOPS: [number, number] = [1, 1];
// of the screen's shorter side: how far a loop bulges out of the river
const LOOP_RADIUS: [number, number] = [0.22, 0.27];
// loops are ovals, this much longer along the flow, and lopsided
const LOOP_STRETCH: [number, number] = [1.3, 1.7];
const LOOP_SKEW: [number, number] = [-0.2, 0.2];
// a thin line, widest where it leaves the button and tapering to a point at
// its head, its coins shrinking along the way like a homing stream's
const START_WIDTH = 60;
const HEAD_SCALE = 0.45; // of a coin's size, by the end of the river
// each coin also sways a little across the line as it flows (of its width)
const SWAY: [number, number] = [0.05, 0.15];
const SWAY_WAVES: [number, number] = [3, 6];
// coins pour out of the button, spreading to their lane over this much of the way
const SPREAD_IN = 0.04;
const STEP = 6; // px between the river line's samples
const EDGE = 30; // loops stay at least this far inside the screen
// how far (of the river's length) a loop may move from its spot to fit
const LOOP_SEARCH = 0.15;

type Pt = { x: number; y: number };

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);

// the signed turn (-PI..PI) from heading a to heading b
const turnTo = (a: number, b: number) =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a));

// an oval loop the loop off line[i], bulging towards the screen's middle;
// null when it wouldn't fit on screen there
function loopAt(line: Pt[], i: number, area: CoverArea): Pt[] | null {
  const a = line[i - 1];
  const b = line[i + 1];
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const tx = (b.x - a.x) / length;
  const ty = (b.y - a.y) / length;
  let nx = -ty;
  let ny = tx;
  const q = line[i];
  const midX = (area.left + area.right) / 2;
  const midY = (area.top + area.bottom) / 2;
  if (nx * (midX - q.x) + ny * (midY - q.y) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const r =
    between(LOOP_RADIUS) *
    Math.min(area.right - area.left, area.bottom - area.top);
  const along = r * between(LOOP_STRETCH);
  const skew = between(LOOP_SKEW);
  const cx = q.x + nx * r;
  const cy = q.y + ny * r;
  const count = Math.ceil((Math.PI * (r + along)) / STEP);
  const loop: Pt[] = [];
  for (let j = 1; j <= count; j++) {
    const angle = (Math.PI * 2 * j) / count;
    // back to 1 at the start and end, so the loop rejoins the river smoothly
    const lopsided = 1 + skew * Math.sin(angle);
    const p = {
      x:
        cx +
        lopsided * (-nx * r * Math.cos(angle) + tx * along * Math.sin(angle)),
      y:
        cy +
        lopsided * (-ny * r * Math.cos(angle) + ty * along * Math.sin(angle)),
    };
    if (
      p.x < area.left + EDGE ||
      p.x > area.right - EDGE ||
      p.y < area.top + EDGE ||
      p.y > area.bottom - EDGE
    )
      return null;
    loop.push(p);
  }
  return loop;
}

// the river's middle, from start: meandering off in a random direction,
// swinging away from the screen's edges, then curving round to the top
// middle, looping the loop once on the way. It only ever bends, so it never
// doubles back on itself
function riverLine(area: CoverArea, start: Pt): Pt[] {
  const left = area.left + MARGIN;
  const right = area.right - MARGIN;
  const top = area.top + MARGIN;
  const bottom = area.bottom - MARGIN;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;
  const end = { x: midX, y: top };
  const maxTurn = STEP / MIN_TURN_RADIUS;
  // two overlapping waves of bending, so the meanders vary in size
  const waves = [0, 1].map(() => ({
    rate: (Math.PI * 2) / between(MEANDER),
    phase: Math.random() * Math.PI * 2,
    weight: between([0.5, 1]),
  }));
  const wander = between(WANDER) * (right - left + (bottom - top));
  let heading = Math.random() * Math.PI * 2;
  let { x, y } = start;
  const line: Pt[] = [{ x, y }];
  for (let s = 0; s < wander * 4; s += STEP) {
    let turn =
      (maxTurn / 2) *
      waves.reduce(
        (sum, w) => sum + w.weight * Math.sin(w.rate * s + w.phase),
        0,
      );
    const aheadX = x + Math.cos(heading) * LOOKAHEAD;
    const aheadY = y + Math.sin(heading) * LOOKAHEAD;
    if (aheadX < left || aheadX > right || aheadY < top || aheadY > bottom)
      turn =
        Math.sign(turnTo(heading, Math.atan2(midY - y, midX - x))) *
        maxTurn *
        1.5;
    if (s > wander) {
      if (Math.hypot(end.x - x, end.y - y) < STEP * 2) break;
      // turns ever tighter, so it can't circle the end forever
      const limit = maxTurn * (1.5 + (s - wander) / 400);
      const want = turnTo(heading, Math.atan2(end.y - y, end.x - x));
      turn = Math.max(-limit, Math.min(limit, want));
    }
    heading += turn;
    x += Math.cos(heading) * STEP;
    y += Math.sin(heading) * STEP;
    line.push({ x, y });
  }
  line.push(end);
  const loops = randomInt(...LOOPS);
  // last to first, so splicing a loop in leaves the earlier indexes in place
  for (let k = loops; k >= 1; k--) {
    const f = k / (loops + 1) + (Math.random() - 0.5) * 0.08;
    const at = Math.round(f * line.length);
    // the nearest spot to f where the loop fits on screen, if any
    const reach = Math.round(line.length * LOOP_SEARCH);
    for (let d = 0; d <= reach; d += 10) {
      const i = [at + d, at - d].find((j) => j >= 1 && j < line.length - 1);
      const loop = i === undefined ? null : loopAt(line, i, area);
      if (loop) {
        line.splice(i! + 1, 0, ...loop);
        break;
      }
    }
  }
  return line;
}

// one path per coin down a river from start, each in its own swaying lane
export function riverPaths(
  area: CoverArea,
  start: Pt,
  count: number,
): CoinPath[] {
  const line = riverLine(area, start);
  const distances = [0];
  for (let i = 1; i < line.length; i++)
    distances.push(
      distances[i - 1] +
        Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y),
    );
  const total = distances[distances.length - 1];
  // the point s px along the line, with its unit normal
  const at = (s: number) => {
    let lo = 0;
    let hi = line.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (distances[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = line[lo];
    const b = line[hi];
    const span = distances[hi] - distances[lo] || 1;
    const f = Math.min(1, Math.max(0, (s - distances[lo]) / span));
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      nx: -(b.y - a.y) / span,
      ny: (b.x - a.x) / span,
    };
  };
  const paths: CoinPath[] = [];
  for (let i = 0; i < count; i++) {
    const lane = Math.random() - 0.5;
    const sway = between(SWAY);
    const waves = between(SWAY_WAVES) * Math.PI * 2;
    const phase = Math.random() * Math.PI * 2;
    paths.push((f) => {
      const p = at(f * total);
      const width = START_WIDTH * (1 - f) ** 2 * Math.min(1, f / SPREAD_IN);
      const offset = (lane + sway * Math.sin(phase + f * waves)) * width;
      return {
        x: p.x + p.nx * offset,
        y: p.y + p.ny * offset,
        scale: 1 - (1 - HEAD_SCALE) * f,
      };
    });
  }
  return paths;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.streamEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { travelMs } = CONFIG.streamEvent;
      // the button pours until the river's head reaches the total, then the
      // event ends as its tail does
      const streamMs = travelMs + FLOW_FLIGHT_MS;
      const durationMs =
        streamMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
      const cover = startMoneyCover(KEY, floor, context, { durationMs }, {});
      if (!cover) return;
      const count = Math.round((COINS_ALONG * streamMs) / travelMs);
      const paths = riverPaths(cover.area, cover.button, count);
      cover.flow(paths, streamMs, travelMs);
      playBoostEventStream();
    },
  },
  { label: "Stream", color: COLOR.cyan },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Stream
export function forceStreamEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
