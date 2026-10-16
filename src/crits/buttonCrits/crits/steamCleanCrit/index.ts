// Steam Clean, a button crit: the number bursts into a white-hot nozzle wisp
// that darts down the column, hissing jets of gold-tinged steam down each
// button's left edge in billowing puffs until the coat gleams and flashes
// (a squeaky sparkle and a jolt), passes quickening; at its own it hovers,
// trembling and pulling steam in with a rising rumble, then one huge blast of
// steam engulfs its edge as it flashes brightest: each of their next taps
// also hires a worker on the least upgraded open floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawSpray,
  drawSprayCoat,
  planSpray,
  type Spray,
} from "../../../../shared/animationStyles/spray";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  drawGlow,
  fadeStops,
  type FadeStops,
} from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { easeOut } from "../../../../shared/easing";
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

const TAU = Math.PI * 2;
const IN_MS = 120;
// the nozzle's flight onto its first button, and its hop between buttons
const FIRST_MS = 150;
const HOP_MS = 80;
const HOP_ARC = 40;
// each other button steamed this long, quickening, all of them squeezed into
// RUN_MS at most; its own steamed while it charges up
const PASS_MS: [number, number] = [300, 150];
const RUN_MS = 1000;
const OWN_MS = 380;
// the nozzle hovering up-left of a button's left edge, hissing HISS px; its
// jet sweeping SWEEP of the edge's half height, landing EDGE_IN px inside it
const NOZZLE_DX = 120;
const NOZZLE_DY = 50;
const HISS = 3;
const SWEEP = 0.85;
const EDGE_IN = 10;
const REACH = Math.hypot(NOZZLE_DX, NOZZLE_DY) + 20;
const SPREAD = 0.18;
const FLIGHT_MS = 160;
const DROPLET = 70;
// PUFFS slots of steam, each puff living PUFF_MS, swelling PUFF_R px
const PUFFS = 12;
const PUFF_MS = 240;
const PUFF_R: [number, number] = [12, 46];
// the gold coat over a button's left end
const COAT_DX = 24;
const COAT_W = 120;
const COAT_H = BTN_H * 1.3;
// a button gleaming as it's finished, its own GLEAM_OWN times as big
const GLEAM_MS = 260;
const GLEAM_GLOW = 70;
const GLEAM_STAR = 26;
const GLEAM_OWN = 2;
// the climax: BLAST puffs of steam flung out to BLAST_REACH over BLAST_MS,
// a white flash and the one big detonation on its own edge
const BLAST = 20;
const BLAST_MS = 420;
const BLAST_REACH = 150;
const BLAST_R: [number, number] = [30, 95];
const OWN_FLASH = 200;
const OWN_BLAST = 300;
const TREMBLE = 10;
// shakes by step: the number popping, a button gleaming, its own blasted
const SHAKES = [0.6, 1.1, 3];

const STEAM: FadeStops = [
  [0, "#fffaf0d0"],
  [0.5, "#fff3d466"],
  [1, "#fff3d400"],
];
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

interface Pass {
  bar: number;
  own: boolean;
  start: number;
  done: number;
  spray: Spray;
  // scratch, written live
  nozzle: Point;
  target: Point;
  edge: Point;
}

interface State {
  bars: Point[];
  passes: Pass[];
  charge: Charge;
  climaxMs: number;
  nozzle: (ms: number) => Point | null;
  hissed: number;
  gleamed: number;
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const hot: Point = { x: 0, y: 0 };
const coatAt: Point = { x: 0, y: 0 };

// each tap also hiring a worker on the least upgraded open floor
const steamTaps = defineTapPerk("Steam", (t) => {
  let least: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!least || floor.upgradeCount < least.upgradeCount)
    )
      least = floor;
  if (least) t.hire(least);
});

const barOf = (state: State, p: Pass): Point => state.bars[p.bar] ?? ORIGIN;

// where the nozzle hovers over pass p's button at ms, hissing
function nozzleOf(state: State, p: Pass, ms: number): Point {
  const b = barOf(state, p);
  p.nozzle.x = b.x - BTN_W / 2 - NOZZLE_DX + HISS * Math.sin(ms * 0.11);
  p.nozzle.y = b.y - NOZZLE_DY + HISS * Math.cos(ms * 0.13);
  return p.nozzle;
}

// where its jet lands on the edge at ms: swept down it once, or on its own
// whipped up and down, faster and faster
function targetOf(state: State, p: Pass, ms: number): Point {
  const b = barOf(state, p);
  const span = Math.max(1, p.done - p.start);
  const u = clamp01((ms - p.start) / span);
  const k = p.own
    ? Math.sin((ms - p.start) * 0.012 * (1 + 2.5 * u))
    : u * 2 - 1;
  p.target.x = b.x - BTN_W / 2 + EDGE_IN;
  p.target.y = b.y + k * (BTN_H / 2) * SWEEP;
  return p.target;
}

function aimOf(state: State, p: Pass, ms: number): number {
  const from = nozzleOf(state, p, ms);
  const fx = from.x;
  const fy = from.y;
  const to = targetOf(state, p, ms);
  return Math.atan2(to.y - fy, to.x - fx);
}

// pass p's steam: puffs shot from the nozzle onto the edge, billowing up and
// out as they fade; `boost` swells them
function drawPuffs(
  ctx: CanvasRenderingContext2D,
  state: State,
  p: Pass,
  ms: number,
  base: number,
  boost: number,
): void {
  if (ms < p.start || ms > p.done + PUFF_MS) return;
  for (let j = 0; j < PUFFS; j++) {
    const offset = (j / PUFFS) * PUFF_MS;
    const life = Math.floor((ms - p.start - offset) / PUFF_MS);
    const born = p.start + offset + life * PUFF_MS;
    if (born < p.start || born > p.done) continue;
    const t = (ms - born) / PUFF_MS;
    if (t < 0 || t >= 1) continue;
    const from = nozzleOf(state, p, born);
    const fx = from.x;
    const fy = from.y;
    const to = targetOf(state, p, born);
    const go = easeOut(Math.min(1, t * 1.8));
    const seed = j + life * PUFFS;
    const x = lerp(fx, to.x, go) + t * (hash01(seed, 31) * 2 - 1) * 30;
    const y = lerp(fy, to.y, go) + t * ((hash01(seed, 32) * 2 - 1) * 30 - 24);
    const r = Math.max(0, lerp(PUFF_R[0], PUFF_R[1], t) * boost);
    const fade = 1 - t;
    ctx.globalAlpha = base * fade * 0.8;
    drawGlow(ctx, STEAM, x, y, r);
    ctx.globalAlpha = base * fade * 0.55;
    drawGlow(ctx, GOLD, x, y, r * 0.5);
  }
}

// a button gleaming `since` ms after it's finished: a white flash on its
// edge and stars popping on it
function drawGleam(
  ctx: CanvasRenderingContext2D,
  edge: Point,
  since: number,
  scale: number,
  base: number,
  k: number,
): void {
  if (since < 0 || since >= GLEAM_MS) return;
  const u = since / GLEAM_MS;
  const pop = Math.sin(Math.PI * Math.min(1, u * 1.4));
  ctx.globalAlpha = base * (1 - u);
  drawGlow(ctx, WHITE, edge.x, edge.y, GLEAM_GLOW * scale * (0.6 + 0.6 * u));
  ctx.globalAlpha = base * Math.max(0, pop);
  for (let e = -1; e <= 1; e++)
    stampGlimmer(
      ctx,
      edge.x + (e === 0 ? 14 : 0),
      edge.y + e * BTN_H * 0.42 * (1 + 0.4 * u),
      Math.max(0, GLEAM_STAR * scale * (e === 0 ? 1.3 : 0.9) * pop),
      k + e + u * 3,
      e === 0 ? COLOR.white : COLOR.heavenlyGold,
    );
}

registerFloorCrit("steamCleanCrit", {
  reward(t) {
    steamTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const state: State = {
      bars,
      passes: [],
      charge: planCharge(0, 1),
      climaxMs: Infinity,
      nozzle: () => null,
      hissed: 0,
      gleamed: 0,
    };
    states.set(r, state);
    if (bars.length === 0) return;
    // top to bottom, its own last
    const order = byHeight(bars).filter((b) => b !== 0);
    order.push(0);
    const others = order.length - 1;
    let raw = 0;
    for (let k = 0; k < others; k++)
      raw += lerp(PASS_MS[0], PASS_MS[1], k / Math.max(1, others - 1)) + HOP_MS;
    const squeeze = raw > RUN_MS ? RUN_MS / raw : 1;
    let t = IN_MS + FIRST_MS;
    for (let k = 0; k < order.length; k++) {
      const bar = order[k];
      const own = k === others;
      const ms = own
        ? OWN_MS
        : lerp(PASS_MS[0], PASS_MS[1], k / Math.max(1, others - 1)) * squeeze;
      const pass: Pass = {
        bar,
        own,
        start: t,
        done: t + ms,
        spray: null as unknown as Spray,
        nozzle: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        edge: { x: 0, y: 0 },
      };
      pass.spray = planSpray(
        (at) => nozzleOf(state, pass, at),
        (at) => aimOf(state, pass, at),
        {
          startMs: pass.start,
          endMs: pass.done,
          spread: SPREAD,
          reach: REACH,
          flightMs: FLIGHT_MS,
        },
      );
      state.passes.push(pass);
      hit(bar, pass.done, own ? 2 : 1);
      t = pass.done + HOP_MS * squeeze;
    }
    const last = state.passes[state.passes.length - 1];
    state.climaxMs = last.done;
    state.charge = planCharge(last.start, OWN_MS, { climaxShake: 2.2 });
    hit(0, IN_MS, 0);
    // the nozzle: out of the number onto its first button, hovering by each
    // as it steams it (trembling at its own), darting on to the next, gone
    // into the blast
    const at: Point = { x: 0, y: 0 };
    const arc = (ax: number, ay: number, bx: number, by: number, u: number) => {
      const s = clamp01(u);
      const p = s * s * (3 - 2 * s);
      const peak = Math.min(ay, by) - HOP_ARC;
      at.x = lerp(ax, bx, p);
      at.y = (1 - p) * (1 - p) * ay + 2 * (1 - p) * p * peak + p * p * by;
      return at;
    };
    const { passes, charge } = state;
    state.nozzle = (ms) => {
      if (ms < IN_MS || ms >= state.climaxMs) return null;
      const first = passes[0];
      if (ms < first.start) {
        const to = nozzleOf(state, first, first.start);
        return arc(0, 0, to.x, to.y, (ms - IN_MS) / FIRST_MS);
      }
      for (let k = 0; k < passes.length; k++) {
        const p = passes[k];
        if (ms < p.done) {
          const n = nozzleOf(state, p, ms);
          at.x = n.x;
          at.y = n.y;
          if (p.own) {
            trembleAt(chargeAt(charge, ms), ms, TREMBLE, shiver);
            at.x += shiver.x;
            at.y += shiver.y;
          }
          return at;
        }
        const next = passes[k + 1];
        if (next && ms < next.start) {
          const a = nozzleOf(state, p, p.done);
          const ax = a.x;
          const ay = a.y;
          const b = nozzleOf(state, next, next.start);
          return arc(ax, ay, b.x, b.y, (ms - p.done) / (next.start - p.done));
        }
      }
      return null;
    };
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state || bars.length === 0) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { passes, charge, climaxMs } = state;
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
    if (passes.length === 0) return;
    while (state.hissed < passes.length && ms >= passes[state.hissed].start) {
      state.hissed++;
      playSwoosh();
    }
    while (
      state.gleamed < passes.length - 1 &&
      ms >= passes[state.gleamed].done
    )
      playSpinTick(1.2 + 0.15 * state.gleamed++);
    tickCharge(charge, ms, r.shake);
    const c = chargeAt(charge, Math.min(ms, climaxMs));
    const base = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    // each button's coat building as it's steamed, whiting out as it's done,
    // and the jet's glittering droplets
    for (let k = 0; k < passes.length; k++) {
      const p = passes[k];
      const b = state.bars[p.bar];
      if (!b) continue;
      p.edge.x = b.x - BTN_W / 2;
      p.edge.y = b.y;
      const since = ms - p.done;
      if (ms >= p.start && since < GLEAM_MS) {
        const coverage =
          since < 0 ? clamp01((ms - p.start) / (p.done - p.start)) : 0;
        coatAt.x = p.edge.x + COAT_DX;
        coatAt.y = p.edge.y;
        drawSprayCoat(
          ctx,
          coatAt,
          COAT_W * (p.own ? 1.4 : 1),
          COAT_H * (p.own ? 1.4 : 1),
          coverage,
          since >= 0 ? 1 - since / GLEAM_MS : 0,
        );
      }
      drawSpray(ctx, p.spray, ms, now, DROPLET * (p.own ? 1 + c : 1));
    }
    ctx.globalAlpha = base;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < passes.length; k++) {
      const p = passes[k];
      if (!state.bars[p.bar]) continue;
      drawPuffs(ctx, state, p, ms, base, p.own ? 1 + 0.9 * c : 1);
      drawGleam(ctx, p.edge, ms - p.done, p.own ? GLEAM_OWN : 1, base, k);
    }
    // the climax: steam flung out all round its own edge, a white flash
    const own = passes[passes.length - 1].edge;
    const since = ms - climaxMs;
    if (since >= 0 && since < BLAST_MS) {
      const u = since / BLAST_MS;
      const out = easeOut(u);
      const fade = (1 - u) ** 1.5;
      ctx.globalAlpha = base * fade;
      drawGlow(ctx, WHITE, own.x, own.y, OWN_FLASH * (0.5 + out));
      for (let i = 0; i < BLAST; i++) {
        const a = (i / BLAST) * TAU + hash01(i, 41) * 0.4;
        const d = BLAST_REACH * out * (0.6 + 0.4 * hash01(i, 42));
        const x = own.x + Math.cos(a) * d;
        const y = own.y + Math.sin(a) * d * 0.7;
        const rad = Math.max(0, lerp(BLAST_R[0], BLAST_R[1], out));
        ctx.globalAlpha = base * fade * 0.85;
        drawGlow(ctx, STEAM, x, y, rad);
        ctx.globalAlpha = base * fade * 0.6;
        drawGlow(ctx, GOLD, x, y, rad * 0.55);
      }
    }
    ctx.globalAlpha = base;
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // steam pulled into the nozzle as it charges, then the wisp itself
    if (c > 0 && ms < climaxMs) {
      const at = state.nozzle(ms);
      if (at) {
        hot.x = at.x;
        hot.y = at.y;
        drawChargeGlow(ctx, hot, c, 170, now);
        drawChargeStreaks(ctx, hot, c, 220, ms);
      }
    }
    drawWisp(
      ctx,
      state.nozzle,
      ms,
      now,
      WISP_SIZE * 1.3,
      Math.min(1, 0.6 + 0.4 * c),
    );
    drawDetonation(ctx, own, since, OWN_BLAST, now);
  },
  tailMs: Math.max(BLAST_MS, DETONATION_MS),
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
