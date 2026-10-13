// Lockpick, a lock crit: the number arcs under the locked floor and spins
// into a drill that bites up into it, stalls rumbling, then bores in shove
// by shove, sparks gushing out both sides, until it punches through and the
// floor bursts open at the crit's tier
import { drawDrillHead, drawDrillSpray } from "../../../../shared/drill";
import { drawDetonation } from "../../../../shared/explosion";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { FLOOR_H } from "../../../../floors/constants";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 180;
const ARC_RISE = 120;
const POP_BLAST = 100;
// where the drill starts below the floor, and how far into it it bites
const START_BELOW = 240;
const BITE_IN = 20;
const APPROACH_MS = 140;
const BITE = ARC_MS + APPROACH_MS;
// it stalls on the bite rumbling, then bores in shove by shove up to the
// floor's middle, then punches through
const STALL_MS = 420;
const RUMBLE_MS = 60;
const SHOVES = 8;
const BORE_MS = 1600;
const SHOVE_MS = 70;
const THROUGH = BITE + STALL_MS + BORE_MS + 150;
const SIZE = 130;
const JUDDER: [number, number] = [14, 6];
const SPRAY = 95;
const SPRAY_FADE_MS = 300;
const THROUGH_BLAST = 270;
const RUMBLE_SHAKE = 0.35;
const TAIL_MS = 900;

const shoveAt = (k: number) => BITE + STALL_MS + (k * BORE_MS) / SHOVES;

// how far it has bored, 0 at the bite to 1 at the floor's middle
function depthAt(ms: number): number {
  let d = 0;
  for (let k = 0; k < SHOVES; k++) {
    const since = ms - shoveAt(k);
    if (since < 0) break;
    d += Math.min(1, since / SHOVE_MS) ** 0.5;
  }
  return d / SHOVES;
}

const states = new WeakMap<
  Running,
  { bars: Point[]; tip: (ms: number) => Point | null }
>();
const start: Point = { x: 0, y: 0 };

registerFloorCrit("lockpickCrit", {
  plan(r, bars, hit) {
    for (let k = 0; k < SHOVES; k++) hit(0, shoveAt(k), 0);
    hit(0, THROUGH, 1);
    hit(0, ARC_MS, 0);
    const state = { bars, tip: (_ms: number): Point | null => null };
    const at: Point = { x: 0, y: 0 };
    // the tip: up from below the floor onto its bottom, juddering as it grinds
    state.tip = (ms) => {
      if (ms < ARC_MS || ms > THROUGH) return null;
      const mid = state.bars[0];
      const bottom = mid.y + FLOOR_H / 2;
      const grinding = ms >= BITE;
      const judder = grinding
        ? (holeHash(Math.floor(ms / 16), 7) - 0.5) *
          (ms < BITE + STALL_MS ? JUDDER[0] : JUDDER[1])
        : 0;
      at.x = mid.x + judder;
      at.y = grinding
        ? lerp(bottom - BITE_IN, mid.y, depthAt(ms))
        : lerp(
            bottom + START_BELOW,
            bottom - BITE_IN,
            ((ms - ARC_MS) / APPROACH_MS) ** 2,
          );
      return at;
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    const mid = bars[0];
    start.x = mid.x;
    start.y = mid.y + FLOOR_H / 2 + START_BELOW;
    if (ms < ARC_MS) {
      // one smooth arch from the middle to under the floor
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        start.x * p,
        start.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    drawDetonation(ctx, start, ms - ARC_MS, POP_BLAST, now);
    // rumbling all through the stall
    const due =
      ms < BITE
        ? 0
        : Math.min(
            STALL_MS / RUMBLE_MS,
            Math.floor((ms - BITE) / RUMBLE_MS) + 1,
          );
    while (r.kicked < due) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }
    const tip = state.tip(ms);
    const since = ms - BITE;
    if (since >= 0 && since < THROUGH - BITE + SPRAY_FADE_MS) {
      const fade = ms > THROUGH ? 1 - (ms - THROUGH) / SPRAY_FADE_MS : 1;
      drawDrillSpray(
        ctx,
        tip ?? mid,
        -Math.PI / 2,
        since,
        (0.7 + depthAt(ms) * 0.9) * fade,
        SPRAY,
        now,
      );
    }
    if (tip) {
      drawDrillHead(
        ctx,
        tip,
        -Math.PI / 2,
        SIZE,
        ms * (since >= 0 ? 0.06 : 0.03),
        now,
      );
      drawWisp(ctx, state.tip, ms, now, WISP_SIZE * 0.9, 1);
    }
    drawDetonation(ctx, mid, ms - THROUGH, THROUGH_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 3 : 0.7),
});
