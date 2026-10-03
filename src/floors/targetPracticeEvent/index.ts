// the "Target Practice" event (gunfire; cash): it covers its crit, whose
// click freezes the screen while a gunner wisp leaps out of the clicked
// floor's button to the middle of the screen and target wisps pop up all
// over it one after another, springing up into place; the gunner snaps
// round onto each and drills it with a three-round burst, muzzle flashing,
// and the target bursts into a spray of coins with a pop and a jolt; the
// targets pop up ever faster, the last bursting in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "targetPractice";
const REWARD = 4;
const TARGETS = 10;
const ROUNDS = 3;
const ROUND_MS = 45;
const EDGE = 70;
const TOP = 170;
const LEAP_MS = 220;
// each target springs up SPRING px over POP_MS before the burst lands
const SPRING = 40;
const POP_MS = 160;
const SPEED = 2.8;
const GUNNER = 0.6;
const TARGET = 0.45;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 44;
const FLASH_MS = 50;
const COINS = 12;
const COIN_REACH: [number, number] = [30, 120];
const HIT_SHAKE: [number, number] = [0.4, 1.1];

export const forceTargetPracticeEvent = registerWispEvent(
  KEY,
  "Target Practice",
  () => CONFIG.targetPracticeEvent.chance,
  (floor, context, area) => {
    const { targetsMs, holdMs, mergeMs } = CONFIG.targetPracticeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const width = area.right - area.left - EDGE * 2;
    const height = area.bottom - area.top - TOP - EDGE;
    let clock = LEAP_MS + POP_MS;
    const targets = Array.from({ length: TARGETS }, (_, k) => {
      let spot: Point;
      do
        spot = {
          x: area.left + EDGE + Math.random() * width,
          y: area.top + TOP + Math.random() * height,
        };
      while (Math.hypot(spot.x - center.x, spot.y - center.y) < 120);
      const dies = clock;
      clock += lerp(targetsMs, k / (TARGETS - 1));
      const pops = dies - POP_MS;
      const burst: Bullet[] = Array.from({ length: ROUNDS }, (_, r) => {
        const reach = Math.hypot(spot.x - center.x, spot.y - center.y);
        return aimBullet(
          center,
          spot,
          dies - reach / SPEED - (ROUNDS - 1 - r) * ROUND_MS,
          SPEED,
        );
      });
      const at: Point = { x: 0, y: 0 };
      return {
        spot,
        pops,
        dies,
        burst,
        at: (ms: number): Point => {
          at.x = spot.x;
          at.y =
            spot.y + SPRING * (1 - easeOutBack(clamp01((ms - pops) / POP_MS)));
          return at;
        },
      };
    });
    const last = targets[TARGETS - 1];
    const endAt = last.dies;
    const bullets = targets.flatMap((t) => t.burst);
    const gunnerAt: Point = { x: 0, y: 0 };
    const gunner = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / LEAP_MS));
      gunnerAt.x = lerp([button.x, center.x], u);
      gunnerAt.y = lerp([button.y, center.y], u);
      return gunnerAt;
    };

    const hitting = createBeats(
      targets,
      (t) => t.dies,
      (t, k) => {
        if (t === last) {
          cover!.blast(t.spot);
          return;
        }
        cover!.launchFrom(t.spot, ringTargets(t.spot, COINS, COIN_REACH));
        cover!.burst(t.spot, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / (TARGETS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const t of targets)
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * TARGET,
              0.3,
              t.pops,
              t.dies,
            );
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets)
            drawMuzzleFlash(
              ctx,
              center,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            gunner,
            ms,
            now,
            WISP_SIZE * GUNNER,
            0.8,
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
