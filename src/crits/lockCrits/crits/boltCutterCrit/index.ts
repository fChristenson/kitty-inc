// Bolt Cutter, a lock crit: the number flies up over the locked floor and
// bolts crack down onto it all over, quicker and quicker, each a flash and a
// jolt, the floor glowing hotter; a giant bolt splits it open down the
// middle, then its bar fills crackling with the crit's levels
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  getIncomeBarBox,
  getIncomeBarCenter,
} from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number flies up over the floor, where the storm gathers
const RISE_MS = 160;
const RISE_BLAST = 110;
const ABOVE = FLOOR_H * 0.9;
// strikes all over the floor, quickening
const STRIKES = 11;
const STRIKE_GAP_MS: [number, number] = [150, 50];
const SPREAD_X = 0.8;
const SPREAD_Y = FLOOR_H * 0.3;
const BOLT_MS = 180;
const SKY = 1.1;
const SKEW = 0.12;
const STRIKE_BLAST = 80;
// the floor's glow, growing with every strike
const GLOW = FLOOR_H * 0.9;
const GLOW_PER_STRIKE = 24;
const GLOW_ALPHA = 0.6;
// the giant bolt, then the bar charging
const SPLIT_GAP_MS = 140;
const GIANT_MS = 320;
const GIANT_WIDTH = 3.2;
const SPLIT_BLAST = 270;
const CHARGE_DELAY_MS = 100;
const CHARGE_MS = 300;
const FILL_BLAST = 170;
const TAIL_MS = 900;

interface Strike {
  at: number;
  offset: Point;
  bolt: Bolt;
}

interface State {
  strikes: Strike[];
  giant: Bolt;
  charge: Bolt;
  // the opened floor's bar from the lock's middle
  bar: Point;
  split: number;
  fill: number;
}

const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const sky: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

const skyOver = (r: Running, mid: Point) => {
  sky.x = mid.x;
  sky.y = Math.max(mid.y - ABOVE, -r.viewportWidth * 0.55);
  return sky;
};

registerFloorCrit("boltCutterCrit", {
  plan(r, bars, hit) {
    const mid = bars[0];
    const halfW = r.play.barHalfWidth * SPREAD_X;
    const strikes: Strike[] = [];
    let t = RISE_MS + 60;
    for (let k = 0; k < STRIKES; k++) {
      const offset = {
        x: (holeHash(k, 41) - 0.5) * 2 * halfW,
        y: (holeHash(k, 42) - 0.5) * 2 * SPREAD_Y,
      };
      const to = { x: mid.x + offset.x, y: mid.y + offset.y };
      strikes.push({
        at: t,
        offset,
        bolt: createBolt(
          { x: to.x + r.viewportWidth * SKEW, y: to.y - r.viewportWidth * SKY },
          to,
          1,
        ),
      });
      hit(0, t, 0);
      t += lerp(STRIKE_GAP_MS[0], STRIKE_GAP_MS[1], k / (STRIKES - 1));
    }
    const split = t - STRIKE_GAP_MS[1] + SPLIT_GAP_MS;
    const fill = split + CHARGE_DELAY_MS + CHARGE_MS;
    hit(0, split, 1);
    hit(0, fill, 2);
    hit(0, RISE_MS, 0);
    const barCenter = getIncomeBarCenter(false);
    const lock = getLockCenter();
    const bar = { x: barCenter.x - lock.x, y: barCenter.y - lock.y };
    const barHalf = getIncomeBarBox(false).width / 2;
    states.set(r, {
      strikes,
      giant: createBolt(
        { x: mid.x, y: mid.y - r.viewportWidth * SKY },
        { x: mid.x, y: mid.y + FLOOR_H / 2 },
        3,
      ),
      charge: createBolt(
        { x: mid.x + bar.x - barHalf, y: mid.y + bar.y },
        { x: mid.x + bar.x + barHalf, y: mid.y + bar.y },
        0,
      ),
      bar,
      split,
      fill,
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { strikes, giant, charge, bar, split, fill } = states.get(r)!;
    const mid = bars[0];
    skyOver(r, mid);
    if (ms < RISE_MS) {
      const u = ms / RISE_MS;
      const p = u * u * (3 - 2 * u);
      drawText(ctx, r.glyphs, r.label, sky.x * p, sky.y * p, r.flashFont);
    }
    drawDetonation(ctx, sky, ms - RISE_MS, RISE_BLAST, now);
    let struck = 0;
    for (let k = 0; k < strikes.length; k++) if (ms >= strikes[k].at) struck++;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (ms < split && struck > 0) {
      ctx.globalAlpha = (struck / strikes.length) * GLOW_ALPHA;
      drawGlow(ctx, GOLD, mid.x, mid.y, GLOW + struck * GLOW_PER_STRIKE, 0.45);
      ctx.globalAlpha = 1;
    }
    for (let k = 0; k < strikes.length; k++) {
      const s = strikes[k];
      const since = ms - s.at;
      if (since < -40 || since >= BOLT_MS) continue;
      s.bolt.to.x = mid.x + s.offset.x;
      s.bolt.to.y = mid.y + s.offset.y;
      s.bolt.from.x = s.bolt.to.x + r.viewportWidth * SKEW;
      s.bolt.from.y = s.bolt.to.y - r.viewportWidth * SKY;
      const alpha = 1 - clamp01(since / BOLT_MS);
      drawBolt(ctx, s.bolt, alpha, 1.3);
      if (since >= 0) drawStrike(ctx, s.bolt.to, alpha, 0.9, now);
    }
    const g = ms - split;
    if (g >= -60 && g < GIANT_MS) {
      giant.from.x = mid.x;
      giant.from.y = mid.y - r.viewportWidth * SKY;
      giant.to.x = mid.x;
      giant.to.y = mid.y + FLOOR_H / 2;
      drawBolt(ctx, giant, 1 - clamp01(g / GIANT_MS), GIANT_WIDTH);
      if (g >= 0) drawStrike(ctx, mid, 1 - g / GIANT_MS, 3, now);
    }
    const c = ms - split - CHARGE_DELAY_MS;
    if (c >= 0 && ms < fill) {
      const half = (charge.to.x - charge.from.x) / 2;
      const cx = mid.x + bar.x;
      charge.from.x = cx - half;
      charge.to.x = cx + half;
      charge.from.y = charge.to.y = mid.y + bar.y;
      drawBolt(ctx, charge, 0.6 + 0.4 * Math.random(), 1.2);
    }
    ctx.restore();
    for (let k = 0; k < strikes.length; k++) {
      const s = strikes[k];
      spot.x = mid.x + s.offset.x;
      spot.y = mid.y + s.offset.y;
      drawDetonation(ctx, spot, ms - s.at, STRIKE_BLAST, now);
    }
    drawDetonation(ctx, mid, g, SPLIT_BLAST, now);
    if (ms >= fill) {
      spot.x = charge.to.x;
      spot.y = mid.y + bar.y;
      drawDetonation(ctx, spot, ms - fill, FILL_BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1.8 : 0.8),
});
