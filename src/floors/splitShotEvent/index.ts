// the "Split Shot" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a single bullet wisp is fired out of the clicked
// floor's button and ricochets off the screen's edges, splitting in two at
// every bounce, the halves glancing off at angles: 1, 2, 4, 8, then 16
// bullets ricocheting ever faster across the screen, every bounce a flash,
// a pop, a spray of coins and a jolt; then all of them turn and converge
// on the total in a huge blast and shake. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../shared/bullets";
import { ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "splitShot";
const REWARD = 4;
const EDGE = 14;
// generations that split at their bounce; the next one converges instead
const SPLITS = 4;
const SPLIT = 0.38;
// the least a ricochet leaves its wall at, so none skim along it
const MIN_LEAVE = 0.25;
const FLASH_MS = 90;
const MUZZLE = 54;
const BULLET = [0.5, 0.42, 0.34, 0.28, 0.24, 0.3];
const COINS = 10;
const COIN_REACH: [number, number] = [30, 110];
const BOUNCE_SHAKE: [number, number] = [0.4, 0.9];
const POP_GAP_MS = 40;

interface Shot {
  bullet: Bullet;
  gen: number;
  // set for a ricochet's bounce: the way it flies off the wall
  bounce: { at: Point; angle: number } | null;
}

export const forceSplitShotEvent = registerWispEvent(
  KEY,
  "Split Shot",
  () => CONFIG.splitShotEvent.chance,
  (floor, context, area) => {
    const { speeds, holdMs, mergeMs } = CONFIG.splitShotEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const total = totalSpot(area);
    const speedOf = (gen: number) => lerp(speeds, gen / SPLITS);
    const shots: Shot[] = [];
    const ricochet = (b: Bullet, gen: number) => {
      const at = b.to;
      let dx = b.dx;
      let dy = b.dy;
      // bounce off whichever walls it reached
      const sideWall = at.x <= box.left + 0.5 || at.x >= box.right - 0.5;
      const flatWall = at.y <= box.top + 0.5 || at.y >= box.bottom - 0.5;
      if (sideWall) dx = -dx;
      if (flatWall) dy = -dy;
      const inX = at.x <= box.left + 0.5 ? 1 : -1;
      const inY = at.y <= box.top + 0.5 ? 1 : -1;
      const from: Point = {
        x: Math.min(box.right - 1, Math.max(box.left + 1, at.x)),
        y: Math.min(box.bottom - 1, Math.max(box.top + 1, at.y)),
      };
      const angle = Math.atan2(dy, dx);
      shots.push({ bullet: b, gen, bounce: { at: from, angle } });
      for (const side of [-1, 1]) {
        let cx = Math.cos(angle + side * SPLIT);
        let cy = Math.sin(angle + side * SPLIT);
        if (sideWall && cx * inX < MIN_LEAVE) cx = inX * MIN_LEAVE;
        if (flatWall && cy * inY < MIN_LEAVE) cy = inY * MIN_LEAVE;
        launch(
          fireBullet(from, Math.atan2(cy, cx), b.hitAt, speedOf(gen + 1), box),
          gen + 1,
        );
      }
    };
    const launch = (b: Bullet, gen: number) => {
      if (gen < SPLITS) {
        ricochet(b, gen);
        return;
      }
      // the last generation bounces once more and turns for the total
      const home = aimBullet(b.to, total, b.hitAt, speedOf(gen + 1));
      shots.push({
        bullet: b,
        gen,
        bounce: { at: b.to, angle: Math.atan2(home.dy, home.dx) },
      });
      shots.push({ bullet: home, gen: gen + 1, bounce: null });
    };
    launch(
      fireBullet(
        button,
        -Math.PI / 2 + (Math.random() - 0.5) * 0.8,
        0,
        speedOf(0),
        box,
      ),
      0,
    );
    const homing = shots.filter((s) => s.gen === SPLITS + 1);
    const walls = shots.filter((s) => s.gen <= SPLITS);
    const endAt = Math.max(...homing.map((s) => s.bullet.hitAt));
    const byGen = Array.from({ length: SPLITS + 2 }, (_, g) =>
      shots.filter((s) => s.gen === g).map((s) => s.bullet),
    );
    const first = byGen[0][0];
    const firedAngle = Math.atan2(first.dy, first.dx);
    let lastPop = -Infinity;

    const bouncing = createBeats(
      walls,
      (s) => s.bullet.hitAt,
      (s) => {
        const at = s.bullet.to;
        cover!.burst(at, 0.35);
        cover!.launchFrom(at, ringTargets(at, COINS, COIN_REACH));
        if (!cover!.isLive() || s.bullet.hitAt - lastPop < POP_GAP_MS) return;
        lastPop = s.bullet.hitAt;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, s.gen / SPLITS));
      },
    );
    const arriving = createBeats(
      homing,
      (s) => s.bullet.hitAt,
      (s) => {
        if (s.bullet.hitAt < endAt) cover!.burst(s.bullet.to, 0.3);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          arriving.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (let g = 0; g < byGen.length; g++)
            drawBullets(ctx, byGen[g], ms, now, WISP_SIZE * BULLET[g], g < 3);
          drawMuzzleFlash(ctx, button, firedAngle, ms / FLASH_MS, MUZZLE * 1.4);
          for (const s of walls) {
            if (!s.bounce) continue;
            const t = (ms - s.bullet.hitAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, s.bounce.at, s.bounce.angle, t, MUZZLE);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
