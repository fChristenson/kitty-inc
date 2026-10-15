// Esses, a button crit: the number shoots off as a racer wisp, a chaser right
// on its tail, flat out down the left of the buttons in a run of S-bends:
// it brakes hard into a hairpin right beside each button, sparks flying off
// the outside of the turn, the button turning over, and powers out down to
// the next, faster and faster; past the last it floors it for its own button
// and slams in at the finish in a blast, the chaser a beat behind: each of
// their next taps also levels the most upgraded floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  planRace,
  type Race,
  type RaceCorner,
} from "../../../../shared/animationStyles/race";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  byHeight,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";

const IN_MS = 120;
// the hairpins INNER px left of each button's left end, swinging OUTER px out
// between them, START px over the top one; corners filleted CUT px round
const INNER = 70;
const OUTER = 330;
const START = 320;
const CUT = 60;
// px a ms on average, the corners at CORNER of top speed, the finish FINISH
const SPEED = 4.5;
const CORNER = 0.4;
const FINISH = 1.4;
const CHASE_MS = 120;
const RACER = WISP_SIZE * 1.4;
const CHASER = WISP_SIZE * 1.1;
// sparks flung off the outside of each hairpin over SPARK_MS
const SPARKS = 14;
const SPARK = 26;
const SPARK_MS = 260;
const SPARK_REACH = 150;
const FINISH_BLAST = 300;
const CHASER_BLAST = 160;
// shakes by step: its own hairpin, a button, the finish
const SHAKES = [0.6, 1, 2.8];

interface Hairpin {
  at: Point;
  ms: number;
}
interface State {
  race: Race;
  hairpins: Hairpin[];
  finish: Point;
  finishMs: number;
  // its own button where it was planned: the line follows it as it scrolls
  anchor: Point;
  racerAt: (ms: number) => Point;
  chaserAt: (ms: number) => Point;
}
const states = new WeakMap<Running, State>();

// each tap also levelling the floor with the most upgrades that can take more
const lapTaps = defineTapPerk("Lap", (t) => {
  let best: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!best || floor.upgradeCount > best.upgradeCount)
    )
      best = floor;
  if (best) t.levelUp(best, meta.values.levels, `+${meta.values.levels} Lvl`);
});

// the points' line with every inner corner rounded CUT px off, and where
// each corner runs along it
function rounded(points: Point[]): {
  line: Point[];
  corners: RaceCorner[];
  apexes: number[];
} {
  const line: Point[] = [points[0]];
  const corners: RaceCorner[] = [];
  const apexes: number[] = [];
  let s = 0;
  const push = (p: Point) => {
    const last = line[line.length - 1];
    s += Math.hypot(p.x - last.x, p.y - last.y);
    line.push(p);
  };
  for (let i = 1; i < points.length - 1; i++) {
    const [p, v, n] = [points[i - 1], points[i], points[i + 1]];
    const lin = Math.hypot(v.x - p.x, v.y - p.y) || 1;
    const lout = Math.hypot(n.x - v.x, n.y - v.y) || 1;
    const c = Math.min(CUT, lin / 2, lout / 2);
    const a = {
      x: v.x - ((v.x - p.x) / lin) * c,
      y: v.y - ((v.y - p.y) / lin) * c,
    };
    const b = {
      x: v.x + ((n.x - v.x) / lout) * c,
      y: v.y + ((n.y - v.y) / lout) * c,
    };
    push(a);
    const from = s;
    for (let j = 1; j <= 6; j++) {
      const u = j / 6;
      const w = 1 - u;
      push({
        x: w * w * a.x + 2 * w * u * v.x + u * u * b.x,
        y: w * w * a.y + 2 * w * u * v.y + u * u * b.y,
      });
      if (j === 3) apexes.push(s);
    }
    corners.push({ from, to: s });
  }
  push(points[points.length - 1]);
  return { line, corners, apexes };
}

registerFloorCrit("essesCrit", {
  reward(t) {
    lapTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const left = (bar: number) => bars[bar].x - BTN_W / 2;
    const top = bars[order[0]];
    // from the flash, over the top button, then a hairpin beside each and a
    // swing out between them, then a dash into its own button
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: left(order[0]) - OUTER, y: top.y - START },
    ];
    order.forEach((bar, k) => {
      points.push({ x: left(bar) - INNER, y: bars[bar].y });
      const next = order[k + 1];
      if (next !== undefined)
        points.push({
          x: left(bar) - OUTER,
          y: (bars[bar].y + bars[next].y) / 2,
        });
    });
    const finish = { x: left(0) + 20, y: bars[0].y };
    points.push(finish);
    const { line, corners, apexes } = rounded(points);
    let total = 0;
    for (let i = 1; i < line.length; i++)
      total += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
    const raceMs = total / SPEED;
    const race = planRace(line, raceMs, corners, {
      corner: CORNER,
      finish: FINISH,
    });
    // the hairpins beside the buttons are every other corner from the second
    const hairpins: Hairpin[] = order.map((bar, k) => {
      const corner = 1 + 2 * k;
      const ms = IN_MS + race.msAt(apexes[corner]);
      hit(bar, ms, bar === 0 ? 0 : 1);
      return { at: { x: left(bar) - INNER, y: bars[bar].y }, ms };
    });
    const finishMs = IN_MS + raceMs;
    hit(0, finishMs, 2);
    const racer: Point = { x: 0, y: 0 };
    const chaser: Point = { x: 0, y: 0 };
    states.set(r, {
      race,
      hairpins,
      finish,
      finishMs,
      anchor: { x: bars[0].x, y: bars[0].y },
      racerAt: (ms) => race.at(ms - IN_MS, racer),
      chaserAt: (ms) => race.at(ms - IN_MS - CHASE_MS, chaser),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.6 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    // a swoosh into every hairpin
    while (
      r.kicked < state.hairpins.length &&
      ms >= state.hairpins[r.kicked].ms - 60
    ) {
      r.kicked++;
      playSwoosh();
    }
    ctx.save();
    ctx.translate(bars[0].x - state.anchor.x, bars[0].y - state.anchor.y);
    if (ms < state.finishMs) drawWisp(ctx, state.racerAt, ms, now, RACER, 0.8);
    if (ms < state.finishMs + CHASE_MS)
      drawWisp(ctx, state.chaserAt, ms, now, CHASER, 0.5);
    // sparks flung off the outside of each hairpin, away from its button
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < state.hairpins.length; k++) {
      const pin = state.hairpins[k];
      const u = (ms - pin.ms) / SPARK_MS;
      if (u < 0 || u >= 1) continue;
      const out = 1 - (1 - u) ** 2;
      for (let i = 0; i < SPARKS; i++) {
        const a = Math.PI + (hash01(i, k + 610) - 0.5) * 1.6;
        const reach = SPARK_REACH * (0.4 + 0.6 * hash01(i, k + 611)) * out;
        stampGlimmer(
          ctx,
          pin.at.x + Math.cos(a) * reach,
          pin.at.y + Math.sin(a) * reach + 60 * u * u,
          SPARK * (1 - u),
          i + k * SPARKS,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, state.finish, ms - state.finishMs, FINISH_BLAST, now);
    drawDetonation(
      ctx,
      state.finish,
      ms - state.finishMs - CHASE_MS,
      CHASER_BLAST,
      now,
    );
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
