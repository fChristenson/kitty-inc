// the "Bullet Time" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while gun wisps rise out of the clicked floor's
// button and unload a volley of wisp bullets up at the income bars in view,
// muzzles flashing; mid-flight time all but stops: the bullets hang in the
// air, creeping, glowing, as a low rumble builds; then time snaps back at
// four times the speed and they slam into the bars, each bar jumping a
// crit tier with a bang and a jolt, the last in a huge blast and shake.
// Then the crit's tier pays out
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
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "bulletTime";
const MAX_BARS = 3;
const PER_BAR = 7;
// time crawls at CRAWL through the freeze, then races at RACE
const CRAWL = 0.04;
const RACE = 4;
const FIRE_MS = 40;
const GUNS = 2;
const GUN = 0.55;
const BULLET = WISP_SIZE * 0.4;
const MUZZLE = 50;
const FLASH_MS = 70;
const RUMBLE = 0.4;
const HIT_SHAKE: [number, number] = [1, 1.6];

export const forceBulletTimeEvent = registerWispEvent(
  KEY,
  "Bullet Time",
  () => CONFIG.bulletTimeEvent.chance,
  (floor, context, area) => {
    const { riseMs, freezeAfterMs, freezeMs, holdMs, mergeMs } =
      CONFIG.bulletTimeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const guns: Point[] = Array.from({ length: GUNS }, (_, i) => ({
      x: lerp([area.left, area.right], (i + 1) / (GUNS + 1)),
      y: area.bottom - 60,
    }));
    // bullets are planned in warped time: real time until the freeze, a
    // crawl through it, then racing
    const freezeAt = riseMs + freezeAfterMs;
    const resumeAt = freezeAt + freezeMs;
    const warp = (ms: number) =>
      ms < freezeAt
        ? ms
        : ms < resumeAt
          ? freezeAt + (ms - freezeAt) * CRAWL
          : freezeAt + freezeMs * CRAWL + (ms - resumeAt) * RACE;
    const unwarp = (w: number) => {
      const frozenEnd = freezeAt + freezeMs * CRAWL;
      return w < freezeAt
        ? w
        : w < frozenEnd
          ? freezeAt + (w - freezeAt) / CRAWL
          : resumeAt + (w - frozenEnd) / RACE;
    };
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const volleys = bars.map((bar, k) => {
      let hits = 0;
      for (let i = 0; i < PER_BAR; i++) {
        const from = guns[(i + k) % GUNS];
        const fired = riseMs + (k * PER_BAR + i) * FIRE_MS * 0.5;
        const target: Point = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / PER_BAR),
          y: bar.center.y,
        };
        // paced so every bullet is caught partway when time stops
        const dist = Math.hypot(target.x - from.x, target.y - from.y);
        const speed =
          (dist * (0.45 + 0.25 * Math.random())) /
          Math.max(80, freezeAt - fired);
        const b = aimBullet(from, target, fired, speed);
        bullets.push(b);
        flashes.push({
          at: fired,
          from,
          angle: Math.atan2(target.y - from.y, target.x - from.x),
        });
        hits = Math.max(hits, unwarp(b.hitAt));
      }
      return { bar, hits };
    });
    volleys.sort((a, b) => a.hits - b.hits);
    const last = volleys[volleys.length - 1];
    const endAt = last.hits;
    const gunWisps = guns.map((spot, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(Math.min(1, ms / riseMs));
        at.x = lerp([button.x, spot.x], u);
        at.y = lerp([button.y, spot.y], u) + Math.sin(ms / 100 + i) * 2;
        return at;
      };
    });

    const pinging = createBeats(
      bullets,
      (b) => unwarp(b.hitAt),
      (b) => cover!.burst(b.to, 0.12),
    );
    const rumbling = createBeats(
      [freezeAt, resumeAt],
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        shakeScreen(k === 0 ? RUMBLE : 1);
        if (k === 1) playExplosion();
      },
    );
    const hitting = createBeats(
      volleys,
      (v) => v.hits,
      (v, k) => {
        cover!.tierUp(v.bar, v.bar.center);
        if (v === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(v.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, volleys.length - 1)));
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
          rumbling.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const w = warp(ms);
          const swell =
            ms > freezeAt && ms < resumeAt ? 1 + 0.25 * Math.sin(ms / 60) : 1;
          drawBullets(
            ctx,
            bullets,
            w,
            now,
            BULLET * swell,
            ms < freezeAt || ms > resumeAt,
          );
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          for (const gun of gunWisps)
            drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
