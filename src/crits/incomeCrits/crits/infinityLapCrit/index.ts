// Infinity Lap, an income crit: the green amount shrinks into a racer wisp
// and its chaser that tear two laps of a figure of eight through the total,
// flat out on the diagonals that cross in the middle of the readout,
// braking hard into the hairpins round its ends, crawling round and powering
// out, a screech and a jolt at every turn-in and a pop on the total every
// time the leader cuts across it; off the last hairpin they sprint in and
// dive into the readout, the leader big, the chaser huge
import {
  planRace,
  type Race,
  type RaceCorner,
} from "../../../../shared/animationStyles/race";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale } from "../shared";

const IN_MS = 200;
// the eight: hairpins round HALF either side of the total (kept EDGE in from
// the screen's sides), RAD round in ARC points, the diagonals in STRAIGHT
const HALF = 400;
const EDGE = 30;
const RAD = 120;
const ARC = 14;
const STRAIGHT = 18;
const LAPS = 2;
// the race RACE_MS long, the chaser LAG_MS behind, finishing FINISH times
// top speed
const RACE_MS = 1800;
const LAG_MS = 120;
const FINISH = 1.4;
const LEADER = WISP_SIZE * 1.4;
const CHASER = WISP_SIZE * 1.1;
const CORNER_SHAKE = 0.6;
const CROSS_BLAST = 90;
const LEADER_BLAST = 260;
// shakes by step: a crossing, the leader in, the chaser's finale
const SHAKES = [0.5, 1.4, 2.6];

interface State {
  race: Race;
  corners: number[];
  crosses: number[];
  finish: number;
  leaderAt: (ms: number) => Point | null;
  chaserAt: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const raw: Point = { x: 0, y: 0 };
// the total this frame: the racers read it
let total: Point = { x: 0, y: 0 };

registerFloorCrit("infinityLapCrit", {
  plan(r, _bars, hit) {
    const half = Math.min(HALF, r.viewportWidth / 2 - RAD - EDGE);
    const line: Point[] = [];
    const along: number[] = [];
    const corners: RaceCorner[] = [];
    const crossAt: number[] = [];
    const add = (x: number, y: number) => {
      const last = line[line.length - 1];
      along.push(
        last ? along[along.length - 1] + Math.hypot(x - last.x, y - last.y) : 0,
      );
      line.push({ x, y });
    };
    // a diagonal from (x0, y0) to its mirror, crossing the middle
    const diagonal = (x0: number, y0: number) => {
      for (let i = 1; i <= STRAIGHT; i++) {
        const u = i / STRAIGHT;
        add(lerp(x0, -x0, u), lerp(y0, -y0, u));
      }
      crossAt.push(
        (along[along.length - 1] + along[along.length - 1 - STRAIGHT]) / 2,
      );
    };
    // a hairpin round the end at x, from its top round to its bottom
    const hairpin = (x: number) => {
      const start = along[along.length - 1];
      const dir = Math.sign(x);
      for (let i = 1; i <= ARC; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / ARC;
        add(x + dir * Math.cos(a) * RAD, Math.sin(a) * RAD);
      }
      corners.push({ from: start, to: along[along.length - 1] });
    };
    add(-half, RAD);
    for (let lap = 0; lap < LAPS; lap++) {
      diagonal(-half, RAD);
      hairpin(half);
      diagonal(half, RAD);
      hairpin(-half);
    }
    // the sprint in to the middle
    for (let i = 1; i <= STRAIGHT / 2; i++)
      add(lerp(-half, 0, i / (STRAIGHT / 2)), lerp(RAD, 0, i / (STRAIGHT / 2)));
    const race = planRace(line, RACE_MS, corners, { finish: FINISH });
    const finish = IN_MS + RACE_MS;
    const crosses = crossAt.map((s) => IN_MS + race.msAt(s));
    for (const at of crosses) hit(0, at, 0);
    hit(0, finish, 1);
    hit(0, finish + LAG_MS, 2);
    const racer = (lag: number) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const t = ms - IN_MS - lag;
        if (t < 0 || t > RACE_MS) return null;
        race.at(t, p);
        p.x += total.x;
        p.y += total.y;
        return p;
      };
    };
    states.set(r, {
      race,
      corners: corners.map((c) => IN_MS + race.msAt(c.from)),
      crosses,
      finish,
      leaderAt: racer(0),
      chaserAt: racer(LAG_MS),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    total = to;
    const { race, corners, finish } = state;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      race.at(0, raw);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, raw.x + to.x, p),
        lerp(0, raw.y + to.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    // a screech and a jolt at every turn-in
    while (r.kicked < corners.length && ms >= corners[r.kicked]) {
      r.shake(CORNER_SHAKE);
      playSwoosh();
      r.kicked++;
    }
    drawWispBetween(
      ctx,
      state.chaserAt,
      ms,
      now,
      CHASER,
      0.6,
      IN_MS + LAG_MS,
      finish + LAG_MS,
    );
    drawWispBetween(ctx, state.leaderAt, ms, now, LEADER, 1, IN_MS, finish);
    for (const at of state.crosses)
      drawDetonation(ctx, to, ms - at, CROSS_BLAST, now);
    drawDetonation(ctx, to, ms - finish, LEADER_BLAST, now);
    drawFinale(ctx, to, ms - finish - LAG_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
