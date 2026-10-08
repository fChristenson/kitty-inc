// the "Sentry Turret" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a turret wisp drops out of the
// clicked floor's button into the middle of the screen and its muzzle
// swings round to an income bar, locks on and rattles off a burst of wisp
// bullets into it, each a flash and a pop, landing free levels with a bang
// and a jolt; it swings to the next bar and the next, ever quicker; then it
// spins and sprays a ring of bullets every way at once in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  bulletRing,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "sentryTurret";
const MAX_BARS = 5;
const SHOTS = 6;
const FIRE_MS = 45;
const SPEED = 2.4;
const BARREL = 30;
const RING = 24;
const TURRET = 0.8;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 46;
const FLASH_MS = 50;
const BURST_SHAKE: [number, number] = [0.6, 1.3];

export const forceSentryTurretEvent = registerWispEvent(
  KEY,
  "Sentry Turret",
  () => CONFIG.sentryTurretEvent.chance,
  (floor, context, area) => {
    const { dropMs, swingsMs, levelShare, holdMs, mergeMs } =
      CONFIG.sentryTurretEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const turret: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const aimOf = (p: Point) => Math.atan2(p.y - turret.y, p.x - turret.x);
    let clock: number = dropMs;
    let angle = -Math.PI / 2;
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const bursts = bars.map((bar, k) => {
      const swing = lerp(swingsMs, k / Math.max(1, bars.length - 1));
      const from = angle;
      let to = aimOf(bar.center);
      // the short way round
      while (to - from > Math.PI) to -= Math.PI * 2;
      while (to - from < -Math.PI) to += Math.PI * 2;
      const swings = clock;
      const fires = swings + swing;
      const muzzle: Point = {
        x: turret.x + Math.cos(to) * BARREL,
        y: turret.y + Math.sin(to) * BARREL,
      };
      let hits = 0;
      for (let i = 0; i < SHOTS; i++) {
        const target: Point = {
          x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.5,
          y: bar.center.y,
        };
        const b = aimBullet(muzzle, target, fires + i * FIRE_MS, SPEED);
        bullets.push(b);
        flashes.push({ at: b.firedAt, from: muzzle, angle: to });
        hits = b.hitAt;
      }
      clock = fires + SHOTS * FIRE_MS;
      angle = to;
      return { bar, from, to, swings, fires, hits };
    });
    const ringAt = clock + 120;
    const ring = bulletRing(turret, RING, ringAt, SPEED, area);
    const endAt = Math.max(ringAt + 300, ...bursts.map((b) => b.hits));
    const all = [...bullets, ...ring];
    const aimAt = (ms: number) => {
      let a = -Math.PI / 2;
      for (const b of bursts) {
        if (ms < b.swings) break;
        a = lerp(
          [b.from, b.to],
          smoothstep((ms - b.swings) / (b.fires - b.swings)),
        );
      }
      if (ms > ringAt) a += (ms - ringAt) / 20;
      return a;
    };
    const turretAt: Point = { x: 0, y: 0 };
    const turretWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / dropMs));
      turretAt.x = lerp([button.x, turret.x], u);
      turretAt.y = lerp([button.y, turret.y], u);
      return turretAt;
    };
    const barrelAt: Point = { x: 0, y: 0 };
    const barrel = (ms: number): Point | null => {
      if (ms < dropMs) return null;
      const a = aimAt(ms);
      barrelAt.x = turret.x + Math.cos(a) * BARREL;
      barrelAt.y = turret.y + Math.sin(a) * BARREL;
      return barrelAt;
    };

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.12),
    );
    const swinging = createBeats(
      bursts,
      (b) => b.swings,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const leveling = createBeats(
      bursts,
      (b) => b.hits,
      (b, k) => {
        cover!.levels(b.bar, levelsFor(b.bar.floor, levelShare, 2), turret);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, k / Math.max(1, bursts.length - 1)));
      },
    );
    const finale = createBeats(
      [ringAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(turret);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          pinging.tick(ms, now);
          swinging.tick(ms, now);
          leveling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, all, ms, now, BULLET);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            turretWisp,
            ms,
            now,
            WISP_SIZE * TURRET,
            0.8,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            barrel,
            ms,
            now,
            WISP_SIZE * 0.3,
            1,
            dropMs,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
