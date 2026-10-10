// the victory lap income crit: the number splits into two wisps racing two
// laps round the total like a racetrack, flat out along the straights over
// and under the readout with blasts trailing the leader across it, braking
// hard into the hairpins at its ends; the leader dives into the total at the
// finish, the chaser right behind with the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { smoothstep } from "../../../../shared/easing";
import { planRace, type Race, type RaceCorner } from "../../../../shared/race";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

const ENTRY_MS = 220;
const RACE_MS = 1300;
const GAP_MS = 120;
const DIVE_MS = 110;
const LAPS = 2;
// the track: its middle this far under the total, its straights' half
// length (kept this far inside the screen) and its hairpins' radius
const TRACK_DOWN = 40;
const HALF = 380;
const EDGE = 20;
const RAD = 110;
const STEP = 12;
const ENTRY_DIP = 200;
// blasts trailing the leader while it's over or under the readout
const TRAIL_EVERY_MS = 45;
const TRAIL_LAG_MS = 30;
const TRAIL_REACH = 300;
const TRAIL_OFF = 25;
const TRAIL_BLAST = 150;
const LEAD_BLAST = 300;
const LEADER = WISP_SIZE * 1.4;
const LEADER_HEAT = 1;
const CHASER = WISP_SIZE * 1.1;
const CHASER_HEAT = 0.6;
const CORNER_SHAKE = 1.2;
// shakes by step: a trail blast, the leader in, the chaser's finale
const SHAKES = [0.5, 1.4, 2.4];

interface Lap {
  leader: (ms: number) => Point;
  chaser: (ms: number) => Point;
  trail: Point[];
  trailAt: number[];
  corners: number[];
  finAt: number;
}
const laps = new WeakMap<Running, Lap>();

// distance s round the track from its bottom left, going right along the
// bottom, up round the right hairpin, back along the top, down the left
function trackAt(c: Point, half: number, s: number): Point {
  const straight = half * 2;
  const bend = Math.PI * RAD;
  let d = s % (2 * (straight + bend));
  if (d < straight) return { x: c.x - half + d, y: c.y + RAD };
  d -= straight;
  if (d < bend) {
    const a = Math.PI / 2 - d / RAD;
    return { x: c.x + half + Math.cos(a) * RAD, y: c.y + Math.sin(a) * RAD };
  }
  d -= bend;
  if (d < straight) return { x: c.x + half - d, y: c.y - RAD };
  d -= straight;
  const a = -Math.PI / 2 - d / RAD;
  return { x: c.x - half + Math.cos(a) * RAD, y: c.y + Math.sin(a) * RAD };
}

// a racer `lag` ms behind the leader: out of the flash's spot onto the
// track, round it, then diving into the total
function racer(race: Race, to: Point, lag: number): (ms: number) => Point {
  const origin = { x: 0, y: 0 };
  const start = race.at(0, { x: 0, y: 0 });
  const finish = race.at(RACE_MS, { x: 0, y: 0 });
  const pull = { x: start.x / 2, y: Math.max(0, start.y) + ENTRY_DIP };
  const spot: Point = { x: 0, y: 0 };
  return (ms) => {
    const t = ms - lag;
    if (t < ENTRY_MS)
      return quadratic(origin, pull, start, smoothstep(clamp01(t / ENTRY_MS)));
    if (t < ENTRY_MS + RACE_MS) return race.at(t - ENTRY_MS, spot);
    const u = clamp01((t - ENTRY_MS - RACE_MS) / DIVE_MS) ** 2;
    spot.x = lerp(finish.x, to.x, u);
    spot.y = lerp(finish.y, to.y, u);
    return spot;
  };
}

function planLap(to: Point, viewportWidth: number): Lap {
  const half = Math.min(HALF, viewportWidth / 2 - RAD - EDGE);
  const c = { x: to.x, y: to.y + TRACK_DOWN };
  const straight = half * 2;
  const bend = Math.PI * RAD;
  const lap = 2 * (straight + bend);
  const length = LAPS * lap + half;
  const line: Point[] = [];
  for (let s = 0; s < length; s += STEP) line.push(trackAt(c, half, s));
  line.push(trackAt(c, half, length));
  const turns: RaceCorner[] = [];
  for (let l = 0; l < LAPS; l++)
    turns.push(
      { from: l * lap + straight, to: l * lap + straight + bend },
      { from: l * lap + 2 * straight + bend, to: (l + 1) * lap },
    );
  const race = planRace(line, RACE_MS, turns);
  const trail: Point[] = [];
  const trailAt: number[] = [];
  const p: Point = { x: 0, y: 0 };
  for (let t = 0; t < RACE_MS; t += TRAIL_EVERY_MS) {
    race.at(t, p);
    if (
      Math.abs(p.x - c.x) < TRAIL_REACH &&
      Math.abs(Math.abs(p.y - c.y) - RAD) < 1
    ) {
      trail.push({ x: p.x, y: to.y + (p.y > c.y ? TRAIL_OFF : -TRAIL_OFF) });
      trailAt.push(ENTRY_MS + t + TRAIL_LAG_MS);
    }
  }
  return {
    leader: racer(race, to, 0),
    chaser: racer(race, to, GAP_MS),
    trail,
    trailAt,
    corners: turns.map((turn) => ENTRY_MS + race.msAt(turn.from)),
    finAt: ENTRY_MS + RACE_MS + DIVE_MS,
  };
}

registerFloorCrit("victoryLapCrit", {
  plan(r, bars, hit) {
    const lap = planLap(bars[0], r.viewportWidth);
    laps.set(r, lap);
    for (const at of lap.trailAt) hit(0, at);
    hit(0, lap.finAt, 1);
    hit(0, lap.finAt + GAP_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const lap = laps.get(r);
    if (!lap) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    // a screech and a jolt braking into each hairpin
    while (r.kicked < lap.corners.length && ms >= lap.corners[r.kicked]) {
      r.kicked++;
      r.shake(CORNER_SHAKE);
      playSwoosh();
    }
    const { finAt } = lap;
    drawWispBetween(
      ctx,
      lap.chaser,
      ms,
      now,
      CHASER,
      CHASER_HEAT,
      GAP_MS,
      finAt + GAP_MS,
    );
    drawWispBetween(ctx, lap.leader, ms, now, LEADER, LEADER_HEAT, 0, finAt);
    for (let k = 0; k < lap.trail.length; k++)
      drawDetonation(ctx, lap.trail[k], ms - lap.trailAt[k], TRAIL_BLAST, now);
    drawDetonation(ctx, to, ms - finAt, LEAD_BLAST, now);
    drawFinale(ctx, to, ms - finAt - GAP_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
