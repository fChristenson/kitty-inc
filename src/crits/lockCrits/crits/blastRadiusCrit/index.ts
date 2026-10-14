// Blast Radius, a lock crit: the number slams onto the dark locked floor's
// lock as a big bomb on a lit fuse and flings a ring of smaller lit bombs out
// round the floor; their fuses fizz down and they blow in a chain racing
// round the ring, each blast setting off the next, quicker and quicker, a
// big blast and a shake each; then the bomb on the lock bursts into a
// cluster of bomblets that scatter and blow together, and the floor bursts
// open in the biggest blast: its button holds a charge of levels
import meta from "./meta";
import { addButtonCharge } from "../../../buttonCrits/buttonBonus";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number arcing onto the lock, then the ring flung out over FLING_MS to
// RING_W of the floor's half width and RING_H of its half height
const ARC_MS = 170;
const ARC_RISE = 120;
const FLING_MS = 260;
const RING_W = 0.8;
const RING_H = 0.62;
const CHARGES = 8;
// the chain: the first blows FUSE_MS after they land, each the next GAP_MS
// on (closing), the spark racing along to it
const FUSE_MS = 520;
const GAP_MS: [number, number] = [170, 60];
const CHAIN_BLAST: [number, number] = [120, 190];
// the cluster: CLUSTER bomblets out CLUSTER_OUT px over SCATTER_MS, CLUSTER_GAP_MS
// after the ring, blowing BOMBLET_GAP_MS apart
const CLUSTER_GAP_MS = 140;
const CLUSTER = 5;
const CLUSTER_OUT = 210;
const SCATTER_MS = 170;
const BOMBLET_GAP_MS = 40;
const BOMBLET_BLAST = 140;
const OPEN_GAP_MS = 90;
const OPEN_BLAST = 420;
const CHARGE_GAP_MS = 320;
const BOMB = WISP_SIZE * 0.9;
const BIG_BOMB = WISP_SIZE * 1.5;
const FUSE = 34;
const BIG_FUSE = 60;
const SPARK = 10;
// shakes by step: a blast, the floor bursting open, the charge
const SHAKES = [0.9, 3.4, 1];

interface State {
  // from the lock's middle
  ring: Point[];
  blows: number[];
  bomblets: Point[];
  scatterAt: number;
  bombletBlows: number[];
  openAt: number;
  landAt: number;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const tip: Point = { x: 0, y: 0 };
let held: Point = ORIGIN;
const heldAt = () => held;

registerFloorCrit("blastRadiusCrit", {
  reward(t) {
    addButtonCharge(t.floor, t.count * meta.values.levels);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const mid = (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x;
    const rx = ((FLOOR_X_MAX - FLOOR_X_MIN) / 2) * RING_W;
    const ry = (FLOOR_H / 2) * RING_H;
    const ring = Array.from({ length: CHARGES }, (_, k) => {
      const a = -Math.PI / 2 + (k / CHARGES) * Math.PI * 2;
      return { x: mid + Math.cos(a) * rx, y: Math.sin(a) * ry };
    });
    const landAt = ARC_MS + FLING_MS;
    const blows: number[] = [];
    let t = landAt + FUSE_MS;
    for (let k = 0; k < CHARGES; k++) {
      blows.push(t);
      hit(0, t, 0);
      t += lerp(GAP_MS[0], GAP_MS[1], k / (CHARGES - 1));
    }
    const scatterAt = blows[CHARGES - 1] + CLUSTER_GAP_MS;
    const bomblets = Array.from({ length: CLUSTER }, (_, k) => {
      const a = (k / CLUSTER) * Math.PI * 2 + 0.4;
      return {
        x: Math.cos(a) * CLUSTER_OUT,
        y: Math.sin(a) * CLUSTER_OUT * 0.6,
      };
    });
    const bombletBlows = bomblets.map(
      (_, k) => scatterAt + SCATTER_MS + k * BOMBLET_GAP_MS,
    );
    for (const at of bombletBlows) hit(0, at, 0);
    const openAt = bombletBlows[CLUSTER - 1] + OPEN_GAP_MS;
    hit(0, openAt, 1);
    hit(0, openAt + CHARGE_GAP_MS, 2);
    states.set(r, {
      ring,
      blows,
      bomblets,
      scatterAt,
      bombletBlows,
      openAt,
      landAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const { ring, blows, bomblets, bombletBlows } = state;
    // the big bomb on the lock, its fuse burning down to the cluster
    if (ms >= ARC_MS && ms < state.scatterAt) {
      const burn = (ms - ARC_MS) / (state.scatterAt - ARC_MS);
      drawLitFuse(ctx, ORIGIN, burn, BIG_FUSE, now);
      held = ORIGIN;
      drawWispHead(ctx, heldAt, ms, now, BIG_BOMB, burn);
    }
    // the ring: flung out, then fizzing till each blows
    const flung = clamp01((ms - ARC_MS) / FLING_MS);
    const out = 1 - (1 - flung) ** 2;
    for (let k = 0; k < CHARGES; k++) {
      if (ms < ARC_MS || ms >= blows[k]) continue;
      spot.x = ring[k].x * out;
      spot.y = ring[k].y * out - 120 * 4 * flung * (1 - flung);
      if (flung >= 1)
        drawLitFuse(
          ctx,
          spot,
          (ms - state.landAt) / (blows[k] - state.landAt),
          FUSE,
          now,
        );
      held = spot;
      drawWispHead(ctx, heldAt, ms, now, BOMB, 0.6);
    }
    // the spark racing along to the next in the chain
    for (let k = 0; k < CHARGES - 1; k++) {
      const u = (ms - blows[k]) / (blows[k + 1] - blows[k]);
      if (u < 0 || u >= 1) continue;
      tip.x = lerp(ring[k].x, ring[k + 1].x, u);
      tip.y = lerp(ring[k].y, ring[k + 1].y, u);
      drawBeam(ctx, ring[k], tip, SPARK, 1 - u * 0.5);
    }
    for (let k = 0; k < CHARGES; k++)
      drawDetonation(
        ctx,
        ring[k],
        ms - blows[k],
        lerp(CHAIN_BLAST[0], CHAIN_BLAST[1], k / (CHARGES - 1)),
        now,
      );
    // the cluster: bomblets scattering, then blowing together
    const scatter = clamp01((ms - state.scatterAt) / SCATTER_MS);
    for (let k = 0; k < CLUSTER; k++) {
      if (ms >= state.scatterAt && ms < bombletBlows[k]) {
        spot.x = bomblets[k].x * (1 - (1 - scatter) ** 2);
        spot.y = bomblets[k].y * (1 - (1 - scatter) ** 2);
        held = spot;
        drawWispHead(ctx, heldAt, ms, now, BOMB, 1);
      }
      drawDetonation(
        ctx,
        bomblets[k],
        ms - bombletBlows[k],
        BOMBLET_BLAST,
        now,
      );
    }
    drawDetonation(ctx, ORIGIN, ms - state.openAt, OPEN_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
