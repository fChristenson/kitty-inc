// the bill counter income crit: the number bursts into a fat stack of bills
// between it and the total; like a money counter they riffle off the top of
// the stack up into the total one by one, faster and faster into a blur,
// the total jolting with them; the last handful fly up together into the
// huge blast
import { COLOR } from "../../../../palette";
import { BILL_SPIN_FRAME_COUNT } from "../../../../coinBurst";
import { loadSprite } from "../../../../loadAssets";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const BILLS = 30;
// the stack, this share of the way from the number up to the total, a
// bill STEP above the one under it
const STACK_AT = 0.2;
const STEP = 14;
const JITTER = 36;
const BILL = 184;
const OPEN_BLAST = 200;
// the stack building: bill k flies in from the number BUILD_GAP_MS after
// the one under it, over BUILD_MS
const BUILD_FROM_MS = 60;
const BUILD_GAP_MS = 8;
const BUILD_MS = 160;
const BUILD_LIFT = 120;
// the riffle: flicks from FLICK_GAP_MS apart down to the last, quickening
// over QUICKEN flicks; the last LAST_BURST go at once, LAST_LAG_MS on
const RIFFLE_LAG_MS = 100;
const FLICK_GAP_MS: [number, number] = [110, 18];
const QUICKEN = 16;
const LAST_BURST = 6;
const LAST_LAG_MS = 120;
const LAST_SPREAD_MS = 10;
const FLY_MS = 240;
const FLY_BOW = 220;
const FLY_RISE = 260;
const FLUTTER = 0.05;
// a pop on the total every few landings, a hit every HIT_EVERY
const POP_EVERY = 3;
const POP_BLAST = 90;
const HIT_EVERY = 5;
// the stack's glow while it riffles fastest
const BLUR_MS = 60;
const BLUR_GLOW = 50;
// shakes by step: a hit, the last; each landing (kicked)
const SHAKES = [0.6, 2.4];
const LANDING_KICK = 0.2;

interface Flick {
  // the bill's place in the stack (0 the bottom)
  slot: number;
  at: number;
  to: Point;
}
interface Counter {
  stack: Point;
  flicks: Flick[];
  slamAt: number;
}
const counters = new WeakMap<Running, Counter>();
// the bill's flutter frames, cut once from the full-size sheet: the coin
// bursts' own frames are too small for bills this big
let frames: HTMLCanvasElement[] = [];
void loadSprite("cashBill").then((sheet) => {
  const w = Math.round(sheet.naturalWidth / BILL_SPIN_FRAME_COUNT);
  const h = sheet.naturalHeight;
  frames = Array.from({ length: BILL_SPIN_FRAME_COUNT }, (_, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(sheet, i * w, 0, w, h, 0, 0, w, h);
    return canvas;
  });
});
const tilts = Array.from(
  { length: BILLS },
  (_, i) => (holeHash(i, 1601) - 0.5) * 0.3,
);
const origin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

function planCounter(to: Point): Counter {
  const stack = { x: to.x, y: lerp(0, to.y, STACK_AT) };
  const flicks: Flick[] = [];
  let at: number =
    BUILD_FROM_MS + (BILLS - 1) * BUILD_GAP_MS + BUILD_MS + RIFFLE_LAG_MS;
  // top of the stack first
  for (let n = 0; n < BILLS; n++) {
    const slot = BILLS - 1 - n;
    if (n === BILLS - LAST_BURST) at += LAST_LAG_MS;
    flicks.push({ slot, at, to: readoutSpot(to, n, 1602) });
    at +=
      n >= BILLS - LAST_BURST
        ? LAST_SPREAD_MS
        : lerp(FLICK_GAP_MS[0], FLICK_GAP_MS[1], Math.min(1, n / QUICKEN));
  }
  return {
    stack,
    flicks,
    slamAt: flicks[BILLS - 1].at + FLY_MS,
  };
}

// bill `slot`'s place in the stack
function stackSpot(c: Counter, slot: number): Point {
  spot.x = c.stack.x + (holeHash(slot, 1603) - 0.5) * JITTER;
  spot.y = c.stack.y - slot * STEP;
  return spot;
}

registerFloorCrit("billCounterCrit", {
  plan(r, bars, hit) {
    const c = planCounter(bars[0]);
    counters.set(r, c);
    for (let n = HIT_EVERY - 1; n < BILLS - 1; n += HIT_EVERY)
      hit(0, c.flicks[n].at + FLY_MS);
    hit(0, c.slamAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const c = counters.get(r);
    if (!c) return;
    const now = r.startedAt + ms;
    const { flicks } = c;
    drawNumberShrink(ctx, r, ms);
    drawDetonation(ctx, origin, ms, OPEN_BLAST, now);
    while (r.kicked < BILLS && ms >= flicks[r.kicked].at + FLY_MS) {
      r.kicked++;
      r.shake(LANDING_KICK);
    }

    // the stack's glow while it riffles: the more bills in the air, the hotter
    let flying = 0;
    for (let n = 0; n < BILLS; n++)
      if (ms >= flicks[n].at && ms < flicks[n].at + BLUR_MS) flying++;
    if (flying > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      stampGlimmer(
        ctx,
        c.stack.x,
        c.stack.y - (BILLS * STEP) / 2,
        BLUR_GLOW * flying,
        5,
        COLOR.heavenlyGold,
      );
      ctx.restore();
    }

    // the bills, the stack's bottom first, then the ones flicked up
    if (frames.length > 0) {
      const h = BILL * 2;
      const w = (h * frames[0].width) / frames[0].height;
      for (let n = BILLS - 1; n >= 0; n--) {
        const f = flicks[n];
        const into = clamp01(
          (ms - BUILD_FROM_MS - f.slot * BUILD_GAP_MS) / BUILD_MS,
        );
        if (into <= 0) continue;
        const home = stackSpot(c, f.slot);
        let x = home.x;
        let y = home.y;
        if (into < 1) {
          x = lerp(origin.x, home.x, into);
          y = lerp(origin.y, home.y, into) - 4 * into * (1 - into) * BUILD_LIFT;
        } else if (ms >= f.at) {
          const t = (ms - f.at) / FLY_MS;
          if (t >= 1) continue;
          // a bow out to one side and up, then onto its spot on the total
          const side = (holeHash(f.slot, 1604) - 0.5) * 2 * FLY_BOW;
          const e = t * t;
          x = lerp(home.x, f.to.x, e) + side * 4 * t * (1 - t);
          y = lerp(home.y, f.to.y, e) - 4 * t * (1 - t) * FLY_RISE;
        }
        const frame =
          ms >= f.at
            ? Math.floor((ms - f.at) * FLUTTER) % BILL_SPIN_FRAME_COUNT
            : 0;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 2 + tilts[f.slot]);
        ctx.drawImage(frames[frame], -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    for (let n = 0; n < BILLS - 1; n += POP_EVERY)
      drawDetonation(
        ctx,
        flicks[n].to,
        ms - flicks[n].at - FLY_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, bars[0], ms - c.slamAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
