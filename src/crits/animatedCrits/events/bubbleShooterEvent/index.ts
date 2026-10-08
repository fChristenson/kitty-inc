// the "Bubble Shooter" event (an experiment beyond the seven looks: an
// arcade bubble shooter; cash): it covers its crit, whose click freezes the
// screen while a cluster of bubble wisps fills the top of the screen and a
// shooter wisp drops to the bottom; it fires a wisp that banks off the side
// of the screen into the cluster, and a whole patch of bubbles pops in a
// crackling chain, each a pop and a spray of coins; shot after shot banks in
// off alternate walls, ever faster, until the last patch goes in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "bubbleShooter";
const REWARD = 4;
const COLS = 8;
const ROWS = 4;
const GAP = 52;
const TOP = 150;
const WALL = 24;
// each shot pops a patch of PATCH columns, its bubbles going POP_MS apart
const PATCH = 2;
const POP_MS = 25;
const SPEED = 2.4;
const BUBBLE = 0.42;
const SHOT = 0.4;
const SHOOTER = 0.7;
const COINS = 3;
const COIN_REACH: [number, number] = [20, 80];
const POP_SHAKE: [number, number] = [0.6, 1.3];

export const forceBubbleShooterEvent = registerWispEvent(
  KEY,
  "Bubble Shooter",
  () => CONFIG.bubbleShooterEvent.chance,
  (floor, context, area) => {
    const { fillMs, shotsMs, holdMs, mergeMs } = CONFIG.bubbleShooterEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const shooter: Point = { x: cx, y: area.bottom - 80 };
    const patches = COLS / PATCH;
    const order = Array.from({ length: patches }, (_, i) => i).sort(
      () => Math.random() - 0.5,
    );
    let clock: number = fillMs;
    const shots = order.map((patch, k) => {
      const col = patch * PATCH + (PATCH - 1) / 2;
      const target: Point = {
        x: cx + (col - (COLS - 1) / 2) * GAP,
        y: area.top + TOP + (ROWS - 1) * GAP * 0.87,
      };
      const wallX = k % 2 === 0 ? area.left + WALL : area.right - WALL;
      // bank off the wall: mirror the target across it and aim straight
      const mirror = 2 * wallX - target.x;
      const u = (wallX - shooter.x) / (mirror - shooter.x);
      const bank: Point = { x: wallX, y: lerp([shooter.y, target.y], u) };
      const leg1 = Math.hypot(bank.x - shooter.x, bank.y - shooter.y);
      const leg2 = Math.hypot(target.x - bank.x, target.y - bank.y);
      const fires = clock;
      const hits = fires + (leg1 + leg2) / SPEED;
      clock += lerp(shotsMs, k / Math.max(1, patches - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        patch,
        target,
        fires,
        hits,
        at: (ms: number): Point => {
          const d = Math.max(0, ms - fires) * SPEED;
          if (d < leg1) {
            const f = d / leg1;
            at.x = lerp([shooter.x, bank.x], f);
            at.y = lerp([shooter.y, bank.y], f);
          } else {
            const f = clamp01((d - leg1) / leg2);
            at.x = lerp([bank.x, target.x], f);
            at.y = lerp([bank.y, target.y], f);
          }
          return at;
        },
      };
    });
    const hitOf = new Map(shots.map((s) => [s.patch, s]));
    const lastShot = shots[shots.length - 1];
    const bubbles = Array.from({ length: COLS * ROWS }, (_, i) => {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const home: Point = {
        x: cx + (c - (COLS - 1) / 2) * GAP + (r % 2) * GAP * 0.25,
        y: area.top + TOP + r * GAP * 0.87,
      };
      const shot = hitOf.get(Math.floor(c / PATCH))!;
      // the patch pops outward from where the shot hit, bottom row first
      const pops =
        shot.hits +
        (ROWS - 1 - r + Math.abs(c - (shot.patch * PATCH + 0.5))) * POP_MS;
      const shows = (i / (COLS * ROWS)) * fillMs * 0.6;
      const at: Point = { x: 0, y: 0 };
      return {
        home,
        pops,
        shows,
        last: shot === lastShot,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - shows) / (fillMs * 0.4)));
          at.x = lerp([button.x, home.x], u);
          at.y = lerp([button.y, home.y], u);
          return at;
        },
      };
    });
    const endAt = Math.max(...bubbles.map((b) => b.pops));
    const shooterAt: Point = { x: 0, y: 0 };
    const shooterWisp = (ms: number): Point => {
      const u = easeOut(clamp01(ms / (fillMs * 0.6)));
      shooterAt.x = lerp([button.x, shooter.x], u);
      shooterAt.y = lerp([button.y, shooter.y], u);
      return shooterAt;
    };

    const firing = createBeats(
      shots,
      (s) => s.fires,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        if (s === lastShot) {
          cover!.blast(s.target);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const popping = createBeats(
      bubbles,
      (b) => b.pops,
      (b, k) => {
        cover!.launchFrom(b.home, ringTargets(b.home, COINS, COIN_REACH));
        if (cover!.isLive() && k % 3 === 0 && !b.last) playBloop();
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
          firing.tick(ms, now);
          hitting.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const b of bubbles)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BUBBLE,
              0.3,
              b.shows,
              b.pops,
            );
          for (const s of shots)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHOT,
              1,
              s.fires,
              s.hits,
            );
          drawWispBetween(
            ctx,
            shooterWisp,
            ms,
            now,
            WISP_SIZE * SHOOTER,
            0.7,
            0,
            lastShot.hits,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
