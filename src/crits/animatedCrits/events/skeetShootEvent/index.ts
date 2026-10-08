// the "Skeet Shoot" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while clay wisps are flung up from the bottom corners
// in high arcs across the sky, one after another, ever faster; a shooter
// wisp over the clicked floor's button swings and fires at each, muzzle
// flashing, and every clay it hits shatters in a flash, a crack, a jolt
// and a shower of coins; the last clay goes off in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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
  type Bullet,
} from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "skeetShoot";
const REWARD = 4;
const CLAYS = 7;
// clays arc up to PEAK of the way down the screen and are hit HIT_AT of the
// way through their flight
const PEAK: [number, number] = [0.15, 0.35];
const HIT_AT = 0.55;
const UP = 70;
const SPEED = 3;
const CLAY = 0.4;
const SHOOTER = 0.55;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 50;
const FLASH_MS = 70;
const SHARDS = 14;
const SHARD_REACH: [number, number] = [30, 120];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceSkeetShootEvent = registerWispEvent(
  KEY,
  "Skeet Shoot",
  () => CONFIG.skeetShootEvent.chance,
  (floor, context, area) => {
    const { gapsMs, arcMs, holdMs, mergeMs } = CONFIG.skeetShootEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const shooter: Point = { x: button.x, y: button.y - UP };
    const h = area.bottom - area.top;
    let clock = 200;
    const bullets: Bullet[] = [];
    const clays = Array.from({ length: CLAYS }, (_, k) => {
      const flung = clock;
      clock += lerp(gapsMs, k / (CLAYS - 1));
      const ltr = k % 2 === 0;
      const from: Point = {
        x: ltr ? area.left - 20 : area.right + 20,
        y: area.bottom - 40,
      };
      const to: Point = {
        x: ltr ? area.right + 20 : area.left - 20,
        y: area.top + h * 0.6,
      };
      const peak = area.top + h * lerp(PEAK, Math.random());
      const at: Point = { x: 0, y: 0 };
      const posAt = (ms: number, into: Point) => {
        const u = (ms - flung) / arcMs;
        into.x = lerp([from.x, to.x], u);
        // a parabola through the peak
        into.y =
          lerp([from.y, to.y], u) -
          4 * u * (1 - u) * (lerp([from.y, to.y], 0.5) - peak);
        return into;
      };
      const hits = flung + arcMs * HIT_AT;
      const spot = posAt(hits, { x: 0, y: 0 });
      // fired so the round meets the clay where it'll be
      const travel = Math.hypot(spot.x - shooter.x, spot.y - shooter.y) / SPEED;
      const shot = aimBullet(shooter, spot, hits - travel, SPEED);
      bullets.push(shot);
      return {
        flung,
        hits,
        spot,
        shot,
        at: (ms: number): Point | null =>
          ms < flung || ms >= hits ? null : posAt(ms, at),
      };
    });
    const last = clays[CLAYS - 1];
    const endAt = last.hits;
    const shooterAt: Point = { x: 0, y: 0 };
    const shooterWisp = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const u = easeOut(Math.min(1, ms / 200));
      shooterAt.x = lerp([button.x, shooter.x], u);
      shooterAt.y = lerp([button.y, shooter.y], u);
      return shooterAt;
    };

    const flinging = createBeats(
      clays,
      (c) => c.flung,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      clays,
      (c) => c.hits,
      (c, k) => {
        if (c === last) {
          cover!.blast(c.spot);
          return;
        }
        cover!.burst(c.spot, 0.4);
        cover!.launchFrom(c.spot, ringTargets(c.spot, SHARDS, SHARD_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (CLAYS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flinging.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const c of clays) {
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CLAY,
              0.5,
              c.flung,
              c.hits,
            );
            drawMuzzleFlash(
              ctx,
              shooter,
              Math.atan2(c.spot.y - shooter.y, c.spot.x - shooter.x),
              (ms - c.shot.firedAt) / FLASH_MS,
              MUZZLE,
            );
          }
          drawWispBetween(
            ctx,
            shooterWisp,
            ms,
            now,
            WISP_SIZE * SHOOTER,
            0.7,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
