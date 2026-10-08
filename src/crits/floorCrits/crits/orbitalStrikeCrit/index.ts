// the orbital strike floor crit: the number shoots up off the screen, aim
// rings lock onto the bars in view one by one, then pillars of light slam
// down from the sky onto each in turn, the last onto its own bar the biggest
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { smoothstep } from "../../../../shared/easing";
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
import { holeHash } from "../../critPlayer/shared";

const STRIKE_UP_MS = 260;
const STRIKE_LOCK0_MS = 380;
const STRIKE_LOCK_EVERY_MS = 150;
const STRIKE_LOCK_MS = 300;
const STRIKE_WAIT_MS = 120;
const STRIKE_EVERY_MS = 160;
const STRIKE_PILLAR_MS = 260;
const STRIKE_LEAD_MS = 60;
// the aim rings: glints on a flat ring closing in from wide to tight
const STRIKE_GLINTS = 14;
const STRIKE_GLINT = 36;
const STRIKE_RING: [number, number] = [320, 120];
const STRIKE_FLAT = 0.45;
// where the pillars come down from (of the viewport's width)
const STRIKE_SKY = 1.4;
const STRIKE_WIDTH = 150;
const STRIKE_LAST_WIDTH = 260;
const STRIKE_FLARE = 80;
const STRIKE_BLAST = 170;
const STRIKE_LAST_BLAST = 320;
const STRIKE_SHAKE = 1;
const STRIKE_LAST_SHAKE = 2.6;
const STRIKE_TAIL_MS = 900;

// the other bars top to bottom, then its own last
const strikeOrder = (bars: Point[]) => [
  ...byHeight(bars).filter((bar) => bar !== 0),
  0,
];
const locksAt = (k: number) => STRIKE_LOCK0_MS + k * STRIKE_LOCK_EVERY_MS;
const strikesAt = (k: number, count: number) =>
  locksAt(count - 1) + STRIKE_LOCK_MS + STRIKE_WAIT_MS + k * STRIKE_EVERY_MS;
const target = (r: Running, bars: Point[], bar: number, k: number) =>
  along(r, bars, bar, (holeHash(k, 1401) * 2 - 1) * 0.7);

registerFloorCrit("orbitalStrikeCrit", {
  plan(_r, bars, hit) {
    const order = strikeOrder(bars);
    order.forEach((bar, k) =>
      hit(bar, strikesAt(k, order.length), k === order.length - 1 ? 1 : 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const order = strikeOrder(bars);
    if (ms < STRIKE_UP_MS) {
      // shot up off the top into the sky
      const p = (ms / STRIKE_UP_MS) ** 2;
      drawText(ctx, r.glyphs, r.label, w * 0.4 * p, -w * 1.3 * p, r.flashFont, {
        along: -Math.PI / 2.5,
        stretch: 1 + p,
        alpha: 1 - p,
      });
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    order.forEach((bar, k) => {
      const since = ms - locksAt(k);
      if (since < 0 || ms >= strikesAt(k, order.length)) return;
      const at = target(r, bars, bar, k);
      const radius = lerp(
        STRIKE_RING[0],
        STRIKE_RING[1],
        smoothstep(clamp01(since / STRIKE_LOCK_MS)),
      );
      const blink =
        since > STRIKE_LOCK_MS ? 0.6 + 0.4 * Math.sin(ms * 0.04) : 1;
      for (let i = 0; i < STRIKE_GLINTS; i++) {
        const a = (i / STRIKE_GLINTS) * Math.PI * 2 + ms * 0.003;
        stampGlimmer(
          ctx,
          at.x + Math.cos(a) * radius,
          at.y + Math.sin(a) * radius * STRIKE_FLAT,
          STRIKE_GLINT * blink,
          a,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    });
    ctx.globalCompositeOperation = previous;
    order.forEach((bar, k) => {
      const last = k === order.length - 1;
      const at = target(r, bars, bar, k);
      const hits = strikesAt(k, order.length);
      const since = ms - hits + STRIKE_LEAD_MS;
      if (since >= 0 && since < STRIKE_PILLAR_MS) {
        const fade = 1 - since / STRIKE_PILLAR_MS;
        drawBeam(
          ctx,
          { x: at.x, y: -w * STRIKE_SKY },
          at,
          (last ? STRIKE_LAST_WIDTH : STRIKE_WIDTH) * fade,
          1,
        );
        drawBeamFlare(ctx, at, STRIKE_FLARE * fade, 1, now);
      }
      drawDetonation(
        ctx,
        at,
        ms - hits,
        last ? STRIKE_LAST_BLAST : STRIKE_BLAST,
        now,
      );
    });
  },
  tailMs: STRIKE_TAIL_MS,
  shake: (step) => (step ? STRIKE_LAST_SHAKE : STRIKE_SHAKE),
});
