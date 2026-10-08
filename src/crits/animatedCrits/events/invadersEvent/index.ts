// the "Invaders" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while a grid of invader wisps pours out of the clicked
// floor's button and forms up across the top of the screen, swaying side to
// side and creeping down; a gun wisp drops to the bottom and slides under
// them, picking them off one by one with wisp bullets straight up, each kill
// a flash, a pop and a burst of coins, ever faster; the last one goes in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
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
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "invaders";
const REWARD = 4;
const COLS = 6;
const ROWS = 4;
const TOP = 150;
const GAP_X = 70;
const GAP_Y = 60;
// the grid sways SWAY px every SWAY_MS and creeps CREEP px a second
const SWAY = 40;
const SWAY_MS = 700;
const CREEP = 25;
const GUN_UP = 90;
const SPEED = 2.6;
const INVADER = 0.4;
const GUN = 0.7;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 44;
const FLASH_MS = 60;
const COINS = 6;
const COIN_REACH: [number, number] = [20, 90];
const KILL_SHAKE: [number, number] = [0.25, 0.9];

export const forceInvadersEvent = registerWispEvent(
  KEY,
  "Invaders",
  () => CONFIG.invadersEvent.chance,
  (floor, context, area) => {
    const { formMs, killsMs, holdMs, mergeMs } = CONFIG.invadersEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const gunY = area.bottom - GUN_UP;
    const n = COLS * ROWS;
    // the kills, in a random order, ever faster
    const order = Array.from({ length: n }, (_, i) => i).sort(
      () => Math.random() - 0.5,
    );
    const killAt: number[] = new Array(n);
    let clock: number = formMs;
    order.forEach((i, k) => {
      killAt[i] = clock;
      clock += lerp(killsMs, k / (n - 1));
    });
    const lastKill = order[n - 1];
    const invaders = Array.from({ length: n }, (_, i) => {
      const home: Point = {
        x: cx + ((i % COLS) - (COLS - 1) / 2) * GAP_X,
        y: area.top + TOP + Math.floor(i / COLS) * GAP_Y,
      };
      const delay = (i / n) * formMs * 0.4;
      const spot: Point = { x: 0, y: 0 };
      const at = (ms: number): Point => {
        const u = easeOut(
          Math.min(1, Math.max(0, ms - delay) / (formMs * 0.6)),
        );
        spot.x =
          lerp([button.x, home.x], u) +
          Math.sin((ms / SWAY_MS) * Math.PI) * SWAY * u;
        spot.y =
          lerp([button.y, home.y], u) +
          (Math.max(0, ms - formMs) / 1000) * CREEP;
        return spot;
      };
      const hits = killAt[i];
      const target = { ...at(hits) };
      const from: Point = { x: target.x, y: gunY };
      const reach = gunY - target.y;
      const b = aimBullet(from, target, hits - reach / SPEED, SPEED);
      return { at, hits, b };
    });
    const bullets = invaders.map((v) => v.b);
    const endAt = clock;
    // the gun slides under each shot in firing order
    const firing = [...invaders].sort((a, b) => a.b.firedAt - b.b.firedAt);
    const gunAt: Point = { x: 0, y: gunY };
    const gun = (ms: number): Point => {
      if (ms < formMs * 0.5) {
        const u = easeOut(ms / (formMs * 0.5));
        gunAt.x = lerp([button.x, cx], u);
        gunAt.y = lerp([button.y, gunY], u);
        return gunAt;
      }
      gunAt.y = gunY;
      let x = cx;
      let prevAt = formMs * 0.5;
      for (const v of firing) {
        if (ms < v.b.firedAt) {
          gunAt.x = lerp(
            [x, v.b.from.x],
            easeOut(Math.max(0, (ms - prevAt) / (v.b.firedAt - prevAt))),
          );
          return gunAt;
        }
        x = v.b.from.x;
        prevAt = v.b.firedAt;
      }
      gunAt.x = x;
      return gunAt;
    };

    const killing = createBeats(
      invaders,
      (v) => v.hits,
      (v, k) => {
        if (v === invaders[lastKill]) {
          cover!.blast(v.b.to);
          return;
        }
        cover!.launchFrom(v.b.to, ringTargets(v.b.to, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (k % 3 === 0) playExplosion();
        shakeScreen(lerp(KILL_SHAKE, k / (n - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => killing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const v of invaders)
            drawWispBetween(
              ctx,
              v.at,
              ms,
              now,
              WISP_SIZE * INVADER,
              0.4,
              0,
              v.hits,
            );
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets)
            drawMuzzleFlash(
              ctx,
              b.from,
              -Math.PI / 2,
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
