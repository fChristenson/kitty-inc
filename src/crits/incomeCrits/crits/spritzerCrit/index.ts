// Spritzer, an income crit: the green amount shrinks into a nozzle wisp that
// whips round and round the total on a tightening loop, hissing a cone of
// gold mist in at the readout the whole way, faster every lap, the
// readout's coat building and a pop of mist and a share at every lap; then
// it dives straight into the readout, the coat flashes white and the
// finale blows
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

// the loop round the total: RX by RY px, DOWN px under it, tightening to
// TIGHT; LAPS laps, LAP_MS each (quickening)
const START_MS = 120;
const RX = 420;
const RY = 170;
const DOWN = 60;
const TIGHT = 0.55;
const LAPS = 6;
const LAP_MS: [number, number] = [380, 170];
const DIVE_MS = 90;
const NOZZLE = WISP_SIZE * 1.3;
const DROP = WISP_SIZE * 1.3;
const COAT_W = 700;
const COAT_H = 130;
const MIST = 150;
const FLASH_MS = 220;
const POP = 130;
// shakes by step: a lap's share, the finale
const SHAKES = [0.7, 2.8];

interface State {
  // the angle round the loop at ms, from the laps' start times
  laps: number[];
  diveAt: number;
  endMs: number;
  nozzle: (ms: number) => Point;
  spray: Spray;
  pops: Point[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("spritzerCrit", {
  plan(r, _bars, hit) {
    const laps: number[] = [];
    let t = START_MS;
    for (let k = 0; k <= LAPS; k++) {
      laps.push(t);
      if (k > 0) hit(0, t);
      t += lerp(LAP_MS[0], LAP_MS[1], k / (LAPS - 1));
    }
    const diveAt = laps[LAPS];
    const endMs = diveAt + DIVE_MS;
    hit(0, endMs, 1);
    const at: Point = { x: 0, y: 0 };
    // laps done by ms, fractional
    const lapsAt = (ms: number): number => {
      if (ms <= laps[0]) return 0;
      let k = 0;
      while (k < LAPS - 1 && ms >= laps[k + 1]) k++;
      return k + clamp01((ms - laps[k]) / (laps[k + 1] - laps[k]));
    };
    const nozzle = (ms: number): Point => {
      const l = lapsAt(Math.min(ms, diveAt));
      const tight = lerp(1, TIGHT, l / LAPS);
      const a = Math.PI / 2 + l * Math.PI * 2;
      at.x = Math.cos(a) * RX * tight;
      at.y = DOWN + Math.sin(a) * RY * tight;
      if (ms > diveAt) {
        const u = clamp01((ms - diveAt) / DIVE_MS) ** 2;
        at.x *= 1 - u;
        at.y *= 1 - u;
      }
      return at;
    };
    const aim = (ms: number) => {
      const p = nozzle(ms);
      return Math.atan2(-p.y, -p.x);
    };
    states.set(r, {
      laps,
      diveAt,
      endMs,
      nozzle,
      spray: planSpray(nozzle, aim, {
        startMs: START_MS,
        endMs: diveAt,
        spread: 0.2,
        reach: RX * 0.8,
        flightMs: 180,
      }),
      pops: laps.map((_, k) => readoutSpot(ORIGIN, k, 3910)),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { laps, diveAt, endMs, spray, pops } = state;
    drawNumberShrink(ctx, r, ms);
    // a whoosh at every lap
    while (r.kicked < laps.length && ms >= laps[r.kicked]) {
      playSwoosh();
      r.kicked++;
    }
    ctx.save();
    ctx.translate(to.x, to.y);
    const cover = clamp01((ms - START_MS) / (diveAt - START_MS));
    const flash = ms >= endMs ? 1 - (ms - endMs) / FLASH_MS : 0;
    if (ms >= START_MS && ms < endMs + FLASH_MS)
      drawSprayCoat(
        ctx,
        ORIGIN,
        COAT_W,
        COAT_H,
        ms < endMs ? cover : flash,
        flash,
      );
    if (ms >= START_MS && ms < endMs)
      drawSprayMist(ctx, ORIGIN, ms - START_MS, cover, MIST, now);
    const previous = ctx.globalCompositeOperation;
    beginLightBatch(ctx);
    drawSpray(ctx, spray, ms, now, DROP * (1 + cover));
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawWispBetween(ctx, state.nozzle, ms, now, NOZZLE, cover, START_MS, endMs);
    for (let k = 1; k < laps.length; k++)
      drawDetonation(ctx, pops[k], ms - laps[k], POP, now);
    ctx.restore();
    drawFinale(ctx, to, ms - endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
