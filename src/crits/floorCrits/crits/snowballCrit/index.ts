// the snowball floor crit: its number snowballing down the bars, a step bigger each bar
import {
  registerFloorCrit,
  MOMENT_FONT,
  lerp,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const SNOW_FIRST_MS = 220;
const SNOW_LEG_MS = 170;
const SNOW_HOP = 120;

registerFloorCrit("snowballCrit", {
  plan(_r, bars, hit) {
    byHeight(bars).forEach((bar, i) =>
      hit(bar, SNOW_FIRST_MS + i * SNOW_LEG_MS, i),
    );
  },
  draw(ctx, r, ms, bars) {
    const legs = r.hits.length;
    const leg =
      ms < SNOW_FIRST_MS
        ? 0
        : 1 + Math.floor((ms - SNOW_FIRST_MS) / SNOW_LEG_MS);
    if (leg >= legs) return;
    const spot = (i: number) => along(r, bars, r.hits[i].bar, i % 2 ? -1 : 1);
    const from = leg === 0 ? { x: 0, y: 0 } : spot(leg - 1);
    const to = spot(leg);
    const q =
      leg === 0
        ? ms / SNOW_FIRST_MS
        : ((ms - SNOW_FIRST_MS) % SNOW_LEG_MS) / SNOW_LEG_MS;
    // a hop off each bar onto the next, growing a step with each one
    const hop = leg === 0 ? 0 : SNOW_HOP * 4 * q * (1 - q);
    drawText(
      ctx,
      r.glyphs,
      `x${r.value + leg}`,
      lerp(from.x, to.x, q),
      lerp(from.y, to.y, leg === 0 ? q * q : q) - hop,
      leg === 0
        ? lerp(r.flashFont, MOMENT_FONT * 0.9, q)
        : MOMENT_FONT * (0.9 + 0.15 * leg),
      { rot: (to.x - from.x) * q * 0.004 + leg * 2 },
    );
  },
});
