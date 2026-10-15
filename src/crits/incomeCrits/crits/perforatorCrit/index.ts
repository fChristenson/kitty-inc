// Perforator, an income crit: the number shrinks into a drill that darts up
// under the total's left end and bites in, grinding, sparks gushing out both
// sides, then bores up into it in two shoves, a blast each; it yanks out and
// hops to the other end, then back in closer, then the other side, quicker
// every hole, a row of punches along the readout; then it hops under the
// middle, stalls there rumbling, and grinds up through it in six shoves,
// punching out the top in the huge blast
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawDrillHead,
  drawDrillSpray,
} from "../../../../shared/animationStyles/drill";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

// the holes along the readout, outside in, then its middle
const SIDES = [-290, 290, -150, 150];
// where it bites, under the total; it hovers DROP px lower between holes
const CONTACT = 60;
const DROP = 70;
// a side hole: hopped to over HOP_MS, stalled STALL_MS, bored DEPTH px up in
// SHOVES shoves of SHOVE_MS; each hole QUICK times as long by the last
const UP_MS = 160;
const HOP_MS = 120;
const STALL_MS = 110;
const SHOVES = 2;
const SHOVE_MS = 110;
const DEPTH = 80;
const QUICK = 0.6;
// the middle: stalled FINAL_STALL_MS, rumbling, then FINAL_SHOVES shoves of
// FINAL_SHOVE_MS up through it, OUT px past the readout
const FINAL_STALL_MS = 300;
const FINAL_SHOVES = 6;
const FINAL_SHOVE_MS = 120;
const OUT = 70;
// the share of a shove spent lunging; the rest it grinds where it got to
const LUNGE = 0.4;
const SIZE: [number, number] = [88, 124];
const TIP = WISP_SIZE * 0.8;
const SPRAY = 80;
const FINAL_SPRAY = 100;
const SPRAY_UP = 20;
const SPRAY_FADE_MS = 140;
const JUDDER_STALL = 18;
const JUDDER_BORE = 8;
const JUDDER_MS = 16;
const TURN_GRIND = 0.06;
const TURN = 0.03;
const SHOVE_BLAST = 100;
const THROUGH_BLAST = 170;
const RUMBLE_MS = 60;
const RUMBLE_SHAKE = 1;
// shakes by step: a shove, through
const SHAKES = [0.9, 2.6];

type Kind = "hop" | "hold" | "lunge";
interface Leg {
  kind: Kind;
  startMs: number;
  endMs: number;
  // from and to, from the total's middle
  from: Point;
  to: Point;
  hole: number;
}
interface Hole {
  x: number;
  bite: number;
  gives: number;
  through: number;
  final: boolean;
}
interface Blast {
  at: Point;
  ms: number;
  size: number;
}
interface Plan {
  legs: Leg[];
  holes: Hole[];
  blasts: Blast[];
  endMs: number;
  rumbles: number[];
}
const plans = new WeakMap<Running, Plan>();
const tip: Point = { x: 0, y: 0 };
const mouth: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
// the total this frame, and the plan the tip follows
let total: Point = { x: 0, y: 0 };
let current: Plan | null = null;

// the drill's tip at ms, from the flash's middle: a pure function of ms, so
// its wisp's trail follows it
function tipAt(ms: number): Point {
  const { legs } = current!;
  let k = 0;
  while (k < legs.length - 1 && ms >= legs[k].endMs) k++;
  const leg = legs[k];
  const u = clamp01((ms - leg.startMs) / (leg.endMs - leg.startMs || 1));
  let x: number;
  let y: number;
  if (leg.kind === "hop") {
    // a quickening arc down under the readout and up to the bite (the first
    // straight in from the flash)
    const e = 0.5 * u + 0.5 * u * u;
    const w = 1 - e;
    const cx = (leg.from.x + leg.to.x) / 2;
    const cy =
      leg.hole === 0
        ? (leg.from.y + leg.to.y) / 2
        : Math.max(leg.from.y, leg.to.y) + DROP;
    x = w * w * leg.from.x + 2 * w * e * cx + e * e * leg.to.x;
    y = w * w * leg.from.y + 2 * w * e * cy + e * e * leg.to.y;
  } else {
    const e = leg.kind === "lunge" ? smoothstep(clamp01(u / LUNGE)) : 0;
    const stalled = leg.kind === "hold";
    const judder =
      (holeHash(Math.floor(ms / JUDDER_MS), 3101) - 0.5) *
      (stalled ? JUDDER_STALL : JUDDER_BORE);
    x = leg.from.x + judder;
    y = leg.from.y + (leg.to.y - leg.from.y) * e;
  }
  tip.x = total.x + x;
  tip.y = total.y + y;
  return tip;
}

registerFloorCrit("perforatorCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const legs: Leg[] = [];
    const holes: Hole[] = [];
    const blasts: Blast[] = [];
    const rumbles: number[] = [];
    let at: Point = { x: -to.x, y: -to.y };
    let t = 0;
    const holeAt = (x: number, k: number, final: boolean) => {
      const s = final ? QUICK : lerp(1, QUICK, k / (SIDES.length - 1));
      const hop = k === 0 ? UP_MS : HOP_MS * s;
      const bite: Point = { x, y: CONTACT };
      legs.push({
        kind: "hop",
        startMs: t,
        endMs: t + hop,
        from: at,
        to: bite,
        hole: k,
      });
      t += hop;
      const hole: Hole = { x, bite: t, gives: 0, through: 0, final };
      const stall = final ? FINAL_STALL_MS : STALL_MS * s;
      legs.push({
        kind: "hold",
        startMs: t,
        endMs: t + stall,
        from: bite,
        to: bite,
        hole: k,
      });
      if (final)
        for (let ms = t + RUMBLE_MS; ms < t + stall; ms += RUMBLE_MS)
          rumbles.push(ms);
      t += stall;
      hole.gives = t;
      const shoves = final ? FINAL_SHOVES : SHOVES;
      const shove = final ? FINAL_SHOVE_MS : SHOVE_MS * s;
      const end = final ? -OUT : CONTACT - DEPTH;
      let from = bite;
      for (let j = 0; j < shoves; j++) {
        const next: Point = {
          x,
          y: lerp(CONTACT, end, (j + 1) / shoves),
        };
        legs.push({
          kind: "lunge",
          startMs: t,
          endMs: t + shove,
          from,
          to: next,
          hole: k,
        });
        const landed = t + shove * LUNGE;
        const last = j === shoves - 1;
        hit(0, landed, final && last ? 1 : 0);
        blasts.push({
          at: next,
          ms: landed,
          size: last ? THROUGH_BLAST : SHOVE_BLAST,
        });
        t += shove;
        from = next;
      }
      hole.through = t - shove * (1 - LUNGE);
      holes.push(hole);
      at = from;
    };
    SIDES.forEach((x, k) => holeAt(x, k, false));
    holeAt(0, SIDES.length, true);
    plans.set(r, {
      legs,
      holes,
      blasts,
      endMs: holes[holes.length - 1].through,
      rumbles,
    });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    total = bars[0];
    current = plan;
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < plan.rumbles.length && ms >= plan.rumbles[r.kicked]) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }
    // the gush out of the hole it's grinding
    for (const hole of plan.holes) {
      const since = ms - hole.bite;
      if (since < 0 || ms > hole.through + SPRAY_FADE_MS) continue;
      const fade =
        ms > hole.through ? 1 - (ms - hole.through) / SPRAY_FADE_MS : 1;
      const hard =
        ms < hole.gives
          ? 1
          : lerp(
              0.9,
              hole.final ? 1.6 : 1.3,
              clamp01((ms - hole.gives) / (hole.through - hole.gives)),
            );
      mouth.x = total.x + hole.x;
      mouth.y = total.y + CONTACT - SPRAY_UP;
      drawDrillSpray(
        ctx,
        mouth,
        -Math.PI / 2,
        since,
        hard * fade,
        hole.final ? FINAL_SPRAY : SPRAY,
        now,
      );
    }
    if (ms < plan.endMs) {
      const { legs } = plan;
      let k = 0;
      while (k < legs.length - 1 && ms >= legs[k].endMs) k++;
      const leg = legs[k];
      const grinding = leg.kind !== "hop";
      const size = lerp(SIZE[0], SIZE[1], leg.hole / SIDES.length);
      tipAt(ms);
      drawDrillHead(
        ctx,
        tip,
        -Math.PI / 2,
        size,
        ms * (grinding ? TURN_GRIND : TURN),
        now,
      );
      drawWisp(ctx, tipAt, ms, now, TIP, 1);
    }
    for (const b of plan.blasts) {
      spot.x = total.x + b.at.x;
      spot.y = total.y + b.at.y;
      drawDetonation(ctx, spot, ms - b.ms, b.size, now);
    }
    drawFinale(ctx, total, ms - plan.endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
