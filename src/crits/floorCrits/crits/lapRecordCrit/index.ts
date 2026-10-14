// Lap Record, a floor crit: two wisps race a slalom down the building,
// flat out along each bar, braking hard into a hairpin round its end,
// crawling round it, then powering out under it and along the next the
// other way, a screech and a jolt at every turn-in, the chaser on the
// leader's tail; off the last hairpin they sprint to the finish and blast
// in, the leader big, the chaser huge, the shock landing levels on every bar
import {
  planRace,
  type Race,
  type RaceCorner,
} from "../../../../shared/animationStyles/race";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playSwoosh } from "../../../../sound";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";

const IN_MS = 200;
// the line: ABOVE the top bar and below the last, PAST the bars' ends, the
// hairpins' arcs in ARC points; the straights in STRAIGHT points
const ABOVE = 100;
const PAST = 40;
const ARC = 14;
const STRAIGHT = 16;
// the race: RACE_MS a bar (at least MIN_MS, at most MAX_MS), the chaser
// LAG_MS behind
const RACE_MS = 650;
const MIN_MS = 1500;
const MAX_MS = 2800;
const LAG_MS = 120;
const LEADER = WISP_SIZE * 1.4;
const CHASER = WISP_SIZE * 1.2;
const CORNER_SHAKE = 0.5;
// the finish: the leader's blast, the chaser's, then the shock up every bar
const LEADER_BLAST = 220;
const CHASER_BLAST = 320;
const SHOCK_GAP_MS = 120;
const SHOCK_EVERY = 50;
const SHOCK_BLAST = 110;
const TAIL_MS = 900;
// shakes by step: a bar's shock, the chaser's finish
const SHAKES = [0.8, 2.6];

interface State {
  race: Race;
  // when it turns in to each hairpin
  corners: number[];
  finish: number;
  // the line's end, from bars[0]
  end: Point;
  shocks: { bar: number; at: number }[];
  leaderAt: (ms: number) => Point | null;
  chaserAt: (ms: number) => Point | null;
  // bars[0] this frame, the line being planned from it
  offset: Point;
}
const states = new WeakMap<Running, State>();
const raw: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("lapRecordCrit", {
  plan(r, bars, hit) {
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const half = r.play.barHalfWidth + PAST;
    const base = bars[0];
    // the levels the line runs along (from bars[0]): over the top bar,
    // between each pair, under the last
    const levels = [bars[order[0]].y - base.y - ABOVE];
    for (let k = 0; k < order.length - 1; k++)
      levels.push((bars[order[k]].y + bars[order[k + 1]].y) / 2 - base.y);
    levels.push(bars[order[order.length - 1]].y - base.y + ABOVE);
    const line: Point[] = [];
    const cornerSpans: [number, number][] = [];
    for (let k = 0; k < levels.length; k++) {
      const dir = k % 2 ? -1 : 1;
      const y = levels[k];
      for (let i = 0; i <= STRAIGHT; i++)
        line.push({ x: dir * lerp(-half, half, i / STRAIGHT), y });
      if (k === levels.length - 1) break;
      // the hairpin round this end, down to the next level
      const next = levels[k + 1];
      const cy = (y + next) / 2;
      const radius = (next - y) / 2;
      const from = line.length;
      for (let i = 1; i < ARC; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / ARC;
        line.push({
          x: dir * (half + Math.cos(a) * radius * 0.6),
          y: cy + Math.sin(a) * radius,
        });
      }
      cornerSpans.push([from - 1, line.length]);
    }
    const along = [0];
    for (let i = 1; i < line.length; i++)
      along.push(
        along[i - 1] +
          Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y),
      );
    const corners: RaceCorner[] = cornerSpans.map(([a, b]) => ({
      from: along[a],
      to: along[Math.min(b, along.length - 1)],
    }));
    const raceMs = Math.min(MAX_MS, Math.max(MIN_MS, RACE_MS * order.length));
    const race = planRace(line, raceMs, corners);
    const finish = IN_MS + raceMs;
    const shocks = order.map((bar, k) => ({
      bar,
      at: finish + LAG_MS + SHOCK_GAP_MS + k * SHOCK_EVERY,
    }));
    for (const s of shocks) hit(s.bar, s.at, 0);
    hit(0, finish + LAG_MS, 1);
    const offset: Point = { x: 0, y: 0 };
    const racer = (lag: number) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const t = ms - IN_MS - lag;
        if (t < 0 || t > raceMs) return null;
        race.at(t, p);
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
      shocks,
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
    for (const s of state.shocks)
      drawDetonation(ctx, bars[s.bar], ms - s.at, SHOCK_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
