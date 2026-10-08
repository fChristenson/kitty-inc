// the drill floor crit: the number spins into a drill and bores straight down
// through every bar in view, stalling and grinding on each in a gush of
// sparks before punching through
import { drawDrillHead, drawDrillSpray } from "../../../../shared/drill";
import { drawDetonation } from "../../../../shared/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  lerp,
  clamp01,
  byHeight,
  drawText,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const DRILL_IN_MS = 280;
const DRILL_APPROACH_MS = 140;
const DRILL_STALL_MS = 320;
const DRILL_PUSH_MS = 150;
const DRILL_SEG_MS = DRILL_APPROACH_MS + DRILL_STALL_MS + DRILL_PUSH_MS;
const DRILL_SIZE = 110;
const DRILL_FONT = 40;
// a bar's half height, where the tip starts above the top bar, where it
// bites (above a bar's top) and where it comes out (below its bottom)
const BAR_HALF_H = 46;
const DRILL_START = 260;
const DRILL_BITE = 6;
const DRILL_SINK = 10;
const DRILL_THROUGH = 20;
const DRILL_JUDDER = 18;
const DRILL_SPRAY = 90;
const DRILL_SPRAY_FADE_MS = 300;
// the rumbling shakes while it stalls on each bar
const DRILL_RUMBLES = 6;
const DRILL_RUMBLE_EVERY_MS = 55;
const DRILL_RUMBLE_SHAKE = 0.3;
const DRILL_BLAST = 170;
const DRILL_SHAKE = 1.2;
const DRILL_TAIL_MS = 800;

// when it bites into the k-th bar from the top, and punches through it
const bitesAt = (k: number) =>
  DRILL_IN_MS + k * DRILL_SEG_MS + DRILL_APPROACH_MS;
const throughAt = (k: number) => bitesAt(k) + DRILL_STALL_MS + DRILL_PUSH_MS;
const contactY = (bar: Point) => bar.y - BAR_HALF_H - DRILL_BITE;
const exitY = (bar: Point) => bar.y + BAR_HALF_H + DRILL_THROUGH;

// the tip's height at ms, boring down the bars in order
function tipY(bars: Point[], order: number[], ms: number): number {
  const start = bars[order[0]].y - BAR_HALF_H - DRILL_START;
  if (ms < DRILL_IN_MS) return start;
  const k = Math.min(
    order.length - 1,
    Math.floor((ms - DRILL_IN_MS) / DRILL_SEG_MS),
  );
  const u = ms - DRILL_IN_MS - k * DRILL_SEG_MS;
  const bar = bars[order[k]];
  const prev = k === 0 ? start : exitY(bars[order[k - 1]]);
  if (u < DRILL_APPROACH_MS)
    return lerp(prev, contactY(bar), (u / DRILL_APPROACH_MS) ** 2);
  if (u < DRILL_APPROACH_MS + DRILL_STALL_MS)
    return (
      contactY(bar) + DRILL_SINK * ((u - DRILL_APPROACH_MS) / DRILL_STALL_MS)
    );
  return lerp(
    contactY(bar) + DRILL_SINK,
    exitY(bar),
    clamp01((u - DRILL_APPROACH_MS - DRILL_STALL_MS) / DRILL_PUSH_MS),
  );
}

registerFloorCrit("drillCrit", {
  plan(_r, bars, hit) {
    byHeight(bars).forEach((bar, k) => hit(bar, throughAt(k)));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const x = bars[order[0]].x;
    const end = throughAt(order.length - 1);
    if (ms < DRILL_IN_MS) {
      // spun down onto where the drill starts, shrinking into its tip
      const p = smoothstep(ms / DRILL_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        x * p,
        tipY(bars, order, 0) * p,
        lerp(r.flashFont, DRILL_FONT, p),
        { rot: p * Math.PI * 2 },
      );
    }
    // rumbling shakes all through each stall
    let due = 0;
    for (let k = 0; k < order.length; k++)
      for (let i = 0; i < DRILL_RUMBLES; i++)
        if (ms >= bitesAt(k) + i * DRILL_RUMBLE_EVERY_MS) due++;
    while (r.kicked < due) {
      r.kicked++;
      r.shake(DRILL_RUMBLE_SHAKE);
    }
    let grinding = false;
    order.forEach((bar, k) => {
      const since = ms - bitesAt(k);
      const grinds = DRILL_STALL_MS + DRILL_PUSH_MS;
      if (since < 0 || since > grinds + DRILL_SPRAY_FADE_MS) return;
      if (since < DRILL_STALL_MS) grinding = true;
      const fade =
        since > grinds ? 1 - (since - grinds) / DRILL_SPRAY_FADE_MS : 1;
      drawDrillSpray(
        ctx,
        { x, y: contactY(bars[bar]) },
        Math.PI / 2,
        since,
        (0.6 + since / grinds) * fade,
        DRILL_SPRAY,
        now,
      );
    });
    if (ms >= DRILL_IN_MS * 0.5 && ms <= end) {
      // juddering while it stalls
      const judder = grinding
        ? (holeHash(Math.floor(ms / 16), 7) - 0.5) * DRILL_JUDDER
        : 0;
      const tip = { x: x + judder, y: tipY(bars, order, ms) };
      drawDrillHead(
        ctx,
        tip,
        Math.PI / 2,
        DRILL_SIZE,
        ms * (grinding ? 0.06 : 0.03),
        now,
      );
      drawWisp(
        ctx,
        (t) => ({ x, y: tipY(bars, order, t) }),
        ms,
        now,
        WISP_SIZE * 0.8,
        1,
      );
    }
    order.forEach((bar, k) =>
      drawDetonation(
        ctx,
        { x, y: bars[bar].y + BAR_HALF_H },
        ms - throughAt(k),
        DRILL_BLAST,
        now,
      ),
    );
  },
  tailMs: DRILL_TAIL_MS,
  shake: () => DRILL_SHAKE,
});
