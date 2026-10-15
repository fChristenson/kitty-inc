// Funnel Cloud, a button crit: the number bursts into glitter that's sucked
// down to where a tornado touches down beside the top button; its foot
// tears down the column just left of the buttons, swelling and spinning up,
// ripping the glitter off each button it passes (a jolt, quicker each) and
// spinning it up the funnel; at the bottom it's huge, whipping round flat out
// and trembling with a rising rumble, then flings everything back onto the
// buttons top to bottom, each landing in a blast and turning over: each of
// their next taps also hires a worker on a random floor; its own last and
// biggest
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
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the number's glitter: BURST specks strewn BURST_OUT px, sucked into the
// foot over SUCK_MS
const BURST = 26;
const BURST_OUT = 240;
const SUCK_MS = 150;
// the foot GAP px left of the buttons' left ends, from LEAD_IN px over the
// top one to LEAD_OUT px under the bottom one over RUN_MS, accelerating
const GAP = 215;
const LEAD_IN = 90;
const LEAD_OUT = 40;
const RUN_MS = 950;
// the funnel, swelling to WHIP_* as it whips round at the bottom for WHIP_MS
// (its rumble rising from CHARGE_LEAD_MS before it), trembling TREMBLE px
const HEIGHT = 470;
const WHIP_HEIGHT = 580;
const FOOT = 26;
const TOP = 120;
const WHIP_TOP = 175;
const SWAY = 30;
const GROW_MS = 550;
const SPIN_HZ: [number, number] = [0.9, 5];
const WHIP_MS = 330;
const CHARGE_LEAD_MS = 220;
const TREMBLE = 14;
// CATCH specks ripped off each button (its own OWN_CATCH), off its end over
// TEAR_MS, TEAR_STAGGER_MS apart
const CATCH = 16;
const OWN_CATCH = 28;
const TEAR_MS = 90;
const TEAR_STAGGER_MS = 3;
const SPECK = 18;
// the fling: each button RIPPLE_MS after the last, every speck FLING_MS in;
// the funnel gone COLLAPSE_MS after the last fling
const RIPPLE_MS = 40;
const FLING_MS = 200;
const COLLAPSE_MS = 220;
const POP = 90;
const BLAST = 170;
const OWN_BLAST = 400;
// shakes by step: a button passed, a button landed on, its own
const SHAKES = [0.6, 1.1, 3];

interface State {
  bars: Point[];
  tornado: Tornado;
  charge: Charge;
  climaxMs: number;
  collapseMs: number;
  // the foot's path: the buttons top to bottom, and the distance along it to
  // each point (LEAD_IN over the top, each button, LEAD_OUT under the bottom)
  path: Int16Array;
  along: Float32Array;
  // when the foot passes each button (path order), and how many have played
  passMs: Float32Array;
  passed: number;
  swooshed: boolean;
  // the buttons landed on, its own last, when each is flung at; each bar's
  // left end, live
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

// each tap also hiring on a random open floor that can take more
const whirlTaps = defineTapPerk("Whirl", (t) => {
  let pick: Floor | null = null;
  let seen = 0;
  for (const floor of t.floors)
    if (floor.unlocked && !isFloorMaxed(floor) && Math.random() * ++seen < 1)
      pick = floor;
  if (pick) t.hire(pick);
});

// path point k of the foot (live): LEAD_IN over the top button, each button,
// LEAD_OUT under the bottom one
function pathPoint(state: State, k: number, into: Point): Point {
  const { path } = state;
  const n = path.length;
  const bar = state.bars[path[Math.min(n - 1, Math.max(0, k - 1))]];
  into.x = bar.x - BTN_W / 2 - GAP;
  into.y = bar.y + (k === 0 ? -LEAD_IN : k > n ? LEAD_OUT : 0);
  return into;
}

registerFloorCrit("funnelCloudCrit", {
  reward(t) {
    whirlTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const n = order.length;
    const path = Int16Array.from(order);
    // the distances along the path, from the bars as planned
    const along = new Float32Array(n + 2);
    const ys: number[] = [bars[order[0]].y - LEAD_IN];
    for (const bar of order) ys.push(bars[bar].y);
    ys.push(bars[order[n - 1]].y + LEAD_OUT);
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
    // the landings: top to bottom, its own last and biggest
    const lands = Int16Array.from(ownLast(bars));
    const flingMs = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      flingMs[j] = climaxMs + j * RIPPLE_MS;
      hit(lands[j], flingMs[j] + FLING_MS, lands[j] === 0 ? 2 : 1);
    }
    // the specks: the number's, then each button's
    const src: number[] = [];
    const ox: number[] = [];
    const oy: number[] = [];
    const tearMs: number[] = [];
    const caughtMs: number[] = [];
    for (let i = 0; i < BURST; i++) {
      const a = (i / BURST) * Math.PI * 2 + holeHash(i, 4410);
      const d = BURST_OUT * (0.4 + 0.6 * holeHash(i, 4411));
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
        ox.push(holeHash(m, 4412) * 40);
        oy.push((holeHash(m, 4413) * 2 - 1) * BTN_H * 0.4);
        tearMs.push(tear);
        caughtMs.push(tear + TEAR_MS);
      }
    }
    const total = src.length;
    const seed = new Float32Array(total);
    const land = new Uint8Array(total);
    const jy = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      seed[i] = holeHash(i, 4414);
      // its own button takes a double share
      land[i] = Math.min(n - 1, i % (n + 1));
      jy[i] = (holeHash(i, 4415) * 2 - 1) * BTN_H * 0.35;
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
        climaxShake: 1.4,
        bang: false,
      }),
      climaxMs,
      collapseMs: flingMs[n - 1],
      path,
      along,
      passMs,
      passed: 0,
      swooshed: false,
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
    while (
      state.passed < state.passMs.length &&
      ms >= state.passMs[state.passed]
    )
      playSpinTick(1 + 0.15 * state.passed++);
    tickCharge(charge, ms, r.shake);
    // swelling as it whips round at the bottom
    const c = chargeAt(charge, Math.min(ms, climaxMs));
    tornado.top = lerp(TOP, WHIP_TOP, c);
    tornado.height = lerp(HEIGHT, WHIP_HEIGHT, c);
    const collapse = clamp01((ms - state.collapseMs) / COLLAPSE_MS);
    if (collapse < 1) drawTornado(ctx, tornado, ms, 1 - collapse);
    const { src, ox, oy, tearMs, caughtMs, seed, land, jy } = state;
    const burst = 1 - (1 - clamp01(ms / IN_MS)) ** 2;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < src.length; i++) {
      const b = src[i];
      const tear = tearMs[i];
      if (b >= 0 && ms < tear) continue;
      const j = land[i];
      const fling = flingMs[j];
      if (ms >= fling + FLING_MS) continue;
      const caught = caughtMs[i];
      if (ms >= fling) {
        const end = ends[lands[j]];
        home.x = end.x + 8;
        home.y = end.y + jy[i];
        flingFrom(
          tornado,
          fling,
          caught,
          seed[i],
          home,
          (ms - fling) / FLING_MS,
          spot,
        );
      } else if (ms >= caught) {
        liftAt(tornado, ms, caught, seed[i], spot);
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
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    const { path, passMs } = state;
    for (let k = 0; k < path.length; k++)
      drawDetonation(ctx, ends[path[k]], ms - passMs[k], POP, now);
    for (let j = 0; j < lands.length; j++)
      drawDetonation(
        ctx,
        ends[lands[j]],
        ms - flingMs[j] - FLING_MS,
        lands[j] === 0 ? OWN_BLAST : BLAST,
        now,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
