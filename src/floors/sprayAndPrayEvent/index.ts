// the "Spray and Pray" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a turret wisp pops up at the
// bottom of the screen and opens up, hosing a stream of wisp bullets along
// one income bar end to end, then swinging back along the next, every bar
// it rakes jolting with free levels, the stream faster and wilder each
// sweep; then it sprays every bar at once in a wild burst and the last
// round lands in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "sprayAndPray";
const MAX_BARS = 4;
const PER_SWEEP = 10;
const WILD = 16;
const LOW = 60;
const SPEED = 2.4;
const TURRET = 0.55;
const RECOIL = 4;
const BULLET = WISP_SIZE * 0.3;
const FLASH_MS = 80;
const FLASH = 40;
const POP_GAP_MS = 60;
const SWEEP_SHAKE: [number, number] = [0.6, 1.3];

interface Shot {
  bullet: Bullet;
  angle: number;
  bar: RewardBar;
  ends: boolean;
}

export const forceSprayAndPrayEvent = registerWispEvent(
  KEY,
  "Spray and Pray",
  () => CONFIG.sprayAndPrayEvent.chance,
  (floor, context, area) => {
    const { firstMs, shotsMs, wildGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.sprayAndPrayEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const turret: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - LOW,
    };
    const count = bars.length * PER_SWEEP;
    let clock: number = firstMs;
    const shoot = (
      bar: RewardBar,
      u: number,
      firedAt: number,
      ends: boolean,
    ): Shot => {
      const to: Point = {
        x: bar.box.x + bar.box.width * u,
        y: bar.center.y + (Math.random() - 0.5) * bar.box.height * 0.5,
      };
      const bullet = aimBullet(turret, to, firedAt, SPEED);
      return { bullet, angle: Math.atan2(bullet.dy, bullet.dx), bar, ends };
    };
    const raked: Shot[] = bars.flatMap((bar, k) =>
      Array.from({ length: PER_SWEEP }, (_, i) => {
        const u = (i + 0.5) / PER_SWEEP;
        const shot = shoot(bar, k % 2 ? 1 - u : u, clock, i === PER_SWEEP - 1);
        clock += lerp(shotsMs, (k * PER_SWEEP + i) / Math.max(1, count - 1));
        return shot;
      }),
    );
    const wildAt = clock + wildGapMs;
    const wild: Shot[] = Array.from({ length: WILD }, (_, i) =>
      shoot(
        bars[Math.floor(Math.random() * bars.length)],
        Math.random(),
        wildAt + i * 18,
        false,
      ),
    );
    const shots = [...raked, ...wild];
    const bullets = shots.map((s) => s.bullet);
    const finale = wild.reduce((a, b) =>
      b.bullet.hitAt > a.bullet.hitAt ? b : a,
    );
    const endAt = finale.bullet.hitAt;
    const enders = raked.filter((s) => s.ends);
    const spot: Point = { x: turret.x, y: turret.y };
    const turretAt = (ms: number): Point => {
      spot.x = turret.x + Math.sin(ms * 0.9) * RECOIL;
      spot.y = turret.y + Math.cos(ms * 1.1) * RECOIL;
      return spot;
    };

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
    const sweeping = createBeats(
      enders,
      (s) => s.bullet.hitAt,
      (s, k) => {
        cover!.levels(
          s.bar,
          levelsFor(s.bar.floor, levelShare, 2),
          s.bar.center,
        );
        if (cover!.isLive())
          shakeScreen(lerp(SWEEP_SHAKE, k / Math.max(1, enders.length - 1)));
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
          sweeping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1) drawMuzzleFlash(ctx, turret, s.angle, t, FLASH);
          }
          drawWispBetween(
            ctx,
            turretAt,
            ms,
            now,
            WISP_SIZE * TURRET,
            0.9,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
