// Upswirl, a button crit: the number bursts into glitter that's sucked down
// to where a tornado touches down under the bottom button; its foot climbs
// the column just left of the buttons, swelling and spinning up, ripping the
// glitter off each button it passes (a flash and a jolt, quicker each) and
// spinning it up the funnel; at the top it's huge, whipping round flat out
// and trembling with a rising rumble until it bursts, then leans over and
// flings everything back down onto the buttons top to bottom, each landing
// in a flash and turning over: each of their next taps also levels the open
// floor with the fewest workers; its own last, in the big blast
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawTornado,
  flingFrom,
  liftAt,
  planTornado,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import {
  chargeAt,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { quicken, quickenAt } from "../../../../shared/easing";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  byHeight,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the number's glitter: BURST specks strewn BURST_OUT px, sucked into the
// foot over SUCK_MS
const BURST = 24;
const BURST_OUT = 220;
const SUCK_MS = 150;
// the foot GAP px left of the buttons' left ends, from LEAD_IN px under the
// bottom one to LEAD_OUT px over the top one over RUN_MS, accelerating
const GAP = 215;
const LEAD_IN = 70;
const LEAD_OUT = 50;
const RUN_MS = 900;
// the funnel, swelling to WHIP_* as it whips round at the top for WHIP_MS
// (its rumble rising from CHARGE_LEAD_MS before it), trembling TREMBLE px
const HEIGHT = 380;
const WHIP_HEIGHT = 560;
const FOOT = 24;
const TOP = 100;
const WHIP_TOP = 180;
const SWAY = 28;
const GROW_MS = 500;
const SPIN_HZ: [number, number] = [0.9, 5.5];
const WHIP_MS = 300;
const CHARGE_LEAD_MS = 240;
const TREMBLE = 14;
// then it leans over the column by LEAN px per px up, over LEAN_MS
const LEAN = 0.4;
const LEAN_MS = 110;
// CATCH specks ripped off each button (its own OWN_CATCH), off its end over
// TEAR_MS, TEAR_STAGGER_MS apart
const CATCH = 16;
const OWN_CATCH = 28;
const TEAR_MS = 90;
const TEAR_STAGGER_MS = 3;
const SPECK = 18;
// the fling: each button RIPPLE_MS after the last, every speck FLING_MS in;
// the funnel gone COLLAPSE_MS after the last fling
const RIPPLE_MS = 45;
const FLING_MS = 180;
const COLLAPSE_MS = 220;
// cheap flashes on the others: a pass, a landing, FLASH_MS long
const PASS_FLASH = 55;
const LAND_FLASH = 100;
const FLASH_MS = 220;
// the burst at the top as it whips flat out, and the blast on its own
const WHIP_BLAST = 220;
const OWN_BLAST = 380;
// shakes by step: a button passed, a button landed on, its own
const SHAKES = [0.6, 1.2, 3];
const FLASH_GOLD = fadeStops(COLOR.heavenlyGold);
const FLASH_CORE = fadeStops(COLOR.white, 0.3);

interface State {
  bars: Point[];
  tornado: Tornado;
  charge: Charge;
  climaxMs: number;
  collapseMs: number;
  // the foot's path: the buttons bottom to top, and the distance along it to
  // each point (LEAD_IN under the bottom, each button, LEAD_OUT over the top)
  path: Int16Array;
  // when the foot passes each button (path order), and how many have played
  passMs: Float32Array;
  passed: number;
  swooshed: boolean;
  whooshed: boolean;
  // the buttons landed on top to bottom, its own last, when each is flung
  // at; each bar's left end, live
  lands: Int16Array;
  flingMs: Float32Array;
  ends: Point[];
  // each speck: its button (-1 the number's), where it starts from its
  // button's end (or the flash), when it's torn off and caught, its seed,
  // the landing it's flung to and its spot there
  src: Int16Array;
  ox: Float32Array;
  oy: Float32Array;
  tearMs: Float32Array;
  caughtMs: Float32Array;
  seed: Float32Array;
  land: Uint8Array;
  jy: Float32Array;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };
const pa: Point = { x: 0, y: 0 };
const pb: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const feet: Point = { x: 0, y: 0 };
const crown: Point = { x: 0, y: 0 };

// each tap also levelling the open floor with the fewest workers
const swirlTaps = defineTapPerk("Swirl", (t) => {
  let fewest: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!fewest || floor.workerCount < fewest.workerCount)
    )
      fewest = floor;
  if (fewest) t.levelUp(fewest, 1, "+1 Lvl");
});

// path point k of the foot (live): LEAD_IN under the bottom button, each
// button, LEAD_OUT over the top one
function pathPoint(state: State, k: number, into: Point): Point {
  const { path } = state;
  const n = path.length;
  const bar = state.bars[path[Math.min(n - 1, Math.max(0, k - 1))]];
  into.x = bar.x - BTN_W / 2 - GAP;
  into.y = bar.y + (k === 0 ? LEAD_IN : k > n ? -LEAD_OUT : 0);
  return into;
}

// a quick flash on a button's end: a gold bloom with a white core
function flash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  size: number,
  base: number,
): void {
  if (ms < 0 || ms >= FLASH_MS) return;
  const u = ms / FLASH_MS;
  ctx.globalAlpha = base * (1 - u);
  drawGlow(ctx, FLASH_GOLD, at.x, at.y, size * (0.6 + 0.8 * u));
  drawGlow(ctx, FLASH_CORE, at.x, at.y, size * 0.5 * (1 - u));
}

// how far the funnel leans over at ms, per px up
const leanAt = (state: State, ms: number): number =>
  LEAN * (1 - (1 - clamp01((ms - state.climaxMs) / LEAN_MS)) ** 3);

registerFloorCrit("upswirlCrit", {
  reward(t) {
    swirlTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const n = order.length;
    // bottom to top
    order.reverse();
    const path = Int16Array.from(order);
    // the distances along the path, from the bars as planned
    const along = new Float32Array(n + 2);
    const ys: number[] = [bars[order[0]].y + LEAD_IN];
    for (const bar of order) ys.push(bars[bar].y);
    ys.push(bars[order[n - 1]].y - LEAD_OUT);
    for (let k = 1; k < ys.length; k++)
      along[k] = along[k - 1] + Math.abs(ys[k] - ys[k - 1]);
    const length = along[n + 1] || 1;
    const runEnd = IN_MS + RUN_MS;
    const climaxMs = runEnd + WHIP_MS;
    const passMs = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      passMs[k] = IN_MS + RUN_MS * quickenAt(along[k + 1] / length);
      hit(order[k], passMs[k], 0);
    }
    // the landings: top to bottom, its own last
    const lands = new Int16Array(n);
    let j = 0;
    for (let k = n - 1; k >= 0; k--) if (order[k] !== 0) lands[j++] = order[k];
    lands[n - 1] = 0;
    const flingMs = new Float32Array(n);
    const flingStart = climaxMs + LEAN_MS;
    for (let m = 0; m < n; m++) {
      flingMs[m] = flingStart + m * RIPPLE_MS;
      hit(lands[m], flingMs[m] + FLING_MS, lands[m] === 0 ? 2 : 1);
    }
    // the specks: the number's, then each button's
    const src: number[] = [];
    const ox: number[] = [];
    const oy: number[] = [];
    const tearMs: number[] = [];
    const caughtMs: number[] = [];
    for (let i = 0; i < BURST; i++) {
      const a = (i / BURST) * Math.PI * 2 + holeHash(i, 4510);
      const d = BURST_OUT * (0.4 + 0.6 * holeHash(i, 4511));
      src.push(-1);
      ox.push(Math.cos(a) * d);
      oy.push(Math.sin(a) * d * 0.7);
      tearMs.push(IN_MS + i * TEAR_STAGGER_MS);
      caughtMs.push(IN_MS + i * TEAR_STAGGER_MS + SUCK_MS);
    }
    for (let k = 0; k < n; k++) {
      const count = order[k] === 0 ? OWN_CATCH : CATCH;
      for (let i = 0; i < count; i++) {
        const m = src.length;
        const tear = passMs[k] - TEAR_MS * 0.5 + i * TEAR_STAGGER_MS;
        src.push(order[k]);
        ox.push(holeHash(m, 4512) * 40);
        oy.push((holeHash(m, 4513) * 2 - 1) * BTN_H * 0.4);
        tearMs.push(tear);
        caughtMs.push(tear + TEAR_MS);
      }
    }
    const total = src.length;
    const seed = new Float32Array(total);
    const land = new Uint8Array(total);
    const jy = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      seed[i] = holeHash(i, 4514);
      // its own button takes a double share
      land[i] = Math.min(n - 1, i % (n + 1));
      jy[i] = (holeHash(i, 4515) * 2 - 1) * BTN_H * 0.35;
    }
    const ends: Point[] = [];
    for (let b = 0; b < bars.length; b++) ends.push({ x: 0, y: 0 });
    const foot = (ms: number, into: Point): Point => {
      const s = length * quicken(clamp01((ms - IN_MS) / RUN_MS));
      let k = 0;
      while (k < n && along[k + 1] < s) k++;
      pathPoint(state, k, pa);
      pathPoint(state, k + 1, pb);
      const f = clamp01((s - along[k]) / (along[k + 1] - along[k] || 1));
      trembleAt(chargeAt(state.charge, ms), ms, TREMBLE, shiver);
      into.x = lerp(pa.x, pb.x, f) + shiver.x;
      into.y = lerp(pa.y, pb.y, f) + shiver.y;
      return into;
    };
    const state: State = {
      bars,
      tornado: planTornado(foot, {
        startMs: IN_MS,
        endMs: climaxMs,
        height: HEIGHT,
        foot: FOOT,
        top: TOP,
        spinHz: SPIN_HZ,
        sway: SWAY,
        growMs: GROW_MS,
      }),
      charge: planCharge(runEnd - CHARGE_LEAD_MS, CHARGE_LEAD_MS + WHIP_MS, {
        climaxShake: 1.6,
        bang: false,
      }),
      climaxMs,
      collapseMs: flingMs[n - 1],
      path,
      passMs,
      passed: 0,
      swooshed: false,
      whooshed: false,
      lands,
      flingMs,
      ends,
      src: Int16Array.from(src),
      ox: Float32Array.from(ox),
      oy: Float32Array.from(oy),
      tearMs: Float32Array.from(tearMs),
      caughtMs: Float32Array.from(caughtMs),
      seed,
      land,
      jy,
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { tornado, charge, climaxMs, ends, lands, flingMs } = state;
    for (let b = 0; b < bars.length && b < ends.length; b++) {
      ends[b].x = bars[b].x - BTN_W / 2;
      ends[b].y = bars[b].y;
    }
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.5 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    if (!state.swooshed && ms >= IN_MS) {
      state.swooshed = true;
      playSwoosh();
    }
    if (!state.whooshed && ms >= climaxMs) {
      state.whooshed = true;
      playSwoosh();
    }
    while (
      state.passed < state.passMs.length &&
      ms >= state.passMs[state.passed]
    )
      playSpinTick(1 + 0.15 * state.passed++);
    tickCharge(charge, ms, r.shake);
    // swelling as it whips round at the top
    const c = chargeAt(charge, Math.min(ms, climaxMs));
    tornado.top = lerp(TOP, WHIP_TOP, c);
    tornado.height = lerp(HEIGHT, WHIP_HEIGHT, c);
    tornado.at(ms, feet);
    const fy = feet.y;
    const lean = ms > climaxMs ? leanAt(state, ms) : 0;
    const collapse = clamp01((ms - state.collapseMs) / COLLAPSE_MS);
    if (collapse < 1) {
      if (lean > 0) {
        // leaning over: everything above its foot slides right by lean per px up
        ctx.save();
        ctx.transform(1, 0, -lean, 1, lean * fy, 0);
        drawTornado(ctx, tornado, ms, 1 - collapse);
        ctx.restore();
      } else drawTornado(ctx, tornado, ms, 1 - collapse);
    }
    const { src, ox, oy, tearMs, caughtMs, seed, land, jy } = state;
    const burst = 1 - (1 - clamp01(ms / IN_MS)) ** 2;
    const previous = ctx.globalCompositeOperation;
    const base = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < src.length; i++) {
      const b = src[i];
      const tear = tearMs[i];
      if (b >= 0 && ms < tear) continue;
      const m = land[i];
      const fling = flingMs[m];
      if (ms >= fling + FLING_MS) continue;
      const caught = caughtMs[i];
      if (ms >= fling) {
        const end = ends[lands[m]];
        home.x = end.x + 8;
        home.y = end.y + jy[i];
        const u = (ms - fling) / FLING_MS;
        flingFrom(tornado, fling, caught, seed[i], home, u, spot);
        spot.x += lean * (fy - spot.y) * (1 - u);
      } else if (ms >= caught) {
        liftAt(tornado, ms, caught, seed[i], spot);
        spot.x += lean * (fy - spot.y);
      } else {
        // strewn by the number's burst, or ripped off its button's end
        if (b < 0) {
          from.x = ox[i] * burst;
          from.y = oy[i] * burst;
        } else {
          from.x = ends[b].x + ox[i];
          from.y = ends[b].y + oy[i];
        }
        if (ms < tear) {
          spot.x = from.x;
          spot.y = from.y;
        } else {
          liftAt(tornado, ms, caught, seed[i], spot);
          const u = ((ms - tear) / (caught - tear)) ** 2;
          spot.x = lerp(from.x, spot.x, u);
          spot.y = lerp(from.y, spot.y, u);
        }
      }
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    // cheap flashes: each button as it's passed, and landed on (its own gets
    // the blast)
    const { path, passMs } = state;
    for (let k = 0; k < path.length; k++)
      flash(ctx, ends[path[k]], ms - passMs[k], PASS_FLASH, base);
    for (let m = 0; m < lands.length; m++)
      if (lands[m] !== 0)
        flash(
          ctx,
          ends[lands[m]],
          ms - flingMs[m] - FLING_MS,
          LAND_FLASH,
          base,
        );
    ctx.globalAlpha = base;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the burst at its crown as it whips flat out, then its own blast
    const sinceWhip = ms - climaxMs;
    if (sinceWhip >= 0 && sinceWhip < DETONATION_MS) {
      crown.x = feet.x;
      crown.y = fy - WHIP_HEIGHT * 0.8;
      drawDetonation(ctx, crown, sinceWhip, WHIP_BLAST, now);
    }
    drawDetonation(
      ctx,
      ends[0],
      ms - flingMs[lands.length - 1] - FLING_MS,
      OWN_BLAST,
      now,
    );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
