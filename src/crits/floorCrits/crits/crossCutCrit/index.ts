// Cross Cut, a floor crit: swipes slash across each bar in quick fire, a
// flash, a whoosh and a jolt each, glitter spilling out of every cut and
// levels landing; then one long cut tears down through every bar at once,
// every bar jolting with levels again, its own the hardest hit
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../critPlayer";
import {
  BAR_HALF_H,
  otherBars,
  topBarY,
  bottomBarY,
} from "../../critPlayer/shared";

const IN_MS = 160;
// a cut across a bar: SLANT past its edges, from AT of its half width left
// of its middle to AT right, over SLASH_MS; GAP_MS between bars, closing
const SLANT = 70;
const AT = 0.35;
const SLASH_MS = 70;
const GAP_MS: [number, number] = [200, 110];
const SLASH_W = 28;
const SPILL = 24;
const CUT_BLAST = 60;
// the long cut: LONG_GAP_MS after the last, OVER px past the bars, over
// LONG_MS
const LONG_GAP_MS = 220;
const OVER = 60;
const LONG_RISE = 140;
const LONG_MS = 130;
const LONG_W = 48;
const LONG_SPILL = 34;
const LONG_SPILL_N = 30;
const OWN_BLAST = 220;
const TAIL_MS = 900;
// shakes by step: a cut, the long cut on its own bar
const SHAKES = [0.6, 2.8];

interface Cut {
  bar: number;
  // from its bar's middle
  slash: Slash;
}
interface State {
  cuts: Cut[];
  // from its own bar's middle
  long: Slash;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("crossCutCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const tall = BAR_HALF_H + SLANT;
    const others = otherBars(bars).filter((bar) => bar !== 0);
    let t = IN_MS;
    const cuts = others.map((bar, k): Cut => {
      const slash = planSlash(
        { x: -half * AT, y: -tall },
        { x: half * AT, y: tall },
        t,
        SLASH_MS,
      );
      hit(bar, slash.endMs, 0);
      t += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, others.length - 1));
      return { bar, slash };
    });
    const anchor = bars[0];
    const last = cuts[cuts.length - 1];
    const long = planSlash(
      {
        x: -half - OVER,
        y: topBarY(bars) - anchor.y - LONG_RISE,
      },
      {
        x: half + OVER,
        y: bottomBarY(bars) - anchor.y + LONG_RISE,
      },
      (last ? last.slash.endMs : IN_MS) + LONG_GAP_MS,
      LONG_MS,
    );
    for (const bar of others) hit(bar, long.endMs, 0);
    hit(0, long.endMs, 1);
    states.set(r, { cuts, long });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // a whoosh at every swipe
    const swipes = state.cuts.length + 1;
    while (r.kicked < swipes) {
      const s =
        r.kicked < state.cuts.length ? state.cuts[r.kicked].slash : state.long;
      if (ms < s.startMs) break;
      r.kicked++;
      playSwoosh();
    }
    for (const cut of state.cuts) {
      const at = bars[cut.bar];
      ctx.save();
      ctx.translate(at.x, at.y);
      drawSlash(ctx, cut.slash, ms, SLASH_W, now);
      drawSliceSpill(ctx, cut.slash, ms, SPILL);
      ctx.restore();
      drawDetonation(ctx, at, ms - cut.slash.endMs, CUT_BLAST, now);
    }
    ctx.save();
    ctx.translate(bars[0].x, bars[0].y);
    drawSlash(ctx, state.long, ms, LONG_W, now);
    drawSliceSpill(ctx, state.long, ms, LONG_SPILL, LONG_SPILL_N);
    ctx.restore();
    for (let i = 1; i < bars.length; i++)
      drawDetonation(ctx, bars[i], ms - state.long.endMs, CUT_BLAST, now);
    spot.x = bars[0].x;
    spot.y = bars[0].y;
    drawDetonation(ctx, spot, ms - state.long.endMs, OWN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
