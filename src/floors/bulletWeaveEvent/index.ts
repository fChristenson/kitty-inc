// the "Bullet Weave" event (gunfire; worker perma tiers): it covers its
// crit, whose click freezes the screen while two gun wisps flank a worker
// and fire interleaved streams of bullet wisps back and forth across it,
// each bullet riding a wave so the streams cross and recross in a woven
// lattice, muzzle flashes and pops at every shot; when the weave is done
// the worker flashes, a bang and a jolt, and climbs a perma tier; worker
// after worker, each weave quicker, the last one tightening and blasting in
// a huge flash and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "bulletWeave";
const MAX_WORKERS = 5;
const SPAN = 120;
const SHOTS = 10;
const FLIGHT_MS = 190;
// each bullet waves WAVES times across the line, AMP px, the last weave
// tightening to TIGHT of it
const WAVES = 1.5;
const AMP = 46;
const TIGHT = 0.3;
const APPEAR_MS = 120;
const OVERLAP_MS = 60;
const FLASH_MS = 70;
const MUZZLE = 40;
const GUN = 0.42;
const BULLET = WISP_SIZE * 0.24;
const DONE_SHAKE: [number, number] = [0.8, 1.4];
const POP_GAP_MS = 50;

interface Weave {
  worker: RewardWorker;
  guns: { at: (ms: number) => Point; angle: number; spot: Point }[];
  starts: number;
  done: number;
  bullets: Bullet[];
}

// a straight shot from `from` to `to`, riding a wave across its line
function wavingBullet(
  from: Point,
  to: Point,
  firedAt: number,
  amp: number,
  phase: number,
): Bullet {
  const base = aimBullet(
    from,
    to,
    firedAt,
    Math.hypot(to.x - from.x, to.y - from.y) / FLIGHT_MS,
  );
  const spot: Point = { x: 0, y: 0 };
  return {
    ...base,
    at: (ms) => {
      const p = base.at(ms);
      if (!p) return null;
      const u = (ms - firedAt) / FLIGHT_MS;
      const s =
        Math.sin(u * Math.PI * 2 * WAVES + phase) * amp * Math.sin(u * Math.PI);
      spot.x = p.x - base.dy * s;
      spot.y = p.y + base.dx * s;
      return spot;
    },
  };
}

export const forceBulletWeaveEvent = registerWispEvent(
  KEY,
  "Bullet Weave",
  () => CONFIG.bulletWeaveEvent.chance,
  (floor, context) => {
    const { weavesMs, holdMs, mergeMs } = CONFIG.bulletWeaveEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const n = workers.length;
    let clock = 0;
    const weaves: Weave[] = workers.map((worker, k) => {
      const u = k / Math.max(1, n - 1);
      const last = k === n - 1;
      const weaveMs = lerp(weavesMs, u);
      const starts = clock;
      const firing = starts + APPEAR_MS;
      const done = firing + weaveMs;
      clock = done - OVERLAP_MS;
      const left: Point = { x: worker.at.x - SPAN, y: worker.at.y };
      const right: Point = { x: worker.at.x + SPAN, y: worker.at.y };
      const guns = [left, right].map((spot, g) => {
        const at: Point = { x: 0, y: 0 };
        return {
          spot,
          angle: g === 0 ? 0 : Math.PI,
          at: (ms: number): Point => {
            const grow = easeOut(clamp01((ms - starts) / APPEAR_MS));
            at.x = lerp([worker.at.x, spot.x], grow);
            at.y = spot.y + Math.sin(Math.max(0, ms) / 70 + g * Math.PI) * 4;
            return at;
          },
        };
      });
      const bullets = Array.from({ length: SHOTS }, (_, i) => {
        const g = i % 2;
        const f = i / (SHOTS - 1);
        const amp = AMP * (last ? lerp([1, TIGHT], f) : 1);
        return wavingBullet(
          g === 0 ? left : right,
          g === 0 ? right : left,
          firing + (weaveMs - FLIGHT_MS) * f,
          amp,
          // alternate crossings so the streams interleave into a lattice
          (Math.floor(i / 2) % 2) * Math.PI,
        );
      });
      return { worker, guns, starts, done, bullets };
    });
    const last = weaves[n - 1];
    const endAt = last.done;
    const bullets = weaves.flatMap((w) => w.bullets);
    let lastPop = -Infinity;

    const popping = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.15);
        if (!cover!.isLive() || b.hitAt - lastPop < POP_GAP_MS) return;
        lastPop = b.hitAt;
        playBloop();
      },
    );
    const finishing = createBeats(
      weaves,
      (w) => w.done,
      (w, k) => {
        cover!.promote(w.worker);
        if (w === last) {
          cover!.blast(w.worker.at);
          return;
        }
        cover!.burst(w.worker.at, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DONE_SHAKE, k / Math.max(1, n - 1)));
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
          popping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const w of weaves) {
            if (ms < w.starts || ms > w.done + 400) continue;
            for (const b of w.bullets) {
              const t = (ms - b.firedAt) / FLASH_MS;
              if (t <= 0 || t >= 1) continue;
              const gun = b.dx > 0 ? w.guns[0] : w.guns[1];
              drawMuzzleFlash(ctx, gun.spot, gun.angle, t, MUZZLE);
            }
            for (const gun of w.guns)
              drawWispBetween(
                ctx,
                gun.at,
                ms,
                now,
                WISP_SIZE * GUN,
                0.6,
                w.starts,
                w.done,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
