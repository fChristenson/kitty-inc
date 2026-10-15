// Hairpin Run, an income crit: the number shoots off as a racer wisp, a
// chaser 120ms behind, up under the total and down the building in a zigzag
// of hairpins round the income panels' and buttons' ends, side after side:
// flat out across, braking hard into each with sparks sprayed off the
// outside and a jolt, a share each, powering out; a last hairpin at the
// bottom, then flat out straight up the screen into the total with the huge
// blast, the chaser slamming in a beat behind
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  planRace,
  type Race,
  type RaceCorner,
} from "../../../../shared/animationStyles/race";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_W,
  SIDE_WALL_WIDTH,
} from "../../../../floors/constants";
import {
  registerFloorCrit,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink } from "../shared";

const IN_MS = 100;
const CHASE_MS = 120;
// the hairpins: round the panels' (left) and buttons' (right) outer ends,
// RAD px round, kept EDGE px inside the screen; the first TOP px under the
// total, the bottom one BOTTOM px over the screen's foot, about ROW px apart
const RAD = 85;
const EDGE = 24;
const TOP = 230;
const BOTTOM = 150;
const ROW = FLOOR_H / 2;
const MIN_PINS = 3;
const MAX_PINS = 6;
const STEP = 24;
const ARC_STEPS = 12;
// px a ms on average (its time held to RACE_MS), corners and the finish as
// shares of top speed
const SPEED = 6;
const RACE_MS: [number, number] = [1450, 1850];
const CORNER = 0.32;
const FINISH = 1.5;
const BRAKING = 0.3;
const RACER = WISP_SIZE * 1.4;
const RACER_HEAT = 0.9;
const CHASER = WISP_SIZE * 1.1;
const CHASER_HEAT = 0.5;
// sparks sprayed off the outside of each hairpin as it goes round
const SPARKS = 18;
const SPARK = 26;
const SPARK_MS = 260;
const SPARK_REACH = 170;
const SPARK_SCATTER = 0.8;
const SPARK_DROP = 70;
const CHASER_BLAST = 220;
const SWOOSH_EARLY_MS = 60;
// shakes by step: a hairpin, the chaser in, the racer's finish
const SHAKES = [0.7, 1.4, 2.8];

interface State {
  race: Race;
  // when it brakes into each hairpin
  corners: number[];
  finishMs: number;
  // per spark: flung at, from, heading
  sparkAt: Float32Array;
  sparkX: Float32Array;
  sparkY: Float32Array;
  sparkCos: Float32Array;
  sparkSin: Float32Array;
  racerAt: (ms: number) => Point | null;
  chaserAt: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();

function planRun(r: Running, to: Point): State & { apexes: number[] } {
  const half = r.viewportWidth / 2;
  const pivot = Math.min(FLOOR_W / 2 - SIDE_WALL_WIDTH, half - RAD - EDGE);
  const top = to.y + TOP;
  const bottom = Math.max(top + MIN_PINS * 2.4 * RAD, -to.y - BOTTOM - RAD);
  const pins = Math.max(
    MIN_PINS,
    Math.min(MAX_PINS, Math.round((bottom - top) / ROW)),
  );
  const line: Point[] = [{ x: 0, y: 0 }];
  const corners: RaceCorner[] = [];
  const centres: Point[] = [];
  let s = 0;
  const push = (x: number, y: number) => {
    const last = line[line.length - 1];
    s += Math.hypot(x - last.x, y - last.y);
    line.push({ x, y });
  };
  const straight = (x: number, y: number) => {
    const last = line[line.length - 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x - last.x, y - last.y) / STEP));
    const x0 = last.x;
    const y0 = last.y;
    for (let i = 1; i <= n; i++)
      push(x0 + ((x - x0) * i) / n, y0 + ((y - y0) * i) / n);
  };
  // round centre c from angle a0 through a1
  const arc = (c: Point, a0: number, a1: number) => {
    straight(c.x + Math.cos(a0) * RAD, c.y + Math.sin(a0) * RAD);
    const from = s;
    for (let i = 1; i <= ARC_STEPS; i++) {
      const a = a0 + ((a1 - a0) * i) / ARC_STEPS;
      push(c.x + Math.cos(a) * RAD, c.y + Math.sin(a) * RAD);
    }
    corners.push({ from, to: s });
    centres.push(c);
  };
  // side hairpins: in along the top heading out, round the end, back along
  // the bottom
  for (let k = 0; k < pins; k++) {
    const side = k % 2 ? -1 : 1;
    const y = top + ((bottom - top) * k) / pins;
    arc({ x: side * pivot, y }, -Math.PI / 2, -Math.PI / 2 + side * Math.PI);
  }
  // the last at the bottom: down its inside, under it, up its outside
  const side = pins % 2 ? -1 : 1;
  arc(
    { x: side * pivot, y: bottom },
    side > 0 ? Math.PI : 0,
    side > 0 ? 0 : Math.PI,
  );
  // flat out straight up into the total
  straight(to.x, to.y);
  const raceMs = Math.max(RACE_MS[0], Math.min(RACE_MS[1], s / SPEED));
  const race = planRace(line, raceMs, corners, {
    corner: CORNER,
    finish: FINISH,
    braking: BRAKING,
  });
  const count = corners.length * SPARKS;
  const sparkAt = new Float32Array(count);
  const sparkX = new Float32Array(count);
  const sparkY = new Float32Array(count);
  const sparkCos = new Float32Array(count);
  const sparkSin = new Float32Array(count);
  const p: Point = { x: 0, y: 0 };
  for (let c = 0; c < corners.length; c++) {
    const t0 = race.msAt(corners[c].from);
    const t1 = race.msAt(corners[c].to);
    for (let i = 0; i < SPARKS; i++) {
      const j = c * SPARKS + i;
      const t = t0 + ((t1 - t0) * (i + hash01(j, 7301))) / SPARKS;
      race.at(t, p);
      const a =
        Math.atan2(p.y - centres[c].y, p.x - centres[c].x) +
        (hash01(j, 7302) - 0.5) * SPARK_SCATTER;
      sparkAt[j] = IN_MS + t;
      sparkX[j] = p.x;
      sparkY[j] = p.y;
      sparkCos[j] = Math.cos(a);
      sparkSin[j] = Math.sin(a);
    }
  }
  const racer: Point = { x: 0, y: 0 };
  const chaser: Point = { x: 0, y: 0 };
  return {
    race,
    corners: corners.map((corner) => IN_MS + race.msAt(corner.from)),
    apexes: corners.map(
      (corner) => IN_MS + race.msAt((corner.from + corner.to) / 2),
    ),
    finishMs: IN_MS + raceMs,
    sparkAt,
    sparkX,
    sparkY,
    sparkCos,
    sparkSin,
    racerAt: (ms) => race.at(ms - IN_MS, racer),
    chaserAt: (ms) => race.at(ms - IN_MS - CHASE_MS, chaser),
  };
}

registerFloorCrit("hairpinRunCrit", {
  plan(r, bars, hit) {
    const run = planRun(r, bars[0]);
    states.set(r, run);
    for (let k = 0; k < run.apexes.length; k++) hit(0, run.apexes[k]);
    hit(0, run.finishMs, 2);
    hit(0, run.finishMs + CHASE_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    // a screech braking into each hairpin
    while (
      r.kicked < state.corners.length &&
      ms >= state.corners[r.kicked] - SWOOSH_EARLY_MS
    ) {
      r.kicked++;
      playSwoosh();
    }
    const { finishMs } = state;
    drawWispBetween(
      ctx,
      state.chaserAt,
      ms,
      now,
      CHASER,
      CHASER_HEAT,
      IN_MS + CHASE_MS,
      finishMs + CHASE_MS,
    );
    drawWispBetween(
      ctx,
      state.racerAt,
      ms,
      now,
      RACER,
      RACER_HEAT,
      IN_MS,
      finishMs,
    );
    // sparks sprayed off the outside of the turns, falling as they fade
    const { sparkAt } = state;
    if (ms >= sparkAt[0] && ms < sparkAt[sparkAt.length - 1] + SPARK_MS) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let j = 0; j < sparkAt.length; j++) {
        const u = (ms - sparkAt[j]) / SPARK_MS;
        if (u < 0) break;
        if (u >= 1) continue;
        const reach = SPARK_REACH * (0.45 + 0.55 * hash01(j, 7303));
        const out = (1 - (1 - u) ** 2) * reach;
        stampGlimmer(
          ctx,
          state.sparkX[j] + state.sparkCos[j] * out,
          state.sparkY[j] + state.sparkSin[j] * out + SPARK_DROP * u * u,
          SPARK * (1 - u),
          j,
          j % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    drawFinale(ctx, to, ms - finishMs, now);
    drawDetonation(ctx, to, ms - finishMs - CHASE_MS, CHASER_BLAST, now);
  },
  tailMs: DETONATION_MS + 60,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
