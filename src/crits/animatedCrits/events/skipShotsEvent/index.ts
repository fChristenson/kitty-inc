// the "Skip Shots" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while guns open up from both bottom
// corners, firing wisp bullets low and flat so they skip off the bottom of
// the screen like stones off water, each skip a splash, and kick up into an
// income bar with a flash, a pop and a jolt of free levels; the guns trade
// shots faster and faster, then fire one last volley that skips into every
// bar at once in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  ricochetThrough,
  drawBounceSplash,
  type BouncePath,
} from "../../../../shared/bounce";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "skipShots";
const MAX_BARS = 4;
const PER_BAR = 2;
const SIDE = 34;
const GUN_LOW = 150;
const SKIP_LOW = 24;
// how far from the gun along the floor the shot skips
const SKIP_AT = 0.45;
const LEG_MS: [number, number] = [150, 210];
const BULLET = 0.45;
const SPLASH = 90;
const FLASH_MS = 110;
const FLASH = 46;
const HIT_SHAKE: [number, number] = [0.4, 1.0];

interface Shot {
  gun: number;
  bar: RewardBar;
  firedAt: number;
  path: BouncePath;
  hitsAt: number;
  last: boolean;
}

export const forceSkipShotsEvent = registerWispEvent(
  KEY,
  "Skip Shots",
  () => CONFIG.skipShotsEvent.chance,
  (floor, context, area) => {
    const { aimMs, shotsMs, volleyGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.skipShotsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const guns: Point[] = [
      { x: area.left + SIDE, y: area.bottom - GUN_LOW },
      { x: area.right - SIDE, y: area.bottom - GUN_LOW },
    ];
    const floorY = area.bottom - SKIP_LOW;
    const shoot = (
      gun: number,
      bar: RewardBar,
      firedAt: number,
      last: boolean,
    ): Shot => {
      const from = guns[gun];
      const target: Point = {
        x: bar.box.x + bar.box.width * (0.25 + 0.5 * Math.random()),
        y: bar.center.y,
      };
      const skip: Point = { x: lerp([from.x, target.x], SKIP_AT), y: floorY };
      const path = ricochetThrough([from, skip, target], LEG_MS, firedAt);
      return { gun, bar, firedAt, path, hitsAt: path.endMs, last };
    };
    const count = bars.length * PER_BAR;
    let clock = aimMs;
    const shots: Shot[] = Array.from({ length: count }, (_, k) => {
      const shot = shoot(k % 2, bars[Math.floor(k / PER_BAR)], clock, false);
      clock += lerp(shotsMs, k / Math.max(1, count - 1));
      return shot;
    });
    const volleyAt = clock + volleyGapMs;
    const volley = bars.flatMap((bar) => [
      shoot(0, bar, volleyAt, false),
      shoot(1, bar, volleyAt, false),
    ]);
    const lastHit = Math.max(...volley.map((s) => s.hitsAt));
    for (const s of volley) if (s.hitsAt === lastHit) s.last = true;
    const all = [...shots, ...volley];
    const finale = all.find((s) => s.last)!;
    const endAt = lastHit;
    const skips = all.map((s) => s.path.bounces[0]);
    const angles = all.map((s) =>
      Math.atan2(
        s.path.bounces[0].at.y - guns[s.gun].y,
        s.path.bounces[0].at.x - guns[s.gun].x,
      ),
    );

    const firing = createBeats(
      all,
      (s) => s.firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const hitting = createBeats(
      all,
      (s) => s.hitsAt,
      (s, k) => {
        const at = s.path.bounces[1].at;
        if (s === finale) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), at);
        cover!.burst(at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, all.length - 1)));
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
          firing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          for (let i = 0; i < all.length; i++) {
            const s = all[i];
            drawMuzzleFlash(
              ctx,
              guns[s.gun],
              angles[i],
              (ms - s.firedAt) / FLASH_MS,
              FLASH,
            );
            drawBounceSplash(ctx, skips[i], ms - skips[i].ms, SPLASH, now);
            drawWispBetween(
              ctx,
              s.path.at,
              ms,
              now,
              WISP_SIZE * BULLET,
              1,
              s.firedAt,
              s.hitsAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
