// the "Trick Shot" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while a gun wisp rises off the clicked floor's
// button and a handful of bumper wisps pop up around the screen; it fires
// one round at a time, each ricocheting off bumper after bumper in a wild
// zigzag, every ricochet a flash and a ping, before it drills into an
// income bar with a bang and a jolt that jumps the bar a crit tier; each
// trick shot faster than the last; the final one ends in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import { findRewardBars } from "../../eventRewards";

const KEY = "trickShot";
const MAX_BARS = 3;
const BUMPERS = 5;
const BANKS = 3;
const UP = 60;
const GUN = 0.55;
const BUMPER = 0.4;
const BULLET = WISP_SIZE * 0.35;
const MUZZLE = 50;
const FLASH_MS = 80;
const HIT_SHAKE: [number, number] = [0.9, 1.5];

export const forceTrickShotEvent = registerWispEvent(
  KEY,
  "Trick Shot",
  () => CONFIG.trickShotEvent.chance,
  (floor, context, area) => {
    const { setMs, speeds, gapMs, holdMs, mergeMs } = CONFIG.trickShotEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const gun: Point = { x: button.x, y: button.y - UP };
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const bumpers: Point[] = Array.from({ length: BUMPERS }, (_, i) => ({
      x: area.left + w * (0.12 + 0.76 * ((i * 0.618 + 0.3) % 1)),
      y: area.top + h * (0.15 + 0.6 * (i / (BUMPERS - 1))),
    }));
    const bullets: Bullet[] = [];
    const pings: { at: number; spot: Point }[] = [];
    let clock: number = setMs;
    const shots = bars.map((bar, k) => {
      const speed = lerp(speeds, k / Math.max(1, bars.length - 1));
      // a route through a few bumpers, never the same one twice running
      const route: Point[] = [gun];
      let previous = -1;
      for (let i = 0; i < BANKS; i++) {
        let pick = Math.floor(Math.random() * BUMPERS);
        if (pick === previous) pick = (pick + 1) % BUMPERS;
        previous = pick;
        route.push(bumpers[pick]);
      }
      route.push(bar.center);
      const fired = clock;
      let t = fired;
      for (let i = 0; i < route.length - 1; i++) {
        const b = aimBullet(route[i], route[i + 1], t, speed);
        bullets.push(b);
        t = b.hitAt;
        if (i < route.length - 2) pings.push({ at: t, spot: route[i + 1] });
      }
      clock = t + gapMs;
      return {
        bar,
        fired,
        hits: t,
        angle: Math.atan2(route[1].y - gun.y, route[1].x - gun.x),
      };
    });
    const last = shots[shots.length - 1];
    const endAt = last.hits;
    const gunAt: Point = { x: 0, y: 0 };
    const gunWisp = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const u = easeOut(Math.min(1, ms / setMs));
      gunAt.x = lerp([button.x, gun.x], u);
      gunAt.y = lerp([button.y, gun.y], u);
      return gunAt;
    };
    const bumperWisps = bumpers.map((spot) => () => spot);

    const pinging = createBeats(
      pings,
      (p) => p.at,
      (p) => {
        cover!.burst(p.spot, 0.3);
        if (cover!.isLive()) playBloop();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.tierUp(s.bar, gun);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
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
          pinging.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              gun,
              s.angle,
              (ms - s.fired) / FLASH_MS,
              MUZZLE,
            );
          const grow = Math.min(1, ms / setMs);
          if (ms < endAt)
            for (const b of bumperWisps)
              drawWispBetween(
                ctx,
                b,
                ms,
                now,
                WISP_SIZE * BUMPER * grow,
                0.4,
                0,
                endAt,
              );
          drawWispBetween(
            ctx,
            gunWisp,
            ms,
            now,
            WISP_SIZE * GUN,
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
  (floor, context) => findRewardBars(floor, context).length > 0,
);
