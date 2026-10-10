// the "Bullet Rain" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a row of guns opens up from
// the top edge of the screen, raining volleys of wisp bullets straight down
// that sweep along one income bar after another, each volley a hail of
// pops and a jolt of free levels for its bar, faster each time; then every
// gun lets loose at once in a downpour onto every bar and a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "bulletRain";
const MAX_BARS = 4;
const GUNS = 5;
const VOLLEY = 6;
const DOWNPOUR = 3;
const SHOT_GAP_MS = 35;
const SPEED = 2.6;
const BULLET = WISP_SIZE * 0.35;
const FLASH_MS = 100;
const FLASH = 40;
const POP_GAP_MS = 45;
const VOLLEY_SHAKE: [number, number] = [0.6, 1.3];

interface Shot {
  bullet: Bullet;
  gun: Point;
  angle: number;
  bar: RewardBar;
  // the last of its bar's volley, which lands the levels
  ends: boolean;
}

export const forceBulletRainEvent = registerWispEvent(
  KEY,
  "Bullet Rain",
  () => CONFIG.bulletRainEvent.chance,
  (floor, context, area) => {
    const { firstMs, volleysMs, downpourGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.bulletRainEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const guns: Point[] = Array.from({ length: GUNS }, (_, i) => ({
      x: area.left + (width * (i + 0.5)) / GUNS,
      y: area.top + 8,
    }));
    const shoot = (
      bar: RewardBar,
      i: number,
      count: number,
      firedAt: number,
      ends: boolean,
    ): Shot => {
      const to: Point = {
        x: bar.box.x + (bar.box.width * (i + 0.5)) / count,
        y: bar.center.y,
      };
      // the gun nearest above where it lands
      const gun = guns.reduce((a, b) =>
        Math.abs(b.x - to.x) < Math.abs(a.x - to.x) ? b : a,
      );
      const bullet = aimBullet(gun, to, firedAt, SPEED);
      return {
        bullet,
        gun,
        angle: Math.atan2(bullet.dy, bullet.dx),
        bar,
        ends,
      };
    };
    let clock = firstMs;
    const volleys = bars.flatMap((bar, k) => {
      const starts = clock;
      clock += lerp(volleysMs, k / Math.max(1, bars.length - 1));
      return Array.from({ length: VOLLEY }, (_, i) =>
        shoot(bar, i, VOLLEY, starts + i * SHOT_GAP_MS, i === VOLLEY - 1),
      );
    });
    const downpourAt = clock + downpourGapMs;
    const downpour = bars.flatMap((bar) =>
      Array.from({ length: DOWNPOUR }, (_, i) =>
        shoot(bar, i, DOWNPOUR, downpourAt + i * 20, false),
      ),
    );
    const finale = downpour.reduce((a, b) =>
      b.bullet.hitAt > a.bullet.hitAt ? b : a,
    );
    const shots = [...volleys, ...downpour];
    const bullets = shots.map((s) => s.bullet);
    const endAt = finale.bullet.hitAt;
    const enders = volleys.filter((s) => s.ends);

    let popped = -Infinity;
    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s) => {
        if (s === finale) {
          for (const bar of bars)
            cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), bar.center);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bullet.to);
          return;
        }
        cover!.burst(s.bullet.to, 0.3);
        if (s.bullet.hitAt - popped < POP_GAP_MS || !cover!.isLive()) return;
        popped = s.bullet.hitAt;
        playExplosion();
      },
    );
    const leveling = createBeats(
      enders,
      (s) => s.bullet.hitAt,
      (s, k) => {
        cover!.levels(
          s.bar,
          levelsFor(s.bar.floor, levelShare, 2),
          s.bar.center,
        );
        if (cover!.isLive())
          shakeScreen(lerp(VOLLEY_SHAKE, k / Math.max(1, enders.length - 1)));
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
          hitting.tick(ms, now);
          leveling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1) drawMuzzleFlash(ctx, s.gun, s.angle, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now, BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
