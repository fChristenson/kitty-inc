// the bank shots floor crit: the number flies to the top corner and fires
// shots that bank off the screen's sides, zigzagging down the building, a
// spark at every bounce and a blast wherever a shot crosses a bar in view;
// then a fat slug banks twice and slams into its own bar in a huge blast
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
import { groundY, skyY } from "../../critPlayer/shared";

const BS_IN_MS = 220;
const BS_FIRST_MS = BS_IN_MS + 20;
const BS_EVERY_MS = 80;
// each shot's heading off straight down, towards the far side
const BS_ANGLES = [0.9, 1.15, 0.7, 1.25, 1, 1.2];
// speed, of the viewport's width a ms
const BS_SPEED = 0.0096;
const BS_SLUG_DELAY_MS = 200;
const BS_SLUG_MS = 300;
// the walls it banks off, of the viewport's width from the middle
const BS_WALL = 0.47;
// the gun: just in from the left wall, over the top bar, and how far under
// the lowest bar shots fly out
const BS_GUN_IN = 30;
const BS_ABOVE = 230;
const BS_BELOW = 150;
const BS_GUN = 1;
const BS_SHOT = 0.8;
const BS_SLUG = 2;
const BS_MUZZLE_MS = 100;
const BS_MUZZLE = 200;
const BS_SLUG_MUZZLE = 360;
// a shot only blasts a bar it crosses this far in from its ends
const BS_BAR_IN = 40;
const BS_SPARK = 70;
const BS_SPARK_KICK = 0.2;
const BS_BLAST = 140;
const BS_SLUG_BLAST = 180;
const BS_BOOM = 440;
const BS_CLUSTER = [-0.5, 0.5, -1, 1];
const BS_CLUSTER_MS = 45;
const BS_CLUSTER_BLAST = 170;
const BS_KICKED_BOOM = 1e6;
// shakes by step: a crossing's blast, the slug
const BS_SHAKES = [0.5, 3];
const BS_TAIL_MS = 1000;

interface Crossing {
  bar: number;
  x: number;
  at: number;
}
interface Shot {
  path: (ms: number) => Point;
  heading: number;
  fired: number;
  end: number;
  crossings: Crossing[];
  slug: boolean;
}
interface Volley {
  gun: Point;
  shots: Shot[];
  // every bounce off a wall, in order
  bounces: { at: number; p: Point }[];
}
const volleys = new WeakMap<Running, Volley>();

function planVolley(r: Running, bars: Point[], playBar: number): Volley {
  const w = r.viewportWidth;
  const left = -w * BS_WALL;
  const span = 2 * w * BS_WALL;
  const gun = { x: left + BS_GUN_IN, y: skyY(r, bars, BS_ABOVE) };
  const bottom = groundY(r, bars, BS_BELOW);
  // x along the unfolded line, folded back between the walls
  const fold = (u: number) => {
    const s = (((u - left) % (2 * span)) + 2 * span) % (2 * span);
    return left + (s < span ? s : 2 * span - s);
  };
  const bounces: Volley["bounces"] = [];
  const shoot = (
    vx: number,
    vy: number,
    fired: number,
    flyMs: number,
    slug: boolean,
  ): Shot => {
    const path = (t: number): Point => {
      const dt = clamp01((t - fired) / flyMs) * flyMs;
      return { x: fold(gun.x + vx * dt), y: gun.y + vy * dt };
    };
    for (let k = 1; ; k++) {
      const dt = (left + k * span - gun.x) / vx;
      if (dt >= flyMs) break;
      bounces.push({ at: fired + dt, p: path(fired + dt) });
    }
    const crossings: Crossing[] = [];
    bars.forEach((b, bar) => {
      if (slug && bar === 0) return;
      const dt = (b.y - gun.y) / vy;
      if (dt <= 0 || dt >= flyMs) return;
      const x = fold(gun.x + vx * dt);
      if (Math.abs(x - b.x) <= playBar - BS_BAR_IN)
        crossings.push({ bar, x: x - b.x, at: fired + dt });
    });
    return {
      path,
      heading: Math.atan2(vy, vx),
      fired,
      end: fired + flyMs,
      crossings,
      slug,
    };
  };
  const speed = w * BS_SPEED;
  const shots = BS_ANGLES.map((a, i) => {
    const vy = speed * Math.cos(a);
    return shoot(
      speed * Math.sin(a),
      vy,
      BS_FIRST_MS + i * BS_EVERY_MS,
      (bottom - gun.y) / vy,
      false,
    );
  });
  // the slug: right, banking off both walls, onto its own bar's middle
  const own = bars[0];
  const reach = left + 2 * span + (own.x - left) - gun.x;
  const slugFired =
    BS_FIRST_MS + (BS_ANGLES.length - 1) * BS_EVERY_MS + BS_SLUG_DELAY_MS;
  shots.push(
    shoot(
      reach / BS_SLUG_MS,
      (own.y - gun.y) / BS_SLUG_MS,
      slugFired,
      BS_SLUG_MS,
      true,
    ),
  );
  bounces.sort((a, b) => a.at - b.at);
  return { gun, shots, bounces };
}

registerFloorCrit("bankShotsCrit", {
  plan(r, bars, hit) {
    const volley = planVolley(r, bars, r.play.barHalfWidth);
    volleys.set(r, volley);
    for (const s of volley.shots)
      for (const c of s.crossings) hit(c.bar, c.at, 0);
    const boom = volley.shots[volley.shots.length - 1].end;
    hit(0, boom, 1);
    BS_CLUSTER.forEach((_, k) => hit(0, boom + (k + 1) * BS_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const volley = volleys.get(r);
    if (!volley) return;
    const now = r.startedAt + ms;
    const { gun, shots, bounces } = volley;
    const slug = shots[shots.length - 1];
    const boom = slug.end;
    if (ms < BS_IN_MS) {
      const p = (ms / BS_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        gun.x * p,
        gun.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // a jolt at every bounce, then the slug's bang
    while (r.kicked < bounces.length && bounces[r.kicked].at <= ms) {
      r.shake(BS_SPARK_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < BS_KICKED_BOOM) {
      r.kicked = BS_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= BS_IN_MS && ms < slug.fired)
      drawWisp(ctx, () => gun, ms, now, WISP_SIZE * BS_GUN);
    for (const s of shots) {
      drawWispBetween(
        ctx,
        s.path,
        ms,
        now,
        WISP_SIZE * (s.slug ? BS_SLUG : BS_SHOT),
        1,
        s.fired,
        s.end,
      );
      drawMuzzleFlash(
        ctx,
        gun,
        s.heading,
        (ms - s.fired) / BS_MUZZLE_MS,
        s.slug ? BS_SLUG_MUZZLE : BS_MUZZLE,
      );
      for (const c of s.crossings)
        drawDetonation(
          ctx,
          { x: bars[c.bar].x + c.x, y: bars[c.bar].y },
          ms - c.at,
          s.slug ? BS_SLUG_BLAST : BS_BLAST,
          now,
        );
    }
    for (const b of bounces) drawDetonation(ctx, b.p, ms - b.at, BS_SPARK, now);
    drawDetonation(ctx, bars[0], ms - boom, BS_BOOM, now);
    BS_CLUSTER.forEach((side, k) =>
      drawDetonation(
        ctx,
        along(r, bars, 0, side),
        ms - boom - (k + 1) * BS_CLUSTER_MS,
        BS_CLUSTER_BLAST,
        now,
      ),
    );
  },
  tailMs: BS_TAIL_MS,
  shake: (step) => BS_SHAKES[step] ?? BS_SHAKES[0],
});
