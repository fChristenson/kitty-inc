// Revolving Door, a lock crit: twin rings open side by side right on the dark
// locked floor's lock, close together; the number dives into the left one and
// bursts out of the right one at once as a wisp, swings round in a tight loop
// and dives back into the left, again and again like a revolving door
// spinning up, each loop quicker and tighter, the rings flaring and growing,
// more wisps bursting out to join (over and under), every loop jolting the
// lock; at top spin the loop flings them all into the lock, bursting it open,
// and they stream into the new floor's button: free taps land on the crit's
// own floor's button
import meta from "./meta";
import { addFreeTaps } from "../../../buttonCrits/buttonBonus";
import { critTarget } from "../../../critKit/target";
import { isFloorMaxed } from "../../../../gameState";
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
import { playSpinTick, playSwoosh } from "../../../../sound";
import { FLOOR_H } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing into the left ring over TEXT_MS
const TEXT_MS = 150;
const ARC_RISE = 120;
// the rings GAP either side of the lock, from RING to RING_HOT of a floor
// high, flaring FLARE at each pass; opening OPEN_MS before the number lands,
// closing CLOSE_MS after the lock bursts
const GAP = 0.2 * FLOOR_H;
const RING = 0.24;
const RING_HOT = 0.36;
const FLARE = 0.3;
const FLARE_MS = 130;
const OPEN_MS = 120;
const CLOSE_MS = 130;
const HOT_ALPHA = 0.7;
const HOT_GLOW = 1.3;
// the loops, right ring round to left, each quicker and tighter (ARC of a
// floor high, over or under the lock); wisp i bursting out to join on loop i,
// spread PHASE of a loop round it, closing up to none by the last
const LOOPS_MS = [280, 220, 175, 140, 112, 92, 78];
const ARC: [number, number] = [0.56, 0.28];
const WISPS = 6;
const PHASE = [0.6, 0.55, 0.45, 0.35, 0.25, 0.15, 0.06];
// the streak behind each wisp, STREAK_MS of its run, cut across a pass
const STREAK_MS = 35;
const STREAK_W = 0.35;
const STREAK_MAX = 0.4 * FLOOR_H;
// the spin blurring into one loop of light round the lock once it's hot
const BLUR_W: [number, number] = [3, 12];
const BLUR_BAND = 0.12;
// each loop the lock knocked aside JOLT px and washed white
const JOLT: [number, number] = [14, 34];
const JOLT_MS = 130;
// the fling: out of the right ring, whipped round into the lock over FLING_MS
const FLING_MS = 130;
const FLING_ARC: [number, number] = [0.15, 0.32];
// a HOLD_MS breath, then out onto the button OUT_STEP_MS apart over OUT_MS,
// bowed BOW px, SPREAD px either side of it
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
// shakes by step: a loop past the lock, it bursting, onto the new button
const SHAKES = [0.9, 3.4, 1.3];
const WHINE = 0.15;

const LEFT_LOOK = portalLook(1);
const RIGHT_LOOK = portalLook(4);
const WHITE = fadeStops(COLOR.white, 0.2);
const GOLD = fadeStops(COLOR.heavenlyGold);
const ORIGIN: Point = { x: 0, y: 0 };
const LEFT: Point = { x: -GAP, y: 0 };
const RIGHT: Point = { x: GAP, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };

interface State {
  button: Point;
  spots: Point[];
  warps: Warp[];
  runners: ((ms: number) => Point | null)[];
  // when each loop starts (the lead's), and every pass through the rings
  loopAt: number[];
  passes: number[];
  // the lead diving in each loop: a jolt, a tick
  jolts: number[];
  sounds: number[];
  lastLoop: number;
  openAt: number;
  lands: number[];
  firstLand: number;
  barsBack: boolean;
}
const states = new WeakMap<Running, State>();

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

registerFloorCrit("revolvingDoorCrit", {
  // free taps on the crit's own floor's button, it turning over
  reward(t) {
    const own = t.ownFloor;
    if (!own.unlocked || isFloorMaxed(own)) return;
    addFreeTaps(own, meta.values.taps);
    critTarget({
      floor: own,
      ownFloor: own,
      floors: t.floors,
      step: t.step,
      tier: t.tier,
      count: t.count,
      color: t.color,
      price: t.price,
      index: t.index,
    }).flipButton();
  },
  plan(r, _bars, hit) {
    const lockAt = getLockCenter();
    const btn = getButtonCenter(false);
    const button = { x: btn.x - lockAt.x, y: btn.y - lockAt.y };
    const loops = LOOPS_MS.length;
    const loopAt: number[] = [TEXT_MS];
    for (let k = 0; k < loops; k++) loopAt.push(loopAt[k] + LOOPS_MS[k]);
    const lastLoop = loopAt[loops];
    const openAt = lastLoop + FLING_MS;
    // wisp i's lag behind the lead on loop k
    const lag = (i: number, k: number) =>
      k >= loops ? 0 : (PHASE[k] * LOOPS_MS[k] * i) / WISPS;
    const passes: number[] = [TEXT_MS];
    const jolts: number[] = [];
    const sounds: number[] = [TEXT_MS];
    const spots: Point[] = [];
    const warps: Warp[] = [];
    const runners: ((ms: number) => Point | null)[] = [];
    const lands: number[] = [];
    for (let i = 0; i < WISPS; i++) {
      // over the lock or under it, by turns
      const side = i % 2 ? 1 : -1;
      const legs: WarpLeg[] = [];
      if (i > 0) passes.push(loopAt[i] + lag(i, i));
      for (let k = i; k < loops; k++) {
        const startMs = loopAt[k] + lag(i, k);
        const endMs = loopAt[k + 1] + lag(i, k + 1);
        const arc = side * lerp(ARC[0], ARC[1], k / (loops - 1)) * FLOOR_H;
        legs.push({ from: RIGHT, to: LEFT, startMs, endMs, arc });
        passes.push(endMs);
        if (i === 0) {
          jolts.push(endMs);
          sounds.push(endMs);
        }
      }
      const fling =
        side * lerp(FLING_ARC[0], FLING_ARC[1], i / (WISPS - 1)) * FLOOR_H;
      legs.push({
        from: RIGHT,
        to: ORIGIN,
        startMs: lastLoop,
        endMs: openAt,
        arc: fling,
      });
      const back = openAt + HOLD_MS + i * OUT_STEP_MS;
      const spot = {
        x: button.x + lerp(-SPREAD, SPREAD, i / (WISPS - 1)),
        y: button.y,
      };
      legs.push({ from: ORIGIN, to: ORIGIN, startMs: openAt, endMs: back });
      legs.push({
        from: ORIGIN,
        to: spot,
        startMs: back,
        endMs: back + OUT_MS,
        arc: side * BOW,
      });
      spots.push(spot);
      lands.push(back + OUT_MS);
      const warp = planWarp(legs);
      const pos: Point = { x: 0, y: 0 };
      warps.push(warp);
      runners.push((ms) => warp.at(ms, pos));
    }
    r.play.hideBars?.([0]);
    for (let k = 0; k < jolts.length; k++) hit(0, jolts[k], 0);
    hit(0, openAt, 1);
    const firstLand = lands[0];
    hit(0, firstLand, 2);
    states.set(r, {
      button,
      spots,
      warps,
      runners,
      loopAt,
      passes,
      jolts,
      sounds,
      lastLoop,
      openAt,
      lands,
      firstLand,
      barsBack: false,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { passes, jolts, openAt, lastLoop, loopAt } = state;
    if (ms < TEXT_MS) {
      const u = ms / TEXT_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + LEFT.x) * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    // a swoosh as it dives in, then a whine rising every loop
    while (r.kicked < state.sounds.length && ms >= state.sounds[r.kicked]) {
      if (r.kicked === 0) playSwoosh();
      else playSpinTick(1 + WHINE * r.kicked);
      r.kicked++;
    }
    if (ms >= openAt && !state.barsBack) {
      state.barsBack = true;
      r.play.hideBars?.(null);
    }
    const heat = clamp01((ms - TEXT_MS) / (lastLoop - TEXT_MS));
    const hot = heat * heat;
    ctx.save();
    ctx.translate(lock.x, lock.y);
    if (ms < openAt) {
      // the lock shoved round by each loop, washed white
      let jolt = 0;
      let wash = 0.3 * hot;
      for (let k = 0; k < jolts.length; k++) {
        const age = ms - jolts[k];
        if (age < 0 || age >= JOLT_MS) continue;
        const f = (1 - age / JOLT_MS) ** 2;
        jolt += lerp(JOLT[0], JOLT[1], k / (jolts.length - 1)) * f;
        if (f > wash) wash = f;
      }
      ctx.save();
      ctx.translate(-jolt, 0);
      r.play.drawBar?.(ctx, 0, wash);
      ctx.restore();
    }
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
    drawRing(ctx, LEFT, size, open, now, LEFT_LOOK, hot, passes, ms);
    drawRing(ctx, RIGHT, size, open, now, RIGHT_LOOK, hot, passes, ms);
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    if (ms > TEXT_MS && ms < lastLoop && hot > 0) {
      // the spin blurring into one loop of light, tightening with it
      let k = 0;
      while (k < LOOPS_MS.length - 1 && ms >= loopAt[k + 1]) k++;
      const reach = lerp(ARC[0], ARC[1], k / (LOOPS_MS.length - 1)) * FLOOR_H;
      ctx.beginPath();
      ctx.ellipse(0, 0, GAP, reach, 0, 0, Math.PI * 2);
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
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx * dx + dy * dy > STREAK_MAX * STREAK_MAX) continue;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.globalAlpha = alpha * (0.4 + 0.5 * heat);
      ctx.lineWidth = WISP * STREAK_W * (1 + heat);
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
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
  tailMs: DETONATION_MS + (WISPS - 1) * OUT_STEP_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
