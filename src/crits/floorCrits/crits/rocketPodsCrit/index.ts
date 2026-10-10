// the rocket pods floor crit: the number drops to the street's corner as a
// launcher and ripple-fires a salvo of small rockets, a flash and a streak
// each, slamming all over the bars in view quick-fire; then one heavy rocket
// into its own bar, a huge blast and a cluster
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { groundY, holeHash } from "../../critPlayer/shared";

const RP_IN_MS = 220;
const RP_FIRST_MS = RP_IN_MS + 30;
const RP_ROCKETS = 18;
const RP_EVERY_MS = 50;
const RP_HEAVY_DELAY_MS = 130;
const RP_FLY_MS = 160;
const RP_HEAVY_FLY_MS = 260;
// rockets speed up all the way in
const RP_THRUST = 1.6;
// the launcher: across from the middle (of the viewport's width) and under
// the lowest bar
const RP_POD_X = 0.4;
const RP_BELOW = 200;
const RP_POD = 1;
const RP_ROCKET = 0.7;
const RP_HEAVY = 2.2;
const RP_MUZZLE_MS = 90;
const RP_MUZZLE = 180;
const RP_HEAVY_MUZZLE = 380;
const RP_KICK = 0.25;
const RP_HEAVY_KICK = 1;
const RP_BLAST = 150;
const RP_BOOM = 440;
const RP_CLUSTER = [-0.5, 0.5, -1, 1];
const RP_CLUSTER_MS = 45;
const RP_CLUSTER_BLAST = 170;
const RP_KICKED_BOOM = 1e6;
// shakes by step: a rocket's blast, the heavy one
const RP_SHAKES = [0.5, 3];
const RP_TAIL_MS = 1000;

interface Rocket {
  bar: number;
  side: number;
  fired: number;
  heavy: boolean;
}
const salvos = new WeakMap<Running, Rocket[]>();

const flyOf = (rocket: Rocket) => (rocket.heavy ? RP_HEAVY_FLY_MS : RP_FLY_MS);
const landAt = (rocket: Rocket) => rocket.fired + flyOf(rocket);

function planSalvo(bars: Point[]): Rocket[] {
  return Array.from({ length: RP_ROCKETS + 1 }, (_, i) => {
    const heavy = i === RP_ROCKETS;
    return {
      bar: heavy ? 0 : Math.floor(holeHash(i, 970) * bars.length),
      side: heavy ? 0 : (holeHash(i, 971) * 2 - 1) * 0.85,
      fired: RP_FIRST_MS + i * RP_EVERY_MS + (heavy ? RP_HEAVY_DELAY_MS : 0),
      heavy,
    };
  });
}

registerFloorCrit("rocketPodsCrit", {
  plan(r, bars, hit) {
    const salvo = planSalvo(bars);
    salvos.set(r, salvo);
    for (const rocket of salvo)
      hit(rocket.bar, landAt(rocket), rocket.heavy ? 1 : 0);
    const boom = landAt(salvo[RP_ROCKETS]);
    RP_CLUSTER.forEach((_, k) => hit(0, boom + (k + 1) * RP_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const salvo = salvos.get(r);
    if (!salvo) return;
    const now = r.startedAt + ms;
    const pod = {
      x: r.viewportWidth * RP_POD_X,
      y: groundY(r, bars, RP_BELOW),
    };
    const boom = landAt(salvo[RP_ROCKETS]);
    if (ms < RP_IN_MS) {
      const p = (ms / RP_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        pod.x * p,
        pod.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // a kick on every launch, then the heavy one's bang
    while (r.kicked <= RP_ROCKETS && salvo[r.kicked].fired <= ms) {
      r.shake(salvo[r.kicked].heavy ? RP_HEAVY_KICK : RP_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < RP_KICKED_BOOM) {
      r.kicked = RP_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= RP_IN_MS && ms < boom)
      drawWisp(ctx, () => pod, ms, now, WISP_SIZE * RP_POD, 0.5);

    for (const rocket of salvo) {
      const to = along(r, bars, rocket.bar, rocket.side);
      const fly = flyOf(rocket);
      drawWispBetween(
        ctx,
        (t) => {
          const p = clamp01((t - rocket.fired) / fly) ** RP_THRUST;
          return { x: lerp(pod.x, to.x, p), y: lerp(pod.y, to.y, p) };
        },
        ms,
        now,
        WISP_SIZE * (rocket.heavy ? RP_HEAVY : RP_ROCKET),
        1,
        rocket.fired,
        landAt(rocket),
      );
      drawMuzzleFlash(
        ctx,
        pod,
        Math.atan2(to.y - pod.y, to.x - pod.x),
        (ms - rocket.fired) / RP_MUZZLE_MS,
        rocket.heavy ? RP_HEAVY_MUZZLE : RP_MUZZLE,
      );
      drawDetonation(
        ctx,
        to,
        ms - landAt(rocket),
        rocket.heavy ? RP_BOOM : RP_BLAST,
        now,
      );
    }
    RP_CLUSTER.forEach((side, k) =>
      drawDetonation(
        ctx,
        along(r, bars, 0, side),
        ms - boom - (k + 1) * RP_CLUSTER_MS,
        RP_CLUSTER_BLAST,
        now,
      ),
    );
  },
  tailMs: RP_TAIL_MS,
  shake: (step) => RP_SHAKES[step] ?? RP_SHAKES[0],
});
