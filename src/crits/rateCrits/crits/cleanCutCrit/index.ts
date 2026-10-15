// Clean Cut, a rate crit: swipes slash across each bar in quick fire, a
// flash, a whoosh and a jolt each, glitter spilling out of every cut; a
// moment later the cut welds shut in a gold seam and the bar pays more for
// good, its readout turning over; quicker bar by bar, its own last, cut end
// to end, paying half as much again
import meta from "./meta";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playSwoosh } from "../../../../sound";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the gaps between the bars' cuts, closing from GAP_MS[0] to [1]
const GAP_MS: [number, number] = [240, 120];
// a cut across a bar: SLANT px past its edges, from AT of its half width
// left of its middle to AT right, over SLASH_MS
const SLANT = 70;
const AT = 0.35;
const SLASH_MS = 70;
const SLASH_W = 28;
const SPILL = 24;
const SPILL_N = 14;
// its own: end to end, OVER px past each end, over OWN_SLASH_MS
const OVER = 60;
const OWN_SLASH_MS = 110;
const OWN_SLASH_W = 44;
const OWN_SPILL = 34;
const OWN_SPILL_N = 24;
// the weld WELD_MS after the cut, its seam fading over SEAM_MS
const WELD_MS = 200;
const OWN_WELD_MS = 300;
const SEAM_MS = 300;
const SEAM_W = 22;
const WELD_BLAST = 70;
const OWN_WELD_BLAST = 170;
const TAIL_MS = 800;

interface Cut {
  bar: number;
  own: boolean;
  // from the bar's middle
  slash: Slash;
  weld: number;
  mid: Point;
}
const cutsOf = new WeakMap<Running, Cut[]>();
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("cleanCutCrit", {
  // payouts bigger for good, its own more
  reward(t) {
    t.floor.payoutMultiplier =
      (t.floor.payoutMultiplier ?? 1) *
      (t.own ? meta.values.ownPayout : meta.values.payout);
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const tall = getIncomeBarBox(false).height / 2 + SLANT;
    const order = ownLast(bars);
    const cuts: Cut[] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const slash = own
        ? planSlash(
            { x: -half - OVER, y: 4 },
            { x: half + OVER, y: -4 },
            t,
            OWN_SLASH_MS,
          )
        : planSlash(
            { x: -half * AT, y: -tall },
            { x: half * AT, y: tall },
            t,
            SLASH_MS,
          );
      const weld = slash.endMs + (own ? OWN_WELD_MS : WELD_MS);
      cuts.push({
        bar,
        own,
        slash,
        weld,
        mid: {
          x: (slash.from.x + slash.to.x) / 2,
          y: (slash.from.y + slash.to.y) / 2,
        },
      });
      hit(bar, slash.endMs, 0);
      hit(bar, weld, own ? 2 : 1);
      t += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, order.length - 2));
    });
    cutsOf.set(r, cuts);
  },
  draw(ctx, r, ms, bars) {
    const cuts = cutsOf.get(r);
    if (!cuts) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // a whoosh at every swipe
    while (r.kicked < cuts.length && ms >= cuts[r.kicked].slash.startMs) {
      r.kicked++;
      playSwoosh();
    }
    for (const cut of cuts) {
      const at = bars[cut.bar];
      ctx.save();
      ctx.translate(at.x, at.y);
      drawSlash(ctx, cut.slash, ms, cut.own ? OWN_SLASH_W : SLASH_W, now);
      drawSliceSpill(
        ctx,
        cut.slash,
        ms,
        cut.own ? OWN_SPILL : SPILL,
        cut.own ? OWN_SPILL_N : SPILL_N,
      );
      const seam = ms - cut.weld;
      if (seam >= 0 && seam < SEAM_MS) {
        const fade = 1 - seam / SEAM_MS;
        drawBeam(ctx, cut.slash.from, cut.slash.to, SEAM_W * fade, fade);
      }
      ctx.restore();
      spot.x = at.x + cut.mid.x;
      spot.y = at.y + cut.mid.y;
      drawDetonation(
        ctx,
        spot,
        ms - cut.weld,
        cut.own ? OWN_WELD_BLAST : WELD_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
});
