// Paint Job, a floor crit: a nozzle wisp glides down the side of the
// building, faster and faster, hissing gold mist sideways along every bar it
// passes, each bar's coat building as it goes by and flashing with its
// levels; then it swoops onto its own bar and gives it a heavy coat that
// flashes in a huge blast
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  byHeight,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, bottomBarY, topBarY } from "../../critPlayer/shared";

const IN_MS = 160;
// the nozzle OUT past the bars' left ends, gliding from OVER above the top
// bar to OVER below the lowest over GLIDE_MS (more per bar), speeding up
const OUT = 130;
const OVER = 70;
const GLIDE_MS = 300;
const GLIDE_PER_BAR = 200;
// a bar coats while the nozzle is within COAT_Y of its middle
const COAT_Y = 90;
const SPREAD = 0.1;
const SWAY = 0.05;
const SWAY_RATE = 0.03;
const FLIGHT_MS = 220;
const DROPLET = 80;
const MIST = 110;
const FLASH_MS = 200;
const BLAST = 70;
// its own bar: the swoop onto it, then its heavy coat
const SWOOP_MS = 140;
const OWN_MS = 420;
const OWN_SPREAD = 0.18;
const OWN_DROPLET = 100;
const OWN_BLAST = 220;
const RUNNER = WISP_SIZE * 1.3;
const TAIL_MS = 900;
// shakes by step: a bar coated, its own
const SHAKES = [1, 2.6];

interface Coat {
  bar: number;
  starts: number;
  done: number;
}
interface State {
  bars: Point[];
  glideAt: number;
  glideEnd: number;
  ownAt: number;
  ownDone: number;
  coats: Coat[];
  glide: Spray;
  own: Spray;
  nozzle: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const nozzle: Point = { x: 0, y: 0 };
const ownFrom: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("paintJobCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const reach = half * 2 * 0.95;
    const others = byHeight(bars).filter((bar) => bar !== 0);
    const glideAt = IN_MS + SWOOP_MS;
    const glideMs = GLIDE_MS + GLIDE_PER_BAR * Math.max(1, others.length);
    const glideEnd = glideAt + glideMs;
    const y0 = topBarY(bars) - OVER;
    const y1 = bottomBarY(bars) + OVER;
    // when the speeding-up nozzle reaches y
    const reaches = (y: number) =>
      glideAt + glideMs * Math.sqrt(clamp01((y - y0) / Math.max(1, y1 - y0)));
    const coats = others.map((bar): Coat => {
      const done = reaches(bars[bar].y + COAT_Y);
      hit(bar, done, 0);
      return { bar, starts: reaches(bars[bar].y - COAT_Y), done };
    });
    const ownAt = glideEnd + SWOOP_MS;
    const ownDone = ownAt + OWN_MS;
    hit(0, ownDone, 1);
    const state: State = {
      bars,
      glideAt,
      glideEnd,
      ownAt,
      ownDone,
      coats,
      glide: null!,
      own: null!,
      nozzle: () => null,
    };
    const side = () => state.bars[0].x - half - OUT;
    const glideY = (ms: number) =>
      lerp(
        topBarY(state.bars) - OVER,
        bottomBarY(state.bars) + OVER,
        clamp01((ms - glideAt) / glideMs) ** 2,
      );
    state.glide = planSpray(
      (ms) => {
        nozzle.x = side();
        nozzle.y = glideY(ms);
        return nozzle;
      },
      (ms) => SWAY * Math.sin(ms * SWAY_RATE),
      {
        startMs: glideAt,
        endMs: glideEnd,
        spread: SPREAD,
        reach,
        flightMs: FLIGHT_MS,
      },
    );
    state.own = planSpray(
      () => {
        ownFrom.x = side();
        ownFrom.y = state.bars[0].y;
        return ownFrom;
      },
      (ms) => SWAY * 2 * Math.sin(ms * SWAY_RATE),
      {
        startMs: ownAt,
        endMs: ownDone,
        spread: OWN_SPREAD,
        reach,
        flightMs: FLIGHT_MS,
      },
    );
    // from the number down onto the top of the glide, then down it, then
    // swooping onto its own bar's end
    const swoop = (a: Point, bx: number, by: number, u: number) => {
      const p = u * u * (3 - 2 * u);
      nozzle.x = lerp(a.x, bx, p);
      nozzle.y = lerp(a.y, by, p);
      return nozzle;
    };
    const bottom: Point = { x: 0, y: 0 };
    state.nozzle = (ms) => {
      if (ms < IN_MS || ms > ownDone) return null;
      if (ms < glideAt)
        return swoop(ORIGIN, side(), glideY(glideAt), (ms - IN_MS) / SWOOP_MS);
      if (ms < glideEnd) {
        nozzle.x = side();
        nozzle.y = glideY(ms);
        return nozzle;
      }
      if (ms < ownAt) {
        bottom.x = side();
        bottom.y = glideY(glideEnd);
        return swoop(bottom, side(), state.bars[0].y, (ms - glideEnd) / SWOOP_MS);
      }
      nozzle.x = side();
      nozzle.y = state.bars[0].y;
      return nozzle;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    state.bars = bars;
    const width = r.play.barHalfWidth * 2;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // a hiss as the glide starts and as it turns onto its own bar
    if (r.kicked === 0 && ms >= state.glideAt) {
      r.kicked++;
      playSwoosh();
    }
    if (r.kicked === 1 && ms >= state.ownAt) {
      r.kicked++;
      playSwoosh();
    }
    for (const c of state.coats) {
      const at = bars[c.bar];
      const since = ms - c.done;
      if (ms >= c.starts && since < FLASH_MS) {
        drawSprayCoat(
          ctx,
          at,
          width,
          BAR_HALF_H * 2,
          since < 0 ? clamp01((ms - c.starts) / (c.done - c.starts)) : 0,
          since >= 0 ? 0.9 * (1 - since / FLASH_MS) : 0,
        );
        if (since < 0) drawSprayMist(ctx, at, ms - c.starts, 1, MIST, now);
      }
      drawDetonation(ctx, at, since, BLAST, now);
    }
    const own = bars[0];
    const since = ms - state.ownDone;
    if (ms >= state.ownAt && since < FLASH_MS) {
      drawSprayCoat(
        ctx,
        own,
        width,
        BAR_HALF_H * 2,
        since < 0 ? clamp01((ms - state.ownAt) / OWN_MS) : 0,
        since >= 0 ? 1 - since / FLASH_MS : 0,
      );
      if (since < 0) drawSprayMist(ctx, own, ms - state.ownAt, 1, MIST, now);
    }
    drawSpray(ctx, state.glide, ms, now, DROPLET);
    drawSpray(ctx, state.own, ms, now, OWN_DROPLET);
    drawWisp(ctx, state.nozzle, ms, now, RUNNER, 0.7);
    drawDetonation(ctx, own, since, OWN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
