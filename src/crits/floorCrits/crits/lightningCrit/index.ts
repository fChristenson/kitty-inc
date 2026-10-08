// the lightning floor crit: a bolt cracking down from the sky, chaining through the bars
import { createBolt, drawBolt } from "../../../../shared/lightning";
import { drawDetonation } from "../../../../shared/explosion";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  drawPays,
} from "../../critPlayer";

const LIGHTNING_RISE_MS = 140;
const LIGHTNING_FIRST_MS = 160;
const LIGHTNING_EVERY_MS = 90;
const LIGHTNING_HOLD_MS = 400;
const LIGHTNING_FADE_MS = 200;
const LIGHTNING_WIDTH = 8;
const LIGHTNING_TAIL_MS = 700;
const LIGHTNING_SHAKE = 0.9;
const LIGHTNING_BLAST = 130;
const LIGHTNING_FONT = 130;

const lightningAt = (i: number) => LIGHTNING_FIRST_MS + i * LIGHTNING_EVERY_MS;

// where a lightning crit's first bolt cracks down from, above the top bar
const lightningSky = (r: Running, bars: Point[], top: number) => ({
  x: bars[top].x + r.viewportWidth * 0.15,
  y: bars[top].y - r.viewportWidth * 1.2,
});

registerFloorCrit("lightningCrit", {
  plan(r, bars, hit) {
    // from the sky onto the top bar, then bar to bar down the building
    const order = byHeight(bars);
    order.forEach((bar, i) => {
      const from =
        i === 0 ? lightningSky(r, bars, bar) : { ...bars[order[i - 1]] };
      r.bolts.push(createBolt(from, { ...bars[bar] }, 3));
      hit(bar, lightningAt(i));
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const top = bars[order[0]];
    if (ms < LIGHTNING_RISE_MS) {
      // shot up off the top into the sky the bolt comes down from
      const p = (ms / LIGHTNING_RISE_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        lerp(0, top.y - r.viewportWidth, p),
        r.flashFont,
        { along: Math.PI / 2, stretch: 1 + p, alpha: 1 - p },
      );
    }
    const fadesAt = lightningAt(order.length - 1) + LIGHTNING_HOLD_MS;
    // the whole chain stays lit as it grows, then fades together
    const boltAlpha = 1 - clamp01((ms - fadesAt) / LIGHTNING_FADE_MS);
    order.forEach((bar, i) => {
      const at = bars[bar];
      const since = ms - lightningAt(i);
      if (since < 0) return;
      const last = i === order.length - 1;
      if (boltAlpha > 0) {
        // its ends kept on the bars as they scroll
        const bolt = r.bolts[i];
        const from = i === 0 ? lightningSky(r, bars, bar) : bars[order[i - 1]];
        bolt.from.x = from.x;
        bolt.from.y = from.y;
        bolt.to.x = at.x;
        bolt.to.y = at.y;
        drawBolt(ctx, bolt, boltAlpha, LIGHTNING_WIDTH, "#ffffff");
      }
      drawDetonation(ctx, at, since, LIGHTNING_BLAST * (last ? 1.3 : 1), now);
      drawPays(ctx, r, "x2", at, since, LIGHTNING_FONT, LIGHTNING_TAIL_MS);
    });
  },
  tailMs: LIGHTNING_TAIL_MS,
  shake: () => LIGHTNING_SHAKE,
});
