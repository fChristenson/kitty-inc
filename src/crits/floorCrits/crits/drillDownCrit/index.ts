// Drill Down, a floor crit: a drill head drops onto the top bar and bites
// it, stalling and juddering in a rumble, then bores through it shove by
// shove, sparks gushing out both sides; it punches through, dives onto the
// bar below and bores through that quicker, and on down the building,
// faster and faster, levels on every bar it bores through
import {
  drawDrillHead,
  drawDrillSpray,
} from "../../../../shared/animationStyles/drill";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H } from "../../critPlayer/shared";

const IN_MS = 160;
const DOWN = Math.PI / 2;
// the drill OFF px right of the bars' middles, dropping DROP px onto the
// top bar over DROP_MS
const OFF = 150;
const DROP = 320;
const DROP_MS = 200;
// each bar: a stall, then shoves through its height; the first bar the full
// grind, quicker bar by bar (STALL_MS, SHOVES and SHOVE_MS from [0] to [1])
const STALL_MS: [number, number] = [380, 120];
const SHOVES: [number, number] = [8, 3];
const SHOVE_MS: [number, number] = [190, 70];
const SHOVE_TIME = 45;
// the dive down to the next bar, faster and faster
const DIVE_MS: [number, number] = [220, 90];
const HEAD = 95;
const SPIN = 0.04;
const JUDDER = 7;
const BORE_JUDDER = 3;
const SPRAY: [number, number] = [1, 1.8];
const SPARK = WISP_SIZE * 0.9;
const SPRAY_FADE_MS = 300;
const RUMBLE_EVERY = 90;
const RUMBLE = 0.4;
const SHOVE_SHAKE: [number, number] = [0.4, 0.9];
const THROUGH_BLAST = 120;
const OWN_THROUGH_BLAST = 220;
const TAIL_MS = 900;
// shakes by step: through a bar (the grind shakes itself), through its own
const SHAKES = [1, 2];

interface Bore {
  bar: number;
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
const spray: Point = { x: 0, y: 0 };

registerFloorCrit("drillDownCrit", {
  plan(r, bars, hit) {
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const bores: Bore[] = [];
    const jolts: State["jolts"] = [];
    let t = IN_MS + DROP_MS;
    order.forEach((bar, k) => {
      const q = k / Math.max(1, order.length - 1);
      const stall = lerp(STALL_MS[0], STALL_MS[1], q);
      const count = Math.round(lerp(SHOVES[0], SHOVES[1], q));
      const gap = lerp(SHOVE_MS[0], SHOVE_MS[1], q);
      for (let s = 0; s < stall; s += RUMBLE_EVERY)
        jolts.push({ at: t + s, power: RUMBLE });
      const shoves = Array.from(
        { length: count },
        (_, s) => t + stall + (s + 1) * gap,
      );
      for (const at of shoves.slice(0, -1))
        jolts.push({ at, power: lerp(SHOVE_SHAKE[0], SHOVE_SHAKE[1], q) });
      const through = shoves[count - 1];
      bores.push({ bar, bite: t, shoves, through });
      hit(bar, through, bar === 0 ? 1 : 0);
      t = through + lerp(DIVE_MS[0], DIVE_MS[1], q);
    });
    states.set(r, { bores, jolts });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { bores, jolts } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    while (r.kicked < jolts.length && ms >= jolts[r.kicked].at)
      r.shake(jolts[r.kicked++].power);
    if (ms < IN_MS) return;
    // which bar it's on: boring it, or diving from it to the next
    let k = 0;
    while (k < bores.length - 1 && ms >= bores[k].through) k++;
    const bore = bores[k];
    const bar = bars[bore.bar];
    const top = bar.y - BAR_HALF_H;
    tip.x = bar.x + OFF;
    const last = bores[bores.length - 1];
    const fade = 1 - clamp01((ms - last.through) / SPRAY_FADE_MS);
    if (ms < bore.bite) {
      // dropping onto it: from above the top bar, or down from the last bar
      const prev = bores[k - 1];
      const from = prev ? bars[prev.bar].y + BAR_HALF_H : top - DROP;
      const start = prev ? prev.through : IN_MS;
      const u = clamp01((ms - start) / (bore.bite - start)) ** 2;
      tip.y = lerp(from, top, u);
    } else {
      let done = 0;
      for (const s of bore.shoves)
        if (ms >= s - SHOVE_TIME)
          done += clamp01((ms - s + SHOVE_TIME) / SHOVE_TIME);
      tip.y = top + (2 * BAR_HALF_H * done) / bore.shoves.length;
    }
    const stalling =
      ms >= bore.bite && ms < bore.bite + (bore.shoves[0] - bore.bite) * 0.6;
    const judder =
      ms >= last.through
        ? 0
        : (stalling ? JUDDER : BORE_JUDDER) * Math.sin(ms * 0.9);
    tip.x += judder;
    drawDrillHead(ctx, tip, DOWN, HEAD, ms * SPIN, now, fade);
    // sparks gush while it bites, growing bar by bar, fading after each bar
    for (let i = 0; i < bores.length; i++) {
      const b = bores[i];
      if (ms < b.bite || ms > b.through + SPRAY_FADE_MS) continue;
      const after = clamp01((ms - b.through) / SPRAY_FADE_MS);
      const at = bars[b.bar];
      spray.x = at.x + OFF + (ms < b.through ? judder : 0);
      spray.y = ms < b.through ? tip.y : at.y + BAR_HALF_H;
      drawDrillSpray(
        ctx,
        spray,
        DOWN,
        ms - b.bite,
        lerp(SPRAY[0], SPRAY[1], i / Math.max(1, bores.length - 1)) *
          (1 - after),
        SPARK,
        now,
      );
    }
    for (const b of bores) {
      spray.x = bars[b.bar].x + OFF;
      spray.y = bars[b.bar].y;
      drawDetonation(
        ctx,
        spray,
        ms - b.through,
        b.bar === 0 ? OWN_THROUGH_BLAST : THROUGH_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
