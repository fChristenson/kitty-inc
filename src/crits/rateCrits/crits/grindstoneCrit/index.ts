// Grindstone, a rate crit: the number flies off the screen's side and comes
// back as a drill that bites into its own bar's end, stalls there juddering
// in a rumble, then bores in shove by shove, sparks gushing out above and
// below; every shove throws a gout of its sparks arcing onto another bar in
// view, nearest first, each landing in a blast that turns its readout over
// onto a faster rate; it punches through its own last in the biggest blast
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  drawGrind,
  planDrill,
  planGrind,
  type Grind,
} from "../../../../shared/animationStyles/drill";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number flying off the side, the drill coming back OFF px past it
const IN_MS = 160;
const OFF = 120;
// the drill: APPROACH_MS in, stalling STALL_MS, boring in PUSHES shoves
// over BORE_MS, REACH px deep, SIZE across its head, its spray SPRAY
const APPROACH_MS = 220;
const STALL_MS = 380;
const BORE_MS = 1500;
const PUSHES = 8;
const REACH = 110;
const SIZE = 110;
const SPRAY = 90;
const INSET = 20;
const RUMBLE_SHAKE: [number, number] = [0.25, 0.5];
const PUSH_SHAKE: [number, number] = [0.6, 1.2];
// a gout: SPECKS sparks thrown GOUT_MS onto a bar's end, landing within
// SPREAD of it, arcing ARC up (more the farther)
const SPECKS = 14;
const GOUT_MS = 300;
const SPREAD = 60;
const ARC = 220;
const SPECK = 22;
const GOUT_BLAST = 120;
const THROUGH_BLAST = 340;
// shakes by step: a jolt, a bar, its own
const SHAKES = [0.4, 1, 3];

interface Gout {
  bar: number;
  from: number;
  lands: number;
}
interface State {
  grind: Grind;
  // the drill's bite, from bars[0]
  hole: Point;
  gouts: Gout[];
  beats: { ms: number; shake: number }[];
  start: Point;
}
const states = new WeakMap<Running, State>();
const spark: Point = { x: 0, y: 0 };
const end: Point = { x: 0, y: 0 };

// a ground bar: `speed` times as fast till then
const ground = defineBarEffect<number>({
  speed: () => meta.values.speed,
  ended: (until, now) => now >= until,
});

registerFloorCrit("grindstoneCrit", {
  reward(t) {
    t.flipRate();
    ground.set(t.floor, t.now + (t.own ? meta.values.ownMs : meta.values.ms));
    t.punch(`x${meta.values.speed} Speed`);
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const own = bars[0];
    const hole = { x: half - INSET, y: 0 };
    const start = { x: r.viewportWidth / 2 + OFF - own.x, y: 0 };
    const drill = planDrill(start, hole, {
      approachMs: APPROACH_MS,
      boreMs: BORE_MS,
      pushes: PUSHES,
      reach: REACH,
      startMs: IN_MS,
    });
    const grind = planGrind(drill, STALL_MS);
    const beats = [
      ...grind.rumbles.map((ms, k) => ({
        ms,
        shake: lerp(
          RUMBLE_SHAKE[0],
          RUMBLE_SHAKE[1],
          k / Math.max(1, grind.rumbles.length - 1),
        ),
      })),
      ...grind.pushes.map((ms, k) => ({
        ms,
        shake: lerp(
          PUSH_SHAKE[0],
          PUSH_SHAKE[1],
          k / Math.max(1, grind.pushes.length - 1),
        ),
      })),
    ];
    // the other bars, nearest first, spread over the shoves
    const others = bars
      .map((_, k) => k)
      .filter((k) => k > 0)
      .sort(
        (a, b) => Math.abs(bars[a].y - own.y) - Math.abs(bars[b].y - own.y),
      );
    const shoves = grind.pushes;
    const gouts = others.map((bar, j) => {
      const from = shoves[Math.floor((j * shoves.length) / others.length)];
      const lands = from + GOUT_MS;
      hit(bar, lands, 1);
      return { bar, from, lands };
    });
    hit(0, grind.through, 2);
    states.set(r, { grind, hole, gouts, beats, start });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const own = bars[0];
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, own.x + state.start.x, p),
        lerp(0, own.y, p),
        r.flashFont * lerp(1, 0.4, p),
      );
    }
    while (r.kicked < state.beats.length && ms >= state.beats[r.kicked].ms)
      r.shake(state.beats[r.kicked++].shake);
    const half = r.play.barHalfWidth;
    ctx.save();
    ctx.translate(own.x, own.y);
    drawGrind(ctx, state.grind, ms, now, SIZE, SPRAY);
    // the gouts of sparks arcing onto the other bars' ends
    const { gouts, hole } = state;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let s = 0; s < gouts.length * SPECKS; s++) {
      const g = gouts[(s / SPECKS) | 0];
      const delay = holeHash(s, 2510) * 40;
      const u = (ms - g.from - delay) / (GOUT_MS - delay);
      if (u <= 0 || u >= 1) continue;
      const to = bars[g.bar];
      const tx =
        to.x - own.x + half - INSET + (holeHash(s, 2511) * 2 - 1) * SPREAD;
      const ty = to.y - own.y;
      const lift = ARC + Math.abs(ty) * 0.3;
      spark.x = lerp(hole.x, tx, u);
      spark.y = lerp(hole.y, ty, u) - lift * 4 * u * (1 - u);
      stampGlimmer(
        ctx,
        spark.x,
        spark.y,
        SPECK * (1 - 0.4 * u),
        s,
        s % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (const g of gouts) {
      end.x = bars[g.bar].x - own.x + half - INSET;
      end.y = bars[g.bar].y - own.y;
      drawDetonation(ctx, end, ms - g.lands, GOUT_BLAST, now);
    }
    drawDetonation(ctx, hole, ms - state.grind.through, THROUGH_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
