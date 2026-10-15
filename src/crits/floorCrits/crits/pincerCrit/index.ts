// Pincer, a floor crit: the number splits into two gun wisps that shoot out
// to either side of the screen; they snap level with the top bar and fire at
// each other, shots meeting head-on over the bar in a flash and a pop, pair
// after pair, quicker each, then a blast into the bar with its levels; they
// snap down to the next bar and the next, firing faster each; at its own bar
// they fire a long volley, the last pair the biggest, meeting in the
// biggest blast
import { drawMuzzleFlash } from "../../../../shared/animationStyles/bullets";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, ownLast } from "../../critPlayer/shared";

const IN_MS = 120;
const OUT_MS = 130;
// the guns EDGE px in from the screen's sides, aiming at a point UP px over
// each bar's middle, snapping level over SNAP_MS
const EDGE = 70;
const UP = 70;
const SNAP_MS = 70;
const GUN = WISP_SIZE * 1.3;
// a bar: PAIRS pairs (its own OWN_PAIRS), PAIR_MS apart (quicker each bar),
// shots flying SPEED px/ms; its blast BAR_GAP_MS after the last pair
const PAIRS = 3;
const OWN_PAIRS = 6;
const PAIR_MS: [number, number] = [110, 60];
const SPEED = 7;
const SHOT = WISP_SIZE * 0.7;
const BAR_GAP_MS = 40;
const MUZZLE_MS = 80;
const MUZZLE = 150;
const MEET = 90;
const BLAST = 170;
const OWN_BLAST = 420;
// shakes by step: a bar, its own
const SHAKES = [0.9, 2.8];

interface Pair {
  fired: number;
  meets: number;
  // the bar it's over (index into the plan's order) and its size
  k: number;
  big: number;
}
interface Target {
  bar: number;
  own: boolean;
  from: number;
  blast: number;
}
interface State {
  targets: Target[];
  pairs: Pair[];
  // live: each target's meeting point and the guns
  meets: Point[];
  guns: Point[];
  shots: ((ms: number) => Point)[][];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const gunAt: Point = { x: 0, y: 0 };
const atGun = () => gunAt;

registerFloorCrit("pincerCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const half = r.viewportWidth / 2 - EDGE;
    const targets: Target[] = [];
    const pairs: Pair[] = [];
    // the shots fly half the screen; the guns are level with the target
    const flight = half / SPEED;
    let t = IN_MS + OUT_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const from = t;
      t += SNAP_MS;
      const count = own ? OWN_PAIRS : PAIRS;
      const gap = lerp(
        PAIR_MS[0],
        PAIR_MS[1],
        k / Math.max(1, order.length - 1),
      );
      for (let i = 0; i < count; i++) {
        pairs.push({
          fired: t,
          meets: t + flight,
          k,
          big: own && i === count - 1 ? 2 : 1,
        });
        t += gap;
      }
      const blast = t - gap + flight + BAR_GAP_MS;
      targets.push({ bar, own, from, blast });
      hit(bar, blast, own ? 1 : 0);
      t = Math.max(t, blast - flight);
    });
    const meets = targets.map(() => ({ x: 0, y: 0 }));
    const guns = [
      { x: -half, y: 0 },
      { x: half, y: 0 },
    ];
    // each pair's two shots, from either gun onto its meeting point
    const shots = pairs.map((p) =>
      [0, 1].map((side) => {
        const at: Point = { x: 0, y: 0 };
        return (ms: number): Point => {
          const u = clamp01((ms - p.fired) / (p.meets - p.fired));
          const m = meets[p.k];
          at.x = lerp(guns[side].x, m.x, u);
          at.y = m.y;
          return at;
        };
      }),
    );
    states.set(r, { targets, pairs, meets, guns, shots });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { targets, pairs, meets, guns, shots } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - 0.5 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    for (let k = 0; k < targets.length; k++) {
      const bar = bars[targets[k].bar];
      meets[k].x = bar.x;
      meets[k].y = bar.y - BAR_HALF_H - UP;
    }
    // a whoosh as they snap onto each bar
    while (r.kicked < targets.length && ms >= targets[r.kicked].from) {
      playSwoosh();
      r.kicked++;
    }
    // the guns: out to the sides, then snapping level with each target
    let k = 0;
    while (k < targets.length - 1 && ms >= targets[k + 1].from) k++;
    const snap = clamp01((ms - targets[k].from) / SNAP_MS);
    const y =
      k > 0
        ? lerp(meets[k - 1].y, meets[k].y, snap)
        : meets[0].y * clamp01((ms - IN_MS) / OUT_MS);
    const out = clamp01((ms - IN_MS) / OUT_MS);
    const last = targets[targets.length - 1];
    if (ms >= IN_MS && ms < last.blast) {
      const heat = clamp01((ms - IN_MS) / (last.blast - IN_MS));
      // the pair fired last, flashing at both muzzles
      let fired = -1;
      for (let i = 0; i < pairs.length && ms >= pairs[i].fired; i++) fired = i;
      const since = fired >= 0 ? ms - pairs[fired].fired : Infinity;
      for (let side = 0; side < 2; side++) {
        gunAt.x = guns[side].x * out;
        gunAt.y = y;
        drawWispHead(ctx, atGun, ms, now, GUN, heat);
        if (since < MUZZLE_MS)
          drawMuzzleFlash(
            ctx,
            gunAt,
            side ? Math.PI : 0,
            since / MUZZLE_MS,
            MUZZLE * pairs[fired].big,
          );
      }
    }
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      for (let side = 0; side < 2; side++)
        drawWispBetween(
          ctx,
          shots[i][side],
          ms,
          now,
          SHOT * p.big,
          1,
          p.fired,
          p.meets,
        );
      spot.x = meets[p.k].x;
      spot.y = meets[p.k].y;
      drawDetonation(ctx, spot, ms - p.meets, MEET * p.big * p.big, now);
    }
    for (let t = 0; t < targets.length; t++) {
      const bar = bars[targets[t].bar];
      spot.x = bar.x;
      spot.y = bar.y;
      drawDetonation(
        ctx,
        spot,
        ms - targets[t].blast,
        targets[t].own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
