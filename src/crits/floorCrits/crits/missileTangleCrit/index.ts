// the missile tangle floor crit: the number looses a ring of missiles all at
// once, their glitter trails looping out past the screen's sides and
// crisscrossing back over the building in a wild tangle, then raining onto
// the bars one after another in a rattling cluster of blasts, a huge one
// onto its own last
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { cubic } from "../../../../shared/curves";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
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
import { holeHash } from "../../critPlayer/shared";

const TANGLE_IN_MS = 220;
// missiles per bar, the first one's flight and the gap between landings
const TANGLE_PER_BAR = 8;
const TANGLE_LEAST = 16;
const TANGLE_FLY_MS = 850;
const TANGLE_EVERY_MS = 45;
const TANGLE_EASE = 1.4;
// how far out the loops swing (of the viewport's width) and how high/low
const TANGLE_OUT = 0.55;
const TANGLE_RISE = 500;
const TANGLE_SIZE = 0.7;
const TANGLE_BURST = 260;
const TANGLE_BLAST = 150;
const TANGLE_BOOM = 420;
const TANGLE_LAST_GAP_MS = 150;
const TANGLE_SHAKE = 0.7;
const TANGLE_BURST_SHAKE = 1.2;
const TANGLE_BOOM_SHAKE = 2.6;
const TANGLE_TAIL_MS = 1000;

const LAUNCH: Point = { x: 0, y: 0 };
const countOf = (bars: Point[]) =>
  Math.max(TANGLE_LEAST, TANGLE_PER_BAR * diveBars(bars).length);
const diveBars = (bars: Point[]) => {
  const order = byHeight(bars);
  return order.length > 1 ? order.filter((i) => i !== 0) : order;
};
const landsAt = (i: number) =>
  TANGLE_IN_MS + TANGLE_FLY_MS + i * TANGLE_EVERY_MS;
const lastAt = (bars: Point[]) =>
  landsAt(countOf(bars) - 1) + TANGLE_LAST_GAP_MS;

// missile i: its bar (landing top to bottom, round and round), where on it,
// and its loop: out past one side, back across the other
function missile(r: Running, bars: Point[], i: number) {
  const order = diveBars(bars);
  const bar = order[i % order.length];
  const to = along(r, bars, bar, holeHash(i, 2201) * 2 - 1);
  const w = r.viewportWidth;
  const a = (i / countOf(bars)) * Math.PI * 2 * 3 + holeHash(i, 2202);
  const side = Math.cos(a) >= 0 ? 1 : -1;
  const out = {
    x: Math.cos(a) * w * TANGLE_OUT,
    y: Math.sin(a) * w * TANGLE_OUT - TANGLE_RISE,
  };
  const back = {
    x: -side * w * (0.2 + holeHash(i, 2203) * 0.3),
    y: to.y - TANGLE_RISE * (0.5 + holeHash(i, 2204)),
  };
  const spot: Point = { x: 0, y: 0 };
  const land = landsAt(i);
  return {
    bar,
    to,
    land,
    at: (t: number): Point | null =>
      t < TANGLE_IN_MS
        ? null
        : cubic(
            LAUNCH,
            out,
            back,
            to,
            clamp01((t - TANGLE_IN_MS) / (land - TANGLE_IN_MS)) ** TANGLE_EASE,
            spot,
          ),
  };
}

registerFloorCrit("missileTangleCrit", {
  plan(r, bars, hit) {
    for (let i = 0; i < countOf(bars); i++) {
      const m = missile(r, bars, i);
      hit(m.bar, m.land);
    }
    hit(0, lastAt(bars), 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    if (ms < TANGLE_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, r.flashFont * 0.4, ms / TANGLE_IN_MS),
      );
    if (ms >= TANGLE_IN_MS && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
      r.shake(TANGLE_BURST_SHAKE);
    }
    drawDetonation(ctx, LAUNCH, ms - TANGLE_IN_MS, TANGLE_BURST, now);
    for (let i = 0; i < countOf(bars); i++) {
      const m = missile(r, bars, i);
      drawWispBetween(
        ctx,
        m.at,
        ms,
        now,
        WISP_SIZE * TANGLE_SIZE,
        0.8,
        TANGLE_IN_MS,
        m.land,
      );
      drawDetonation(ctx, m.to, ms - m.land, TANGLE_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - lastAt(bars), TANGLE_BOOM, now);
  },
  tailMs: TANGLE_TAIL_MS,
  shake: (step) => (step ? TANGLE_BOOM_SHAKE : TANGLE_SHAKE),
});
