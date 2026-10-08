// the "Gauntlet" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a runner wisp bolts out of the clicked floor's
// button and dashes across the screen between a row of gun wisps along the
// top and a row along the bottom, all blazing away at it; it jinks and
// weaves, and every bullet that just misses it smacks in behind it in a
// pop and a spray of coins; it runs the gauntlet there and back, the fire
// ever thicker, and as it reaches the end every gun fires at once, the
// whole volley missing into a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "gauntlet";
const REWARD = 4;
const GUNS = 3;
const EDGE = 90;
const TOP = 180;
const ENTER_MS = 200;
const WEAVE = 50;
const SPEED = 2.2;
// each shot lands LAG ms behind where the runner is
const LAG = 70;
const FLASH_MS = 70;
const FLASH = 40;
const RUNNER = 0.5;
const GUN = 0.4;
const BULLET = WISP_SIZE * 0.3;
const COINS = 10;
const COIN_REACH: [number, number] = [20, 90];
const BANG_GAP_MS = 60;

export const forceGauntletEvent = registerWispEvent(
  KEY,
  "Gauntlet",
  () => CONFIG.gauntletEvent.chance,
  (floor, context, area) => {
    const { runMs, shotsMs, holdMs, mergeMs } = CONFIG.gauntletEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const lane = (top + bottom) / 2;
    const ltr = button.x < (left + right) / 2;
    const start = ltr ? left : right;
    const finish = ltr ? right : left;
    const guns = Array.from(
      { length: GUNS * 2 },
      (_, i): Point => ({
        x: lerp([left + 60, right - 60], (i % GUNS) / (GUNS - 1)),
        y: i < GUNS ? top : bottom,
      }),
    );
    const gunAts = guns.map((gun) => (): Point => gun);
    const endAt = ENTER_MS + runMs * 2;
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point => {
      if (ms < ENTER_MS) {
        const u = ms / ENTER_MS;
        runnerAt.x = lerp([button.x, start], u);
        runnerAt.y = lerp([button.y, lane], u);
        return runnerAt;
      }
      const t = (ms - ENTER_MS) / runMs;
      // there and back, easing at the turn, jinking up and down all the way
      const leg =
        t < 1 ? smoothstep(clamp01(t)) : 1 - smoothstep(clamp01(t - 1));
      runnerAt.x = lerp([start, finish], leg);
      runnerAt.y = lane + Math.sin(t * Math.PI * 5) * WEAVE;
      return runnerAt;
    };
    const bullets: Bullet[] = [];
    let clock: number = ENTER_MS;
    for (let s = 0; clock < endAt - 150; s++) {
      const gun = guns[(s * 7) % guns.length];
      const aim = { ...runner(clock + 150 - LAG) };
      bullets.push(aimBullet(gun, aim, clock, SPEED));
      clock += lerp(shotsMs, clock / endAt);
    }
    // the last volley: every gun at once, all at the runner's finish
    const finishSpot: Point = { ...runner(endAt) };
    const volley = guns.map((gun) =>
      aimBullet(
        gun,
        {
          x: finishSpot.x + (gun.x - finishSpot.x) * 0.25,
          y: finishSpot.y + (gun.y - finishSpot.y) * 0.3,
        },
        endAt - 150,
        SPEED,
      ),
    );
    bullets.push(...volley);
    const finaleAt = Math.max(...volley.map((b) => b.hitAt));
    let lastBang = -Infinity;

    const hitting = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => {
        cover!.launchFrom(b.to, ringTargets(b.to, COINS, COIN_REACH));
        cover!.burst(b.to, 0.3);
        if (!cover!.isLive() || b.hitAt - lastBang < BANG_GAP_MS) return;
        lastBang = b.hitAt;
        playBloop();
        shakeScreen(0.4);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        cover!.blast(finishSpot);
        if (cover!.isLive()) playExplosion();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > finaleAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, b.from, Math.atan2(b.dy, b.dx), t, FLASH);
          }
          for (const gunAt of gunAts)
            drawWispBetween(
              ctx,
              gunAt,
              ms,
              now,
              WISP_SIZE * GUN,
              0.4,
              ENTER_MS,
              finaleAt,
            );
          drawWispBetween(
            ctx,
            runner,
            ms,
            now,
            WISP_SIZE * RUNNER,
            1,
            0,
            finaleAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
