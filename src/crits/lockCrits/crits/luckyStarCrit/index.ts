// Lucky Star, a lock crit: the number arcs into the locked floor and bursts
// into a tilted disk of stars turning inside it; they spiral in onto the
// core, quicker and quicker, until it collapses and blows the floor open,
// one star leaping onto its button: a sure crit at the crit's tier
import { armCritUpgrade } from "../../../floorCrits/upgradeCrit";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import {
  planDisk,
  scatterDisk,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { stampGlimmer } from "../../../../shared/twinkle";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";

const ARC_MS = 180;
const ARC_RISE = 120;
const ARRIVE_BLAST = 90;
// the disk inside the floor, grown out, then spiralling in onto its core
const STARS = 170;
const INNER = 60;
const OUTER = FLOOR_H * 0.6;
const SQUASH = 0.3;
const RIM_HZ = 0.6;
const GROW_MS = 200;
const SPIRAL_MS = 1300;
const CORE_R = 12;
const STAR = 28;
const TWINKLE = 0.012;
const GLOW = 140;
const GLOW_GROWTH = 220;
const GLOW_ALPHA = 0.5;
// rumbles while it spirals in, quicker each
const RUMBLES = [0.35, 0.6, 0.78, 0.9];
const RUMBLE_SHAKE = 0.6;
const COLLAPSE_BLAST = 280;
// one star leaping onto the opened floor's button
const LEAP_DELAY_MS = 120;
const LEAP_MS = 220;
const LEAP_ARC = 160;
const LAND_BLAST = 150;
const TAIL_MS = 900;

interface State {
  bars: Point[];
  stars: Orbit[];
  core: Orbit;
  disk: Disk;
  collapse: number;
  lands: number;
  // the opened floor's button from the lock's middle
  button: Point;
  leap: (ms: number) => Point | null;
}

const states = new WeakMap<Running, State>();
const GOLD = glowStops(COLOR.heavenlyGold);
const star: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("luckyStarCrit", {
  // the crit's tier armed on the floor it opened
  reward(t) {
    armCritUpgrade(t.floor, t.tier);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const disk = planDisk(
      { x: bars[0].x, y: bars[0].y },
      { inner: INNER, outer: OUTER, squash: SQUASH, rimHz: RIM_HZ },
    );
    const collapse = ARC_MS + SPIRAL_MS;
    const lands = collapse + LEAP_DELAY_MS + LEAP_MS;
    const btn = getButtonCenter(false);
    const lock = getLockCenter();
    const button = { x: btn.x - lock.x, y: btn.y - lock.y };
    hit(0, ARC_MS, 0);
    hit(0, collapse, 1);
    hit(0, lands, 2);
    const at: Point = { x: 0, y: 0 };
    const state: State = {
      bars,
      stars: scatterDisk(disk, STARS),
      core: { radius: CORE_R, phase: 0 },
      disk,
      collapse,
      lands,
      button,
      leap: (ms) => {
        const from = collapse + LEAP_DELAY_MS;
        if (ms < from || ms > lands) return null;
        const c = state.bars[0];
        const u = (ms - from) / LEAP_MS;
        const tx = c.x + button.x;
        const ty = c.y + button.y;
        at.x = c.x + (tx - c.x) * u;
        at.y = c.y + (ty - c.y) * u - LEAP_ARC * 4 * u * (1 - u);
        return at;
      },
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const c = bars[0];
    const { disk } = state;
    disk.center.x = c.x;
    disk.center.y = c.y;
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
    const u = clamp01((ms - ARC_MS) / SPIRAL_MS);
    while (r.kicked < RUMBLES.length && u >= RUMBLES[r.kicked]) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }
    if (ms >= ARC_MS && ms < state.collapse) {
      const grow = 1 - (1 - clamp01((ms - ARC_MS) / GROW_MS)) ** 3;
      // spiralling in quicker and quicker as they near the core
      const pull = u * u * u;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = GLOW_ALPHA;
      drawGlow(ctx, GOLD, c.x, c.y, GLOW + GLOW_GROWTH * u);
      ctx.globalAlpha = 1;
      beginLightBatch(ctx);
      const local = ms - ARC_MS;
      for (let i = 0; i < state.stars.length; i++) {
        disk.drift(state.stars[i], state.core, pull, local, star, grow);
        stampGlimmer(
          ctx,
          star.x,
          star.y,
          STAR,
          i + ms * TWINKLE,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    drawDetonation(ctx, c, ms - state.collapse, COLLAPSE_BLAST, now);
    drawWispBetween(
      ctx,
      state.leap,
      ms,
      now,
      WISP_SIZE * 1.4,
      1,
      state.collapse + LEAP_DELAY_MS,
      state.lands,
    );
    spot.x = c.x + state.button.x;
    spot.y = c.y + state.button.y;
    drawDetonation(ctx, spot, ms - state.lands, LAND_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : step === 2 ? 1.4 : 0.7),
});
