// the "Pepperbox" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a pepperbox of six wisp barrels spins up
// round a hub in the middle of the screen, whirling faster and faster; one
// barrel after another fires as it swings round, each shot streaking onto
// an empty spot where a new worker forms in a flash and a jolt; then all six
// fire outward at once in a ring and the hub blows in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "pepperbox";
const BARRELS = 6;
const MAX_HIRES = 6;
const HIGH = 0.45;
const RADIUS = 64;
// laps a second it spins, from spinning up to its last volley
const LAPS: [number, number] = [0.6, 3];
const SPEED = 2.2;
const RING_SPEED = 1.6;
const BARREL = 0.35;
const HUB = 0.6;
const BULLET = WISP_SIZE * 0.4;
const FLASH_MS = 110;
const FLASH = 44;
const FORM_MS = 300;
const GROW_MS = 220;
const HIT_SHAKE: [number, number] = [0.5, 1.1];
const RING_SHAKE = 1.0;

interface Shot {
  bullet: Bullet;
  angle: number;
  hire: RewardHire | null;
}

export const forcePepperboxEvent = registerWispEvent(
  KEY,
  "Pepperbox",
  () => CONFIG.pepperboxEvent.chance,
  (floor, context, area) => {
    const { spinUpMs, shotsMs, volleyGapMs, holdMs, mergeMs } =
      CONFIG.pepperboxEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HIGH,
    };
    let clock = spinUpMs;
    const fireTimes = hires.map((_, k) => {
      const ms = clock;
      clock += lerp(shotsMs, k / Math.max(1, hires.length - 1));
      return ms;
    });
    const volleyAt = clock + volleyGapMs;
    const span = volleyAt / 1000;
    const turnAt = (ms: number) => {
      const t = Math.min(Math.max(0, ms), volleyAt) / 1000;
      return (
        Math.PI * 2 * (LAPS[0] * t + ((LAPS[1] - LAPS[0]) * t * t) / (2 * span))
      );
    };
    const barrelAt = (i: number, ms: number, into: Point): Point => {
      const a = turnAt(ms) + (i / BARRELS) * Math.PI * 2;
      const r = RADIUS * easeOut(clamp01(ms / GROW_MS));
      into.x = hub.x + Math.cos(a) * r;
      into.y = hub.y + Math.sin(a) * r;
      return into;
    };
    const box = {
      left: area.left,
      right: area.right,
      top: area.top,
      bottom: area.bottom,
    };
    const aimed: Shot[] = hires.map((hire, k) => {
      const from = barrelAt(k % BARRELS, fireTimes[k], { x: 0, y: 0 });
      const bullet = aimBullet(
        from,
        { x: hire.x, y: hire.y },
        fireTimes[k],
        SPEED,
      );
      return { bullet, angle: Math.atan2(bullet.dy, bullet.dx), hire };
    });
    const ring: Shot[] = Array.from({ length: BARRELS }, (_, i) => {
      const from = barrelAt(i, volleyAt, { x: 0, y: 0 });
      const angle = Math.atan2(from.y - hub.y, from.x - hub.x);
      return {
        bullet: fireBullet(from, angle, volleyAt, RING_SPEED, box),
        angle,
        hire: null,
      };
    });
    const shots = [...aimed, ...ring];
    const bullets = shots.map((s) => s.bullet);
    const endAt = Math.max(volleyAt, ...aimed.map((s) => s.bullet.hitAt));
    const barrels = Array.from({ length: BARRELS }, (_, i) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number) => barrelAt(i, ms, spot);
    });
    const hubAt = () => hub;

    const firing = createBeats(
      shots,
      (s) => s.bullet.firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const hitting = createBeats(
      aimed,
      (s) => s.bullet.hitAt,
      (s, k) => {
        giveHire(s.hire!);
        cover!.burst(s.bullet.to, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, aimed.length - 1)));
      },
    );
    const volley = createBeats(
      [volleyAt],
      (ms) => ms,
      () => {
        cover!.blast(hub);
        if (cover!.isLive()) shakeScreen(RING_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
          volley.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > Math.max(endAt, volleyAt + 900)) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, s.bullet.from, s.angle, t, FLASH);
          }
          if (ms >= volleyAt) return;
          const heat = clamp01(ms / volleyAt);
          drawWisp(ctx, hubAt, ms, now, WISP_SIZE * HUB, lerp([0.5, 1], heat));
          for (const barrel of barrels)
            drawWisp(ctx, barrel, ms, now, WISP_SIZE * BARREL, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
