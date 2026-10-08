// the pinball floor crit: its number pinballing between the bars in view
import {
  registerFloorCrit,
  type Point,
  MOMENT_FONT,
  lerp,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const PIN_LEG_MS = 150;
const PIN_MAX_BOUNCES = 4;

// a pinball's bounces: the other bars, top and bottom ones in turn, then home
function pinballOrder(bars: Point[]): number[] {
  const others = byHeight(bars).filter((i) => i !== 0);
  const order: number[] = [];
  while (others.length && order.length < PIN_MAX_BOUNCES)
    order.push(order.length % 2 ? others.pop()! : others.shift()!);
  return [...order, 0];
}

registerFloorCrit("pinballCrit", {
  plan(_r, bars, hit) {
    pinballOrder(bars).forEach((bar, i) => hit(bar, (i + 1) * PIN_LEG_MS));
  },
  draw(ctx, r, ms, bars) {
    const legs = r.hits.length;
    const leg = Math.floor(ms / PIN_LEG_MS);
    if (leg >= legs) return;
    const spot = (i: number) => along(r, bars, r.hits[i].bar, i % 2 ? -1 : 1);
    const from = leg === 0 ? { x: 0, y: 0 } : spot(leg - 1);
    const to = spot(leg);
    const q = (ms % PIN_LEG_MS) / PIN_LEG_MS;
    drawText(
      ctx,
      r.glyphs,
      r.label,
      lerp(from.x, to.x, q),
      lerp(from.y, to.y, q),
      leg === 0 ? lerp(r.flashFont, MOMENT_FONT, q) : MOMENT_FONT,
      {
        rot: ms * 0.03,
        along: Math.atan2(to.y - from.y, to.x - from.x),
        stretch: 1.35,
      },
    );
  },
});
