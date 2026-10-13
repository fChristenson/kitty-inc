// Free Taps, a button crit: the number turns into a ball that ricochets off
// the screen's sides from button to button, quicker each leg, every strike
// stamping a button with the taps it now gives free; the last strike slams
// the crit's own
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  drawBounceSplash,
  ricochetThrough,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const POP_MS = 100;
const POP_BLAST = 110;
// each leg's time, quickening from the first to the last
const LEG_MS: [number, number] = [230, 140];
// the walls it banks off, of the screen's half width
const WALL = 0.92;
const SPLASH = 130;
const STRIKE_BLAST = 90;
const OWN_BLAST = 190;
const BALL = WISP_SIZE * 1.9;
const TAIL_MS = 800;

interface State {
  // the own button where it was planned, to carry everything along a scroll
  home: Point;
  path: BouncePath;
  // which bar each bounce struck, -1 off a wall
  struck: number[];
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const offset: Point = { x: 0, y: 0 };

registerFloorCrit("freeTapsCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const wall = (r.viewportWidth / 2) * WALL;
    const points: Point[] = [ORIGIN];
    const struck: number[] = [];
    order.forEach((bar) => {
      const from = points[points.length - 1];
      const to = bars[bar];
      // off the far side from the button, so every leg crosses the screen
      const side = to.x > 0 ? -1 : 1;
      points.push({ x: side * wall, y: (from.y + to.y) / 2 });
      points.push({ x: to.x, y: to.y });
      struck.push(-1, bar);
    });
    const path = ricochetThrough(points, LEG_MS, POP_MS);
    path.bounces.forEach((bounce, i) =>
      hit(
        Math.max(0, struck[i]),
        bounce.ms,
        struck[i] < 0 ? 0 : struck[i] === 0 ? 2 : 1,
      ),
    );
    hit(0, POP_MS, 0);
    states.set(r, { home: { ...bars[0] }, path, struck });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { home, path, struck } = states.get(r)!;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    offset.x = bars[0].x - home.x;
    offset.y = bars[0].y - home.y;
    ctx.save();
    ctx.translate(offset.x, offset.y);
    drawWispBetween(ctx, path.at, ms, now, BALL, 0.9, path.startMs, path.endMs);
    for (let i = 0; i < path.bounces.length; i++) {
      const bounce = path.bounces[i];
      const since = ms - bounce.ms;
      if (struck[i] < 0) drawBounceSplash(ctx, bounce, since, SPLASH, now);
      else
        drawDetonation(
          ctx,
          bounce.at,
          since,
          struck[i] === 0 ? OWN_BLAST : STRIKE_BLAST,
          now,
        );
    }
    ctx.restore();
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 2.4 : step === 1 ? 1 : 0.5),
});
