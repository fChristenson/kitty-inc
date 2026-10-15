// Broadside, a button crit: the number bursts into a column of cannon wisps,
// one left of every button in view like a ship's gun deck; they fire rolling
// broadsides down the column, each gun a fanned volley into its button's
// end with a muzzle flash and a kick back, each broadside quicker, denser
// and tighter; then the guns tremble and glow and all fire at once, every
// button blasting and turning over, its own last and biggest: each of its
// next taps also pays out the floor with the fewest workers
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import type { Floor } from "../../../../gameState";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the guns burst out of the number over DEAL_MS, landing GAP px left of
// their buttons
const DEAL_MS = 150;
const GAP = 170;
const END_X = -BTN_W / 2;
const GUN_X = END_X - GAP;
const GUN = WISP_SIZE * 1.2;
const OWN_GUN = WISP_SIZE * 1.6;
// rolling broadsides: shots per volley, the ripple's span down the column
// and the pause after each
const SHOTS = [3, 4, 5];
const RIPPLE_MS = [300, 200, 110];
const PAUSE_MS = [150, 100, 0];
const SPREAD_Y = BTN_H * 0.35;
// the guns charging, then the climax volley, its own LAG_MS after the rest
const CHARGE_MS = 240;
const FINAL_SHOTS = 7;
const OWN_SHOTS = 11;
const FINAL_SPREAD_Y = BTN_H * 0.48;
const LAG_MS = 60;
const TREMBLE = 9;
// px per ms: a volley crosses to its button in about 120ms
const SPEED = 1.4;
const ROUND = WISP_SIZE * 0.45;
const OWN_ROUND = WISP_SIZE * 0.6;
const RECOIL = 30;
const RECOIL_MS = 60;
const FLASH_MS = 80;
const FLASH = 80;
const FINAL_FLASH = 150;
const SPARK = 60;
const SPARK_MS = 140;
const BLAST = 180;
const OWN_BLAST = 380;
const FADE_MS = 160;
// shakes by step: a volley, a button, its own
const SHAKES = [0.35, 1.2, 3];

interface Gun {
  bar: number;
  own: boolean;
  // its spot, from its button's middle
  at: Point;
  shots: Bullet[];
  // each volley's firing and landing
  fires: number[];
  lands: number[];
  doneMs: number;
}
interface State {
  guns: Gun[];
  chargeFrom: number;
  climax: number;
  // every volley and every shot across the guns, flat, each with its gun
  volleyGun: Uint8Array;
  volleyFire: Float32Array;
  volleyLand: Float32Array;
  volleyLast: Uint8Array;
  shots: Bullet[];
  shotGun: Uint8Array;
  // per gun, this frame: its kick and its muzzle
  kicks: Float32Array;
  muzzleX: Float32Array;
  muzzleY: Float32Array;
}
const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };
const atHead = () => head;
const muzzle: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };

// each tap also paying out the open floor with the fewest workers
const volleyTaps = defineTapPerk("Volley", (t) => {
  let fewest: Floor | null = null;
  for (const floor of t.floors)
    if (floor.unlocked && (!fewest || floor.workerCount < fewest.workerCount))
      fewest = floor;
  if (fewest) t.payout(fewest, 1);
});

registerFloorCrit("broadsideCrit", {
  reward(t) {
    volleyTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    // down the column, top to bottom
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const guns: Gun[] = order.map((bar) => ({
      bar,
      own: bar === 0,
      at: { x: GUN_X, y: 0 },
      shots: [],
      fires: [],
      lands: [],
      doneMs: 0,
    }));
    const volley = (
      gun: Gun,
      ms: number,
      count: number,
      spread: number,
      step: number,
    ) => {
      let landed = ms;
      for (let i = 0; i < count; i++) {
        const n = gun.shots.length;
        const to = {
          x: END_X + 4,
          y:
            (i / (count - 1) - 0.5) * 2 * spread +
            (holeHash(n + gun.bar * 50, 6120) - 0.5) * 8,
        };
        const shot = aimBullet(gun.at, to, ms, SPEED);
        gun.shots.push(shot);
        landed = Math.max(landed, shot.hitAt);
      }
      gun.fires.push(ms);
      gun.lands.push(landed);
      gun.doneMs = landed;
      hit(gun.bar, landed, step);
    };
    const between = Math.max(1, guns.length - 1);
    let t = IN_MS + DEAL_MS;
    let lastFire = t;
    for (let b = 0; b < SHOTS.length; b++) {
      for (let k = 0; k < guns.length; k++) {
        lastFire = t + (RIPPLE_MS[b] * k) / between;
        volley(guns[k], lastFire, SHOTS[b], SPREAD_Y, 0);
      }
      t = lastFire + PAUSE_MS[b];
    }
    const chargeFrom = lastFire + FLASH_MS;
    const climax = lastFire + CHARGE_MS;
    for (const gun of guns)
      if (gun.own) volley(gun, climax + LAG_MS, OWN_SHOTS, FINAL_SPREAD_Y, 2);
      else volley(gun, climax, FINAL_SHOTS, FINAL_SPREAD_Y, 1);
    const volleyGun: number[] = [];
    const volleyFire: number[] = [];
    const volleyLand: number[] = [];
    const volleyLast: number[] = [];
    const shots: Bullet[] = [];
    const shotGun: number[] = [];
    guns.forEach((gun, k) => {
      gun.fires.forEach((fire, v) => {
        volleyGun.push(k);
        volleyFire.push(fire);
        volleyLand.push(gun.lands[v]);
        volleyLast.push(v === gun.fires.length - 1 ? 1 : 0);
      });
      for (const shot of gun.shots) {
        shots.push(shot);
        shotGun.push(k);
      }
    });
    states.set(r, {
      guns,
      chargeFrom,
      climax,
      volleyGun: Uint8Array.from(volleyGun),
      volleyFire: Float32Array.from(volleyFire),
      volleyLand: Float32Array.from(volleyLand),
      volleyLast: Uint8Array.from(volleyLast),
      shots,
      shotGun: Uint8Array.from(shotGun),
      kicks: new Float32Array(guns.length),
      muzzleX: new Float32Array(guns.length),
      muzzleY: new Float32Array(guns.length),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { guns, chargeFrom, climax, volleyGun, volleyFire, volleyLast } =
      state;
    const { kicks, muzzleX, muzzleY, shots, shotGun, volleyLand } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.5 * (ms / IN_MS)),
        { alpha: 1 - ms / IN_MS },
      );
    const dealt = clamp01((ms - IN_MS * 0.5) / DEAL_MS);
    if (dealt <= 0) return;
    const e = 1 - (1 - dealt) ** 3;
    // charging up to the climax: trembling harder, glowing hotter
    const c =
      ms < climax ? clamp01((ms - chargeFrom) / (climax - chargeFrom)) : 0;
    const warm = clamp01(ms / climax);
    kicks.fill(0);
    for (let v = 0; v < volleyFire.length; v++) {
      const since = ms - volleyFire[v];
      if (since < 0 || since > RECOIL_MS * 6) continue;
      kicks[volleyGun[v]] +=
        Math.exp(-since / RECOIL_MS) * (volleyLast[v] ? 1.6 : 1);
    }
    for (let k = 0; k < guns.length; k++) {
      const gun = guns[k];
      const button = bars[gun.bar];
      ctx.translate(button.x, button.y);
      const kick = Math.min(1.6, kicks[k]);
      const size = (gun.own ? OWN_GUN : GUN) * (0.4 + 0.6 * e) * (1 + 0.35 * c);
      trembleAt(c, ms + k * 53, TREMBLE, shiver);
      head.x = lerp(-button.x, gun.at.x, e) - RECOIL * kick + shiver.x;
      head.y = lerp(-button.y, gun.at.y, e) + shiver.y;
      drawWispHead(
        ctx,
        atHead,
        ms,
        now,
        size,
        Math.min(1, 0.3 * warm + c + 0.5 * kick),
        1 - clamp01((ms - gun.doneMs) / FADE_MS),
      );
      drawBullets(ctx, gun.shots, ms, now, gun.own ? OWN_ROUND : ROUND);
      muzzleX[k] = button.x + head.x + size * 0.4;
      muzzleY[k] = button.y + head.y;
      ctx.translate(-button.x, -button.y);
    }
    for (let v = 0; v < volleyFire.length; v++) {
      const since = ms - volleyFire[v];
      if (since < 0 || since >= FLASH_MS) continue;
      const k = volleyGun[v];
      muzzle.x = muzzleX[k];
      muzzle.y = muzzleY[k];
      drawMuzzleFlash(
        ctx,
        muzzle,
        0,
        since / FLASH_MS,
        (volleyLast[v] ? FINAL_FLASH : FLASH) * (guns[k].own ? 1.3 : 1),
      );
    }
    // a spark where every shot lands
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const since = ms - shot.hitAt;
      if (since < 0 || since >= SPARK_MS) continue;
      const gun = guns[shotGun[i]];
      const button = bars[gun.bar];
      stampGlimmer(
        ctx,
        button.x + shot.to.x,
        button.y + shot.to.y,
        SPARK * (gun.own ? 1.4 : 1) * (1 - since / SPARK_MS),
        i,
        i % 2 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the rolling volleys land in sparks; only the climax detonates
    for (let v = 0; v < volleyLand.length; v++) {
      if (!volleyLast[v]) continue;
      const since = ms - volleyLand[v];
      if (since < 0 || since >= DETONATION_MS) continue;
      const gun = guns[volleyGun[v]];
      const button = bars[gun.bar];
      blast.x = button.x + END_X;
      blast.y = button.y;
      drawDetonation(ctx, blast, since, gun.own ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
