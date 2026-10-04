// the "Deflector" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a gun wisp at the screen's left edge opens
// fire on a bar of light spinning flat out in the middle of the screen;
// every round glances off it at a new angle, each timed to the spin so it
// flies off onto an empty spot, ever faster; every hit a pop and a jolt as
// the spot charges up with glitter, and its last hit bursts it into a new
// worker, the final one in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "deflector";
const MAX_HIRES = 3;
const MIN_SHOTS = 6;
const GUN_IN = 40;
// px the shots land over each spot, and the deflector's length and width
const ABOVE = 40;
const BAR = 150;
const BAR_W = 12;
// the deflector's half turn, ms (a bar looks the same turned half round)
const HALF_TURN_MS = 180;
const FIRST_HIT = 320;
const OUT_SPEED = 1.25;
const GUN = 0.7;
const BULLET = WISP_SIZE * 0.5;
const MUZZLE = 60;
const MUZZLE_MS = 90;
const GLANCE_MS = 140;
const GLANCE = 46;
const CHARGE = 5;
const CHARGE_R = 34;
const HIT_SHAKE: [number, number] = [0.4, 0.9];
const HIRE_SHAKE = 1.2;

interface Shot {
  hire: RewardHire;
  to: Point;
  into: Bullet;
  out: Bullet;
  lands: boolean;
}

export const forceDeflectorEvent = registerWispEvent(
  KEY,
  "Deflector",
  () => CONFIG.deflectorEvent.chance,
  (floor, context, area) => {
    const { fireMs, speed, holdMs, mergeMs } = CONFIG.deflectorEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const deflector: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const gun: Point = { x: area.left + GUN_IN, y: deflector.y };
    const inAngle = Math.atan2(deflector.y - gun.y, deflector.x - gun.x);
    const flight = Math.hypot(deflector.x - gun.x, deflector.y - gun.y) / speed;
    const spin = Math.PI / HALF_TURN_MS;
    const count = Math.max(MIN_SHOTS, hires.length * 3);
    const targets = hires.map((h) => ({ x: h.x, y: h.y - ABOVE }));
    const lastFor = hires.map((_, k) => {
      let last = k;
      while (last + hires.length < count) last += hires.length;
      return last;
    });

    // each glances off when the spinning bar lies along the mirror line
    // between the incoming shot and its spot
    const shots: Shot[] = [];
    let earliest: number = FIRST_HIT + flight;
    for (let j = 0; j < count; j++) {
      const k = j % hires.length;
      const to = targets[k];
      const out = Math.atan2(to.y - deflector.y, to.x - deflector.x);
      const nx = Math.cos(out) - Math.cos(inAngle);
      const ny = Math.sin(out) - Math.sin(inAngle);
      const line = Math.atan2(ny, nx) + Math.PI / 2;
      const turns = Math.ceil((spin * earliest - line) / Math.PI);
      const hitAt = (line + turns * Math.PI) / spin;
      shots.push({
        hire: hires[k],
        to,
        into: aimBullet(gun, deflector, hitAt - flight, speed),
        out: aimBullet(deflector, to, hitAt, speed * OUT_SPEED),
        lands: lastFor[k] === j,
      });
      earliest = hitAt + lerp(fireMs, j / (count - 1));
    }
    const last = shots[shots.length - 1];
    const endAt = last.out.hitAt + 400;
    const bullets = shots.flatMap((s) => [s.into, s.out]);
    const hits = hires.map(() => 0);
    const gunAt = () => gun;
    const deflectorAt = () => deflector;
    const end1: Point = { x: 0, y: 0 };
    const end2: Point = { x: 0, y: 0 };

    let bloop = -Infinity;
    const landing = createBeats(
      shots,
      (s) => s.out.hitAt,
      (s, j) => {
        const k = hires.indexOf(s.hire);
        hits[k]++;
        if (s === last) {
          giveHire(s.hire);
          cover!.blast(s.to);
          return;
        }
        if (s.lands) giveHire(s.hire);
        cover!.burst(s.to, s.lands ? 0.8 : 0.35);
        if (!cover!.isLive()) return;
        if (s.lands) {
          playExplosion();
          shakeScreen(HIRE_SHAKE);
          return;
        }
        if (s.out.hitAt - bloop > 60) {
          bloop = s.out.hitAt;
          playBloop();
        }
        shakeScreen(lerp(HIT_SHAKE, j / (shots.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          drawRewardHires(ctx, hires, now);
          const live = ms <= last.out.hitAt;
          // the spots charging up with every hit
          for (let k = 0; k < hires.length; k++) {
            const lit = hires[k].hiredAt === null ? hits[k] * CHARGE : 0;
            for (let i = 0; i < lit; i++) {
              const a = (i / lit) * Math.PI * 2 + ms * 0.006;
              drawGlitterLight(
                ctx,
                targets[k].x + Math.cos(a) * CHARGE_R,
                targets[k].y + Math.sin(a) * CHARGE_R,
                10,
                i + k * 20,
                1,
                now,
              );
            }
          }
          if (live) {
            const a = spin * ms;
            end1.x = deflector.x - (Math.cos(a) * BAR) / 2;
            end1.y = deflector.y - (Math.sin(a) * BAR) / 2;
            end2.x = deflector.x + (Math.cos(a) * BAR) / 2;
            end2.y = deflector.y + (Math.sin(a) * BAR) / 2;
            drawBeam(ctx, end1, end2, BAR_W, 0.9);
            drawWispHead(ctx, deflectorAt, ms, now, WISP_SIZE * 0.4, 0.6);
            drawWispHead(ctx, gunAt, ms, now, WISP_SIZE * GUN, 0.8);
          }
          for (const s of shots) {
            drawMuzzleFlash(
              ctx,
              gun,
              inAngle,
              (ms - s.into.firedAt) / MUZZLE_MS,
              MUZZLE,
            );
            const t = (ms - s.out.firedAt) / GLANCE_MS;
            if (t >= 0 && t < 1)
              drawBeamFlare(
                ctx,
                deflector,
                GLANCE * (1 - t),
                clamp01(1 - t),
                now,
              );
          }
          drawBullets(ctx, bullets, ms, now, BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
