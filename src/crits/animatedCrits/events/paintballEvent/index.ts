// the "Paintball" event (gunfire; levels): it covers its crit, whose click
// freezes the screen while paintball guns (wisps) pop up at both edges of
// the screen beside every bar in view; the two sides trade volleys, each
// gun rattling off a burst of wisp pellets that splat gold onto its bar,
// faster and faster, every volley a jolt; each bar ends up spattered and
// lands free levels on its last splat; then every gun turns on the clicked
// floor's bar at once and splatters it in a huge blast, and every bar
// slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { drawSprayCoat } from "../../../../shared/spray";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "paintball";
const MAX_BARS = 4;
const VOLLEYS = 6;
const BURST = 3;
const BURST_GAP = 60;
// the guns: EDGE px in from the sides, this far over their bar
const EDGE = 50;
const OVER = 70;
const GUN = WISP_SIZE * 0.7;
const BULLET = WISP_SIZE * 0.45;
const BULLET_SPEED = 3.2;
const MUZZLE = 80;
const MUZZLE_MS = 110;
const SPLAT: [number, number] = [60, 36];
const VOLLEY_SHAKE: [number, number] = [0.3, 0.7];
const DONE_SHAKE = 0.6;
const SOUND_GAP_MS = 60;

interface Shot {
  bullet: Bullet;
  gun: Point;
  bar: RewardBar;
  final: boolean;
}

export const forcePaintballEvent = registerWispEvent(
  KEY,
  "Paintball",
  () => CONFIG.paintballEvent.chance,
  (floor, context, area) => {
    const { growMs, volleyMs, levelShare, holdMs, mergeMs } =
      CONFIG.paintballEvent;
    const all = findRewardBars(floor, context);
    const clicked = all.find((b) => b.floor === floor) ?? all[0];
    if (!clicked) return;
    const bars = all.slice(0, MAX_BARS);
    if (!bars.includes(clicked)) bars[bars.length - 1] = clicked;
    const guns = bars.map((bar) =>
      [-1, 1].map((side) => ({
        x: side < 0 ? area.left + EDGE : area.right - EDGE,
        y: bar.box.y - OVER,
      })),
    );
    const spotOn = (bar: RewardBar): Point => ({
      x: bar.box.x + bar.box.width * lerp([0.08, 0.92], Math.random()),
      y: bar.box.y + bar.box.height * lerp([0.2, 0.8], Math.random()),
    });

    // volleys from alternate sides, quickening; then all at the clicked bar
    const shots: Shot[] = [];
    let clock: number = growMs;
    for (let v = 0; v < VOLLEYS; v++) {
      const side = v % 2;
      bars.forEach((bar, k) => {
        for (let j = 0; j < BURST; j++) {
          const gun = guns[k][side];
          shots.push({
            bullet: aimBullet(
              gun,
              spotOn(bar),
              clock + j * BURST_GAP + k * 20,
              BULLET_SPEED,
            ),
            gun,
            bar,
            final: false,
          });
        }
      });
      clock += volleyMs * lerp([1.3, 0.7], v / (VOLLEYS - 1));
    }
    const finalAt = clock + 120;
    guns.forEach((pair) =>
      pair.forEach((gun) => {
        for (let j = 0; j < BURST; j++)
          shots.push({
            bullet: aimBullet(
              gun,
              spotOn(clicked),
              finalAt + j * BURST_GAP,
              BULLET_SPEED,
            ),
            gun,
            bar: clicked,
            final: true,
          });
      }),
    );
    const endMs = Math.max(...shots.map((s) => s.bullet.hitAt));
    // each bar's last splat before the finale lands its levels
    const lastHit = new Map<RewardBar, number>();
    for (const s of shots)
      if (!s.final)
        lastHit.set(s.bar, Math.max(lastHit.get(s.bar) ?? 0, s.bullet.hitAt));
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 2)]),
    );
    const bullets = shots.map((s) => s.bullet);
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const firing = createBeats(
      shots.filter((_, i) => i % BURST === 0),
      (s) => s.bullet.firedAt,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const splatting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k, now) => {
        if (s.bullet.hitAt === endMs) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bullet.to);
          return;
        }
        if (!s.final && lastHit.get(s.bar) === s.bullet.hitAt) {
          cover!.levels(s.bar, levels.get(s.bar)!, s.gun);
          if (cover!.isLive()) shakeScreen(DONE_SHAKE);
        }
        if (!cover!.isLive()) return;
        shakeScreen(lerp(VOLLEY_SHAKE, k / shots.length) * 0.5);
        sound(now);
      },
    );

    const gunAt = guns.flat().map((g) => () => g);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          splatting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 400) return;
          const fade = 1 - clamp01((ms - endMs) / 400);
          for (const b of bullets)
            if (ms >= b.hitAt) {
              const flash = 1 - clamp01((ms - b.hitAt) / 200);
              drawSprayCoat(ctx, b.to, SPLAT[0], SPLAT[1], 0.8 * fade, flash);
            }
          const pop = easeOutBack(clamp01(ms / growMs));
          for (const g of gunAt)
            drawWisp(ctx, g, ms, now, GUN * pop * fade, 0.5);
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / MUZZLE_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(
                ctx,
                s.gun,
                Math.atan2(s.bullet.dy, s.bullet.dx),
                t,
                MUZZLE,
              );
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
