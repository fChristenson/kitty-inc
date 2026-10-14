// Autopress, a button crit: the number bursts into a wisp over every button
// in view, each hammering its button down in a quickening rattle, every
// press a pop and levels on its floor; then the crit's own wisp, wound up
// high over its button, slams it in one huge blast
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { otherBars } from "../../../floorCrits/critPlayer/shared";

const POP_MS = 100;
const POP_BLAST = 120;
const FLY_MS = 220;
// a presser hovers this high over its button, dips this far on a press and
// springs back over PRESS_MS
const HOVER = 130;
const DIP = 95;
const PRESS_MS = 60;
// each button's presses, quickening, the buttons a beat apart
const PRESSES = 6;
const PRESS_GAP_MS: [number, number] = [170, 60];
const BUTTON_GAP_MS = 45;
// the own wisp winding up this much higher, then slamming down
const WIND_UP = 220;
const SLAM_GAP_MS = 220;
const SLAM_MS = 90;
const PRESS_BLAST = 45;
const SLAM_BLAST = 190;
const TAIL_MS = 800;

interface Presser {
  bar: number;
  presses: number[];
  path: (ms: number) => Point | null;
}

interface State {
  bars: Point[];
  pressers: Presser[];
  slam: number;
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };

// how far down its last press still has a presser, 1 right on it
function dipOf(presses: number[], ms: number): number {
  let last = -Infinity;
  for (let i = 0; i < presses.length && presses[i] <= ms; i++)
    last = presses[i];
  return Math.exp(-(ms - last) / PRESS_MS);
}

registerFloorCrit("autopressCrit", {
  // levels every press, the closing slam the crit's multiple
  reward: (t) => t.levelUp(t.step === 2 ? t.count : Math.ceil(t.count / 4)),
  plan(r, bars, hit) {
    const state: State = { bars, pressers: [], slam: 0 };
    const arrive = POP_MS + FLY_MS;
    let end = arrive;
    const rattling = otherBars(bars);
    // each bar's place in the rattle, -1 for the own bar sitting it out
    const place = bars.map(() => -1);
    rattling.forEach((bar, k) => (place[bar] = k));
    const all = place[0] >= 0 ? rattling : [...rattling, 0];
    for (const bar of all) {
      const presses: number[] = [];
      if (place[bar] >= 0) {
        let t = arrive + place[bar] * BUTTON_GAP_MS;
        for (let k = 0; k < PRESSES; k++) {
          presses.push(t);
          hit(bar, t, 1);
          t += lerp(PRESS_GAP_MS[0], PRESS_GAP_MS[1], k / (PRESSES - 1));
        }
        end = Math.max(end, presses[PRESSES - 1]);
      }
      const spot: Point = { x: 0, y: 0 };
      const path = (ms: number): Point | null => {
        if (ms < POP_MS) return null;
        const at = state.bars[bar];
        const hover = at.y - HOVER;
        if (ms < arrive) {
          const u = (ms - POP_MS) / FLY_MS;
          const p = u * u * (3 - 2 * u);
          spot.x = at.x * p;
          spot.y = lerp(0, hover, p) - 160 * 4 * p * (1 - p);
          return spot;
        }
        spot.x = at.x;
        if (bar === 0 && ms >= state.slam - SLAM_GAP_MS) {
          // wound up high, then slammed down onto the button
          const wind = Math.min(1, (ms - state.slam + SLAM_GAP_MS) / 120);
          const fall = (ms - state.slam + SLAM_MS) / SLAM_MS;
          spot.y =
            fall < 0
              ? hover - WIND_UP * wind
              : fall < 1
                ? lerp(hover - WIND_UP, at.y, fall * fall)
                : at.y - HOVER * 0.4;
          return spot;
        }
        spot.y = hover + DIP * dipOf(presses, ms);
        return spot;
      };
      state.pressers.push({ bar, presses, path });
    }
    state.slam = end + SLAM_GAP_MS;
    hit(0, state.slam, 2);
    hit(0, POP_MS, 0);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    for (const presser of state.pressers) {
      const own = presser.bar === 0;
      drawWispBetween(
        ctx,
        presser.path,
        ms,
        now,
        WISP_SIZE * (own ? 1.5 : 1.1),
        own && ms >= state.slam - SLAM_GAP_MS ? 1 : 0.5,
        POP_MS,
        own ? state.slam : presser.presses[PRESSES - 1] + PRESS_MS * 3,
      );
      for (const at of presser.presses)
        drawDetonation(ctx, bars[presser.bar], ms - at, PRESS_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - state.slam, SLAM_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.6 : step === 1 ? 0.35 : 0.6),
});
