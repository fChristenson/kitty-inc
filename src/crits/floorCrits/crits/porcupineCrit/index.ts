// Porcupine, a floor crit: the number shrinks into a turret wisp that
// bristles: it fires rings of wisp bullets out every way at once, each ring
// denser and sooner than the last, a flash and a kick each, the bullets
// that meet a bar blasting it; charged up, it whirls into a four-armed
// spiral spraying bullets ever faster, each arm crossing a bar slamming a
// fat round into it; then it swells and fires one slug into its own bar in
// a huge blast
import {
  aimBullet,
  bulletRing,
  bulletSpiral,
  drawBullets,
  drawMuzzleFlash,
  type Box,
  type Bullet,
  type Spiral,
} from "../../../../shared/animationStyles/bullets";
import {
  chargeAt,
  drawChargeGlow,
  planCharge,
  tickCharge,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";

const IN_MS = 160;
// the rings: RING_COUNTS bullets each, the first FIRST_MS in, then GAPS_MS
const FIRST_MS = IN_MS + 140;
const RING_COUNTS = [12, 16, 22, 28];
const GAPS_MS = [330, 240, 170];
const SPEED = 2.4;
const RING_BLAST: [number, number] = [90, 160];
const RING_KICK: [number, number] = [0.6, 1.2];
// the spiral: ARMS arms over SPIRAL_MS, SPIRAL_GAP_MS after the last ring
const SPIRAL_GAP_MS = 200;
const SPIRAL_MS = 480;
const ARMS = 4;
const RATE_HZ: [number, number] = [18, 46];
const LAPS_HZ: [number, number] = [0.8, 2.6];
const SPIRAL_KICK_MS = 60;
const SPIRAL_KICK = 0.35;
// the slug into its own bar, SLUG_GAP_MS after the spiral
const SLUG_GAP_MS = 160;
const SLUG_SPEED = 3;
const SLUG_MUZZLE = 340;
const MUZZLE_MS = 120;
const TURRET: [number, number] = [0.9, 1.8];
const GLOW = 260;
const BULLET = WISP_SIZE * 0.5;
const ROUND = WISP_SIZE * 0.8;
const SLUG = WISP_SIZE * 1.6;
const HIT_BLAST = 90;
const ROUND_BLAST = 150;
const SLUG_BLAST = 420;
// shakes by step: a ring bullet in a bar, a spiral round, the slug
const SHAKES = [0.5, 0.9, 3];

interface Hit {
  bar: number;
  ms: number;
  step: number;
}
interface State {
  rings: number[];
  spray: Bullet[];
  // the bullets that land on bars, and their blasts
  shots: Bullet[];
  hits: Hit[];
  spiralFrom: number;
  slug: Bullet;
  charge: Charge;
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const turretAt = () => ORIGIN;

// the spiral's first arm's angle at ms (as bulletSpiral turns it)
function armAngle(spiral: Spiral, ms: number): number {
  const s = (ms - spiral.fromMs) / 1000;
  const span = (spiral.toMs - spiral.fromMs) / 1000;
  const [l0, l1] = spiral.lapsHz;
  return (
    spiral.turn +
    spiral.spin * Math.PI * 2 * (l0 * s + ((l1 - l0) * s * s) / (2 * span))
  );
}

registerFloorCrit("porcupineCrit", {
  // a ring bullet lands a level, a spiral round the crit's multiple
  levels: (count, step) => (step === 0 ? 1 : count),
  plan(r, bars, hit) {
    const half = r.viewportWidth / 2;
    const box: Box = {
      left: -half,
      right: half,
      top: -r.viewportWidth * 1.2,
      bottom: r.viewportWidth * 1.2,
    };
    const spray: Bullet[] = [];
    const shots: Bullet[] = [];
    const hits: Hit[] = [];
    const rings: number[] = [];
    let t = FIRST_MS;
    RING_COUNTS.forEach((count, k) => {
      rings.push(t);
      spray.push(
        ...bulletRing(ORIGIN, count, t, SPEED, box, (k * Math.PI) / count),
      );
      for (let bar = 1; bar < bars.length; bar++) {
        const shot = aimBullet(ORIGIN, bars[bar], t, SPEED);
        shots.push(shot);
        hits.push({ bar, ms: shot.hitAt, step: 0 });
      }
      t += GAPS_MS[k] ?? 0;
    });
    const spiralFrom = t + SPIRAL_GAP_MS;
    const spiral: Spiral = {
      arms: ARMS,
      rateHz: RATE_HZ,
      lapsHz: LAPS_HZ,
      fromMs: spiralFrom,
      toMs: spiralFrom + SPIRAL_MS,
      turn: 0,
      spin: 1,
    };
    spray.push(...bulletSpiral(ORIGIN, spiral, SPEED, box));
    // a fat round down each bar the first time an arm sweeps past it
    const sector = (Math.PI * 2) / ARMS;
    for (let bar = 1; bar < bars.length; bar++) {
      const aim = Math.atan2(bars[bar].y, bars[bar].x);
      let last = -1;
      for (let ms = spiral.fromMs; ms < spiral.toMs; ms++) {
        const off = (((armAngle(spiral, ms) - aim) % sector) + sector) % sector;
        // an arm just swept past it: the offset wrapped round
        if (off >= last) {
          last = off;
          continue;
        }
        const shot = aimBullet(ORIGIN, bars[bar], ms, SPEED);
        shots.push(shot);
        hits.push({ bar, ms: shot.hitAt, step: 1 });
        break;
      }
    }
    const slug = aimBullet(
      ORIGIN,
      bars[0],
      spiral.toMs + SLUG_GAP_MS,
      SLUG_SPEED,
    );
    for (const h of hits) hit(h.bar, h.ms, h.step);
    hit(0, slug.hitAt, 2);
    states.set(r, {
      rings,
      spray,
      shots,
      hits,
      spiralFrom,
      slug,
      charge: planCharge(FIRST_MS, slug.firedAt - FIRST_MS, { bang: false }),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.7 * p), {
        alpha: 1 - p,
      });
    }
    // a kick at every ring, then a rattle through the spiral
    const rings = state.rings.length;
    while (r.kicked < rings && ms >= state.rings[r.kicked]) {
      r.shake(lerp(RING_KICK[0], RING_KICK[1], r.kicked / (rings - 1)));
      r.kicked++;
    }
    while (
      r.kicked >= rings &&
      ms >= state.spiralFrom + (r.kicked - rings) * SPIRAL_KICK_MS &&
      ms < state.spiralFrom + SPIRAL_MS
    ) {
      r.shake(SPIRAL_KICK);
      r.kicked++;
    }
    tickCharge(state.charge, ms, r.shake);
    const c = chargeAt(state.charge, ms);
    const fired = state.slug.firedAt;
    if (ms >= IN_MS && ms < fired) {
      drawChargeGlow(ctx, ORIGIN, c, GLOW, now);
      drawWisp(
        ctx,
        turretAt,
        ms,
        now,
        WISP_SIZE * lerp(TURRET[0], TURRET[1], c),
        c,
      );
    }
    for (let k = 0; k < rings; k++)
      drawDetonation(
        ctx,
        ORIGIN,
        ms - state.rings[k],
        lerp(RING_BLAST[0], RING_BLAST[1], k / (rings - 1)),
        now,
      );
    drawBullets(ctx, state.spray, ms, now, BULLET);
    drawBullets(ctx, state.shots, ms, now, ROUND);
    for (const h of state.hits)
      drawDetonation(
        ctx,
        bars[h.bar],
        ms - h.ms,
        h.step ? ROUND_BLAST : HIT_BLAST,
        now,
      );
    const slug = state.slug;
    drawMuzzleFlash(
      ctx,
      ORIGIN,
      Math.atan2(slug.dy, slug.dx),
      clamp01((ms - fired) / MUZZLE_MS),
      SLUG_MUZZLE,
    );
    drawWispBetween(ctx, slug.at, ms, now, SLUG, 1, fired, slug.hitAt);
    drawDetonation(ctx, bars[0], ms - slug.hitAt, SLUG_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
