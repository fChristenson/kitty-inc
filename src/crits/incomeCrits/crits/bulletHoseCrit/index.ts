// the bullet hose income crit: the number climbs under the total and hoses a
// quickening stream of wisp bullets up into it, the hits walking back and
// forth across the readout; then it fires itself in as one heavy slug
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

const RISE_MS = 180;
const FIRE_MS = 200;
const SHOTS = 18;
const FLY_MS = 120;
// the gap between shots, closing by QUICKEN_MS over the stream
const FIRST_GAP_MS = 62;
const QUICKEN_MS = 26;
// the gun's spot, of the way up to the total
const GUN_AT = 0.4;
const MUZZLE_ABOVE = 70;
const SWEEP_X = 300;
const SWEEP_STEP = 0.9;
const SPREAD_Y = 60;
const GUN_FONT = 130;
const SLUG_FONT = 80;
const SLUG_DELAY_MS = 130;
const SLUG_MS = 140;
const SLUG_STRETCH = 0.6;
const KICK = 22;
const KICK_MS = 40;
const FLASH_MS = 60;
const FLASH_SIZE = 120;
const BULLET = WISP_SIZE * 0.8;
const BULLET_HEAT = 0.8;
const BLAST = 160;
// shakes by step: a bullet, the slug
const SHAKES = [0.6, 2.4];

interface Shot {
  at: number;
  to: Point;
  path: (ms: number) => Point;
}
interface Hose {
  gun: Point;
  muzzle: Point;
  shots: Shot[];
  slugAt: number;
  endAt: number;
}
const hoses = new WeakMap<Running, Hose>();

function planHose(to: Point): Hose {
  const gun = { x: to.x * GUN_AT, y: to.y * GUN_AT };
  const muzzle = { x: gun.x, y: gun.y - MUZZLE_ABOVE };
  const shots: Shot[] = [];
  for (let k = 0; k < SHOTS; k++) {
    const at = FIRE_MS + k * (FIRST_GAP_MS - (QUICKEN_MS * k) / SHOTS);
    const spot = {
      x: to.x + Math.sin(k * SWEEP_STEP) * SWEEP_X,
      y: to.y + (holeHash(k, 61) - 0.5) * SPREAD_Y,
    };
    shots.push({
      at,
      to: spot,
      path: (ms) => {
        const u = clamp01((ms - at) / FLY_MS);
        return { x: lerp(muzzle.x, spot.x, u), y: lerp(muzzle.y, spot.y, u) };
      },
    });
  }
  const slugAt = shots[SHOTS - 1].at + SLUG_DELAY_MS;
  return { gun, muzzle, shots, slugAt, endAt: slugAt + SLUG_MS };
}

registerFloorCrit("bulletHoseCrit", {
  plan(r, bars, hit) {
    const hose = planHose(bars[0]);
    hoses.set(r, hose);
    for (const s of hose.shots) hit(0, s.at + FLY_MS);
    hit(0, hose.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const hose = hoses.get(r);
    if (!hose) return;
    const now = r.startedAt + ms;
    const { gun, muzzle, shots } = hose;
    for (let k = 0; k < shots.length; k++) {
      const s = shots[k];
      drawWispBetween(
        ctx,
        s.path,
        ms,
        now,
        BULLET,
        BULLET_HEAT,
        s.at,
        s.at + FLY_MS,
      );
      drawMuzzleFlash(
        ctx,
        muzzle,
        -Math.PI / 2,
        (ms - s.at) / FLASH_MS,
        FLASH_SIZE,
      );
      drawDetonation(ctx, s.to, ms - s.at - FLY_MS, BLAST, now);
    }
    if (ms < FIRE_MS) {
      const u = smoothstep(clamp01(ms / RISE_MS));
      drawText(
        ctx,
        r.glyphs,
        r.label,
        gun.x * u,
        gun.y * u,
        lerp(r.flashFont, GUN_FONT, u),
      );
    } else if (ms < hose.slugAt) {
      // kicked down by the latest shot
      let kick = 0;
      for (let k = shots.length - 1; k >= 0; k--)
        if (ms >= shots[k].at) {
          kick = Math.exp(-(ms - shots[k].at) / KICK_MS);
          break;
        }
      drawText(ctx, r.glyphs, r.label, gun.x, gun.y + KICK * kick, GUN_FONT);
    } else if (ms < hose.endAt) {
      const to = bars[0];
      const p = ((ms - hose.slugAt) / SLUG_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(gun.x, to.x, p),
        lerp(gun.y, to.y, p),
        lerp(GUN_FONT, SLUG_FONT, p),
        {
          along: Math.atan2(to.y - gun.y, to.x - gun.x),
          stretch: 1 + SLUG_STRETCH * p,
        },
      );
    }
    drawFinale(ctx, bars[0], ms - hose.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
