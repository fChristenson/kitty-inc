// Hot Lap, a lock crit: the number turns into a racer wisp and its chaser
// that tear two laps round the inside of the locked floor, flat out down its
// length, braking hard into the hairpins at its ends; they cross the line,
// the floor bursts open, and three wisps drop in onto its chairs, supplies
// and manager
import { drawDetonation } from "../../../../shared/explosion";
import { smoothstep } from "../../../../shared/easing";
import { planRace, type RaceCorner } from "../../../../shared/race";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";

const ENTRY_MS = 220;
const ENTRY_DIP = 200;
const RACE_MS = 1800;
const GAP_MS = 120;
const LAPS = 2;
// the track round the floor's middle: its straights' half length and its
// hairpins' radius
const HALF = 360;
const RAD = 190;
const STEP = 12;
const LEADER = WISP_SIZE * 1.4;
const CHASER = WISP_SIZE * 1.1;
const CORNER_SHAKE = 1.2;
const LEAD_BLAST = 200;
const OPEN_BLAST = 300;
// three wisps dropping in onto the opened floor, one after another
const DROP_DELAY_MS = 160;
const DROP_GAP_MS = 90;
const DROP_MS = 180;
const DROP_FROM = -FLOOR_H * 0.35;
const DROP_SPOTS = [0.2, 0.5, 0.8];
const CAT_MID = 70;
const DROP_BLAST = 140;
const TAIL_MS = 900;

interface Lap {
  bars: Point[];
  // where each racer is, from the lock's middle (its entry from the flash)
  leader: (ms: number) => Point;
  chaser: (ms: number) => Point;
  corners: number[];
  // the start and finish line, from the lock's middle
  start: Point;
  finAt: number;
  open: number;
  drops: number[];
  // the drops' landing spots, from the lock's middle
  spots: Point[];
  fall: ((ms: number) => Point | null)[];
}

const laps = new WeakMap<Running, Lap>();
const spot: Point = { x: 0, y: 0 };

// distance s round the track from its top left, right along the top, down
// round the right hairpin, back along the bottom, up round the left
function trackAt(s: number): Point {
  const straight = HALF * 2;
  const bend = Math.PI * RAD;
  let d = s % (2 * (straight + bend));
  if (d < straight) return { x: -HALF + d, y: -RAD };
  d -= straight;
  if (d < bend) {
    const a = -Math.PI / 2 + d / RAD;
    return { x: HALF + Math.cos(a) * RAD, y: Math.sin(a) * RAD };
  }
  d -= bend;
  if (d < straight) return { x: HALF - d, y: RAD };
  d -= straight;
  const a = Math.PI / 2 + d / RAD;
  return { x: -HALF + Math.cos(a) * RAD, y: Math.sin(a) * RAD };
}

registerFloorCrit("hotLapCrit", {
  plan(r, bars, hit) {
    const straight = HALF * 2;
    const bend = Math.PI * RAD;
    const lapLength = 2 * (straight + bend);
    const length = LAPS * lapLength;
    const line: Point[] = [];
    for (let s = 0; s < length; s += STEP) line.push(trackAt(s));
    line.push(trackAt(length));
    const turns: RaceCorner[] = [];
    for (let l = 0; l < LAPS; l++)
      turns.push(
        { from: l * lapLength + straight, to: l * lapLength + straight + bend },
        { from: l * lapLength + 2 * straight + bend, to: (l + 1) * lapLength },
      );
    const race = planRace(line, RACE_MS, turns);
    const start = trackAt(0);
    const lap: Lap = {
      bars,
      leader: () => spot,
      chaser: () => spot,
      corners: turns.map((turn) => ENTRY_MS + race.msAt(turn.from)),
      start,
      finAt: ENTRY_MS + RACE_MS,
      open: ENTRY_MS + RACE_MS + GAP_MS,
      drops: [],
      spots: [],
      fall: [],
    };
    // a racer lag ms behind: out of the flash onto the track, then round it
    const racer = (lag: number) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const mid = lap.bars[0];
        const t = ms - lag;
        if (t < ENTRY_MS) {
          const u = smoothstep(clamp01(t / ENTRY_MS));
          const ex = mid.x + start.x;
          const ey = mid.y + start.y;
          const py = Math.max(0, ey) + ENTRY_DIP;
          at.x = lerp(0, ex, u);
          at.y = 2 * (1 - u) * u * py + u * u * ey;
          return at;
        }
        race.at(Math.min(RACE_MS, t - ENTRY_MS), at);
        at.x += mid.x;
        at.y += mid.y;
        return at;
      };
    };
    lap.leader = racer(0);
    lap.chaser = racer(GAP_MS);
    hit(0, lap.finAt, 0);
    hit(0, lap.open, 1);
    const lock = getLockCenter();
    DROP_SPOTS.forEach((share, k) => {
      const x = FLOOR_X_MIN + (FLOOR_X_MAX - FLOOR_X_MIN) * share - lock.x;
      const to = { x, y: WORKER_FEET_Y - lock.y - CAT_MID };
      const drop = lap.open + DROP_DELAY_MS + k * DROP_GAP_MS;
      lap.drops.push(drop);
      lap.spots.push(to);
      hit(0, drop + DROP_MS, 2);
      const at: Point = { x: 0, y: 0 };
      lap.fall.push((ms) => {
        if (ms < drop || ms > drop + DROP_MS) return null;
        const mid = lap.bars[0];
        const u = ((ms - drop) / DROP_MS) ** 2;
        at.x = mid.x + x;
        at.y = mid.y + lerp(DROP_FROM, to.y, u);
        return at;
      });
    });
    laps.set(r, lap);
  },
  draw(ctx, r, ms, bars) {
    const lap = laps.get(r)!;
    lap.bars = bars;
    const now = r.startedAt + ms;
    const mid = bars[0];
    if (ms < ENTRY_MS / 2)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / (ENTRY_MS / 2),
      });
    // a screech and a jolt braking into each hairpin
    while (r.kicked < lap.corners.length && ms >= lap.corners[r.kicked]) {
      r.kicked++;
      r.shake(CORNER_SHAKE);
      playSwoosh();
    }
    drawWispBetween(ctx, lap.chaser, ms, now, CHASER, 0.6, GAP_MS, lap.open);
    drawWispBetween(ctx, lap.leader, ms, now, LEADER, 1, 0, lap.finAt);
    spot.x = mid.x + lap.start.x;
    spot.y = mid.y + lap.start.y;
    drawDetonation(ctx, spot, ms - lap.finAt, LEAD_BLAST, now);
    drawDetonation(ctx, mid, ms - lap.open, OPEN_BLAST, now);
    for (let k = 0; k < lap.drops.length; k++) {
      const land = lap.drops[k] + DROP_MS;
      drawWispBetween(
        ctx,
        lap.fall[k],
        ms,
        now,
        WISP_SIZE * 1.2,
        0.7,
        lap.drops[k],
        land,
      );
      spot.x = mid.x + lap.spots[k].x;
      spot.y = mid.y + lap.spots[k].y;
      drawDetonation(ctx, spot, ms - land, DROP_BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1 : 1.4),
});
