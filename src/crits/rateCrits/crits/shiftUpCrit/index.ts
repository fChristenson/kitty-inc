// Shift Up, a rate crit: the number turns into a racer wisp and its chaser
// that tear a lap round each bar in turn, flat out along it, braking hard
// round its ends, quicker each, the crit's own last with two laps; as the
// chaser crosses the line the bar shifts up a gear with a jolt, its readout
// turning over onto twice its rate for good
import { CONFIG } from "../../../../config";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { smoothstep } from "../../../../shared/easing";
import { planRace, type Race, type RaceCorner } from "../../../../shared/animationStyles/race";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const ENTRY_MS = 220;
const ENTRY_DIP = 160;
const HOP_MS = 140;
const HOP_LIFT = 90;
const GAP_MS = 110;
// a lap's time on the first bar and on the last, per lap
const LAP_MS: [number, number] = [560, 400];
// the track round each bar: its straights end this far in from the bar's
// ends, its hairpins this far out from its edges
const END_INSET = 60;
const EDGE_OUT = 40;
const STEP = 12;
const LEADER = WISP_SIZE * 1.4;
const CHASER = WISP_SIZE * 1.1;
const CORNER_SHAKE = 1;
const SHIFT_BLAST = 100;
const OWN_SHIFT_BLAST = 210;
const TAIL_MS = 800;

interface Lap {
  bar: number;
  start: number;
  end: number;
  race: Race;
}

interface State {
  bars: Point[];
  laps: Lap[];
  corners: number[];
  shifts: number[];
  // where the track starts and finishes, from a bar's middle
  line: Point;
  leader: (ms: number) => Point;
  chaser: (ms: number) => Point;
}

const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("shiftUpCrit", {
  // faster for good
  reward(t) {
    t.floor.incomeIntervalSeconds /= CONFIG.crit.shiftUpSpeed;
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth - END_INSET;
    const rad = getIncomeBarBox(false).height / 2 + EDGE_OUT;
    const straight = half * 2;
    const bend = Math.PI * rad;
    const lapLength = 2 * (straight + bend);
    // distance s round the track from its top left: right along the top,
    // down round the right hairpin, back along the bottom, up round the left
    const trackAt = (s: number): Point => {
      let d = s % lapLength;
      if (d < straight) return { x: -half + d, y: -rad };
      d -= straight;
      if (d < bend) {
        const a = -Math.PI / 2 + d / rad;
        return { x: half + Math.cos(a) * rad, y: Math.sin(a) * rad };
      }
      d -= bend;
      if (d < straight) return { x: half - d, y: rad };
      d -= straight;
      const a = Math.PI / 2 + d / rad;
      return { x: -half + Math.cos(a) * rad, y: Math.sin(a) * rad };
    };
    const order = [...byHeight(bars).filter((bar) => bar !== 0), 0];
    const corners: number[] = [];
    const shifts: number[] = [];
    let t = ENTRY_MS;
    const laps = order.map((bar, k): Lap => {
      const count = bar === 0 ? 2 : 1;
      const length = count * lapLength;
      const line: Point[] = [];
      for (let s = 0; s < length; s += STEP) line.push(trackAt(s));
      line.push(trackAt(length));
      const turns: RaceCorner[] = [];
      for (let l = 0; l < count; l++)
        turns.push(
          {
            from: l * lapLength + straight,
            to: l * lapLength + straight + bend,
          },
          {
            from: l * lapLength + 2 * straight + bend,
            to: (l + 1) * lapLength,
          },
        );
      const raceMs =
        lerp(LAP_MS[0], LAP_MS[1], k / Math.max(1, order.length - 1)) * count;
      const race = planRace(line, raceMs, turns);
      for (const turn of turns) corners.push(t + race.msAt(turn.from));
      const lap = { bar, start: t, end: t + raceMs, race };
      const shift = lap.end + GAP_MS;
      shifts.push(shift);
      hit(bar, shift, bar === 0 ? 2 : 1);
      t += raceMs + HOP_MS;
      return lap;
    });
    hit(order[0], ENTRY_MS, 0);
    const state: State = {
      bars,
      laps,
      corners,
      shifts,
      line: trackAt(0),
      leader: () => spot,
      chaser: () => spot,
    };
    // a racer lag ms behind: out of the flash onto the first bar's track,
    // round each bar, hopping from one to the next
    const racer = (lag: number) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const { bars, line } = state;
        const time = ms - lag;
        if (time < ENTRY_MS) {
          const to = bars[laps[0].bar];
          const u = smoothstep(clamp01(time / ENTRY_MS));
          const ey = to.y + line.y;
          at.x = lerp(0, to.x + line.x, u);
          at.y = 2 * (1 - u) * u * (Math.max(0, ey) + ENTRY_DIP) + u * u * ey;
          return at;
        }
        for (let k = 0; k < laps.length; k++) {
          const lap = laps[k];
          const mid = bars[lap.bar];
          if (time < lap.start) {
            const from = bars[laps[k - 1].bar];
            const u = clamp01((time - laps[k - 1].end) / HOP_MS);
            at.x = lerp(from.x, mid.x, u) + line.x;
            at.y = lerp(from.y, mid.y, u) + line.y - 4 * HOP_LIFT * u * (1 - u);
            return at;
          }
          if (time <= lap.end || k === laps.length - 1) {
            lap.race.at(Math.min(lap.end, time) - lap.start, at);
            at.x += mid.x;
            at.y += mid.y;
            return at;
          }
        }
        return at;
      };
    };
    state.leader = racer(0);
    state.chaser = racer(GAP_MS);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r)!;
    state.bars = bars;
    const { laps, corners, shifts, line } = state;
    const now = r.startedAt + ms;
    if (ms < ENTRY_MS / 2)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / (ENTRY_MS / 2),
      });
    // a screech and a jolt braking into each hairpin
    while (r.kicked < corners.length && ms >= corners[r.kicked]) {
      r.kicked++;
      r.shake(CORNER_SHAKE);
      playSwoosh();
    }
    const finish = laps[laps.length - 1].end;
    drawWispBetween(
      ctx,
      state.chaser,
      ms,
      now,
      CHASER,
      0.6,
      GAP_MS,
      finish + GAP_MS,
    );
    drawWispBetween(ctx, state.leader, ms, now, LEADER, 1, 0, finish);
    for (let k = 0; k < laps.length; k++) {
      const mid = bars[laps[k].bar];
      spot.x = mid.x + line.x;
      spot.y = mid.y + line.y;
      drawDetonation(
        ctx,
        spot,
        ms - shifts[k],
        laps[k].bar === 0 ? OWN_SHIFT_BLAST : SHIFT_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 3 : step === 1 ? 1.4 : 0.6),
});
