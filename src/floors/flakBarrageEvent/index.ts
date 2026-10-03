// the "Flak Barrage" event (gunfire; cash): it covers its crit, whose
// click freezes the screen while three gun wisps shoot out of the clicked
// floor's button and plant themselves along the bottom of the screen; they
// open up at the sky, muzzles flashing, hosing wisp shells upward ever
// faster, each bursting high overhead in a white flak burst and a pop that
// rains cash; then all three fire one last shell together that meets in
// the sky and goes off in a huge blast and shake, and the cash sweeps into
// the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
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
import { drawDetonation } from "../../shared/explosion";

const KEY = "flakBarrage";
const REWARD = 4;
const GUNS = 3;
// guns stand LINE px up from the bottom; shells burst in the top HIGH share
// of the screen
const LINE = 60;
const HIGH: [number, number] = [0.08, 0.5];
const SPEED = 1.8;
const BULLET = WISP_SIZE * 0.35;
const FINAL_BULLET = WISP_SIZE * 0.7;
const GUN = 0.65;
const MUZZLE = 44;
const FLASH_MS = 70;
const FLAK = 90;
const POP_SHAKE = 0.35;

export const forceFlakBarrageEvent = registerWispEvent(
  KEY,
  "Flak Barrage",
  () => CONFIG.flakBarrageEvent.chance,
  (floor, context, area) => {
    const { plantMs, fireMs, firesMs, holdMs, mergeMs } =
      CONFIG.flakBarrageEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const spots: Point[] = Array.from({ length: GUNS }, (_, i) => ({
      x: area.left + width * ((i + 0.5) / GUNS),
      y: area.bottom - LINE,
    }));
    // shots ever closer together, round-robin over the guns
    const shells: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    let n = 0;
    for (let ms: number = plantMs; ms < plantMs + fireMs; n++) {
      const from = spots[n % GUNS];
      const to: Point = {
        x: area.left + width * (0.08 + 0.84 * Math.random()),
        y: area.top + height * lerp(HIGH, Math.random()),
      };
      shells.push(aimBullet(from, to, ms, SPEED));
      flashes.push({
        at: ms,
        from,
        angle: Math.atan2(to.y - from.y, to.x - from.x),
      });
      ms += lerp(firesMs, (ms - plantMs) / fireMs);
    }
    const lastAt = plantMs + fireMs;
    const meet: Point = {
      x: area.left + width / 2,
      y: area.top + height * HIGH[0] * 2,
    };
    const finals = spots.map((from) => aimBullet(from, meet, lastAt, SPEED));
    for (const b of finals)
      flashes.push({ at: lastAt, from: b.from, angle: Math.atan2(b.dy, b.dx) });
    const endAt = Math.max(...finals.map((b) => b.hitAt));
    const guns = spots.map((spot) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(Math.min(1, ms / plantMs));
        at.x = lerp([button.x, spot.x], u);
        at.y = lerp([button.y, spot.y], u);
        return at;
      };
    });

    const popping = createBeats(
      shells,
      (b) => b.hitAt,
      (b) => {
        cover!.burst(b.to, 0.3);
        if (cover!.isLive()) shakeScreen(POP_SHAKE);
      },
    );
    const firing = createBeats(
      [...shells, ...finals.slice(0, 1)],
      (b) => b.firedAt,
      () => {
        if (cover?.isLive()) playExplosion();
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(meet),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          popping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, shells, ms, now, BULLET);
          drawBullets(ctx, finals, ms, now, FINAL_BULLET, true);
          for (const b of shells)
            drawDetonation(ctx, b.to, ms - b.hitAt, FLAK, now);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          for (const gun of guns)
            drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
