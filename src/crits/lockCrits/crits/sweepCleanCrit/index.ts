// Sweep Clean, a lock crit: glitter dust lies all over the dark locked
// floor; a broom of light drags it across the floor in one brisk pass, then
// back into one heap in the middle, the dust only moving as the broom
// reaches it; the heap settles with a jolt and bursts the floor open, and
// the floor waiting above it is priced down
import {
  drawBroom,
  type BroomState,
} from "../../../../shared/animationStyles/clutter";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number arcing down into the floor's middle
const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the dust: DUST specks over SPREAD of the floor's width and height
const DUST = 70;
const SPREAD_W = 0.46;
const SPREAD_H = 0.36;
const SPECK = 20;
// how far ahead of the broom a speck rides, px
const AHEAD: [number, number] = [10, 70];
// the strokes: out to the far end, then back to the middle, each easing to
// a stop; a pause between
const OUT_MS = 480;
const BACK_MS = 380;
const PAUSE_MS = 120;
const EASE = 1.6;
const BROOM = 0.75;
const LIFT_MS = 100;
// the heap settling, then bursting the floor open, then the price cut
const SETTLE_MS = 140;
const SETTLE = 200;
const HEAP_BELOW = 0.17;
const OPEN_GAP_MS = 260;
const OPEN_BLAST = 240;
const PRICE_GAP_MS = 400;
const TAIL_MS = 900;
// shakes by step: a stroke or the heap, the opening, the price cut
const SHAKES = [0.8, 2.6, 1];

interface State {
  // the floor's middle from the lock's
  offset: Point;
  dust: { x: number; y: number; ahead: number }[];
  strokes: { from: number; to: number; start: number; ms: number }[];
  heapAt: number;
  openAt: number;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };
const broom: BroomState = { x: 0, y: 0, heading: 0, length: 0, pushing: true };

const broomX = (s: State["strokes"][number], ms: number) =>
  lerp(s.from, s.to, 1 - (1 - clamp01((ms - s.start) / s.ms)) ** EASE);

registerFloorCrit("sweepCleanCrit", {
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const half = width / 2;
    const strokes = [
      { from: -half, to: half * 0.9, start: ARC_MS + 80, ms: OUT_MS },
      {
        from: half,
        to: 0,
        start: ARC_MS + 80 + OUT_MS + PAUSE_MS,
        ms: BACK_MS,
      },
    ];
    const heapAt = strokes[1].start + strokes[1].ms + SETTLE_MS;
    const openAt = heapAt + OPEN_GAP_MS;
    states.set(r, {
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
      dust: Array.from({ length: DUST }, (_, i) => ({
        x: (holeHash(i, 1850) * 2 - 1) * width * SPREAD_W,
        y: (holeHash(i, 1851) * 2 - 1) * FLOOR_H * SPREAD_H,
        ahead: lerp(AHEAD[0], AHEAD[1], holeHash(i, 1852)),
      })),
      strokes,
      heapAt,
      openAt,
    });
    hit(0, ARC_MS, 0);
    for (const s of strokes) hit(0, s.start, 0);
    hit(0, heapAt, 0);
    hit(0, openAt, 1);
    hit(0, openAt + PRICE_GAP_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    at.x = bars[0].x + state.offset.x;
    at.y = bars[0].y + state.offset.y;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        at.x * p,
        at.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    drawDetonation(ctx, at, ms - ARC_MS, ARRIVE_BLAST, now);
    // a swoosh at every stroke
    while (
      r.kicked < state.strokes.length &&
      ms >= state.strokes[r.kicked].start
    ) {
      r.kicked++;
      playSwoosh();
    }
    if (ms >= ARC_MS && ms < state.openAt) {
      const settle = clamp01((ms - state.heapAt + SETTLE_MS) / SETTLE);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < state.dust.length; i++) {
        const d = state.dust[i];
        let x = d.x;
        for (const s of state.strokes) {
          if (ms < s.start) break;
          const pushed = broomX(s, ms) + Math.sign(s.to - s.from) * d.ahead;
          x = s.to > s.from ? Math.max(x, pushed) : Math.min(x, pushed);
        }
        const y = lerp(d.y, FLOOR_H * HEAP_BELOW - d.ahead * 0.4, settle);
        stampGlimmer(
          ctx,
          at.x + x,
          at.y + y,
          SPECK,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      for (const s of state.strokes) {
        if (ms < s.start - LIFT_MS || ms > s.start + s.ms + LIFT_MS) continue;
        broom.pushing = ms >= s.start && ms <= s.start + s.ms;
        broom.x = at.x + broomX(s, ms);
        broom.y = at.y;
        broom.heading = s.to > s.from ? 0 : Math.PI;
        broom.length = FLOOR_H * BROOM;
        drawBroom(ctx, broom, 1, ms, now);
      }
    }
    drawDetonation(ctx, at, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
