// the "Bullet Curtain" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a row of gun wisps rises out
// of the bottom of it and fires straight up in perfect unison, volley after
// volley, each a solid curtain of wisp bullets rising up the screen and
// slamming into an income bar from below in a rattle of pops, a bang and a
// jolt that lands free levels, ever faster; the last curtain rips up
// through every bar to the top in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "bulletCurtain";
const MAX_BARS = 4;
const GUNS = 9;
const LOW = 40;
const SPEED = 1.6;
const GUN = 0.4;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 36;
const FLASH_MS = 60;
const VOLLEY_SHAKE: [number, number] = [0.6, 1.3];

export const forceBulletCurtainEvent = registerWispEvent(
  KEY,
  "Bullet Curtain",
  () => CONFIG.bulletCurtainEvent.chance,
  (floor, context, area) => {
    const { riseMs, gapsMs, levelShare, holdMs, mergeMs } =
      CONFIG.bulletCurtainEvent;
    // nearest the bottom first, so the curtains climb
    const bars = findRewardBars(floor, context)
      .sort((a, b) => b.center.y - a.center.y)
      .slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const guns: Point[] = Array.from({ length: GUNS }, (_, i) => ({
      x: lerp([area.left + 20, area.right - 20], i / (GUNS - 1)),
      y: area.bottom - LOW,
    }));
    const bullets: Bullet[] = [];
    let clock: number = riseMs;
    const volleys = [...bars, null].map((bar, k) => {
      const fired = clock;
      clock += lerp(gapsMs, k / bars.length);
      let hits = 0;
      for (const gun of guns) {
        const b = aimBullet(
          gun,
          { x: gun.x, y: bar ? bar.center.y : area.top },
          fired,
          SPEED,
        );
        bullets.push(b);
        hits = Math.max(hits, b.hitAt);
      }
      return { bar, fired, hits };
    });
    const finalVolley = volleys[volleys.length - 1];
    const endAt = finalVolley.hits;
    const gunWisps = guns.map((spot, i) => {
      const at: Point = { x: spot.x, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        at.y = lerp(
          [area.bottom + 30, spot.y],
          easeOut(Math.min(1, Math.max(0, ms - i * 20) / riseMs)),
        );
        return at;
      };
    });

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.1),
    );
    const firing = createBeats(
      volleys,
      (v) => v.fired,
      () => {
        if (cover?.isLive()) playExplosion();
      },
    );
    const hitting = createBeats(
      volleys,
      (v) => v.hits,
      (v, k) => {
        if (!v.bar) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast({ x: (area.left + area.right) / 2, y: area.top + 60 });
          return;
        }
        cover!.levels(v.bar, levelsFor(v.bar.floor, levelShare, 2), {
          x: v.bar.center.x,
          y: area.bottom,
        });
        if (cover!.isLive())
          shakeScreen(lerp(VOLLEY_SHAKE, k / Math.max(1, bars.length - 1)));
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
          firing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const v of volleys) {
            const t = (ms - v.fired) / FLASH_MS;
            if (t > 0 && t < 1)
              for (const gun of guns)
                drawMuzzleFlash(ctx, gun, -Math.PI / 2, t, MUZZLE);
          }
          for (const g of gunWisps)
            drawWispBetween(ctx, g, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
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
