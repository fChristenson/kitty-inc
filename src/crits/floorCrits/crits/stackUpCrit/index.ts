// Stack Up, a floor crit: glitter lies scattered round every bar, and it
// tidies itself in waves, each wave's specks hopping up in arcs onto a
// stack at their bar's left end with a click and a jolt, the waves quicker
// and quicker; then every stack slams down into its bar, levels on each
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, holeHash } from "../../critPlayer/shared";

const IN_MS = 160;
// the mess: SPECKS a bar, over its length and SPREAD px above and below it,
// twinkling in over SHOW_MS
const SPECKS = 24;
const SPREAD = 80;
const SHOW_MS = 160;
const SPECK = 26;
// the waves: WAVES of them from FIRST_MS, the gaps closing, each wave's
// specks hopping HOP_MS (quicker each wave) LIFT px high, STAGGER_MS apart
const FIRST_MS = IN_MS + 220;
const WAVES = 5;
const GAPS: [number, number] = [340, 130];
const HOP_MS: [number, number] = [260, 150];
const LIFT = 90;
const STAGGER_MS = 8;
const WAVE_SHAKE: [number, number] = [0.3, 0.8];
// the stack: COLUMN_IN from the bar's left end, two specks across GAP_X
// apart, STEP_Y per row up from the bar's top
const COLUMN_IN = 70;
const GAP_X = 26;
const STEP_Y = 18;
// the slam: SLAM_GAP_MS after the last wave lands, the stacks driving down
// into their bars over SLAM_MS, faster and faster, SLAM_EVERY ms apart top
// down
const SLAM_GAP_MS = 160;
const SLAM_MS = 110;
const SLAM_EVERY = 40;
const BLAST = 140;
const OWN_BLAST = 240;
const TAIL_MS = 900;
// shakes by step: a bar's slam (the waves shake themselves), its own
const SHAKES = [0.9, 1.8];

interface Speck {
  // from its bar's middle: where it lies, and its spot in the stack
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  wave: number;
  seed: number;
}
interface State {
  waves: number[];
  hops: number[];
  slams: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
// the stack filled from the bottom in the order the specks land
const SPECKS_OF: Speck[] = Array.from({ length: SPECKS }, (_, i) => ({
  dx: holeHash(i, 4100) * 2 - 1,
  dy: (holeHash(i, 4101) * 2 - 1) * SPREAD,
  sx: 0,
  sy: 0,
  wave: Math.floor(holeHash(i, 4102) * WAVES),
  seed: i,
}))
  .sort((a, b) => a.wave - b.wave || a.seed - b.seed)
  .map((s, rank) => ({
    ...s,
    sx: (rank % 2 ? 1 : -1) * (GAP_X / 2),
    sy: -BAR_HALF_H - STEP_Y * (0.5 + Math.floor(rank / 2)),
  }));
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("stackUpCrit", {
  plan(r, bars, hit) {
    const waves: number[] = [];
    const hops: number[] = [];
    let t = FIRST_MS;
    for (let w = 0; w < WAVES; w++) {
      const k = w / (WAVES - 1);
      waves.push(t);
      hops.push(lerp(HOP_MS[0], HOP_MS[1], k));
      t += lerp(GAPS[0], GAPS[1], k);
    }
    const landed =
      waves[WAVES - 1] + hops[WAVES - 1] + SPECKS * STAGGER_MS * 0.5;
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const slams = order.map((bar, k) => ({
      bar,
      at: landed + SLAM_GAP_MS + SLAM_MS + k * SLAM_EVERY,
    }));
    for (const s of slams) hit(s.bar, s.at, s.bar === 0 ? 1 : 0);
    states.set(r, { waves, hops, slams });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const half = r.play.barHalfWidth;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // each wave's landing clicks with a jolt, harder each
    while (r.kicked < WAVES) {
      const w = r.kicked;
      if (ms < state.waves[w] + state.hops[w]) break;
      r.shake(lerp(WAVE_SHAKE[0], WAVE_SHAKE[1], w / (WAVES - 1)));
      r.kicked++;
    }
    const show = clamp01((ms - IN_MS) / SHOW_MS);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (const slam of state.slams) {
      const bar = bars[slam.bar];
      const drive = clamp01((ms - (slam.at - SLAM_MS)) / SLAM_MS) ** 2;
      if (drive >= 1) continue;
      const column = bar.x - half + COLUMN_IN;
      for (const s of SPECKS_OF) {
        const start = state.waves[s.wave] + s.seed * STAGGER_MS * 0.5;
        const u = clamp01((ms - start) / state.hops[s.wave]);
        const fromX = bar.x + s.dx * (half - 20);
        const fromY = bar.y + s.dy;
        const toX = column + s.sx;
        const toY = bar.y + s.sy * (1 - drive);
        spot.x = lerp(fromX, toX, u);
        spot.y = lerp(fromY, toY, u) - LIFT * 4 * u * (1 - u);
        stampGlimmer(
          ctx,
          spot.x,
          spot.y,
          SPECK * show * (1 + 0.4 * (u > 0 && u < 1 ? 1 : 0)),
          s.seed + slam.bar * 7 + (u < 1 ? now * 0.004 : 0),
          s.seed % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.restore();
    for (const slam of state.slams)
      drawDetonation(
        ctx,
        bars[slam.bar],
        ms - slam.at,
        slam.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
