// Katana, a floor crit: a blade wisp holds beside the top bar, trembling as
// it draws, then dashes, vanishing and reappearing at each bar in turn and
// leaving a razor-thin diagonal slash across it; a beat later the cut flares,
// the bar's glow splits along it and the halves slide apart, glitter
// spilling, a flash and a jolt, levels landing; the dashes quicken. Then it
// stops beside its own bar, a hush, every cut flares at once (levels again)
// and one long final slash splits its own bar in a blast
import { COLOR } from "../../../../palette";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  byHeight,
  clamp01,
  drawText,
  lerp,
  registerFloorCrit,
  type Point,
} from "../../critPlayer";
import { BAR_HALF_H } from "../../critPlayer/shared";

const IN_MS = 160;
// the draw: trembling beside the top bar, SIDE px off its left end
const DRAW_MS = 320;
const SIDE = 70;
const TREMBLE = 12;
// a dash's cut: CUT_REACH of the half width either side, CUT_RISE px past
// the bar's edges, over CUT_MS; GAP_MS between dashes, closing
const CUT_REACH = 0.85;
const CUT_RISE = 24;
const CUT_MS = 65;
const CUT_W = 12;
const GAP_MS: [number, number] = [210, 95];
// the wisp lingers LINGER_MS at a cut's end, then vanishes
const LINGER_MS = 40;
// a beat after the cut it flares (SPLIT_MS), and the bar splits
const SPLIT_DELAY = 80;
const SPLIT_MS = 35;
const SPLIT_W = 30;
const SPILL = 22;
// the halves: their glows PIECE_AT of the way to the corners, sliding
// PIECE_GAP px apart, fading over PIECE_MS
const PIECE_AT = 0.45;
const PIECE_GAP = 26;
const PIECE_MS = 380;
const EDGE_W = 10;
const FLASH_MS = 140;
// the hush beside its own bar, then every cut flaring at once
const APPEAR_MS = 40;
const HUSH_MS = 220;
const FLARE_MS = 40;
const FLARE_W = 40;
const FLARE_SPILL = 26;
const FLARE_SPILL_N = 18;
const CUT_DONE_MS = 600;
// the long slash: LONG_GAP_MS after the flare, LONG_RISE px past its bar,
// over LONG_MS; its bar splits OWN_DELAY_MS later in the blast
const LONG_GAP_MS = 60;
const LONG_RISE = 80;
const LONG_MS = 110;
const LONG_W = 46;
const OWN_DELAY_MS = 50;
const OWN_SPLIT_W = 64;
const OWN_SPILL = 34;
const OWN_SPILL_N = 30;
const OWN_GAP = 56;
const OWN_FLASH = 1.4;
const OWN_BLAST = 280;
const TAIL_MS = DETONATION_MS + 100;
// shakes by step: a cut's split, the flare, its own bar's split
const SHAKES = [0.8, 1.2, 3.2];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

interface Cut {
  bar: number;
  // all from its bar's middle
  slash: Slash;
  split: Slash;
  only: Slash[];
  flare: Slash;
  pieceA: Point;
  pieceB: Point;
  until: number;
}

// planned at launch (one floor crit plays at a time)
const cuts: Cut[] = [];
let topBar = 0;
let dash0 = 0;
let appearAt = 0;
let long: Slash = planSlash({ x: 0, y: 0 }, { x: 1, y: 0 }, 0);
let ownSplit: Slash = long;
let ownOnly: Slash[] = [long];
let ownA: Point = { x: 0, y: 0 };
let ownB: Point = { x: 0, y: 0 };
let drawCharge: Charge = planCharge(IN_MS, DRAW_MS);
let hushCharge: Charge = planCharge(0, HUSH_MS);
const kicks: number[] = [];

// kept each frame for wispAt
let curBars: Point[] = [];
let half = 0;
const slots: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
let slot = 0;
const here: Point = { x: 0, y: 0 };
const off: Point = { x: 0, y: 0 };
const e1: Point = { x: 0, y: 0 };
const e2: Point = { x: 0, y: 0 };

const sign = (v: number) => (v < 0 ? -1 : 1);

// the glows of the two halves a cut through a bar's middle leaves
function pieces(s: Slash, h: number): [Point, Point] {
  return [
    {
      x: sign(s.from.x) * h * PIECE_AT,
      y: sign(s.to.y) * BAR_HALF_H * PIECE_AT,
    },
    {
      x: sign(s.to.x) * h * PIECE_AT,
      y: sign(s.from.y) * BAR_HALF_H * PIECE_AT,
    },
  ];
}

function tipOf(s: Slash, at: Point, t: number, p: Point): Point {
  const u = clamp01((t - s.startMs) / (s.endMs - s.startMs));
  p.x = at.x + s.from.x + (s.to.x - s.from.x) * u;
  p.y = at.y + s.from.y + (s.to.y - s.from.y) * u;
  return p;
}

function wispAt(t: number): Point | null {
  if (t < IN_MS || curBars.length === 0) return null;
  slot = (slot + 1) & 3;
  const p = slots[slot];
  if (t < dash0) {
    const top = curBars[topBar] ?? curBars[0];
    trembleAt(chargeAt(drawCharge, t), t, TREMBLE, p);
    p.x += top.x - half - SIDE;
    p.y += top.y;
    return p;
  }
  for (let k = 0; k < cuts.length; k++) {
    const s = cuts[k].slash;
    if (t < s.startMs) return null;
    if (t <= s.endMs + LINGER_MS) return tipOf(s, curBars[cuts[k].bar], t, p);
  }
  if (t < appearAt) return null;
  const own = curBars[0];
  if (t < long.startMs) {
    trembleAt(chargeAt(hushCharge, t), t, TREMBLE, p);
    p.x += own.x + long.from.x;
    p.y += own.y + long.from.y;
    return p;
  }
  if (t <= long.endMs + LINGER_MS) return tipOf(long, own, t, p);
  return null;
}

// a bar split along s from splitAt: its halves' glows sliding apart, the cut's
// edges glowing on each, a flash on it
function drawSplit(
  ctx: CanvasRenderingContext2D,
  s: Slash,
  only: Slash[],
  a: Point,
  b: Point,
  at: Point,
  ms: number,
  gap: number,
  flash: number,
): void {
  const since = ms - s.endMs;
  if (since < 0 || since >= PIECE_MS) return;
  const fade = (1 - since / PIECE_MS) ** 1.5;
  for (let i = 0; i < 2; i++) {
    sliceOffset(only, i ? b : a, ms, gap, off);
    e1.x = at.x + s.from.x + off.x;
    e1.y = at.y + s.from.y + off.y;
    e2.x = at.x + s.to.x + off.x;
    e2.y = at.y + s.to.y + off.y;
    drawBeam(ctx, e1, e2, EDGE_W, fade);
  }
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  const r = half * 0.6;
  const squash = (BAR_HALF_H * 1.1) / Math.max(1, r);
  for (let i = 0; i < 2; i++) {
    const p = i ? b : a;
    sliceOffset(only, p, ms, gap, off);
    ctx.globalAlpha = 0.8 * fade;
    drawGlow(ctx, GOLD, at.x + p.x + off.x, at.y + p.y + off.y, r, squash);
  }
  if (since < FLASH_MS) {
    ctx.globalAlpha = (1 - since / FLASH_MS) ** 2;
    drawGlow(ctx, WHITE, at.x, at.y, half * 0.7 * flash, 0.35);
  }
  endLightBatch(ctx);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

registerFloorCrit("katanaCrit", {
  // it cuts each other bar twice: its dash, then the flare
  levels: (count) => Math.ceil(count / 2),
  plan(r, bars, hit) {
    const h = r.play.barHalfWidth;
    const tall = BAR_HALF_H + CUT_RISE;
    topBar = byHeight(bars)[0];
    const others = byHeight(bars).filter((bar) => bar !== 0);
    drawCharge = planCharge(IN_MS, DRAW_MS, {
      shake: [0.05, 0.5],
      everyMs: [160, 45],
      climaxShake: 0.9,
      bang: false,
    });
    dash0 = IN_MS + DRAW_MS;
    cuts.length = 0;
    kicks.length = 0;
    let t = dash0;
    let lastHit = dash0;
    for (let k = 0; k < others.length; k++) {
      const dir = k & 1 ? -1 : 1;
      const from = { x: -h * CUT_REACH, y: -tall * dir };
      const to = { x: h * CUT_REACH, y: tall * dir };
      const slash = planSlash(from, to, t, CUT_MS);
      const split = planSlash(from, to, slash.endMs + SPLIT_DELAY, SPLIT_MS);
      const [pieceA, pieceB] = pieces(slash, h);
      cuts.push({
        bar: others[k],
        slash,
        split,
        only: [split],
        flare: slash,
        pieceA,
        pieceB,
        until: 0,
      });
      hit(others[k], split.endMs, 0);
      kicks.push(t);
      lastHit = split.endMs;
      t += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, others.length - 1));
    }
    appearAt = cuts.length ? lastHit + APPEAR_MS : dash0;
    const flareAt = appearAt + HUSH_MS;
    // silent: only its tremble and glow build
    hushCharge = planCharge(appearAt, HUSH_MS);
    for (const cut of cuts) {
      cut.flare = planSlash(cut.slash.from, cut.slash.to, flareAt, FLARE_MS);
      cut.until = cut.flare.endMs + CUT_DONE_MS;
      hit(cut.bar, cut.flare.endMs, 1);
    }
    if (cuts.length) kicks.push(flareAt);
    const longTall = BAR_HALF_H + LONG_RISE;
    long = planSlash(
      { x: -h - SIDE, y: -longTall },
      { x: h + SIDE, y: longTall },
      flareAt + FLARE_MS + LONG_GAP_MS,
      LONG_MS,
    );
    ownSplit = planSlash(
      long.from,
      long.to,
      long.endMs + OWN_DELAY_MS - SPLIT_MS,
      SPLIT_MS,
    );
    ownOnly = [ownSplit];
    [ownA, ownB] = pieces(long, h);
    hit(0, ownSplit.endMs, 2);
    kicks.push(long.startMs, ownSplit.endMs);
  },
  draw(ctx, r, ms, bars) {
    curBars = bars;
    half = r.play.barHalfWidth;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCharge(drawCharge, ms, r.shake);
    while (r.kicked < kicks.length && ms >= kicks[r.kicked]) {
      r.kicked++;
      if (r.kicked === kicks.length) playExplosion();
      else playSwoosh();
    }

    for (let k = 0; k < cuts.length; k++) {
      const cut = cuts[k];
      if (ms < cut.slash.startMs || ms > cut.until) continue;
      const at = bars[cut.bar];
      drawSplit(
        ctx,
        cut.split,
        cut.only,
        cut.pieceA,
        cut.pieceB,
        at,
        ms,
        PIECE_GAP,
        1,
      );
      ctx.save();
      ctx.translate(at.x, at.y);
      drawSlash(ctx, cut.slash, ms, CUT_W, now);
      drawSlash(ctx, cut.split, ms, SPLIT_W, now);
      drawSliceSpill(ctx, cut.split, ms, SPILL);
      drawSlash(ctx, cut.flare, ms, FLARE_W, now);
      drawSliceSpill(ctx, cut.flare, ms, FLARE_SPILL, FLARE_SPILL_N);
      ctx.restore();
    }

    const own = bars[0];
    if (ms >= long.startMs) {
      drawSplit(
        ctx,
        ownSplit,
        ownOnly,
        ownA,
        ownB,
        own,
        ms,
        OWN_GAP,
        OWN_FLASH,
      );
      ctx.save();
      ctx.translate(own.x, own.y);
      drawSlash(ctx, long, ms, LONG_W, now);
      drawSlash(ctx, ownSplit, ms, OWN_SPLIT_W, now);
      drawSliceSpill(ctx, ownSplit, ms, OWN_SPILL, OWN_SPILL_N);
      ctx.restore();
      drawDetonation(ctx, own, ms - ownSplit.endMs, OWN_BLAST, now);
    }

    // the blade gathering itself: drawing, then in the hush
    let c = 0;
    if (ms >= IN_MS && ms < dash0) c = chargeAt(drawCharge, ms);
    else if (ms >= appearAt && ms < long.startMs) c = chargeAt(hushCharge, ms);
    const head = c > 0 ? wispAt(ms) : null;
    if (head) {
      here.x = head.x;
      here.y = head.y;
      drawChargeGlow(ctx, here, c, 200, now);
    }
    const dashing = ms >= dash0 && ms < appearAt;
    drawWispBetween(
      ctx,
      wispAt,
      ms,
      now,
      WISP_SIZE *
        (ms >= long.startMs ? 2.4 : dashing ? 1.5 : lerp(1.1, 2.2, c)),
      ms >= long.startMs ? 1 : dashing ? 0.6 : c,
      IN_MS,
      long.endMs + LINGER_MS,
    );
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
