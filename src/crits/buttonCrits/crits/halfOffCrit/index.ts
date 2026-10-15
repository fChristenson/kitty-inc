// Half Off, a button crit: a drill head swings in beside each button and
// bites its edge, stalling and juddering with rumbling shakes, then bores in
// shove by shove, sparks gushing out both sides; it punches through and the
// button turns over gold: its next taps cost half; quicker button by
// button, its own last
import meta from "./meta";
import { addHalfTaps } from "../../buttonBonus";
import {
  drawDrillHead,
  drawDrillSpray,
} from "../../../../shared/animationStyles/drill";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { WISP_SIZE } from "../../../../shared/wisp";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the drill swings in over SWING_MS from REACH px out, bites the button's
// edge, stalls STALL_MS, then bores BORE px in over SHOVES shoves
const SWING_MS = 120;
const REACH = 90;
const BORE = 50;
const SHOVES = 5;
const STALL_MS = 180;
const OWN_STALL_MS = 260;
const BORE_MS: [number, number] = [460, 320];
const OWN_BORE_MS = 640;
// the next button's drill bites GAP of the way into the last one's bore
const GAP = 0.7;
const HEAD = 80;
const OWN_HEAD = 100;
const SPIN = 0.04;
const JUDDER = 5;
const BORE_JUDDER = 2;
const SPRAY = 0.9;
const OWN_SPRAY = 1.2;
const SPARK = WISP_SIZE * 0.9;
const FADE_MS = 300;
const STALL_SHAKE = 0.5;
const SHOVE_SHAKE = 0.6;
const THROUGH_BLAST = 60;
const OWN_THROUGH_BLAST = 120;
const TAIL_MS = 900;
// shakes by step: a jolt, through a button, through its own
const SHAKES = [0.3, 1.2, 2.4];

interface Bore {
  bar: number;
  own: boolean;
  bite: number;
  shoves: number[];
  through: number;
}
interface State {
  bores: Bore[];
  jolts: { at: number; power: number }[];
}
const states = new WeakMap<Running, State>();
const tip: Point = { x: 0, y: 0 };

registerFloorCrit("halfOffCrit", {
  // taps that each cost half, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * meta.values.taps));
    addHalfTaps(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const bores: Bore[] = [];
    const jolts: { at: number; power: number }[] = [];
    let t = IN_MS + SWING_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const stall = own ? OWN_STALL_MS : STALL_MS;
      const bore = own
        ? OWN_BORE_MS
        : lerp(BORE_MS[0], BORE_MS[1], k / Math.max(1, order.length - 2));
      const shoves = Array.from(
        { length: SHOVES },
        (_, j) => t + stall + (bore * (j + 1)) / SHOVES,
      );
      const through = shoves[SHOVES - 1];
      bores.push({ bar, own, bite: t, shoves, through });
      jolts.push({ at: t, power: STALL_SHAKE });
      for (const at of shoves.slice(0, -1))
        jolts.push({ at, power: SHOVE_SHAKE });
      hit(bar, through, own ? 2 : 1);
      t += (stall + bore) * GAP;
    });
    jolts.sort((a, b) => a.at - b.at);
    states.set(r, { bores, jolts });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    while (r.kicked < state.jolts.length && ms >= state.jolts[r.kicked].at)
      r.shake(state.jolts[r.kicked++].power);
    for (const b of state.bores) {
      const button = bars[b.bar];
      if (ms >= b.bite - SWING_MS && ms <= b.through + FADE_MS) {
        let done = 0;
        for (const s of b.shoves) if (ms >= s) done++;
        const judder =
          ms >= b.through
            ? 0
            : (ms < b.shoves[0] ? JUDDER : BORE_JUDDER) * Math.sin(ms * 0.9);
        const swing = clamp01((ms - b.bite + SWING_MS) / SWING_MS);
        tip.x =
          button.x -
          BTN_W / 2 -
          REACH * (1 - swing) +
          (BORE * done) / SHOVES +
          judder;
        tip.y = button.y + judder * 0.5;
        const fade = 1 - clamp01((ms - b.through) / FADE_MS);
        drawDrillHead(
          ctx,
          tip,
          0,
          b.own ? OWN_HEAD : HEAD,
          ms * SPIN,
          now,
          fade,
        );
        drawDrillSpray(
          ctx,
          tip,
          0,
          ms - b.bite,
          (b.own ? OWN_SPRAY : SPRAY) * fade,
          SPARK,
          now,
        );
      }
      drawDetonation(
        ctx,
        button,
        ms - b.through,
        b.own ? OWN_THROUGH_BLAST : THROUGH_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
