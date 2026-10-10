// the tesla cannon floor crit: the number drops to the street corner as a
// crackling coil that fires bolts up at the bars in view, each forking into
// three strikes along a bar at once, quicker and quicker; then it lets go one
// giant discharge that forks onto every bar in view at once and into its own
// bar in a huge blast
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { groundY, holeHash, ownLast } from "../../critPlayer/shared";

const TC_IN_MS = 220;
const TC_FIRST_MS = TC_IN_MS + 80;
const TC_SHOTS = 8;
// the gaps between shots, quickening, then before the discharge
const TC_GAP_MS: [number, number] = [170, 70];
const TC_LAST_GAP_MS = 120;
const TC_FORKS = 3;
const TC_FINALE_FORKS = 2;
const TC_FORK_STAGGER_MS = 15;
const TC_REACH = 0.85;
// the coil: out past its own bar's left end, down by the street
const TC_OUT = 120;
const TC_BELOW = 260;
const TC_CHARGE_MS = 300;
const TC_BOLT_MS = 140;
const TC_BIG_MS = 260;
const TC_BOLT = 1;
const TC_BIG_BOLT = 1.4;
const TC_OWN_BOLT = 2.8;
const TC_OWN_STRIKE = 2.4;
const TC_BLAST = 140;
const TC_BIG_BLAST = 200;
const TC_BOOM = 440;
const TC_CLUSTER = [-0.5, 0.5, -1, 1];
const TC_CLUSTER_MS = 45;
const TC_CLUSTER_BLAST = 170;
const TC_KICKED_BOOM = 1e6;
// shakes by step: a fork striking, its own bar
const TC_SHAKES = [0.4, 3];
const TC_TAIL_MS = 1000;

interface Fork {
  bar: number;
  side: number;
  at: number;
  bolt: Bolt;
}
interface Shot {
  at: number;
  forks: Fork[];
}
interface Cannon {
  shots: Shot[];
  // the discharge's forks onto every other bar, and the one into its own
  finale: Fork[];
  own: Bolt;
  boom: number;
  coil: Point;
  coilAt: () => Point;
}
const cannons = new WeakMap<Running, Cannon>();

const newBolt = () => createBolt({ x: 0, y: 0 }, { x: 0, y: -800 }, 1);

function planCannon(bars: Point[]): Cannon {
  const order = ownLast(bars);
  const others = order.length > 1 ? order.slice(0, -1) : order;
  let clock = TC_FIRST_MS;
  const shots: Shot[] = [];
  for (let i = 0; i < TC_SHOTS; i++) {
    const bar = others[i % others.length];
    shots.push({
      at: clock,
      forks: Array.from({ length: TC_FORKS }, (_, j) => ({
        bar,
        side: (holeHash(i * TC_FORKS + j, 1200) * 2 - 1) * TC_REACH,
        at: clock + j * TC_FORK_STAGGER_MS,
        bolt: newBolt(),
      })),
    });
    clock +=
      i < TC_SHOTS - 1
        ? lerp(...TC_GAP_MS, i / (TC_SHOTS - 2))
        : TC_LAST_GAP_MS;
  }
  const boom = clock;
  const finale = order.slice(0, -1).flatMap((bar) =>
    Array.from({ length: TC_FINALE_FORKS }, (_, j) => ({
      bar,
      side: (holeHash(bar * TC_FINALE_FORKS + j, 1300) * 2 - 1) * TC_REACH,
      at: boom,
      bolt: newBolt(),
    })),
  );
  const coil = { x: 0, y: 0 };
  return {
    shots,
    finale,
    own: createBolt({ x: 0, y: 0 }, { x: 0, y: -800 }, 2),
    boom,
    coil,
    coilAt: () => coil,
  };
}

function drawFork(
  ctx: CanvasRenderingContext2D,
  r: Running,
  bars: Point[],
  coil: Point,
  f: Fork,
  fade: number,
  scale: number,
  now: number,
): void {
  const spot = along(r, bars, f.bar, f.side);
  f.bolt.from.x = coil.x;
  f.bolt.from.y = coil.y;
  f.bolt.to.x = spot.x;
  f.bolt.to.y = spot.y;
  drawBolt(ctx, f.bolt, fade, scale);
  drawStrike(ctx, f.bolt.to, fade, scale, now);
}

registerFloorCrit("teslaCannonCrit", {
  plan(r, bars, hit) {
    const cannon = planCannon(bars);
    cannons.set(r, cannon);
    for (const s of cannon.shots) for (const f of s.forks) hit(f.bar, f.at, 0);
    for (const f of cannon.finale) hit(f.bar, f.at, 0);
    hit(0, cannon.boom, 1);
    TC_CLUSTER.forEach((_, k) =>
      hit(0, cannon.boom + (k + 1) * TC_CLUSTER_MS, 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const cannon = cannons.get(r);
    if (!cannon) return;
    const now = r.startedAt + ms;
    const { shots, finale, own, boom, coil } = cannon;
    coil.x = along(r, bars, 0, -1).x - TC_OUT;
    coil.y = groundY(r, bars, TC_BELOW);
    if (ms < TC_IN_MS) {
      const p = (ms / TC_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        coil.x * p,
        coil.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= boom && r.kicked < TC_KICKED_BOOM) {
      r.kicked = TC_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= TC_IN_MS && ms < boom + TC_BOLT_MS) {
      const charge = clamp01((ms - (boom - TC_CHARGE_MS)) / TC_CHARGE_MS);
      drawWisp(ctx, cannon.coilAt, ms, now, WISP_SIZE * (1 + charge));
      drawStrike(ctx, coil, 0.4 + 0.6 * charge, 1 + charge, now);
    }
    for (const s of shots) {
      const t = ms - s.at;
      if (t < 0 || t >= TC_BOLT_MS) continue;
      for (const f of s.forks)
        drawFork(ctx, r, bars, coil, f, 1 - t / TC_BOLT_MS, TC_BOLT, now);
    }
    const t = ms - boom;
    if (t >= 0 && t < TC_BIG_MS) {
      const fade = 1 - t / TC_BIG_MS;
      for (const f of finale)
        drawFork(ctx, r, bars, coil, f, fade, TC_BIG_BOLT, now);
      own.from.x = coil.x;
      own.from.y = coil.y;
      own.to.x = bars[0].x;
      own.to.y = bars[0].y;
      drawBolt(ctx, own, fade, TC_OWN_BOLT);
      drawStrike(ctx, own.to, fade, TC_OWN_STRIKE, now);
    }
    for (const s of shots)
      for (const f of s.forks) {
        const since = ms - f.at;
        if (since < 0 || since >= 1000) continue;
        drawDetonation(
          ctx,
          along(r, bars, f.bar, f.side),
          since,
          TC_BLAST,
          now,
        );
      }
    for (const f of finale)
      drawDetonation(ctx, along(r, bars, f.bar, f.side), t, TC_BIG_BLAST, now);
    drawDetonation(ctx, bars[0], t, TC_BOOM, now);
    for (let k = 0; k < TC_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, TC_CLUSTER[k]),
        t - (k + 1) * TC_CLUSTER_MS,
        TC_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: TC_TAIL_MS,
  shake: (step) => TC_SHAKES[step] ?? TC_SHAKES[0],
});
