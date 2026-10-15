// Pinking Shears, a button crit: a pair of shears (two bright wisp blades
// hinged together) trembles open beside the top button and snaps shut,
// snipping a zigzag cut that flashes, jolts and spills glitter, its strip of
// light peeling apart; snip after snip, quicker each, down the button column;
// then the shears leap to the top and chomp one long zigzag cut down the
// whole column, its halves sliding apart and the glitter bursting onto every
// button: each of its next taps also levels the floor above, then the floor
// below, in turn; its own the biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the shears: hinged AWAY px left of a button's middle, blades BLADE px long
// (tips short of the button), opening OPEN rad each side, trembling
const AWAY = BTN_W / 2 + 150;
const BLADE = 110;
const BLADE_W = 12;
const OPEN = 0.5;
const TREMBLE = 0.05;
const REOPEN_MS = 45;
const TIP = WISP_SIZE * 0.8;
// SNIPS snips (2 a button, within the bounds) from FIRST_MS, GAPS_MS apart
// (closing), each SNIP_MS shutting through a zigzag of ZIGS legs ZIG_H tall
const FIRST_MS = 280;
const SNIPS: [number, number] = [6, 8];
const GAPS_MS: [number, number] = [140, 80];
const SNIP_MS = 64;
const ZIGS = 4;
const ZIG_H = 14;
const SNIP_W = 16;
const SPILL = 16;
const FLASH = 70;
const FLASH_MS = 120;
// the strip of light peeling apart PEEL px over PEEL_MS
const PEEL = 22;
const PEEL_MS = 380;
const LIVE_MS = 520;
// the long cut, LONG_GAP_MS after the last snip, CUT_IN px left of the
// buttons, PAST px beyond them, zigzagging LONG_AMP px each side in legs of
// about LONG_LEG px; the shears chomping CHOMPS times down it
const LONG_GAP_MS = 140;
const LONG_MS = 150;
const CUT_IN = 60;
const PAST = 120;
const LONG_AMP = 20;
const LONG_LEG = 44;
const LONG_LEGS: [number, number] = [4, 22];
const LONG_W = 30;
const LONG_APART = 30;
const LONG_APART_MS = 120;
const LONG_FADE_MS = 420;
const CHOMPS = 5;
const VANISH_MS = 80;
// the glitter bursting out of the cut OUT_MS, then zipping into its button
// over FLY_MS, each speck up to FLY_SPREAD_MS late
const BURST = 14;
const BURST_X = 40;
const BURST_Y = 60;
const SPECK = 18;
const OUT_MS = 60;
const FLY_MS = 130;
const FLY_SPREAD_MS = 40;
const LAND_FLASH = 90;
const LAND_MS = 150;
const OWN_BLAST = 240;
const CUT_BLAST = 160;
// shakes by step: a snip, a button, its own
const SHAKES = [0.4, 1.2, 3];

interface State {
  bars: Point[];
  // the buttons top to bottom; the column's live top and bottom
  col: number[];
  top: number;
  bottom: number;
  snipAt: number[];
  snipBar: number[];
  snipY: number[];
  // each snip's zigzag and its legs' cuts, from its button's middle
  zigs: Point[][];
  cuts: Slash[][];
  // the long cut, from the top button's middle
  longStart: number;
  longEnd: number;
  longPts: Point[];
  longCuts: Slash[];
  // by col: when the long cut reaches the button, its glitter landing
  reach: number[];
  land: number[];
  ownLand: number;
  upper: (ms: number) => Point | null;
  lower: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const hinge: Point = { x: 0, y: 0 };
const bladeA: Point = { x: 0, y: 0 };
const bladeB: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// a floor that can take a level
const open = (floor: Floor | undefined): floor is Floor =>
  !!floor && floor.unlocked && !isFloorMaxed(floor);

// each tap also levelling the floor above, the next the floor below, in turn
// (the other one when that can't take it)
const zigzagTaps = defineTapPerk("Zigzag", (t, left) => {
  const k = t.floors.indexOf(t.floor);
  const zig = t.floors[left % 2 ? k + 1 : k - 1];
  const zag = t.floors[left % 2 ? k - 1 : k + 1];
  const floor = open(zig) ? zig : open(zag) ? zag : null;
  if (floor) t.levelUp(floor, 1, "+1 Lvl");
});

registerFloorCrit("pinkingShearsCrit", {
  reward(t) {
    zigzagTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const col = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const n = col.length;
    const count = Math.min(SNIPS[1], Math.max(SNIPS[0], n * 2));
    const snipAt: number[] = [];
    const snipBar: number[] = [];
    const snipY: number[] = [];
    const zigs: Point[][] = [];
    const cuts: Slash[][] = [];
    const seen: number[] = col.map(() => 0);
    let t = FIRST_MS;
    for (let k = 0; k < count; k++) {
      const j = Math.floor((k * n) / count);
      const bar = col[j];
      const y = [0, -ZIG_H * 1.6, ZIG_H * 1.6][seen[j]++ % 3];
      const pts: Point[] = [];
      for (let i = 0; i <= ZIGS; i++)
        pts.push({
          x: -AWAY + 25 + ((BLADE - 15) * i) / ZIGS,
          y: y + (i % 2 ? ZIG_H : -ZIG_H),
        });
      const legs: Slash[] = [];
      for (let i = 0; i < ZIGS; i++)
        legs.push(
          planSlash(pts[i], pts[i + 1], t + (SNIP_MS * i) / ZIGS, SNIP_MS / ZIGS),
        );
      snipAt.push(t);
      snipBar.push(bar);
      snipY.push(y);
      zigs.push(pts);
      cuts.push(legs);
      hit(bar, t + SNIP_MS, 0);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, count - 1));
    }
    const longStart = snipAt[count - 1] + SNIP_MS + LONG_GAP_MS;
    const top = bars[col[0]];
    const span = bars[col[n - 1]].y - top.y + PAST * 2;
    const legsN = Math.min(
      LONG_LEGS[1],
      Math.max(LONG_LEGS[0], Math.ceil(span / LONG_LEG)),
    );
    const cutX = -BTN_W / 2 - CUT_IN;
    const longPts: Point[] = [];
    for (let i = 0; i <= legsN; i++)
      longPts.push({
        x: cutX + (i % 2 ? LONG_AMP : -LONG_AMP),
        y: -PAST + (span * i) / legsN,
      });
    const longCuts: Slash[] = [];
    for (let i = 0; i < legsN; i++)
      longCuts.push(
        planSlash(
          longPts[i],
          longPts[i + 1],
          longStart + (LONG_MS * i) / legsN,
          LONG_MS / legsN,
        ),
      );
    const reach: number[] = [];
    const land: number[] = [];
    let ownLand = 0;
    for (const bar of col) {
      const at = longStart + (LONG_MS * (bars[bar].y - top.y + PAST)) / span;
      const landAt = at + OUT_MS + FLY_SPREAD_MS + FLY_MS;
      reach.push(at);
      land.push(landAt);
      if (bar === 0) ownLand = landAt;
      hit(bar, landAt, bar === 0 ? 2 : 1);
    }
    const state: State = {
      bars,
      col,
      top: top.y,
      bottom: bars[col[n - 1]].y,
      snipAt,
      snipBar,
      snipY,
      zigs,
      cuts,
      longStart,
      longEnd: longStart + LONG_MS,
      longPts,
      longCuts,
      reach,
      land,
      ownLand,
      upper: () => null,
      lower: () => null,
    };
    const tipA: Point = { x: 0, y: 0 };
    const tipB: Point = { x: 0, y: 0 };
    state.upper = (ms) => tip(state, ms, -1, tipA);
    state.lower = (ms) => tip(state, ms, 1, tipB);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    if (ms < IN_MS) return;
    const { col, snipAt, zigs, cuts, longCuts } = state;
    state.bars = bars;
    state.top = bars[col[0]].y;
    state.bottom = bars[col[col.length - 1]].y;
    const head = bars[col[0]];
    const cutX = head.x - BTN_W / 2 - CUT_IN;

    // the snips: each leg's streak and spill, the strip peeling apart
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = COLOR.heavenlyGold;
    ctx.lineJoin = "miter";
    for (let k = 0; k < snipAt.length; k++) {
      const since = ms - snipAt[k] - SNIP_MS;
      if (ms < snipAt[k]) break;
      if (since > LIVE_MS) continue;
      const bar = bars[state.snipBar[k]];
      ctx.translate(bar.x, bar.y);
      const legs = cuts[k];
      for (let i = 0; i < legs.length; i++) {
        drawSlash(ctx, legs[i], ms, SNIP_W, now);
        if (i === 1 || i === 2) drawSliceSpill(ctx, legs[i], ms, SPILL, 6);
      }
      if (since > 0 && since < PEEL_MS) {
        const u = since / PEEL_MS;
        const e = 1 - (1 - u) * (1 - u);
        ctx.globalAlpha = 1 - u;
        ctx.lineWidth = 4;
        strip(ctx, zigs[k], PEEL * 0.4 * e, -PEEL * e);
        strip(ctx, zigs[k], -PEEL * 0.4 * e, PEEL * e);
        ctx.globalAlpha = 1;
      }
      ctx.translate(-bar.x, -bar.y);
    }
    // the long cut, its halves sliding apart once through
    if (ms >= state.longStart) {
      ctx.translate(head.x, head.y);
      for (let i = 0; i < longCuts.length; i++) {
        drawSlash(ctx, longCuts[i], ms, LONG_W, now);
        drawSliceSpill(ctx, longCuts[i], ms, SPILL, 5);
      }
      const since = ms - state.longEnd;
      if (since > 0 && since < LONG_FADE_MS) {
        const e = 1 - (1 - clamp01(since / LONG_APART_MS)) ** 3;
        ctx.globalAlpha = 1 - since / LONG_FADE_MS;
        ctx.lineWidth = 6;
        strip(ctx, state.longPts, -LONG_APART * e, 0);
        strip(ctx, state.longPts, LONG_APART * e, 0);
        ctx.globalAlpha = 1;
      }
      ctx.translate(-head.x, -head.y);
    }
    ctx.restore();

    // the flashes, the hinge's glow and the glitter bursting onto the buttons
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < snipAt.length; k++) {
      const since = ms - snipAt[k] - SNIP_MS;
      if (since < 0) break;
      if (since > FLASH_MS) continue;
      const bar = bars[state.snipBar[k]];
      const mid = zigs[k][ZIGS >> 1];
      stampGlimmer(
        ctx,
        bar.x + mid.x,
        bar.y + mid.y,
        FLASH * (1 - since / FLASH_MS),
        k,
        COLOR.white,
      );
    }
    const shown = ms <= state.longEnd + VANISH_MS;
    if (shown) {
      shears(state, ms, hinge);
      stampGlimmer(
        ctx,
        hinge.x,
        hinge.y,
        ms >= state.longStart ? 40 : 28,
        7,
        COLOR.white,
      );
    }
    for (let j = 0; j < col.length; j++) {
      const since = ms - state.reach[j];
      if (since < 0) break;
      const landSince = ms - state.land[j];
      if (landSince > LAND_MS) continue;
      const bar = bars[col[j]];
      const tx = bar.x - BTN_W / 2 + 12;
      const out = 1 - (1 - clamp01(since / OUT_MS)) ** 2;
      for (let i = 0; i < BURST; i++) {
        let x = cutX + (holeHash(i, 7310 + j) - 0.5) * 2 * BURST_X * out;
        let y = bar.y + (holeHash(i, 7311 + j) - 0.5) * 2 * BURST_Y * out;
        const u =
          (since - OUT_MS - holeHash(i, 7312 + j) * FLY_SPREAD_MS) / FLY_MS;
        if (u >= 1) continue;
        if (u > 0) {
          const e = u * u;
          x += (tx - x) * e;
          y += (bar.y - y) * e;
        }
        stampGlimmer(
          ctx,
          x,
          y,
          SPECK * (u > 0 ? 1 - 0.4 * u : 1),
          i + j * BURST,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      if (landSince > 0)
        stampGlimmer(
          ctx,
          tx,
          bar.y,
          LAND_FLASH * (col[j] === 0 ? 1.5 : 1) * (1 - landSince / LAND_MS),
          j,
          COLOR.white,
        );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;

    // the shears: two blades off the hinge, a wisp at each tip
    if (shown) {
      const angle = shears(state, ms, hinge);
      const reachX = BLADE * Math.cos(angle);
      const reachY = BLADE * Math.sin(angle);
      bladeA.x = bladeB.x = hinge.x + reachX;
      bladeA.y = hinge.y - reachY;
      bladeB.y = hinge.y + reachY;
      drawBeam(ctx, hinge, bladeA, BLADE_W, 0.9);
      drawBeam(ctx, hinge, bladeB, BLADE_W, 0.9);
    }
    const heat = ms >= state.longStart - LONG_GAP_MS ? 1 : 0.3;
    const end = state.longEnd + VANISH_MS;
    drawWispBetween(ctx, state.upper, ms, now, TIP, heat, IN_MS, end);
    drawWispBetween(ctx, state.lower, ms, now, TIP, heat, IN_MS, end);

    spot.x = cutX;
    spot.y = (state.top + state.bottom) / 2;
    drawDetonation(ctx, spot, ms - state.longEnd, CUT_BLAST, now);
    const own = bars[0];
    spot.x = own.x - BTN_W / 2 - 30;
    spot.y = own.y;
    drawDetonation(ctx, spot, ms - state.ownLand, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});

// the zigzag through pts, shifted by (dx, dy)
function strip(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  dx: number,
  dy: number,
): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x + dx, pts[0].y + dy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + dx, pts[i].y + dy);
  ctx.stroke();
}

const easeOut = (u: number) => 1 - (1 - u) ** 3;

// the hinge at ms (into into) and how far the blades are open each side:
// snipping beside a button, darting to the next; leaping to the column's
// top; chomping down the long cut
function shears(s: State, ms: number, into: Point): number {
  const { bars, snipAt, snipBar, snipY } = s;
  const n = snipAt.length;
  const longX = bars[s.col[0]].x - BTN_W / 2 - CUT_IN - BLADE * 0.8;
  if (ms >= s.longStart) {
    const u = clamp01((ms - s.longStart) / LONG_MS);
    into.x = longX;
    into.y = lerp(s.top - PAST, s.bottom + PAST, u);
    return u >= 1 ? 0 : OPEN * 0.8 * Math.abs(Math.cos(u * Math.PI * CHOMPS));
  }
  let k = -1;
  while (k + 1 < n && snipAt[k + 1] <= ms) k++;
  const lastEnd = snipAt[n - 1] + SNIP_MS;
  if (k === n - 1 && ms > lastEnd) {
    const from = bars[snipBar[k]];
    const e = easeOut(clamp01((ms - lastEnd) / ((s.longStart - lastEnd) * 0.7)));
    into.x = lerp(from.x - AWAY, longX, e);
    into.y = lerp(from.y + snipY[k], s.top - PAST, e);
    return OPEN * 1.25 + TREMBLE * 2 * Math.sin(ms * 0.11);
  }
  const at = k < 0 ? 0 : k;
  const bar = bars[snipBar[at]];
  into.x = bar.x - AWAY;
  into.y = bar.y + snipY[at];
  if (k >= 0 && ms < snipAt[k] + SNIP_MS)
    return OPEN * (1 - (ms - snipAt[k]) / SNIP_MS);
  const shutAt = k < 0 ? IN_MS : snipAt[k] + SNIP_MS;
  if (k >= 0 && k + 1 < n) {
    const next = bars[snipBar[k + 1]];
    const e = easeOut(clamp01((ms - shutAt) / ((snipAt[k + 1] - shutAt) * 0.75)));
    into.x = lerp(into.x, next.x - AWAY, e);
    into.y = lerp(into.y, next.y + snipY[k + 1], e);
  }
  return Math.max(
    0,
    OPEN * clamp01((ms - shutAt) / REOPEN_MS) + TREMBLE * Math.sin(ms * 0.09),
  );
}

// a blade's tip at ms (sign -1 the upper, 1 the lower), while it's on stage
function tip(s: State, ms: number, sign: number, into: Point): Point | null {
  if (ms < IN_MS || ms > s.longEnd + VANISH_MS) return null;
  const angle = shears(s, ms, into);
  into.x += BLADE * Math.cos(angle);
  into.y += sign * BLADE * Math.sin(angle);
  return into;
}
