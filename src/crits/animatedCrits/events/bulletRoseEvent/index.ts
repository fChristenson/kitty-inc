// the "Bullet Rose" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a boss wisp rises out of the clicked floor's
// button to the middle of the screen and fires ring after ring of wisp
// bullets, each ring's rounds flying at different speeds so the swelling
// cloud of bullets opens into the petals of a rose, every ring turned and
// fuller than the last; as the rounds reach the screen's edge they pop
// into coins with a flash and a jolt, and the boss blows in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
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
  drawBullets,
  drawMuzzleFlash,
  fireBullet,
  type Bullet,
} from "../../../../shared/bullets";

const KEY = "bulletRose";
const REWARD = 4;
const EDGE = 20;
const RISE_MS = 250;
// RINGS rings of ROUNDS rounds, PETALS petals, speeds SPEED x (1 - DIP .. 1)
const RINGS = 4;
const ROUNDS = 36;
const PETALS: [number, number] = [4, 6];
const SPEED = 1.6;
const DIP = 0.65;
const BOSS = 0.9;
const BULLET = WISP_SIZE * 0.26;
const MUZZLE = 80;
const FLASH_MS = 100;
const POP_GAP_MS = 60;
const RING_SHAKE: [number, number] = [0.6, 1.2];

export const forceBulletRoseEvent = registerWispEvent(
  KEY,
  "Bullet Rose",
  () => CONFIG.bulletRoseEvent.chance,
  (floor, context, area) => {
    const { ringsMs, holdMs, mergeMs } = CONFIG.bulletRoseEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const boss: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const bullets: Bullet[] = [];
    const rings: number[] = [];
    let clock = RISE_MS;
    for (let r = 0; r < RINGS; r++) {
      rings.push(clock);
      const petals = Math.round(lerp(PETALS, r / (RINGS - 1)));
      const turn = r * 0.35;
      for (let i = 0; i < ROUNDS; i++) {
        const a = turn + (i / ROUNDS) * Math.PI * 2;
        // the petal's shape: rounds along a petal's middle fly fastest
        const speed =
          SPEED *
          (1 - DIP * (1 - Math.abs(Math.cos((petals / 2) * (a - turn)))));
        bullets.push(fireBullet(boss, a, clock, speed, box));
      }
      clock += lerp(ringsMs, r / (RINGS - 1));
    }
    const blowAt = rings[RINGS - 1] + 200;
    const endAt = Math.max(...bullets.map((b) => b.hitAt));
    // only some edge pops pay out, so the coins stay a spray, not a wall
    const pops = bullets
      .filter((_, i) => i % 3 === 0)
      .sort((a, b) => a.hitAt - b.hitAt);
    const bossAt: Point = { x: 0, y: 0 };
    const bossWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / RISE_MS));
      bossAt.x = lerp([button.x, boss.x], u);
      bossAt.y = lerp([button.y, boss.y], u);
      return bossAt;
    };
    let lastPop = -Infinity;

    const firing = createBeats(
      rings,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RING_SHAKE, k / (RINGS - 1)));
      },
    );
    const popping = createBeats(
      pops,
      (b) => b.hitAt,
      (b) => {
        cover!.launchFrom(b.to, [
          { x: b.to.x - b.dx * 60, y: b.to.y - b.dy * 60 },
        ]);
        if (!cover!.isLive() || b.hitAt - lastPop < POP_GAP_MS) return;
        lastPop = b.hitAt;
        playBloop();
      },
    );
    const blowing = createBeats(
      [blowAt],
      (ms) => ms,
      () => cover!.blast(boss),
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
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const r of rings)
            drawMuzzleFlash(
              ctx,
              boss,
              -Math.PI / 2,
              (ms - r) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            bossWisp,
            ms,
            now,
            WISP_SIZE * BOSS,
            0.8,
            0,
            blowAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
