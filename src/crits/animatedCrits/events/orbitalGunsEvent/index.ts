// the "Orbital Guns" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while three gun wisps fly out of
// the clicked floor's button and lock into orbit round a worker, whirling
// round it and firing inward as they go, a ring of muzzle flashes and
// bullets converging on it, the last round striking with a pop and a jolt
// as the worker climbs a perma tier; then the ring flies on to the next
// worker, spinning ever faster, the last volley landing in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "orbitalGuns";
const MAX_WORKERS = 5;
const GUNS = 3;
const ORBIT = 110;
const SHOTS = 3;
const SPEED = 1.6;
const MOVE_MS = 180;
const FLASH_MS = 70;
const GUN = 0.38;
const BULLET = WISP_SIZE * 0.26;
const BANG_GAP_MS = 60;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceOrbitalGunsEvent = registerWispEvent(
  KEY,
  "Orbital Guns",
  () => CONFIG.orbitalGunsEvent.chance,
  (floor, context) => {
    const { orbitsMs, lapsHz, holdMs, mergeMs } = CONFIG.orbitalGunsEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const orbits = workers.map((worker, k) => {
      const arrives = clock + MOVE_MS;
      const span = lerp(orbitsMs, k / Math.max(1, workers.length - 1));
      const ends = arrives + span;
      clock = ends;
      const hz = lerp(lapsHz, k / Math.max(1, workers.length - 1));
      const angle = (g: number, ms: number) =>
        (g / GUNS) * Math.PI * 2 + ((ms - arrives) / 1000) * hz * Math.PI * 2;
      // every gun fires SHOTS times inward while it whirls
      const bullets: Bullet[] = [];
      for (let g = 0; g < GUNS; g++)
        for (let s = 0; s < SHOTS; s++) {
          const fires =
            arrives + ((s + g / GUNS) / SHOTS) * (span - ORBIT / SPEED);
          const a = angle(g, fires);
          bullets.push(
            aimBullet(
              {
                x: worker.at.x + Math.cos(a) * ORBIT,
                y: worker.at.y + Math.sin(a) * ORBIT,
              },
              worker.at,
              fires,
              SPEED,
            ),
          );
        }
      return {
        worker,
        arrives,
        ends,
        angle,
        bullets,
        lands: Math.max(...bullets.map((b) => b.hitAt)),
      };
    });
    const last = orbits[orbits.length - 1];
    const endAt = last.lands;
    const bullets = orbits.flatMap((o) => o.bullets);
    const guns = Array.from({ length: GUNS }, (_, g) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        let k = 0;
        while (k + 1 < orbits.length && ms >= orbits[k + 1].arrives - MOVE_MS)
          k++;
        const o = orbits[k];
        const a = o.angle(g, Math.max(ms, o.arrives));
        const tx = o.worker.at.x + Math.cos(a) * ORBIT;
        const ty = o.worker.at.y + Math.sin(a) * ORBIT;
        if (ms >= o.arrives) {
          at.x = tx;
          at.y = ty;
          return at;
        }
        const prev = orbits[k - 1];
        const pa = prev ? prev.angle(g, prev.ends) : 0;
        const fx = prev ? prev.worker.at.x + Math.cos(pa) * ORBIT : button.x;
        const fy = prev ? prev.worker.at.y + Math.sin(pa) * ORBIT : button.y;
        const u = easeOut(clamp01((ms - (o.arrives - MOVE_MS)) / MOVE_MS));
        at.x = lerp([fx, tx], u);
        at.y = lerp([fy, ty], u);
        return at;
      };
    });
    let lastBang = -Infinity;

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.2);
        if (!cover!.isLive() || b.hitAt - lastBang < BANG_GAP_MS) return;
        lastBang = b.hitAt;
        playBloop();
        shakeScreen(0.3);
      },
    );
    const promoting = createBeats(
      orbits,
      (o) => o.lands,
      (o, k) => {
        cover!.promote(o.worker);
        if (o === last) {
          cover!.blast(o.worker.at);
          return;
        }
        cover!.burst(o.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, orbits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          pinging.tick(ms, now);
          promoting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, 38);
          }
          for (const gun of guns)
            drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
