// Julienne, a button crit: a ball of glitter swells up beside every button in
// view; swift slashes swipe through them in quick fire, rippling down the
// buttons, round after round, quicker each, every cut spilling glitter and
// the pieces sliding further apart; then one long cut tears down through all
// of them at once and the diced pieces zip into their buttons in a blast:
// each button turns over, its next taps also levelling the building's middle
// floor; its own the biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed } from "../../../../gameState";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
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
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// each ball R round (its own OWN_R), AWAY px left of its button's middle,
// swelling up over SWELL_MS; SPECKS specks of glitter SPECK px
const AWAY = BTN_W / 2 + 110;
const R = 60;
const OWN_R = 80;
const SWELL_MS = 140;
const SPECKS = 26;
const SPECK = 22;
// ROUNDS rounds of cuts from FIRST_MS, GAPS_MS apart (closing), each ball
// STAGGER_MS after the one above; each cut CUT of the radius long, the pieces
// sliding GAP px apart along it
const FIRST_MS = 320;
const ROUNDS = 3;
const GAPS_MS: [number, number] = [260, 130];
const STAGGER_MS = 40;
const CUT = 1.5;
const GAP = 14;
const SLASH = 22;
const SPILL = 20;
// the long cut, LONG_GAP_MS after the last round, swiping LONG_MS from the
// top ball to the bottom, PAST px beyond them, LONG_SLASH wide
const LONG_GAP_MS = 220;
const LONG_MS = 120;
const PAST = 160;
const LONG_SLASH = 36;
// the pieces zip into their button APART_MS after the long cut, over FLY_MS,
// each up to FLY_SPREAD_MS late
const APART_MS = 90;
const FLY_MS = 120;
const FLY_SPREAD_MS = 60;
const BLAST = 140;
const OWN_BLAST = 300;
// shakes by step: a cut, a button, its own
const SHAKES = [0.35, 1.1, 2.8];

interface Ball {
  bar: number;
  own: boolean;
  radius: number;
  // its cuts, from its middle, the long cut's last
  cuts: Slash[];
  flyMs: number;
}
interface State {
  balls: Ball[];
  long: { startMs: number; endMs: number };
}
const states = new WeakMap<Running, State>();
// the specks in a ball of radius 1, sunflower-packed
const SEEDS: Point[] = Array.from({ length: SPECKS }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / SPECKS);
  const a = i * 2.39996;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
});
const seed: Point = { x: 0, y: 0 };
const apart: Point = { x: 0, y: 0 };
const top: Point = { x: 0, y: 0 };
const bottom: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

// each tap also levelling the middle one of the floors that can take levels
const slicedTaps = defineTapPerk("Slice", (t) => {
  let open = 0;
  for (const floor of t.floors)
    if (floor.unlocked && !isFloorMaxed(floor)) open++;
  let k = Math.floor(open / 2);
  for (const floor of t.floors)
    if (floor.unlocked && !isFloorMaxed(floor) && k-- === 0) {
      t.levelUp(floor, meta.values.levels, `+${meta.values.levels} Lvl`);
      return;
    }
});

registerFloorCrit("julienneCrit", {
  reward(t) {
    slicedTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const balls: Ball[] = order.map((bar) => ({
      bar,
      own: bar === 0,
      radius: bar === 0 ? OWN_R : R,
      cuts: [],
      flyMs: 0,
    }));
    let t = FIRST_MS;
    for (let k = 0; k < ROUNDS; k++) {
      balls.forEach((ball, i) => {
        const at = t + i * STAGGER_MS;
        const a =
          (holeHash(k * 17 + i, 6120) - 0.5) * Math.PI * 0.9 +
          (k % 2 ? Math.PI / 2 : 0);
        const reach = ball.radius * CUT;
        const dx = Math.cos(a) * reach;
        const dy = Math.sin(a) * reach;
        // off its middle a little, across the cut
        const off = (holeHash(k * 17 + i, 6121) - 0.5) * 0.4;
        const ox = -dy * off;
        const oy = dx * off;
        ball.cuts.push(
          planSlash({ x: ox - dx, y: oy - dy }, { x: ox + dx, y: oy + dy }, at),
        );
        hit(ball.bar, at, 0);
      });
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, ROUNDS - 1));
    }
    // the long cut down through them all, top to bottom
    const startMs =
      t - GAPS_MS[1] + (balls.length - 1) * STAGGER_MS + LONG_GAP_MS;
    const ys = balls.map((b) => bars[b.bar].y);
    const highest = Math.min(...ys) - PAST;
    const span = Math.max(...ys) + PAST - highest || 1;
    for (const ball of balls) {
      const reach = ball.radius * CUT;
      const at = startMs + (LONG_MS * (bars[ball.bar].y - highest)) / span;
      ball.cuts.push(
        planSlash({ x: 0, y: -reach }, { x: 0, y: reach }, at, 40),
      );
      ball.flyMs = at + APART_MS;
      hit(ball.bar, ball.flyMs + FLY_MS, ball.own ? 2 : 1);
    }
    states.set(r, { balls, long: { startMs, endMs: startMs + LONG_MS } });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const swell = clamp01((ms - IN_MS) / SWELL_MS);
    if (swell <= 0) return;
    const { balls } = state;
    // the specks: diced apart by the cuts, then zipping into the button
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (const ball of balls) {
      const bar = bars[ball.bar];
      const x0 = bar.x - AWAY;
      const size = SPECK * (ball.own ? 1.3 : 1);
      for (let i = 0; i < SPECKS; i++) {
        seed.x = SEEDS[i].x * ball.radius * swell;
        seed.y = SEEDS[i].y * ball.radius * swell;
        const leaves =
          ball.flyMs + holeHash(i, 6122 + ball.bar) * FLY_SPREAD_MS;
        sliceOffset(ball.cuts, seed, Math.min(ms, leaves), GAP, apart);
        let x = seed.x + apart.x;
        let y = seed.y + apart.y;
        const u = (ms - leaves) / FLY_MS;
        if (u >= 1) continue;
        if (u > 0) {
          const e = u * u;
          x += (AWAY - BTN_W / 2 + 20 - x) * e;
          y -= y * e;
        }
        stampGlimmer(
          ctx,
          x0 + x,
          bar.y + y,
          size * (u > 0 ? 1 - 0.4 * u : 1),
          i + ball.bar * SPECKS,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (const ball of balls) {
      const bar = bars[ball.bar];
      const x0 = bar.x - AWAY;
      ctx.save();
      ctx.translate(x0, bar.y);
      const last = ball.cuts.length - 1;
      for (let k = 0; k < ball.cuts.length; k++) {
        if (k < last) drawSlash(ctx, ball.cuts[k], ms, SLASH, now);
        drawSliceSpill(ctx, ball.cuts[k], ms, SPILL, k < last ? 10 : 14);
      }
      ctx.restore();
      spot.x = x0;
      spot.y = bar.y;
      drawDetonation(
        ctx,
        spot,
        ms - ball.flyMs - FLY_MS,
        ball.own ? OWN_BLAST : BLAST,
        now,
      );
    }
    // the long cut, drawn whole through every ball
    if (ms >= state.long.startMs) {
      let highest = Infinity;
      let lowest = -Infinity;
      for (const ball of balls) {
        const y = bars[ball.bar].y;
        if (y < highest) highest = y;
        if (y > lowest) lowest = y;
      }
      const x = bars[balls[0].bar].x - AWAY;
      top.x = bottom.x = x;
      top.y = highest - PAST;
      bottom.y = lowest + PAST;
      drawLongCut(ctx, state.long, top, bottom, ms, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});

// the long cut's streak from `from` down to `to`, swiping over its span
const longSlash: Slash = planSlash({ x: 0, y: 0 }, { x: 0, y: 1 }, 0);
function drawLongCut(
  ctx: CanvasRenderingContext2D,
  long: { startMs: number; endMs: number },
  from: Point,
  to: Point,
  ms: number,
  now: number,
): void {
  longSlash.from = from;
  longSlash.to = to;
  longSlash.startMs = long.startMs;
  longSlash.endMs = long.endMs;
  drawSlash(ctx, longSlash, ms, LONG_SLASH, now);
}
