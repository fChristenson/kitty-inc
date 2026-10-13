// Gilded, a button crit: the number turns into a nozzle wisp that darts from
// button to button, hissing gold mist over each, quicker each, until its coat
// flashes and it flips over gilded, each tap of it then paying its bar's
// payout too; the crit's own last in the biggest blast
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const POP_MS = 110;
const POP_BLAST = 120;
// the nozzle's flight onto its first button, and its hop between buttons
const FIRST_MS = 160;
const HOP_MS = 110;
const HOP_ARC = 90;
// each button coated this long, quickening
const COAT_MS: [number, number] = [380, 200];
// where the nozzle hovers from a button's middle, and its sway as it sprays
const NOZZLE: Point = { x: -(BTN_W / 2 + 120), y: -90 };
const SWAY = 0.18;
const SWAY_RATE = 0.03;
const SPREAD = 0.22;
const REACH = Math.hypot(NOZZLE.x, NOZZLE.y) + 20;
const FLIGHT_MS = 200;
const DROPLET = 90;
const MIST = 110;
const FLASH_MS = 200;
const BLAST = 80;
const OWN_BLAST = 170;
const TAIL_MS = 900;

interface Coat {
  bar: number;
  starts: number;
  done: number;
  spray: Spray;
}

interface State {
  bars: Point[];
  coats: Coat[];
  nozzle: (ms: number) => Point | null;
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const AIM = Math.atan2(-NOZZLE.y, -NOZZLE.x);

registerFloorCrit("gildedCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const state: State = { bars, coats: [], nozzle: () => null };
    let t = POP_MS + FIRST_MS;
    order.forEach((bar, k) => {
      const coatMs = lerp(
        COAT_MS[0],
        COAT_MS[1],
        k / Math.max(1, order.length - 1),
      );
      const from: Point = { x: 0, y: 0 };
      const spray = planSpray(
        () => {
          const at = state.bars[bar];
          from.x = at.x + NOZZLE.x;
          from.y = at.y + NOZZLE.y;
          return from;
        },
        (ms) => AIM + SWAY * Math.sin(ms * SWAY_RATE),
        {
          startMs: t,
          endMs: t + coatMs,
          spread: SPREAD,
          reach: REACH,
          flightMs: FLIGHT_MS,
        },
      );
      state.coats.push({ bar, starts: t, done: t + coatMs, spray });
      hit(bar, t + coatMs, bar === 0 ? 2 : 1);
      t += coatMs + HOP_MS;
    });
    hit(0, POP_MS, 0);
    // the nozzle: from the number onto its first button, hovering by each
    // while it sprays, hopping on to the next
    const at: Point = { x: 0, y: 0 };
    const hopFrom: Point = { x: 0, y: 0 };
    const hover = (bar: number) => {
      at.x = state.bars[bar].x + NOZZLE.x;
      at.y = state.bars[bar].y + NOZZLE.y;
      return at;
    };
    const arc = (a: Point, bx: number, by: number, u: number) => {
      const p = u * u * (3 - 2 * u);
      const peak = Math.min(a.y, by) - HOP_ARC;
      at.x = lerp(a.x, bx, p);
      at.y = (1 - p) * (1 - p) * a.y + 2 * (1 - p) * p * peak + p * p * by;
      return at;
    };
    const { coats } = state;
    state.nozzle = (ms) => {
      if (ms < POP_MS || ms > coats[coats.length - 1].done + HOP_MS)
        return null;
      if (ms < coats[0].starts) {
        const to = state.bars[coats[0].bar];
        return arc(
          ORIGIN,
          to.x + NOZZLE.x,
          to.y + NOZZLE.y,
          (ms - POP_MS) / FIRST_MS,
        );
      }
      for (let k = 0; k < coats.length; k++) {
        if (ms < coats[k].done) return hover(coats[k].bar);
        if (k + 1 < coats.length && ms < coats[k + 1].starts) {
          const a = state.bars[coats[k].bar];
          const b = state.bars[coats[k + 1].bar];
          hopFrom.x = a.x + NOZZLE.x;
          hopFrom.y = a.y + NOZZLE.y;
          return arc(
            hopFrom,
            b.x + NOZZLE.x,
            b.y + NOZZLE.y,
            (ms - coats[k].done) / HOP_MS,
          );
        }
      }
      return hover(coats[coats.length - 1].bar);
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    for (const coat of state.coats) {
      const at = bars[coat.bar];
      const since = ms - coat.done;
      if (ms >= coat.starts && since < FLASH_MS)
        drawSprayCoat(
          ctx,
          at,
          BTN_W,
          BTN_H,
          since < 0
            ? clamp01((ms - coat.starts) / (coat.done - coat.starts))
            : 0,
          since >= 0 ? 0.9 * (1 - since / FLASH_MS) : 0,
        );
      drawSpray(ctx, coat.spray, ms, now, DROPLET);
      if (ms >= coat.starts && since < 0)
        drawSprayMist(ctx, at, ms - coat.starts, 1, MIST, now);
      drawDetonation(ctx, at, since, coat.bar === 0 ? OWN_BLAST : BLAST, now);
    }
    drawWisp(ctx, state.nozzle, ms, now, WISP_SIZE * 1.4, 0.7);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.4 : step === 1 ? 1 : 0.6),
});
