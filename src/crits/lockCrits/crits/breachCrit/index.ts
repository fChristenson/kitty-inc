// Breach, a lock crit: the number arcs up under the locked floor and turns
// into a wisp gun hammering it all over with wisp bullets in quickening
// volleys, the floor glowing hotter with every hit, until it bursts open,
// unlocked
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { FLOOR_H } from "../../../../floors/constants";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  glowStops,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the number's arc to under the floor, where the gun hovers
const ARC_MS = 200;
const ARC_RISE = 120;
const GUN_BELOW = 110;
const POP_BLAST = 100;
const SHOTS = 18;
// the gap after each shot, quickening
const SHOT_GAP_MS: [number, number] = [120, 38];
// px per ms
const BULLET_SPEED = 3.4;
// where the shots land: up to this far either side of the floor's middle
const SPREAD_X = 520;
const SPREAD_Y = 250;
const MUZZLE_MS = 90;
const MUZZLE = 120;
const IMPACT_BLAST = 60;
const OPEN_GAP_MS = 150;
const OPEN_BLAST = 250;
// the cluster bursting round the open floor just after
const CLUSTER = 4;
const CLUSTER_MS = 70;
const CLUSTER_BLAST = 120;
const HEAT = 820;
const TAIL_MS = 900;

interface State {
  // the floor's middle where it was planned, to carry everything along a scroll
  home: Point;
  gun: Point;
  gunAt: () => Point;
  bullets: Bullet[];
  open: number;
  cluster: Point[];
}

const states = new WeakMap<Running, State>();
const HEAT_STOPS = glowStops(COLOR.heavenlyGold);

registerFloorCrit("breachCrit", {
  plan(r, bars, hit) {
    const home = { ...bars[0] };
    const gun = { x: home.x, y: home.y + FLOOR_H / 2 + GUN_BELOW };
    const bullets: Bullet[] = [];
    let t = ARC_MS;
    for (let k = 0; k < SHOTS; k++) {
      const to = {
        x: home.x + (holeHash(k, 81) * 2 - 1) * SPREAD_X,
        y: home.y + (holeHash(k, 82) * 2 - 1) * SPREAD_Y,
      };
      const bullet = aimBullet(gun, to, t, BULLET_SPEED);
      bullets.push(bullet);
      hit(0, bullet.hitAt, 0);
      t += lerp(SHOT_GAP_MS[0], SHOT_GAP_MS[1], k / (SHOTS - 1));
    }
    const open = Math.max(...bullets.map((b) => b.hitAt)) + OPEN_GAP_MS;
    hit(0, open, 1);
    hit(0, ARC_MS, 0);
    const cluster = Array.from({ length: CLUSTER }, (_, k) => ({
      x: home.x + Math.cos((k / CLUSTER) * Math.PI * 2 + 0.4) * SPREAD_X * 0.6,
      y: home.y + Math.sin((k / CLUSTER) * Math.PI * 2 + 0.4) * SPREAD_Y * 0.7,
    }));
    states.set(r, { home, gun, gunAt: () => gun, bullets, open, cluster });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const { home, gun, gunAt, bullets, open, cluster } = states.get(r)!;
    ctx.save();
    ctx.translate(bars[0].x - home.x, bars[0].y - home.y);
    if (ms < ARC_MS) {
      // one smooth arch from the middle up under the floor
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        gun.x * p,
        gun.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont,
      );
    }
    drawDetonation(ctx, gun, ms - ARC_MS, POP_BLAST, now);
    // the floor heating with every hit, then blowing
    let landed = 0;
    for (let k = 0; k < bullets.length; k++)
      if (ms >= bullets[k].hitAt) landed++;
    if (ms < open + 120) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha =
        (landed / SHOTS) * (ms < open ? 0.75 : 1 - (ms - open) / 120);
      drawGlow(ctx, HEAT_STOPS, home.x, home.y, HEAT, 0.5);
      ctx.restore();
    }
    if (ms >= ARC_MS && ms < open)
      drawWisp(ctx, gunAt, ms, now, WISP_SIZE * 1.7, 0.7);
    for (let k = 0; k < bullets.length; k++) {
      const b = bullets[k];
      if (ms < b.firedAt) break;
      drawMuzzleFlash(
        ctx,
        gun,
        Math.atan2(b.dy, b.dx),
        (ms - b.firedAt) / MUZZLE_MS,
        MUZZLE,
      );
      drawDetonation(ctx, b.to, ms - b.hitAt, IMPACT_BLAST, now);
    }
    drawBullets(ctx, bullets, ms, now, WISP_SIZE * 0.6, true);
    drawDetonation(ctx, home, ms - open, OPEN_BLAST, now);
    for (let k = 0; k < cluster.length; k++)
      drawDetonation(
        ctx,
        cluster[k],
        ms - open - (k + 1) * CLUSTER_MS,
        CLUSTER_BLAST,
        now,
      );
    ctx.restore();
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 1 ? 2.8 : 0.35),
});
