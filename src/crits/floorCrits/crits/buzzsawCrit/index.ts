// the buzzsaw floor crit: the number spins into a whirling saw blade that
// rips along each bar in view end to end in a fountain of sparks, hopping
// down onto the next bar after each
import { drawBeam } from "../../../../shared/beam";
import { drawDrillSpray } from "../../../../shared/drill";
import { drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
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
  glowStops,
} from "../../critPlayer";
import { quadratic, holeHash } from "../../critPlayer/shared";

const SAW_IN_MS = 260;
const SAW_HOP_MS = 220;
const SAW_CUT_MS = 380;
const SAW_SEG_MS = SAW_HOP_MS + SAW_CUT_MS;
const SAW_FONT = 40;
// the blade's radius, and how far it sinks into a bar's top (of the radius)
const SAW_R = 110;
const SAW_RIDE = 0.55;
const SAW_TEETH = 16;
const SAW_TOOTH = 42;
const SAW_SPIN = 0.035;
const SAW_JUDDER = 10;
const BAR_HALF_H = 46;
// where it starts, above the top bar, kept below the HUD (of the viewport's width)
const SAW_START = 280;
const SAW_HIGHEST = 0.55;
const SAW_HOP_LIFT = 260;
const SAW_KERF = 16;
const SAW_KERF_FADE_MS = 400;
const SAW_SPRAY = 90;
const SAW_SPRAY_HEAT = 1.3;
// the rumbling shakes while it cuts each bar
const SAW_RUMBLES = 6;
const SAW_RUMBLE_EVERY_MS = 60;
const SAW_RUMBLE_SHAKE = 0.25;
const SAW_BLAST = 160;
const SAW_SHAKE = 1.2;
const SAW_TAIL_MS = 800;

// when it starts cutting the k-th bar from the top, and finishes
const cutsAt = (k: number) => SAW_IN_MS + k * SAW_SEG_MS + SAW_HOP_MS;
const cutAt = (k: number) => cutsAt(k) + SAW_CUT_MS;
const barTop = (bar: Point) => bar.y - BAR_HALF_H;
const rideY = (bar: Point) => barTop(bar) - SAW_R * SAW_RIDE;
const ends = (r: Running, bars: Point[], bar: number) => ({
  left: along(r, bars, bar, -1).x,
  right: along(r, bars, bar, 1).x,
});

// the blade's centre at ms
function sawAt(r: Running, bars: Point[], order: number[], ms: number): Point {
  const first = ends(r, bars, order[0]);
  const start = {
    x: first.left,
    y: Math.max(
      rideY(bars[order[0]]) - SAW_START,
      -r.viewportWidth * SAW_HIGHEST,
    ),
  };
  if (ms < SAW_IN_MS) return start;
  const k = Math.min(
    order.length - 1,
    Math.floor((ms - SAW_IN_MS) / SAW_SEG_MS),
  );
  const u = ms - SAW_IN_MS - k * SAW_SEG_MS;
  const bar = bars[order[k]];
  const { left, right } = ends(r, bars, order[k]);
  if (u < SAW_HOP_MS) {
    const from =
      k === 0
        ? start
        : {
            x: ends(r, bars, order[k - 1]).right,
            y: rideY(bars[order[k - 1]]),
          };
    const to = { x: left, y: rideY(bar) };
    const pull = {
      x: (from.x + to.x) / 2,
      y: Math.min(from.y, to.y) - SAW_HOP_LIFT,
    };
    return quadratic(from, pull, to, smoothstep(u / SAW_HOP_MS));
  }
  return {
    x: lerp(left, right, clamp01((u - SAW_HOP_MS) / SAW_CUT_MS)),
    y: rideY(bar),
  };
}

registerFloorCrit("buzzsawCrit", {
  plan(_r, bars, hit) {
    byHeight(bars).forEach((bar, k) => hit(bar, cutAt(k)));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const end = cutAt(order.length - 1);
    if (ms < SAW_IN_MS) {
      // spun over onto where the blade starts, shrinking into its hub
      const p = smoothstep(ms / SAW_IN_MS);
      const start = sawAt(r, bars, order, 0);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        start.x * p,
        start.y * p,
        lerp(r.flashFont, SAW_FONT, p),
        { rot: p * Math.PI * 2 },
      );
    }
    let due = 0;
    for (let k = 0; k < order.length; k++)
      for (let i = 0; i < SAW_RUMBLES; i++)
        if (ms >= cutsAt(k) + i * SAW_RUMBLE_EVERY_MS) due++;
    while (r.kicked < due) {
      r.kicked++;
      r.shake(SAW_RUMBLE_SHAKE);
    }
    // the glowing kerf it leaves along each bar, and its sparks
    let cutting = false;
    order.forEach((bar, k) => {
      const since = ms - cutsAt(k);
      if (since < 0 || since > SAW_CUT_MS + SAW_KERF_FADE_MS) return;
      if (since < SAW_CUT_MS) cutting = true;
      const { left, right } = ends(r, bars, bar);
      const x = lerp(left, right, clamp01(since / SAW_CUT_MS));
      const y = barTop(bars[bar]);
      drawBeam(
        ctx,
        { x: left, y: y + 6 },
        { x, y: y + 6 },
        SAW_KERF,
        since > SAW_CUT_MS ? 1 - (since - SAW_CUT_MS) / SAW_KERF_FADE_MS : 1,
      );
      if (since < SAW_CUT_MS)
        drawDrillSpray(
          ctx,
          { x, y },
          Math.PI / 2,
          since,
          SAW_SPRAY_HEAT,
          SAW_SPRAY,
          now,
        );
    });
    if (ms >= SAW_IN_MS * 0.6 && ms <= end + 80) {
      const at = sawAt(r, bars, order, ms);
      const y =
        at.y +
        (cutting ? (holeHash(Math.floor(ms / 16), 3) - 0.5) * SAW_JUDDER : 0);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55;
      drawGlow(ctx, glowStops(COLOR.heavenlyGold), at.x, y, SAW_R * 1.25);
      ctx.globalAlpha = 1;
      for (let j = 0; j < SAW_TEETH; j++) {
        const a = (j / SAW_TEETH) * Math.PI * 2 + ms * SAW_SPIN;
        stampGlimmer(
          ctx,
          at.x + Math.cos(a) * SAW_R,
          y + Math.sin(a) * SAW_R,
          SAW_TOOTH,
          a,
          j % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      ctx.globalCompositeOperation = previous;
      drawWisp(
        ctx,
        (t) => sawAt(r, bars, order, t),
        ms,
        now,
        WISP_SIZE * 1.1,
        1,
      );
    }
    order.forEach((bar, k) =>
      drawDetonation(
        ctx,
        { x: ends(r, bars, bar).right, y: bars[bar].y },
        ms - cutAt(k),
        SAW_BLAST,
        now,
      ),
    );
  },
  tailMs: SAW_TAIL_MS,
  shake: () => SAW_SHAKE,
});
