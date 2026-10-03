// the "Rappel" event (gunfire; free upgrade levels): it covers its crit,
// whose click freezes the screen while a gunner wisp shoots up out of the
// clicked floor's button to the top corner of the screen and rappels down
// its side in long swinging bounds; at every income bar it kicks off the
// wall, hangs a beat and rakes the bar with a burst of wisp bullets, muzzle
// flashing, each round a pop, the burst landing free levels with a bang and
// a jolt; it drops down the screen ever quicker, the last burst slamming its
// bar in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "rappel";
const MAX_BARS = 5;
const WALL = 40;
const TOP = 150;
const CLIMB_MS = 250;
// each bound swings KICK px out off the wall; the burst fires BURST rounds
// FIRE_MS apart once it hangs at the bar's row
const KICK = 70;
const BURST = 4;
const FIRE_MS = 40;
const SPEED = 2.6;
const GUNNER = 0.55;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 44;
const FLASH_MS = 50;
const BURST_SHAKE: [number, number] = [0.6, 1.3];

export const forceRappelEvent = registerWispEvent(
  KEY,
  "Rappel",
  () => CONFIG.rappelEvent.chance,
  (floor, context, area) => {
    const { boundsMs, holdMs, mergeMs } = CONFIG.rappelEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const side = button.x > (area.left + area.right) / 2 ? -1 : 1;
    const wallX = side > 0 ? area.left + WALL : area.right - WALL;
    const top: Point = { x: wallX, y: area.top + TOP };
    let clock = CLIMB_MS;
    let fromY = top.y;
    const bounds = bars.map((bar, k) => {
      const leaves = clock;
      const span = lerp(boundsMs, k / Math.max(1, bars.length - 1));
      const hangs = leaves + span * 0.6;
      const perch: Point = { x: wallX, y: bar.center.y };
      const burst: Bullet[] = Array.from({ length: BURST }, (_, r) =>
        aimBullet(
          perch,
          {
            x: bar.center.x + (r / (BURST - 1) - 0.5) * bar.box.width * 0.6,
            y: bar.center.y,
          },
          hangs + r * FIRE_MS,
          SPEED,
        ),
      );
      clock = leaves + span;
      const bound = {
        bar,
        fromY,
        perch,
        leaves,
        hangs,
        burst,
        lands: burst[BURST - 1].hitAt,
      };
      fromY = perch.y;
      return bound;
    });
    const last = bounds[bounds.length - 1];
    const endAt = Math.max(clock, last.lands);
    const bullets = bounds.flatMap((b) => b.burst);
    const gunnerAt: Point = { x: 0, y: 0 };
    const gunner = (ms: number): Point => {
      if (ms < CLIMB_MS) {
        const u = easeOut(ms / CLIMB_MS);
        gunnerAt.x = lerp([button.x, top.x], u);
        gunnerAt.y = lerp([button.y, top.y], u);
        return gunnerAt;
      }
      let b = bounds[0];
      for (const bound of bounds) if (ms >= bound.leaves) b = bound;
      const u = clamp01((ms - b.leaves) / (b.hangs - b.leaves));
      gunnerAt.x = wallX + side * Math.sin(Math.PI * u) * KICK;
      gunnerAt.y = lerp([b.fromY, b.perch.y], easeOut(u));
      return gunnerAt;
    };

    const bounding = createBeats(
      bounds,
      (b) => b.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const raking = createBeats(
      bounds,
      (b) => b.lands,
      (b, k) => {
        cover!.levels(b.bar, levelsFor(b.bar.floor), b.perch);
        if (b === last) {
          cover!.slam(b.bar);
          cover!.blast(b.bar.center);
          return;
        }
        cover!.burst(b.bar.center, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, k / Math.max(1, bounds.length - 1)));
      },
    );
    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.1),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          bounding.tick(ms, now);
          raking.tick(ms, now);
          pinging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets)
            drawMuzzleFlash(
              ctx,
              b.from,
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
  (floor, context) => findRewardBars(floor, context).length > 0,
);
