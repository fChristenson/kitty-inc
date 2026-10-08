// the "Gunship" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a gunship wisp roars out of the clicked
// floor's button and starts circling the whole screen in a wide orbit,
// banking ever faster; as it comes round it opens up inward with its side
// guns, burst after burst of wisp bullets hammering onto an empty spot on
// a floor in view, where a new worker forms out of the flash with a bang
// and a jolt; the last burst lands in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "gunship";
const MAX_HIRES = 5;
const FORM_MS = 300;
// the orbit is ORBIT of the screen's size round; it laps LAPS times, ever
// faster; bursts of SHOTS shots FIRE_MS apart
const ORBIT = 0.42;
const LAPS = 1.6;
const SHOTS = 4;
const FIRE_MS = 50;
const SPEED = 2.8;
const SHIP = 0.7;
const BULLET = WISP_SIZE * 0.28;
const MUZZLE = 40;
const FLASH_MS = 50;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceGunshipEvent = registerWispEvent(
  KEY,
  "Gunship",
  () => CONFIG.gunshipEvent.chance,
  (floor, context, area) => {
    const { enterMs, orbitMs, holdMs, mergeMs } = CONFIG.gunshipEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const rx = ((area.right - area.left) / 2) * ORBIT * 2;
    const ry = ((area.bottom - area.top) / 2) * ORBIT * 2;
    const orbitAt = (ms: number, into: Point): Point => {
      const u = clamp01((ms - enterMs) / orbitMs);
      const a = Math.PI / 2 + Math.PI * 2 * LAPS * u ** 1.3;
      const ox = center.x + Math.cos(a) * rx;
      const oy = center.y + Math.sin(a) * ry;
      if (ms < enterMs) {
        const v = easeOut(ms / enterMs);
        into.x = lerp([button.x, ox], v);
        into.y = lerp([button.y, oy], v);
      } else {
        into.x = ox;
        into.y = oy;
      }
      return into;
    };
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const bursts = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const fires = enterMs + orbitMs * ((k + 0.6) / (hires.length + 0.4));
      let hits = 0;
      for (let i = 0; i < SHOTS; i++) {
        const at = fires + i * FIRE_MS;
        const from = orbitAt(at, { x: 0, y: 0 });
        const b = aimBullet(from, spot, at, SPEED);
        bullets.push(b);
        flashes.push({
          at,
          from,
          angle: Math.atan2(spot.y - from.y, spot.x - from.x),
        });
        hits = b.hitAt;
      }
      return { hire, spot, hits };
    });
    bursts.sort((a, b) => a.hits - b.hits);
    const last = bursts[bursts.length - 1];
    const endAt = Math.max(enterMs + orbitMs, last.hits);
    const shipAt: Point = { x: 0, y: 0 };
    const ship = (ms: number) => (ms > endAt ? null : orbitAt(ms, shipAt));

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.12),
    );
    const hiring = createBeats(
      bursts,
      (b) => b.hits,
      (b, k) => {
        giveHire(b.hire);
        if (b === last) {
          cover!.blast(b.spot);
          return;
        }
        cover!.burst(b.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bursts.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          pinging.tick(ms, now);
          hiring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(ctx, ship, ms, now, WISP_SIZE * SHIP, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
