// Accelerator, a lock crit: twin rings open facing each other at the dark
// locked floor's two ends, the lock between them; the number drops into the
// far ring and bursts out of the near one as a wisp shooting along the floor,
// through the lock (a flash and a jolt), into the far ring and out of the near
// one at once, lap after lap, quicker every time (a streak, then a blur), the
// rings swelling and glowing hotter, the whine rising, more wisps bursting
// out to join the run; at top speed they all hit the lock at once and smash
// it open, then stream into the new floor's button: each of its next taps
// also boosts every worker on the floor below
import meta from "./meta";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import { activateBoosted } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  portalLook,
  type PortalLook,
  type Warp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playBloop, playSpinTick, playSwoosh } from "../../../../sound";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { clickWorker, getRenderedWorkerCount } from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing into the far ring over TEXT_MS
const TEXT_MS = 150;
const ARC_RISE = 120;
// the rings INSET px in from the floor's ends, from RING to RING_HOT of a
// floor high, flaring FLARE at each pass; opening over OPEN_MS, closing
// CLOSE_MS after the lock bursts
const INSET = 34;
const RING = 0.36;
const RING_HOT = 0.52;
const FLARE = 0.3;
const FLARE_MS = 140;
const OPEN_MS = 120;
const CLOSE_MS = 130;
const HOT_ALPHA = 0.7;
const HOT_GLOW = 1.3;
// the laps, near ring to far, each quicker; wisp i bursting out to join on
// lap JOIN[i], in lane LANES[i] (of a floor high), STAGGER_MS[k] behind the
// one before it on lap k, closing up to none on the last
const LAPS_MS = [300, 220, 165, 125, 95, 75, 60];
const JOIN = [0, 2, 3, 4, 5];
const LANES = [0, -0.14, 0.14, -0.26, 0.26];
const STAGGER_MS = [0, 0, 40, 30, 20, 12, 6, 0];
// the streak behind each wisp, STREAK_MS of its run; the blur along the
// floor once it's hot
const STREAK_MS = 40;
const STREAK_W = 0.35;
const BLUR_W: [number, number] = [3, 10];
const BLUR_BAND = 0.6;
// each lap through the lock a white flash
const CROSS_MS = 130;
const CROSS_GLOW = 150;
// the smash, a HOLD_MS breath, then out onto the button OUT_STEP_MS apart
// over OUT_MS, bowed BOW px, SPREAD px either side of it
const HOLD_MS = 70;
const OUT_STEP_MS = 18;
const OUT_MS = 170;
const BOW = 140;
const SPREAD = 60;
const LAND_MS = 160;
const LAND_GLOW = 70;
const WISP = WISP_SIZE * 1.1;
const OPEN_BLAST = 440;
const BUTTON_BLAST = 200;
// shakes by step: a lap through the lock, it bursting, onto the new button
const SHAKES = [0.8, 3.2, 1.3];
const WHINE = 0.15;

const LEFT_LOOK = portalLook(3);
const RIGHT_LOOK = portalLook(5);
const WHITE = fadeStops(COLOR.white, 0.2);
const GOLD = fadeStops(COLOR.heavenlyGold);

interface State {
  // round the lock (the crit draws round it)
  left: Point;
  right: Point;
  button: Point;
  spots: Point[];
  warps: Warp[];
  runners: ((ms: number) => Point | null)[];
  // every dive into the far ring (out of the near one at once)
  passes: number[];
  // the lead through the lock
  crosses: number[];
  sounds: number[];
  lastLap: number;
  openAt: number;
  lands: number[];
  firstLand: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

// each tap also boosting every worker on the open floor below, as if tapped
const chargeTaps = defineTapPerk("Charge", (t) => {
  const below = t.floors[t.floors.indexOf(t.floor) - 1];
  if (!below?.unlocked) return;
  const now = Date.now();
  const count = getRenderedWorkerCount(below);
  for (let i = 0; i < count; i++) {
    clickWorker(below, i, now);
    activateBoosted(below, i, now);
  }
  if (count > 0) playBloop();
});

// a ring stood upright at `at`, its passes and its heat
function drawRing(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  open: number,
  now: number,
  look: PortalLook,
  heat: number,
  passes: number[],
  ms: number,
): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.PI / 2);
  drawPortal(ctx, ORIGIN, size, open, now, 1, look);
  for (let k = 0; k < passes.length; k++)
    drawPortalPass(ctx, ORIGIN, ms - passes[k], size);
  if (heat > 0 && open > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha *= HOT_ALPHA * heat * open;
    drawGlow(ctx, WHITE, 0, 0, size * HOT_GLOW);
  }
  ctx.restore();
}

registerFloorCrit("acceleratorCrit", {
  reward(t) {
    chargeTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lockAt = getLockCenter();
    const btn = getButtonCenter(false);
    const left = { x: FLOOR_X_MIN + INSET - lockAt.x, y: 0 };
    const right = { x: FLOOR_X_MAX - INSET - lockAt.x, y: 0 };
    const button = { x: btn.x - lockAt.x, y: btn.y - lockAt.y };
    // how far along a lap the lock is
    const through = clamp01(-left.x / (right.x - left.x));
    const laps = LAPS_MS.length;
    const lapAt: number[] = [TEXT_MS];
    for (let k = 0; k < laps; k++) lapAt.push(lapAt[k] + LAPS_MS[k]);
    const lastLap = lapAt[laps];
    const openAt = lastLap + Math.max(25, through * LAPS_MS[laps - 1]);
    const passes: number[] = [TEXT_MS];
    const crosses: number[] = [];
    const sounds: number[] = [TEXT_MS];
    const spots: Point[] = [];
    const warps: Warp[] = [];
    const runners: ((ms: number) => Point | null)[] = [];
    const lands: number[] = [];
    const total = JOIN.length;
    for (let i = 0; i < total; i++) {
      const lane = LANES[i] * FLOOR_H;
      const near = { x: left.x, y: lane };
      const far = { x: right.x, y: lane };
      const legs: WarpLeg[] = [];
      if (JOIN[i] > 0) passes.push(lapAt[JOIN[i]] + i * STAGGER_MS[JOIN[i]]);
      for (let k = JOIN[i]; k < laps; k++) {
        const startMs = lapAt[k] + i * STAGGER_MS[k];
        const endMs = lapAt[k + 1] + i * STAGGER_MS[k + 1];
        legs.push({ from: near, to: far, startMs, endMs });
        passes.push(endMs);
        if (i === 0) {
          crosses.push(lerp(startMs, endMs, through));
          sounds.push(endMs);
        }
      }
      const back = openAt + HOLD_MS + i * OUT_STEP_MS;
      const spot = {
        x: button.x + lerp(-SPREAD, SPREAD, i / (total - 1)),
        y: button.y,
      };
      legs.push({ from: near, to: ORIGIN, startMs: lastLap, endMs: openAt });
      legs.push({ from: ORIGIN, to: ORIGIN, startMs: openAt, endMs: back });
      legs.push({
        from: ORIGIN,
        to: spot,
        startMs: back,
        endMs: back + OUT_MS,
        arc: (i % 2 ? -1 : 1) * BOW,
      });
      spots.push(spot);
      lands.push(back + OUT_MS);
      const warp = planWarp(legs);
      const pos: Point = { x: 0, y: 0 };
      warps.push(warp);
      runners.push((ms) => warp.at(ms, pos));
    }
    for (let k = 0; k < crosses.length; k++) hit(0, crosses[k], 0);
    hit(0, openAt, 1);
    const firstLand = lands[0];
    hit(0, firstLand, 2);
    states.set(r, {
      left,
      right,
      button,
      spots,
      warps,
      runners,
      passes,
      crosses,
      sounds,
      lastLap,
      openAt,
      lands,
      firstLand,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { left, right, passes, crosses, openAt, lastLap } = state;
    if (ms < TEXT_MS) {
      const u = ms / TEXT_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + right.x) * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    // a swoosh as it sets off, then a whine rising every lap
    while (r.kicked < state.sounds.length && ms >= state.sounds[r.kicked]) {
      if (r.kicked === 0) playSwoosh();
      else playSpinTick(1 + WHINE * r.kicked);
      r.kicked++;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const heat = clamp01((ms - TEXT_MS) / (lastLap - TEXT_MS));
    const hot = heat * heat;
    let flare = 0;
    for (let k = 0; k < passes.length; k++) {
      const since = ms - passes[k];
      if (since >= 0 && since < FLARE_MS)
        flare = Math.max(flare, 1 - since / FLARE_MS);
    }
    const size = lerp(RING, RING_HOT, heat) * FLOOR_H * (1 + FLARE * flare);
    const open = Math.min(
      clamp01((ms - TEXT_MS + OPEN_MS) / OPEN_MS),
      1 - clamp01((ms - openAt) / CLOSE_MS),
    );
    drawRing(ctx, left, size, open, now, LEFT_LOOK, hot, passes, ms);
    drawRing(ctx, right, size, open, now, RIGHT_LOOK, hot, passes, ms);
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    if (ms < openAt && hot > 0) {
      // the run blurring into one band of light along the floor
      ctx.beginPath();
      ctx.moveTo(left.x, 0);
      ctx.lineTo(right.x, 0);
      ctx.globalAlpha = alpha * hot * 0.25;
      ctx.lineWidth = FLOOR_H * BLUR_BAND * hot;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.stroke();
      ctx.globalAlpha = alpha * hot * 0.55;
      ctx.lineWidth = lerp(BLUR_W[0], BLUR_W[1], hot);
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
    }
    if (ms > TEXT_MS && ms < openAt) {
      ctx.beginPath();
      for (let i = 0; i < state.warps.length; i++) {
        const warp = state.warps[i];
        if (ms < warp.startMs) continue;
        const b = warp.at(ms, to);
        const a = warp.at(ms - STREAK_MS, from);
        if (!a || !b || b.x <= a.x) continue;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.globalAlpha = alpha * (0.4 + 0.5 * heat);
      ctx.lineWidth = WISP * STREAK_W * (1 + heat);
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
    }
    for (let k = 0; k < crosses.length; k++) {
      const u = (ms - crosses[k]) / CROSS_MS;
      if (u < 0 || u >= 1) continue;
      ctx.globalAlpha = alpha * (1 - u);
      drawGlow(
        ctx,
        WHITE,
        0,
        0,
        CROSS_GLOW * (0.6 + (0.7 * k) / crosses.length) * (0.8 + 0.5 * u),
      );
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    for (let i = 0; i < state.runners.length; i++) {
      const warp = state.warps[i];
      drawWispBetween(
        ctx,
        state.runners[i],
        ms,
        now,
        WISP,
        heat,
        warp.startMs,
        warp.endMs,
      );
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < state.lands.length; i++) {
      const u = (ms - state.lands[i]) / LAND_MS;
      if (u < 0 || u >= 1) continue;
      ctx.globalAlpha = alpha * (1 - u);
      const spot = state.spots[i];
      drawGlow(ctx, GOLD, spot.x, spot.y, LAND_GLOW * (1 + u));
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, state.button, ms - state.firstLand, BUTTON_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS + (JOIN.length - 1) * OUT_STEP_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
