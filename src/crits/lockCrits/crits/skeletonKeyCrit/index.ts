// Skeleton Key, a lock crit: the number arcs into the locked floor and
// sprays dots that build a giant key over it, faster and faster; it blazes,
// then snaps into the floor, which bursts open, its button left with free taps
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { SHAPES, shapeOutline } from "../../../../shared/animationStyles/drawing";
import { stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { playSpinTick } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the key over the floor's middle, its dots sprayed out one after another,
// quicker and quicker, each a click
const DOTS = 150;
const SIZE = 330;
const DOT_GAP_MS: [number, number] = [12, 3];
const FLY_MS = 200;
const CLICK_EVERY = 25;
const CLICK_SHAKE = 0.3;
const DOT = 34;
const BLAZE_DOT = 26;
// it blazes, then snaps into the floor
const BLAZE_GAP_MS = 60;
const BLAZE_MS = 300;
const BLAZE_GLOW = 520;
const SNAP_MS = 140;
const OPEN_BLAST = 280;
const TAPS_GAP_MS = 180;
const TAPS_BLAST = 150;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  // each dot's spot from the floor's middle, and when it's sprayed
  dots: Point[];
  fired: number[];
  blaze: number;
  snap: number;
  open: number;
  taps: number;
  button: Point;
  clicks: number[];
}

const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("skeletonKeyCrit", {
  plan(r, bars, hit) {
    const dots = shapeOutline(SHAPES.key, DOTS, { x: 0, y: 0 }, SIZE);
    const fired: number[] = [];
    let t = ARC_MS;
    for (let k = 0; k < dots.length; k++) {
      fired.push(t);
      t += lerp(DOT_GAP_MS[0], DOT_GAP_MS[1], k / (dots.length - 1));
    }
    const blaze = fired[fired.length - 1] + FLY_MS + BLAZE_GAP_MS;
    const snap = blaze + BLAZE_MS;
    const open = snap + SNAP_MS;
    const taps = open + TAPS_GAP_MS;
    const btn = getButtonCenter(false);
    const lock = getLockCenter();
    hit(0, ARC_MS, 0);
    hit(0, blaze, 0);
    hit(0, open, 1);
    hit(0, taps, 2);
    states.set(r, {
      bars,
      dots,
      fired,
      blaze,
      snap,
      open,
      taps,
      button: { x: btn.x - lock.x, y: btn.y - lock.y },
      clicks: fired.filter((_, k) => k % CLICK_EVERY === 0),
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const c = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        c.x * p,
        c.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    drawDetonation(ctx, c, ms - ARC_MS, ARRIVE_BLAST, now);
    // a click and a jolt every few dots
    while (r.kicked < state.clicks.length && ms >= state.clicks[r.kicked]) {
      r.kicked++;
      r.shake(CLICK_SHAKE);
      playSpinTick();
    }
    if (ms >= ARC_MS && ms < state.open) {
      const blaze =
        ms >= state.blaze ? 1 - clamp01((ms - state.blaze) / BLAZE_MS) : 0;
      const snap = clamp01((ms - state.snap) / SNAP_MS) ** 2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (blaze > 0) {
        ctx.globalAlpha = 0.3 + 0.5 * blaze;
        drawGlow(ctx, GOLD, c.x, c.y, BLAZE_GLOW, 0.5);
        ctx.globalAlpha = 1;
      }
      beginLightBatch(ctx);
      const { dots, fired } = state;
      for (let k = 0; k < dots.length; k++) {
        if (ms < fired[k]) break;
        const u = clamp01((ms - fired[k]) / FLY_MS);
        const e = 1 - (1 - u) * (1 - u);
        stampGlimmer(
          ctx,
          c.x + dots[k].x * e * (1 - snap),
          c.y + dots[k].y * e * (1 - snap),
          DOT + BLAZE_DOT * blaze,
          k,
          k % 4 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawDetonation(ctx, c, ms - state.open, OPEN_BLAST, now);
    spot.x = c.x + state.button.x;
    spot.y = c.y + state.button.y;
    drawDetonation(ctx, spot, ms - state.taps, TAPS_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1.2 : 0.8),
});
