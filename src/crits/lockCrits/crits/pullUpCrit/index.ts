// Pull Up, a lock crit: the number lands in the dark locked floor and two
// gold pole wisps light up at its ends, field lines bowing between them;
// the dust lying all over the floor snaps onto them along the lines into
// spiky crusts, a trickle then a flood, a click every few; the poles yank
// together and slam it open, then flip, the crust flung off onto its new
// bar, which runs a gear up for good
import {
  drawFieldLines,
  flingAt,
  planSnaps,
  snapAt,
  type Snap,
} from "../../../../shared/animationStyles/magnet";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
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
} from "../../../floorCrits/critPlayer";

// the number arcing down into the floor's middle
const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the poles INSET of the floor's width in from its ends, lighting up over
// POLES_MS; the dust over BOX of the floor, snapping in from SNAPS_MS till
// PULL_MS, crusts REACH deep
const INSET = 0.12;
const POLES_MS = 150;
const BOX_W = 0.45;
const BOX_H = 0.35;
const SPECKS = 60;
const SPECK = 18;
const STUCK = 24;
const SNAPS_MS = ARC_MS + 120;
const PULL_MS = ARC_MS + 1000;
const REACH: [number, number] = [36, 96];
const FIELD = 110;
const CLICK_EVERY = 8;
// the poles yanked together over YANK_MS, slamming it open; the crust flung
// off at FLING px a ms, fading over FLING_MS onto the new bar's gear up
const YANK_MS = 220;
const SLAM_MS = PULL_MS + YANK_MS;
const SLAM_BLAST = 240;
const FLING = 1.6;
const FLING_MS = 300;
const GEAR_MS = SLAM_MS + 380;
const POLE = WISP_SIZE * 1.1;
const TAIL_MS = 900;
// shakes by step: a click, the slam, the gear up
const SHAKES = [0.3, 2.6, 1];

interface State {
  snaps: Snap[];
  clicks: number[];
  // the floor's middle from the lock's, its poles' reach either side
  offset: Point;
  span: number;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };
const north: Point = { x: 0, y: 0 };
const south: Point = { x: 0, y: 0 };
const speck: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };
const northOff: Point = { x: 0, y: 0 };
const southOff: Point = { x: 0, y: 0 };

registerFloorCrit("pullUpCrit", {
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const width = FLOOR_X_MAX - FLOOR_X_MIN;
    const snaps = planSnaps(
      SPECKS,
      {
        left: -width * BOX_W,
        top: -FLOOR_H * BOX_H,
        right: width * BOX_W,
        bottom: FLOOR_H * BOX_H,
      },
      2,
      SNAPS_MS,
      PULL_MS,
      REACH,
    );
    const clicks = snaps
      .filter((_, i) => i % CLICK_EVERY === CLICK_EVERY - 1)
      .map((s) => s.landMs);
    states.set(r, {
      snaps,
      clicks,
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
      span: width * (0.5 - INSET),
    });
    hit(0, ARC_MS, 0);
    for (const click of clicks) hit(0, click, 0);
    hit(0, SLAM_MS, 1);
    hit(0, GEAR_MS, 2);
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
    const yank = clamp01((ms - PULL_MS) / YANK_MS) ** 3;
    const reach = state.span * (1 - yank);
    northOff.x = -reach;
    southOff.x = reach;
    north.x = at.x - reach;
    north.y = at.y;
    south.x = at.x + reach;
    south.y = at.y;
    const lit = clamp01((ms - ARC_MS) / POLES_MS);
    if (ms < SLAM_MS) drawFieldLines(ctx, north, south, lit, ms, FIELD);

    const flung = ms - SLAM_MS;
    const fade = flung < 0 ? 1 : 1 - flung / FLING_MS;
    if (ms >= ARC_MS && fade > 0) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      beginLightBatch(ctx);
      for (let i = 0; i < state.snaps.length; i++) {
        const s = state.snaps[i];
        // planned round the floor's middle
        if (flung >= 0) flingAt(s, flung, ORIGIN, FLING, speck);
        else snapAt(s, ms, s.pole === 0 ? northOff : southOff, SPECK, speck);
        stampGlimmer(
          ctx,
          at.x + speck.x,
          at.y + speck.y,
          ms >= s.landMs ? STUCK : SPECK,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
    }
    if (ms >= ARC_MS && ms < SLAM_MS) {
      drawWispHead(ctx, () => north, ms, now, POLE * lit, 0.6);
      drawWispHead(ctx, () => south, ms, now, POLE * lit, 0.6);
    }
    drawDetonation(ctx, at, ms - SLAM_MS, SLAM_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
