// Whirligig, a button crit: a small gold funnel touches down just left of its
// own button, ripping its sparkle up into its spin; growing taller and
// spinning faster it zips up past the top button, then tears down the whole
// column past every button (each a flash and a jolt, quicker each), catching
// their glitter, and back up to its own; there it whips round in a tight
// loop, swelling and trembling with a rising rumble, and bursts, flinging
// everything out onto every button at once, each landing in a flash and
// turning over, its own in the big blast: each of their next taps also
// levels the next floor round the building in turn
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { snapshotMap } from "../../../../shared/snapshotState";
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

const TAU = Math.PI * 2;
const IN_MS = 120;
// the foot GAP px left of the buttons' left ends: from its own button up to
// LEAD px over the top one, down to LEAD px under the bottom one and back up
// to its own over RUN_MS, accelerating
const GAP = 205;
const LEAD = 60;
const RUN_MS = 1000;
// the funnel, small at first, swelling to WHIP_* as it whips round its own
// button in WHIP_LAPS loops WHIP_R px across over WHIP_MS (its rumble rising
// from CHARGE_LEAD_MS before), trembling TREMBLE px
const HEIGHT = 240;
const WHIP_HEIGHT = 520;
const FOOT = 18;
const TOP = 70;
const WHIP_TOP = 170;
const SWAY = 22;
const GROW_MS = 700;
const SPIN_HZ: [number, number] = [1.2, 7];
const WHIP_MS = 320;
const WHIP_LAPS = 2;
const WHIP_R = 46;
const CHARGE_LEAD_MS = 200;
const TREMBLE = 12;
// CATCH specks ripped off each button as it's passed, OWN_CATCH off its own
// at touchdown; off its end over TEAR_MS, TEAR_STAGGER_MS apart
const CATCH = 16;
const OWN_CATCH = 28;
const TEAR_MS = 90;
const TEAR_STAGGER_MS = 3;
const SPECK = 18;
// the fling onto every button at once, FLING_MS in; the funnel blown apart
// over COLLAPSE_MS from the climax
const FLING_MS = 190;
const COLLAPSE_MS = 200;
// cheap flashes: a button passed, landed on, FLASH_MS long
const PASS_FLASH = 70;
const LAND_FLASH = 120;
const FLASH_MS = 220;
// the burst at its foot as it flings, and the blast on its own
const WHIP_BLAST = 260;
const OWN_BLAST = 420;
// shakes by step: a button passed, a button landed on, its own
const SHAKES = [0.6, 1.2, 3];
const FLASH_GOLD = fadeStops(COLOR.heavenlyGold);
const FLASH_CORE = fadeStops(COLOR.white, 0.3);

interface State {
  bars: Point[];
  tornado: Tornado;
  charge: Charge;
  runEnd: number;
  climaxMs: number;
  // the topmost and bottommost buttons, and the distance along the run to
  // the top turn, the bottom turn and the end
  top: number;
  bottom: number;
  along: Float32Array;
  length: number;
  // when the foot passes each button (bar order), the order they're passed
  // in, and how many have played
  passMs: Float32Array;
  passOrder: Int16Array;
  passed: number;
  swooshed: boolean;
  whooshed: boolean;
  // each bar's left end, live
  ends: Point[];
  // each speck: its button, where it starts off its button's end, when it's
  // torn off and caught, its seed, the button it's flung to and its spot there
  src: Int16Array;
  ox: Float32Array;
  oy: Float32Array;
  tearMs: Float32Array;
  caughtMs: Float32Array;
  seed: Float32Array;
  land: Int16Array;
  jy: Float32Array;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const home: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const feet: Point = { x: 0, y: 0 };

// how far round the building each button's spin taps have got
const spun = snapshotMap<Floor, number>();

// each tap also levelling the next floor round the building that can take
// it, one further each tap, wrapping from the top back to the bottom
const spinTaps = defineTapPerk("Spin", (t, left) => {
  const n = t.floors.length;
  const k = t.floors.indexOf(t.floor);
  let step = spun.get(t.floor) ?? 0;
  for (let tries = 1; tries < n; tries++) {
    step = (step % (n - 1)) + 1;
    const floor = t.floors[(k + step) % n];
    if (floor.unlocked && !isFloorMaxed(floor)) {
      t.levelUp(floor, 1, "+1 Lvl");
      break;
    }
  }
  if (left > 0) spun.set(t.floor, step);
  else spun.delete(t.floor);
});

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

// the foot's y (live) s px along the run: own, over the top, under the
// bottom, own again
function runY(state: State, s: number): number {
  const { bars, along } = state;
  const own = bars[0].y;
  const hi = bars[state.top].y - LEAD;
  const lo = bars[state.bottom].y + LEAD;
  if (s <= along[0]) return lerp(own, hi, s / (along[0] || 1));
  if (s <= along[1])
    return lerp(hi, lo, (s - along[0]) / (along[1] - along[0] || 1));
  return lerp(lo, own, clamp01((s - along[1]) / (along[2] - along[1] || 1)));
}

registerFloorCrit("whirligigCrit", {
  reward(t) {
    spinTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = byHeight(bars);
    const n = order.length;
    const top = order[0];
    const bottom = order[n - 1];
    const hi = bars[top].y - LEAD;
    const lo = bars[bottom].y + LEAD;
    const along = new Float32Array(3);
    along[0] = Math.abs(bars[0].y - hi);
    along[1] = along[0] + (lo - hi);
    along[2] = along[1] + Math.abs(bars[0].y - lo);
    const length = along[2] || 1;
    const runEnd = IN_MS + RUN_MS;
    const climaxMs = runEnd + WHIP_MS;
    // passed on the way down, top to bottom
    const passMs = new Float32Array(bars.length);
    for (let k = 0; k < n; k++) {
      const b = order[k];
      const s = along[0] + (bars[b].y - hi);
      passMs[b] = IN_MS + RUN_MS * quickenAt(s / length);
      hit(b, passMs[b], 0);
    }
    // all landed on at once
    const landMs = climaxMs + FLING_MS;
    for (let b = 0; b < n; b++) hit(b, landMs, b === 0 ? 2 : 1);
    // the specks: its own at touchdown, then each button's as it's passed
    const src: number[] = [];
    const ox: number[] = [];
    const oy: number[] = [];
    const tearMs: number[] = [];
    const caughtMs: number[] = [];
    const push = (b: number, tear: number) => {
      const m = src.length;
      src.push(b);
      ox.push(holeHash(m, 4612) * 40);
      oy.push((holeHash(m, 4613) * 2 - 1) * BTN_H * 0.4);
      tearMs.push(tear);
      caughtMs.push(tear + TEAR_MS);
    };
    for (let i = 0; i < OWN_CATCH; i++) push(0, IN_MS + i * TEAR_STAGGER_MS);
    for (let k = 0; k < n; k++)
      for (let i = 0; i < CATCH; i++)
        push(order[k], passMs[order[k]] - TEAR_MS * 0.5 + i * TEAR_STAGGER_MS);
    const total = src.length;
    const seed = new Float32Array(total);
    const land = new Int16Array(total);
    const jy = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      seed[i] = holeHash(i, 4614);
      // its own button takes a double share
      land[i] = (i % (n + 1)) % n;
      jy[i] = (holeHash(i, 4615) * 2 - 1) * BTN_H * 0.35;
    }
    const ends: Point[] = [];
    for (let b = 0; b < bars.length; b++) ends.push({ x: 0, y: 0 });
    const foot = (ms: number, into: Point): Point => {
      const u = clamp01((ms - IN_MS) / RUN_MS);
      into.x = state.bars[0].x - BTN_W / 2 - GAP;
      into.y = runY(state, state.length * quicken(u));
      // whipping round in tight loops beside its own button, ever faster
      const w = clamp01((ms - state.runEnd) / WHIP_MS);
      if (w > 0) {
        const a = WHIP_LAPS * TAU * w * w;
        into.x -= WHIP_R * (1 - Math.cos(a));
        into.y += WHIP_R * 0.5 * Math.sin(a);
      }
      trembleAt(chargeAt(state.charge, ms), ms, TREMBLE, shiver);
      into.x += shiver.x;
      into.y += shiver.y;
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
      runEnd,
      climaxMs,
      top,
      bottom,
      along,
      length,
      passMs,
      passOrder: Int16Array.from(order),
      passed: 0,
      swooshed: false,
      whooshed: false,
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
    const { tornado, charge, climaxMs, ends, passMs } = state;
    const n = Math.min(bars.length, ends.length);
    for (let b = 0; b < n; b++) {
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
    const { passOrder } = state;
    while (
      state.passed < passOrder.length &&
      ms >= passMs[passOrder[state.passed]]
    )
      playSpinTick(1 + 0.15 * state.passed++);
    tickCharge(charge, ms, r.shake);
    // swelling as it whips round
    const c = chargeAt(charge, Math.min(ms, climaxMs));
    const grown = clamp01((ms - IN_MS) / RUN_MS);
    tornado.top = lerp(lerp(TOP, TOP * 1.4, grown), WHIP_TOP, c);
    tornado.height = lerp(lerp(HEIGHT, HEIGHT * 1.5, grown), WHIP_HEIGHT, c);
    tornado.at(ms, feet);
    const collapse = clamp01((ms - climaxMs) / COLLAPSE_MS);
    if (collapse < 1) drawTornado(ctx, tornado, ms, 1 - collapse);
    const { src, ox, oy, tearMs, caughtMs, seed, land, jy } = state;
    const previous = ctx.globalCompositeOperation;
    const base = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    if (ms < climaxMs + FLING_MS)
      for (let i = 0; i < src.length; i++) {
        const tear = tearMs[i];
        if (ms < tear) continue;
        const caught = caughtMs[i];
        if (ms >= climaxMs) {
          const end = ends[land[i]];
          home.x = end.x + 8;
          home.y = end.y + jy[i];
          flingFrom(
            tornado,
            climaxMs,
            caught,
            seed[i],
            home,
            (ms - climaxMs) / FLING_MS,
            spot,
          );
        } else if (ms >= caught) {
          liftAt(tornado, ms, caught, seed[i], spot);
        } else {
          // ripped off its button's end into the foot
          const b = src[i];
          from.x = ends[b].x + ox[i];
          from.y = ends[b].y + oy[i];
          liftAt(tornado, ms, caught, seed[i], spot);
          const u = ((ms - tear) / (caught - tear)) ** 2;
          spot.x = lerp(from.x, spot.x, u);
          spot.y = lerp(from.y, spot.y, u);
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
    // cheap flashes: its own at touchdown, each button as it's passed, and
    // every other one as it's landed on (its own gets the blast)
    flash(ctx, ends[0], ms - IN_MS, LAND_FLASH, base);
    const landed = ms - climaxMs - FLING_MS;
    for (let b = 0; b < n; b++) {
      flash(ctx, ends[b], ms - passMs[b], PASS_FLASH, base);
      if (b !== 0) flash(ctx, ends[b], landed, LAND_FLASH, base);
    }
    ctx.globalAlpha = base;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the burst at its foot as it flings, then its own blast
    drawDetonation(ctx, feet, ms - climaxMs, WHIP_BLAST, now);
    drawDetonation(ctx, ends[0], landed, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
