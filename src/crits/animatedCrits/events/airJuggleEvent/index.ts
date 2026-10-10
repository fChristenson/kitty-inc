// the "Air Juggle" event (gunfire; levels + crit tier): it covers its crit,
// whose click freezes the screen while a lit bomb wisp is tossed up off the
// clicked floor's bar and two guns in the bottom corners keep it in the air,
// every hit a blast, a jolt and free levels on the bar under it, knocking it
// higher and across the building, quicker and quicker; then it drops back
// over its bar, both guns riddle it in a rattling burst and it blows in a
// huge blast that tiers the bar up. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "airJuggle";
// each hit's height, 0 just over the clicked bar to 1 near the screen's top,
// and the gaps before the next, quickening
const HEIGHTS = [0.35, 0.7, 0.2, 0.8, 0.5, 1, 0.65, 1];
const GAPS = [280, 260, 235, 215, 195, 175, 155];
// hits swing this share of the screen's width either side of its middle,
// narrowing each hit
const SWING: [number, number] = [0.27, 0.12];
const LOW = 100;
const HIGH = 0.16;
const MIN_SPAN = 500;
const TOSS_LIFT = 220;
const KNOCK_LIFT = 140;
const DROP_LIFT = 100;
// it ends hovering this far over its bar, riddled by RIDDLE shots
const HOVER = 160;
const RIDDLE = 12;
const RIDDLE_GAP_MS = 30;
const RIDDLE_SPREAD = { x: 120, y: 100 };
const FINALE_LAG = 100;
// the guns sit this share in from the bottom corners; shots fly FLY_MS
const GUN_IN = { x: 0.08, y: 0.06 };
const FLY_MS = 110;
const FLASH_MS = 90;
const FLASH_SIZE = 140;
const BOMB = WISP_SIZE * 1.4;
const BULLET = WISP_SIZE * 0.5;
const KNOCK_BLAST = 140;
const RIDDLE_BLAST = 110;
const FINALE_BLAST = 850;
const KNOCK_SHAKE: [number, number] = [0.6, 1.1];
const RIDDLE_SHAKE = 0.5;
const FINALE_SHAKE = 1.8;
const SOUND_GAP_MS = 55;

interface Knock {
  at: Point;
  ms: number;
  bar: RewardBar;
}

interface Shot {
  gun: Point;
  bullet: Bullet;
  angle: number;
}

export const forceAirJuggleEvent = registerWispEvent(
  KEY,
  "Air Juggle",
  () => CONFIG.airJuggleEvent.chance,
  (floor, context, area) => {
    const { tossMs, dropMs, levelShare, holdMs, mergeMs } =
      CONFIG.airJuggleEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middle = (area.left + area.right) / 2;
    const high = area.top + height * HIGH;
    const low = Math.max(clicked.box.y - LOW, high + MIN_SPAN);
    const nearest = (y: number) =>
      bars.reduce((a, b) =>
        Math.abs(b.center.y - y) < Math.abs(a.center.y - y) ? b : a,
      );
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    const start = clicked.center;
    const knocks: Knock[] = [];
    let t = tossMs;
    HEIGHTS.forEach((h, k) => {
      const at: Point = {
        x:
          middle +
          (k % 2 ? 1 : -1) * width * lerp(SWING, k / (HEIGHTS.length - 1)),
        y: lerp([low, high], h),
      };
      knocks.push({ at, ms: t, bar: nearest(at.y) });
      t += GAPS[k] ?? 0;
    });
    const last = knocks[knocks.length - 1];
    const hover: Point = { x: clicked.center.x, y: clicked.center.y - HOVER };
    const over = last.ms + dropMs;
    const riddle = Array.from({ length: RIDDLE }, (_, i) => ({
      at: {
        x: hover.x + (Math.random() - 0.5) * RIDDLE_SPREAD.x,
        y: hover.y + (Math.random() - 0.5) * RIDDLE_SPREAD.y,
      },
      ms: over + 60 + i * RIDDLE_GAP_MS,
    }));
    const finaleAt = riddle[RIDDLE - 1].ms + FINALE_LAG;
    const endMs = finaleAt + DETONATION_MS;

    const guns: Point[] = [
      { x: area.left + width * GUN_IN.x, y: area.bottom - height * GUN_IN.y },
      { x: area.right - width * GUN_IN.x, y: area.bottom - height * GUN_IN.y },
    ];
    const shoot = (gun: Point, to: Point, hitMs: number): Shot => {
      const reach = Math.hypot(to.x - gun.x, to.y - gun.y) || 1;
      return {
        gun,
        bullet: aimBullet(gun, to, hitMs - FLY_MS, reach / FLY_MS),
        angle: Math.atan2(to.y - gun.y, to.x - gun.x),
      };
    };
    const shots: Shot[] = [
      ...knocks.map((k, i) => shoot(guns[i % 2], k.at, k.ms)),
      ...riddle.map((r, i) => shoot(guns[i % 2], r.at, r.ms)),
    ];
    const bullets = shots.map((s) => s.bullet);

    const spot: Point = { x: 0, y: 0 };
    const arc = (a: Point, b: Point, lift: number, u: number): Point => {
      spot.x = lerp([a.x, b.x], u);
      spot.y = lerp([a.y, b.y], u) - 4 * lift * u * (1 - u);
      return spot;
    };
    const bombAt = (ms: number): Point | null => {
      if (ms < 0 || ms > finaleAt) return null;
      if (ms < knocks[0].ms)
        return arc(start, knocks[0].at, TOSS_LIFT, ms / knocks[0].ms);
      for (let k = 1; k < knocks.length; k++)
        if (ms < knocks[k].ms) {
          const a = knocks[k - 1];
          const b = knocks[k];
          return arc(a.at, b.at, KNOCK_LIFT, (ms - a.ms) / (b.ms - a.ms));
        }
      return arc(last.at, hover, DROP_LIFT, clamp01((ms - last.ms) / dropMs));
    };

    let soundAt = -Infinity;
    const bang = (now: number, loud = false) => {
      if (!loud && now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const firing = createBeats(
      shots,
      (s) => s.bullet.firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const knocking = createBeats(
      knocks,
      (k) => k.ms,
      (k, i, now) => {
        cover!.levels(k.bar, levels.get(k.bar)!, k.at);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(KNOCK_SHAKE, i / (knocks.length - 1)));
        bang(now);
      },
    );
    const riddling = createBeats(
      riddle,
      (r) => r.ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(RIDDLE_SHAKE);
        bang(now);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      (_, __, now) => {
        cover!.tierUp(clicked, hover);
        cover!.slam(clicked);
        cover!.blast(hover);
        if (!cover!.isLive()) return;
        shakeScreen(FINALE_SHAKE);
        bang(now, true);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          knocking.tick(ms, now);
          riddling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const at = bombAt(ms);
          if (at) drawLitFuse(ctx, at, clamp01(ms / finaleAt), BOMB * 1.4, now);
          drawWispBetween(ctx, bombAt, ms, now, BOMB, 0.4, 0, finaleAt);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              s.gun,
              s.angle,
              (ms - s.bullet.firedAt) / FLASH_MS,
              FLASH_SIZE,
            );
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const k of knocks)
            drawDetonation(ctx, k.at, ms - k.ms, KNOCK_BLAST, now);
          for (const r of riddle)
            drawDetonation(ctx, r.at, ms - r.ms, RIDDLE_BLAST, now);
          drawDetonation(ctx, hover, ms - finaleAt, FINALE_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
