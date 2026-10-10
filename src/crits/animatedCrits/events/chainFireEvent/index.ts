// the "Chain Fire" event (gunfire; free upgrade levels and a free floor):
// it covers its crit, whose click freezes the screen while the clicked
// floor's button fires a burst at an income bar; the instant it hits, the
// bar fires back a burst of its own at the next bar, a chain of guns
// hopping up the screen in muzzle flashes, every bar it lands on a pop, a
// jolt and free levels, quicker each hop; the last bar empties a long burst
// into the building's locked floor until the lock blows in a huge blast
// and shake and the floor bursts open, unlocked for free
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
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
import {
  findRewardBars,
  findRewardLocked,
  type RewardBar,
} from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { levelsFor } from "../../../../gameState";

const KEY = "chainFire";
const MAX_BARS = 3;
const BURST = 3;
const LOCK_BURST = 10;
const SPEED = 2.6;
const JITTER = 30;
const BULLET = 0.5;
const FLASH_MS = 90;
const FLASH = 80;
const BLAST_DELAY_MS = 120;
const RATTLE_GAP_MS = 50;
const HOP_SHAKE: [number, number] = [0.6, 1.2];
const LOCK_SHAKE = 0.5;
const BLAST_SHAKE = 2.6;

interface Shot {
  bullet: Bullet;
  angle: number;
  // the bar this hop lands on (null for the lock), on its first bullet only
  lands: RewardBar | null | undefined;
  hop: number;
}

export const forceChainFireEvent = registerWispEvent(
  KEY,
  "Chain Fire",
  () => CONFIG.chainFireEvent.chance,
  (floor, context) => {
    const { hopsMs, shotGapMs, lockGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.chainFireEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const dist = (p: Point) => Math.hypot(p.x - lock.x, p.y - lock.y);
    // farthest from the lock first, so the chain climbs toward it
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => dist(b.center) - dist(a.center));
    const stops: Point[] = [button, ...bars.map((b) => b.center), lock];
    const shots: Shot[] = [];
    let clock = 0;
    for (let k = 0; k < stops.length - 1; k++) {
      const from = stops[k];
      const toLock = k === stops.length - 2;
      const count = toLock ? LOCK_BURST : BURST;
      const gap = toLock ? lockGapMs : shotGapMs;
      for (let i = 0; i < count; i++) {
        const to = {
          x: stops[k + 1].x + (Math.random() - 0.5) * 2 * JITTER,
          y: stops[k + 1].y + (Math.random() - 0.5) * JITTER,
        };
        const bullet = aimBullet(from, to, clock + i * gap, SPEED);
        shots.push({
          bullet,
          angle: Math.atan2(bullet.dy, bullet.dx),
          lands: i === 0 ? (toLock ? null : bars[k]) : undefined,
          hop: k,
        });
      }
      // the next bar opens up the moment this burst lands on it
      const first = shots[shots.length - count].bullet.hitAt;
      clock = first + lerp(hopsMs, k / Math.max(1, stops.length - 2));
    }
    const lastHit = Math.max(...shots.map((s) => s.bullet.hitAt));
    const blastAt = lastHit + BLAST_DELAY_MS;
    const bullets = shots.map((s) => s.bullet);
    let lastRattle = -Infinity;

    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s) => {
        const at = s.bullet.to;
        if (s.lands)
          cover!.levels(s.lands, levelsFor(s.lands.floor, levelShare, 2), at);
        cover!.burst(at, s.lands ? 0.6 : 0.3);
        if (!cover!.isLive()) return;
        shakeScreen(
          s.lands
            ? lerp(HOP_SHAKE, s.hop / Math.max(1, bars.length - 1))
            : LOCK_SHAKE,
        );
        if (s.bullet.hitAt - lastRattle >= RATTLE_GAP_MS) {
          lastRattle = s.bullet.hitAt;
          playBloop();
        }
      },
    );
    const blasting = createBeats(
      [blastAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          hitting.tick(ms, now);
          blasting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > lastHit) return;
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET, true);
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, s.bullet.from, s.angle, t, FLASH);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
