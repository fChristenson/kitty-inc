// Deep Breath, a lock crit: the number bursts into a ring of wisps hanging
// all round the dark locked floor, trembling; the lock starts to breathe in:
// field lines bow out to the nearest wisp and it's yanked in along them,
// a pop and a jolt, then the next and the next, quicker and quicker, the
// lock's glow swelling and trembling with each it swallows; it takes the
// last, collapses to a point and the floor bursts open, every wisp blown
// back out onto the new floor's bar with its levels
import meta from "./meta";
import { drawFieldLines } from "../../../../shared/animationStyles/pull";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const BURST_MS = 120;
// the wisps: WISPS round the lock RING of the room's half width out (squashed
// SQUASH), flung out over SPREAD_MS, trembling up to TREMBLE px
const WISPS = 10;
const RING = 0.8;
const SQUASH = 0.55;
const SPREAD_MS = 200;
const TREMBLE = 8;
const WISP = WISP_SIZE * 1.1;
// the breaths: the first FIRST_MS in, GAPS_MS apart (closing), each yanked
// in over YANK_MS along LINES field lines; the lock's glow GLOW
const FIRST_MS = BURST_MS + SPREAD_MS + 200;
const GAPS_MS: [number, number] = [220, 60];
const YANK_MS = 150;
const LINES = 3;
const GLOW = 300;
const POP = 110;
// collapsing over COLLAPSE_MS, the wisps blown out onto the bar over BLOW_MS
// (STAGGER_MS apart)
const COLLAPSE_MS = 100;
const BLOW_MS = 180;
const STAGGER_MS = 15;
const OPEN_BLAST = 440;
const BAR_BLAST = 240;
// shakes by step: a breath, the floor bursting open, onto its bar
const SHAKES = [0.6, 3.2, 1.4];

interface Wisp {
  home: Point;
  yank: number;
  lands: number;
  blownAt: number;
  to: Point;
  hang: (ms: number) => Point;
  blow: (ms: number) => Point;
}
interface State {
  wisps: Wisp[];
  openAt: number;
  landAt: number;
  bar: Point;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

registerFloorCrit("deepBreathCrit", {
  reward(t) {
    t.levelUp(t.count * meta.values.levels);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const room = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * RING;
    const box = getIncomeBarBox(false);
    const bar: Point = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const wisps: Wisp[] = [];
    let t = FIRST_MS;
    // breathed in one after another round the ring
    for (let k = 0; k < WISPS; k++) {
      const a = (k / WISPS) * Math.PI * 2 + holeHash(k, 9810) * 0.4;
      const home = { x: Math.cos(a) * room, y: Math.sin(a) * room * SQUASH };
      const yank = t;
      const lands = yank + YANK_MS;
      hit(0, lands, 0);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (WISPS - 1));
      const at: Point = { x: 0, y: 0 };
      const out: Point = { x: 0, y: 0 };
      const w: Wisp = {
        home,
        yank,
        lands,
        blownAt: 0,
        to: {
          x: bar.x + (holeHash(k, 9811) * 2 - 1) * box.width * 0.4,
          y: bar.y,
        },
        // flung out to its spot, hanging there trembling, then yanked in on a
        // bow, faster and faster
        hang: (ms) => {
          const s = clamp01((ms - BURST_MS) / SPREAD_MS);
          const e = 1 - (1 - s) ** 2;
          const shake = TREMBLE * clamp01((ms - FIRST_MS + 400) / 400);
          let x = home.x * e + Math.sin(ms * 0.07 + k) * shake;
          let y = home.y * e + Math.cos(ms * 0.09 + k) * shake;
          if (ms >= yank) {
            const u = clamp01((ms - yank) / YANK_MS) ** 3;
            const bow = Math.sin(Math.PI * u) * 0.3;
            const bx = x * (1 - u) - y * bow;
            const by = y * (1 - u) + x * bow;
            x = bx;
            y = by;
          }
          at.x = x;
          at.y = y;
          return at;
        },
        blow: (ms) => {
          const u = clamp01((ms - w.blownAt) / BLOW_MS);
          out.x = w.to.x * u;
          out.y = w.to.y * u - 180 * 4 * u * (1 - u);
          return out;
        },
      };
      wisps.push(w);
    }
    const openAt = wisps[WISPS - 1].lands + COLLAPSE_MS;
    hit(0, openAt, 1);
    wisps.forEach((w, k) => (w.blownAt = openAt + k * STAGGER_MS));
    const landAt = openAt + (WISPS - 1) * STAGGER_MS + BLOW_MS;
    hit(0, landAt, 2);
    states.set(r, { wisps, openAt, landAt, bar });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { wisps, openAt } = state;
    if (ms < BURST_MS) {
      const p = ms / BURST_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p,
        r.flashFont * (1 - 0.6 * p),
      );
      return;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    let swallowed = 0;
    for (const w of wisps) if (ms >= w.lands) swallowed++;
    const c = swallowed / wisps.length;
    trembleAt(c, ms, TREMBLE * 1.5, shiver);
    if (ms < openAt) {
      const collapse = clamp01((ms - openAt + COLLAPSE_MS) / COLLAPSE_MS);
      drawChargeGlow(ctx, shiver, c * (1 - collapse), GLOW, now);
    }
    for (let k = 0; k < wisps.length; k++) {
      const w = wisps[k];
      // the field lines bowing out to it as it's breathed in
      if (ms >= w.yank - 80 && ms < w.lands)
        drawFieldLines(
          ctx,
          ORIGIN,
          w.hang(ms),
          1 - clamp01((ms - w.yank) / YANK_MS),
          ms,
          60,
          LINES,
        );
      if (ms < w.lands)
        drawWispHead(
          ctx,
          w.hang,
          ms,
          now,
          WISP,
          clamp01((ms - w.yank + 300) / 300),
        );
      drawDetonation(ctx, ORIGIN, ms - w.lands, POP, now);
      drawWispBetween(
        ctx,
        w.blow,
        ms,
        now,
        WISP,
        1,
        w.blownAt,
        w.blownAt + BLOW_MS,
      );
    }
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
