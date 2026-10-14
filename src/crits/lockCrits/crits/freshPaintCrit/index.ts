// Fresh Paint, a lock crit: the number arcs up into the locked floor and
// turns into a nozzle wisp sweeping back and forth along its top, hissing
// gold mist down over it, quicker each pass, until its coat flashes and it
// bursts open; its cats step out gold, each a perma tier up
import { celebrateWorkerBoost, getRenderedWorkerCount, promoteWorkerPermaTier } from "../../../../floors/worker";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { FLOOR_H } from "../../../../floors/constants";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 200;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the nozzle along the floor's top, sweeping end to end, quicker each pass
const NOZZLE_Y = -FLOOR_H * 0.38;
const SWEEP = 0.75;
const PASSES_MS = [420, 340, 270, 220];
const SWAY = 0.2;
const SWAY_RATE = 0.03;
const SPREAD = 0.35;
const REACH = FLOOR_H * 0.7;
const FLIGHT_MS = 220;
const DROPLET = 110;
const MIST = 150;
// the coat over the whole floor
const COAT_H = FLOOR_H * 0.85;
const FLASH_MS = 260;
const OPEN_BLAST = 300;
const CATS_GAP_MS = 220;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  start: number;
  passEnds: number[];
  done: number;
  spray: Spray;
  nozzle: (ms: number) => Point | null;
  // the nozzle's x from the floor's middle at ms
  sweepX: (ms: number) => number;
  halfW: number;
}

const states = new WeakMap<Running, State>();
const land: Point = { x: 0, y: 0 };

registerFloorCrit("freshPaintCrit", {
  // every worker on the floor it opened up a perma tier
  reward(t) {
    for (let i = 0; i < getRenderedWorkerCount(t.floor); i++) {
      promoteWorkerPermaTier(t.floor, i);
      celebrateWorkerBoost(t.floor, i, t.now);
    }
  },
  plan(r, bars, hit) {
    const halfW = r.play.barHalfWidth * SWEEP;
    const start = ARC_MS;
    const passEnds: number[] = [];
    let t = start;
    for (const ms of PASSES_MS) {
      t += ms;
      passEnds.push(t);
      hit(0, t, 0);
    }
    const done = t;
    hit(0, done, 1);
    hit(0, done + CATS_GAP_MS, 2);
    const sweepX = (ms: number) => {
      let from = start;
      for (let k = 0; k < passEnds.length; k++) {
        if (ms < passEnds[k]) {
          const u = clamp01((ms - from) / (passEnds[k] - from));
          const p = u * u * (3 - 2 * u);
          return k % 2 ? lerp(halfW, -halfW, p) : lerp(-halfW, halfW, p);
        }
        from = passEnds[k];
      }
      return passEnds.length % 2 ? halfW : -halfW;
    };
    const at: Point = { x: 0, y: 0 };
    const from: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      start,
      passEnds,
      done,
      sweepX,
      halfW,
      spray: planSpray(
        (ms) => {
          const mid = state.bars[0];
          from.x = mid.x + sweepX(ms);
          from.y = mid.y + NOZZLE_Y;
          return from;
        },
        (ms) => Math.PI / 2 + SWAY * Math.sin(ms * SWAY_RATE),
        {
          startMs: start,
          endMs: done,
          spread: SPREAD,
          reach: REACH,
          flightMs: FLIGHT_MS,
        },
      ),
      nozzle: (ms) => {
        if (ms < start || ms > done) return null;
        const mid = state.bars[0];
        at.x = mid.x + sweepX(ms);
        at.y = mid.y + NOZZLE_Y;
        return at;
      },
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const mid = bars[0];
    const sx = mid.x - state.halfW;
    const sy = mid.y + NOZZLE_Y;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        sx * p,
        sy * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    land.x = sx;
    land.y = sy;
    drawDetonation(ctx, land, ms - ARC_MS, ARRIVE_BLAST, now);
    const since = ms - state.done;
    if (ms >= state.start && since < FLASH_MS)
      drawSprayCoat(
        ctx,
        mid,
        r.play.barHalfWidth * 2 * SWEEP + 200,
        COAT_H,
        since < 0
          ? clamp01((ms - state.start) / (state.done - state.start))
          : 0,
        since >= 0 ? 0.9 * (1 - since / FLASH_MS) : 0,
      );
    drawSpray(ctx, state.spray, ms, now, DROPLET);
    if (ms >= state.start && since < 0)
      drawSprayMist(
        ctx,
        sprayLandsAt(state.spray, ms, land),
        ms - state.start,
        1,
        MIST,
        now,
      );
    drawWisp(ctx, state.nozzle, ms, now, WISP_SIZE * 1.4, 0.7);
    drawDetonation(ctx, mid, since, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1.2 : 0.6),
});
