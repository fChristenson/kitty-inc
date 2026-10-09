// the revolver floor crit: the number flies to the screen's side and fans the
// hammer: six heavy shots in a blink, each a big muzzle flash, a kick, a
// streak and a big blast on a bar in view; the cylinder spins and it fans six
// more, the last into its own bar with a huge blast
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const RV_IN_MS = 220;
const RV_FIRST_MS = RV_IN_MS + 60;
const RV_SHOTS = 12;
const RV_CYLINDER = 6;
const RV_FAN_MS = 65;
const RV_SPIN_MS = 220;
// the gun: across and up from the middle (of the viewport's width)
const RV_GUN: Point = { x: 0.42, y: -0.1 };
const RV_GUN_SIZE = 1.2;
const RV_HIT_MS = 30;
const RV_STREAK_MS = 70;
const RV_STREAK = 34;
const RV_LAST_STREAK = 70;
const RV_MUZZLE_MS = 110;
const RV_MUZZLE = 280;
const RV_LAST_MUZZLE = 380;
const RV_BLAST = 190;
const RV_BOOM = 440;
const RV_KICK = 0.6;
// the cylinder's whirl of glitter as it spins
const RV_WHIRL = 6;
const RV_WHIRL_R = 70;
const RV_WHIRL_SIZE = 34;
const RV_KICKED_BOOM = 1e6;
// shakes by step: a shot's blast, the last one
const RV_SHAKES = [0.9, 3];
const RV_TAIL_MS = 1000;

interface Shot {
  bar: number;
  side: number;
  at: number;
}
const cylinders = new WeakMap<Running, Shot[]>();

const shotAt = (i: number) =>
  RV_FIRST_MS + i * RV_FAN_MS + (i >= RV_CYLINDER ? RV_SPIN_MS : 0);

function planShots(bars: Point[]): Shot[] {
  return Array.from({ length: RV_SHOTS }, (_, i) => {
    const last = i === RV_SHOTS - 1;
    return {
      bar: last ? 0 : Math.floor(holeHash(i, 890) * bars.length),
      side: last ? 0 : (holeHash(i, 891) * 2 - 1) * 0.8,
      at: shotAt(i),
    };
  });
}

registerFloorCrit("revolverCrit", {
  plan(r, bars, hit) {
    const shots = planShots(bars);
    cylinders.set(r, shots);
    shots.forEach((s, i) =>
      hit(s.bar, s.at + RV_HIT_MS, i === RV_SHOTS - 1 ? 1 : 0),
    );
  },
  draw(ctx, r, ms, bars) {
    const shots = cylinders.get(r);
    if (!shots) return;
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const gun = { x: w * RV_GUN.x, y: w * RV_GUN.y };
    const boom = shots[RV_SHOTS - 1].at + RV_HIT_MS;
    if (ms < RV_IN_MS) {
      const p = (ms / RV_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        gun.x * p,
        gun.y * p,
        lerp(r.flashFont, 0, p),
      );
    }

    // every shot's kick, then the last one's bang
    while (r.kicked < RV_SHOTS && shots[r.kicked].at <= ms) {
      r.shake(RV_KICK);
      r.kicked++;
    }
    if (ms >= boom && r.kicked < RV_KICKED_BOOM) {
      r.kicked = RV_KICKED_BOOM;
      playExplosion();
    }

    if (ms >= RV_IN_MS && ms < boom) {
      drawWisp(ctx, () => gun, ms, now, WISP_SIZE * RV_GUN_SIZE);
      // the cylinder spinning between the fans
      const spin = ms - shots[RV_CYLINDER - 1].at;
      if (spin > RV_HIT_MS && spin < RV_SPIN_MS + RV_HIT_MS) {
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < RV_WHIRL; i++) {
          const a = spin * 0.06 + (i / RV_WHIRL) * Math.PI * 2;
          stampGlimmer(
            ctx,
            gun.x + Math.cos(a) * RV_WHIRL_R,
            gun.y + Math.sin(a) * RV_WHIRL_R,
            RV_WHIRL_SIZE,
            i,
            i % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
        }
        ctx.globalCompositeOperation = previous;
      }
    }

    shots.forEach((s, i) => {
      const last = i === RV_SHOTS - 1;
      const to = last ? bars[0] : along(r, bars, s.bar, s.side);
      const t = ms - s.at;
      if (t >= 0 && t < RV_STREAK_MS)
        drawBeam(
          ctx,
          gun,
          to,
          last ? RV_LAST_STREAK : RV_STREAK,
          1 - t / RV_STREAK_MS,
        );
      drawMuzzleFlash(
        ctx,
        gun,
        Math.atan2(to.y - gun.y, to.x - gun.x),
        t / RV_MUZZLE_MS,
        last ? RV_LAST_MUZZLE : RV_MUZZLE,
      );
      drawDetonation(ctx, to, t - RV_HIT_MS, last ? RV_BOOM : RV_BLAST, now);
    });
  },
  tailMs: RV_TAIL_MS,
  shake: (step) => RV_SHAKES[step] ?? RV_SHAKES[0],
});
