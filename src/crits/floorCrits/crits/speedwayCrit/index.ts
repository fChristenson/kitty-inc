// Speedway, a floor crit: the number turns into a racer wisp and its chaser
// that tear two laps round the outside of every bar in view, flat out up
// one side, braking hard into each tight corner round the top and bottom
// bars, crawling round it and powering out, a screech and a jolt at every
// turn-in; each time the leader roars down past a bar it lands levels on
// it; off the last lap they turn in hard onto their own bar and sprint
// across it above top speed into the finish, the leader big, the chaser huge
import {
  planRace,
  type Race,
  type RaceCorner,
} from "../../../../shared/animationStyles/race";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playSwoosh } from "../../../../sound";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";

const IN_MS = 180;
// the track: PAST the bars' ends, ABOVE the top bar and below the bottom
// one, its corners CORNER px round in ARC points, LAPS laps
const PAST = 90;
const ABOVE = 170;
const CORNER = 80;
const ARC = 8;
const LAPS = 2;
// the race RACE_MS long, the chaser LAG_MS behind, finishing FINISH times
// top speed
const RACE_MS = 2600;
const LAG_MS = 120;
const FINISH = 1.5;
const LEADER = WISP_SIZE * 1.4;
const CHASER = WISP_SIZE * 1.2;
const CORNER_SHAKE = 0.5;
const LEADER_BLAST = 240;
const CHASER_BLAST = 360;
// shakes by step: a drive-by, the finish
const SHAKES = [0.35, 2.8];

interface State {
  race: Race;
  corners: number[];
  finish: number;
  // the finish line, from bars[0]
  end: Point;
  leaderAt: (ms: number) => Point | null;
  chaserAt: (ms: number) => Point | null;
  offset: Point;
}
const states = new WeakMap<Running, State>();
const raw: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("speedwayCrit", {
  // two drive-bys a bar
  levels: (count) => Math.ceil(count / 2),
  plan(r, bars, hit) {
    const base = bars[0];
    let top = Infinity;
    let bottom = -Infinity;
    for (const bar of bars) {
      top = Math.min(top, bar.y - base.y);
      bottom = Math.max(bottom, bar.y - base.y);
    }
    const half = r.play.barHalfWidth;
    const left = -(half + PAST);
    const right = half + PAST;
    const t = top - ABOVE;
    const b = bottom + ABOVE;
    const line: Point[] = [];
    const along: number[] = [];
    const corners: RaceCorner[] = [];
    // the right-hand straight's start along the line, each lap
    const downs: number[] = [];
    const add = (x: number, y: number) => {
      const last = line[line.length - 1];
      along.push(
        last ? along[along.length - 1] + Math.hypot(x - last.x, y - last.y) : 0,
      );
      line.push({ x, y });
    };
    const turn = (cx: number, cy: number, from: number) => {
      const start = along[along.length - 1];
      for (let i = 1; i <= ARC; i++) {
        const a = from + (Math.PI / 2) * (i / ARC);
        add(cx + Math.cos(a) * CORNER, cy + Math.sin(a) * CORNER);
      }
      corners.push({ from: start, to: along[along.length - 1] });
    };
    add(left, b - CORNER);
    for (let lap = 0; lap < LAPS; lap++) {
      add(left, t + CORNER);
      turn(left + CORNER, t + CORNER, Math.PI);
      add(right - CORNER, t);
      turn(right - CORNER, t + CORNER, -Math.PI / 2);
      downs.push(along[along.length - 1]);
      add(right, b - CORNER);
      turn(right - CORNER, b - CORNER, 0);
      add(left + CORNER, b);
      turn(left + CORNER, b - CORNER, Math.PI / 2);
    }
    // up the side to its own bar, hard in, and flat out across it
    add(left, CORNER);
    turn(left + CORNER, CORNER, Math.PI);
    add(half, 0);
    const race = planRace(line, RACE_MS, corners, { finish: FINISH });
    const finish = IN_MS + RACE_MS;
    for (const down of downs)
      bars.forEach((bar, k) => {
        if (k === 0) return;
        const s = down + (bar.y - base.y) - (t + CORNER);
        hit(k, IN_MS + race.msAt(s), 0);
      });
    hit(0, finish + LAG_MS, 1);
    const offset: Point = { x: 0, y: 0 };
    const racer = (lag: number) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const at = ms - IN_MS - lag;
        if (at < 0 || at > RACE_MS) return null;
        race.at(at, p);
        p.x += offset.x;
        p.y += offset.y;
        return p;
      };
    };
    states.set(r, {
      race,
      corners: corners.map((c) => IN_MS + race.msAt(c.from)),
      finish,
      end: line[line.length - 1],
      leaderAt: racer(0),
      chaserAt: racer(LAG_MS),
      offset,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { race, corners, finish } = state;
    state.offset.x = bars[0].x;
    state.offset.y = bars[0].y;
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      race.at(0, raw);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, raw.x + bars[0].x, p),
        lerp(0, raw.y + bars[0].y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    // a screech and a jolt at every turn-in
    while (r.kicked < corners.length && ms >= corners[r.kicked]) {
      r.shake(CORNER_SHAKE);
      playSwoosh();
      r.kicked++;
    }
    if (ms >= IN_MS && ms <= finish + LAG_MS) {
      drawWisp(ctx, state.chaserAt, ms, now, CHASER, 0.6);
      drawWisp(ctx, state.leaderAt, ms, now, LEADER, 1);
    }
    spot.x = bars[0].x + state.end.x;
    spot.y = bars[0].y + state.end.y;
    drawDetonation(ctx, spot, ms - finish, LEADER_BLAST, now);
    drawDetonation(ctx, spot, ms - finish - LAG_MS, CHASER_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
