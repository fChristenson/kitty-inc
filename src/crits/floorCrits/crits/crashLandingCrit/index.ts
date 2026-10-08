// the crash landing floor crit: the number turns into a burning ship that
// tears in from the sky, scraping and bouncing off every bar in view on its
// way down, then ploughs into the street in a huge blast
import { drawDrillSpray } from "../../../../shared/drill";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import {
  quadratic,
  holeHash,
  skyY,
  groundY,
  BAR_HALF_H,
} from "../../critPlayer/shared";

const CRASH_IN_MS = 250;
const CRASH_ENTRY_MS = 420;
// each bounce a little quicker than the last
const CRASH_HOP_MS = 300;
const CRASH_QUICKEN_MS = 35;
const CRASH_MIN_HOP_MS = 200;
const CRASH_STREET_MS = 300;
const CRASH_FONT = 100;
// where it tears in from: off the left edge, high (of the viewport's width)
const CRASH_FROM_SIDE = 0.75;
const CRASH_FROM_ABOVE = 500;
const CRASH_ENTRY_DIP = 220;
// how far along the top and bottom bars it touches down, from their middles
const CRASH_SPREAD = 0.7;
const CRASH_HOP_LIFT = 140;
// the street it ploughs into: right of centre, under the lowest bar
const CRASH_STREET_SIDE = 0.3;
const CRASH_STREET_BELOW = 220;
const CRASH_SHIP = 1.6;
const CRASH_DEBRIS = 12;
const CRASH_DEBRIS_LAG_MS = 22;
const CRASH_DEBRIS_SIZE = 34;
const CRASH_DEBRIS_SCATTER = 60;
const CRASH_SPRAY_MS = 400;
const CRASH_SPRAY = 70;
const CRASH_SPRAY_HEAT = 1.6;
const CRASH_BLAST = 150;
const CRASH_STREET_BLAST = 380;
const CRASH_AFTER_BLAST = 220;
const CRASH_AFTER_MS = 120;
const CRASH_KICK = 2.6;
// every bar leaping off its floor as the crash shakes the building
const CRASH_LIFT_DELAY_MS = 60;
const CRASH_LIFT_MS = 500;
const CRASH_SHAKE = 1;
const CRASH_TAIL_MS = 1100;

const hopMs = (k: number) =>
  Math.max(CRASH_MIN_HOP_MS, CRASH_HOP_MS - CRASH_QUICKEN_MS * k);
// when it touches down on the k-th bar from the top
const contactAt = (k: number) => {
  let t = CRASH_IN_MS + CRASH_ENTRY_MS;
  for (let i = 0; i < k; i++) t += hopMs(i);
  return t;
};
const crashAt = (bars: number) => contactAt(bars - 1) + CRASH_STREET_MS;

// in from the sky, onto each bar top to bottom, then the street
function route(r: Running, bars: Point[], order: number[]): Point[] {
  const w = r.viewportWidth;
  const n = order.length;
  return [
    { x: -w * CRASH_FROM_SIDE, y: skyY(r, bars, CRASH_FROM_ABOVE) },
    ...order.map((bar, k) => ({
      x: along(
        r,
        bars,
        bar,
        n > 1 ? lerp(-CRASH_SPREAD, CRASH_SPREAD, k / (n - 1)) : 0,
      ).x,
      y: bars[bar].y - BAR_HALF_H,
    })),
    { x: w * CRASH_STREET_SIDE, y: groundY(r, bars, CRASH_STREET_BELOW) },
  ];
}

function shipAt(points: Point[], t: number): Point {
  const n = points.length - 2;
  if (t < contactAt(0)) {
    const [from, to] = points;
    return quadratic(
      from,
      { x: lerp(from.x, to.x, 0.6), y: to.y - CRASH_ENTRY_DIP },
      to,
      clamp01((t - CRASH_IN_MS) / CRASH_ENTRY_MS),
    );
  }
  let k = 0;
  while (k < n - 1 && t >= contactAt(k + 1)) k++;
  const a = points[k + 1];
  const b = points[k + 2];
  const legMs = k < n - 1 ? hopMs(k) : CRASH_STREET_MS;
  return quadratic(
    a,
    { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - CRASH_HOP_LIFT },
    b,
    clamp01((t - contactAt(k)) / legMs),
  );
}

registerFloorCrit("crashLandingCrit", {
  plan(_r, bars, hit, lift) {
    byHeight(bars).forEach((bar, k) => hit(bar, contactAt(k)));
    const crash = crashAt(bars.length);
    bars.forEach((_, bar) =>
      lift(bar, crash + CRASH_LIFT_DELAY_MS, CRASH_LIFT_MS),
    );
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const points = route(r, bars, order);
    const crash = crashAt(order.length);
    if (ms < CRASH_IN_MS) {
      const p = (ms / CRASH_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        points[0].x * p,
        points[0].y * p,
        lerp(r.flashFont, CRASH_FONT, p),
        { rot: -0.6 * p },
      );
    }
    if (ms >= crash && r.kicked === 0) {
      r.kicked = 1;
      r.shake(CRASH_KICK);
      playExplosion();
    }
    for (let k = 0; k < order.length; k++) {
      const since = ms - contactAt(k);
      if (since >= 0 && since < CRASH_SPRAY_MS)
        drawDrillSpray(
          ctx,
          points[k + 1],
          Math.PI / 2,
          since,
          CRASH_SPRAY_HEAT * (1 - since / CRASH_SPRAY_MS),
          CRASH_SPRAY,
          now,
        );
    }
    // burning debris shed behind it
    if (ms >= CRASH_IN_MS && ms < crash) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      for (let i = 1; i <= CRASH_DEBRIS; i++) {
        const at = shipAt(
          points,
          Math.max(CRASH_IN_MS, ms - i * CRASH_DEBRIS_LAG_MS),
        );
        stampGlimmer(
          ctx,
          at.x + (holeHash(i, 3601) - 0.5) * CRASH_DEBRIS_SCATTER,
          at.y + (holeHash(i, 3602) - 0.5) * CRASH_DEBRIS_SCATTER - i * 6,
          CRASH_DEBRIS_SIZE * (1 - i / (CRASH_DEBRIS + 1)),
          i + ms * 0.01,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalCompositeOperation = previous;
    }
    drawWispBetween(
      ctx,
      (t) => shipAt(points, t),
      ms,
      now,
      WISP_SIZE * CRASH_SHIP,
      1,
      CRASH_IN_MS,
      crash,
    );
    for (let k = 0; k < order.length; k++)
      drawDetonation(ctx, points[k + 1], ms - contactAt(k), CRASH_BLAST, now);
    const street = points[points.length - 1];
    drawDetonation(ctx, street, ms - crash, CRASH_STREET_BLAST, now);
    drawDetonation(
      ctx,
      { x: street.x - CRASH_STREET_BLAST * 0.4, y: street.y - 60 },
      ms - crash - CRASH_AFTER_MS,
      CRASH_AFTER_BLAST,
      now,
    );
  },
  tailMs: CRASH_TAIL_MS,
  shake: () => CRASH_SHAKE,
});
