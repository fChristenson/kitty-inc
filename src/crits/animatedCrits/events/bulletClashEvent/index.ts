// the "Bullet Clash" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a gun wisp slides up each side
// of the screen; level with each income bar in turn they fire at each other,
// the wisp bullets meeting dead over the middle of the bar and smashing
// together in a flash, a pop and a jolt that rains down on the bar as free
// levels, pair after pair, faster and faster; then both guns empty at once
// along every bar and the last collision goes off in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "bulletClash";
const MAX_BARS = 4;
const PAIRS = 2;
const SIDE = 30;
const ABOVE = 34;
const SPEED = 2.4;
const GUN = 0.45;
const BULLET = WISP_SIZE * 0.35;
const FLASH_MS = 100;
const FLASH = 44;
const VOLLEY_GAP_MS = 25;
const POP_SHAKE = 0.35;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Clash {
  bar: RewardBar | null;
  at: Point;
  shots: Bullet[];
  guns: Point[];
  meets: number;
  lands: boolean;
}

export const forceBulletClashEvent = registerWispEvent(
  KEY,
  "Bullet Clash",
  () => CONFIG.bulletClashEvent.chance,
  (floor, context, area) => {
    const { firstMs, pairsMs, volleyGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.bulletClashEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const xs = [area.left + SIDE, area.right - SIDE];
    const midX = (xs[0] + xs[1]) / 2;
    const clashOf = (
      bar: RewardBar,
      firedAt: number,
      lands: boolean,
      nudge = 0,
    ): Clash => {
      const y = bar.box.y - ABOVE + nudge;
      const at: Point = { x: midX, y };
      const guns = xs.map((x) => ({ x, y }));
      const shots = guns.map((g) => aimBullet(g, at, firedAt, SPEED));
      return {
        bar: lands ? bar : null,
        at,
        shots,
        guns,
        meets: shots[0].hitAt,
        lands,
      };
    };
    let clock = firstMs;
    const clashes: Clash[] = [];
    bars.forEach((bar, k) => {
      for (let p = 0; p < PAIRS; p++) {
        clashes.push(clashOf(bar, clock, p === PAIRS - 1, p * 6));
        clock += lerp(
          pairsMs,
          (k * PAIRS + p) / Math.max(1, bars.length * PAIRS - 1),
        );
      }
    });
    const volleyAt = clock + volleyGapMs;
    const volley = bars.map((bar, k) =>
      clashOf(bar, volleyAt + k * VOLLEY_GAP_MS, false),
    );
    const all = [...clashes, ...volley];
    const bullets = all.flatMap((c) => c.shots);
    const finale = volley.reduce((a, b) => (b.meets > a.meets ? b : a));
    const endAt = finale.meets;
    // the guns glide to each clash's height ahead of firing it
    const gunAt = all.map((c) => ({ ms: c.shots[0].firedAt, y: c.at.y }));
    const guns = xs.map((x) => {
      const spot: Point = { x, y: gunAt[0].y };
      return (ms: number): Point => {
        let k = 0;
        while (k < gunAt.length - 1 && ms >= gunAt[k].ms) k++;
        const prev = k === 0 ? gunAt[0] : gunAt[k - 1];
        const next = gunAt[k];
        spot.y = lerp(
          [prev.y, next.y],
          smoothstep(clamp01((ms - prev.ms) / (next.ms - prev.ms || 1))),
        );
        return spot;
      };
    });

    const firing = createBeats(
      all,
      (c) => c.shots[0].firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const meeting = createBeats(
      clashes,
      (c) => c.meets,
      (c, k) => {
        cover!.burst(c.at, 0.5);
        if (c.bar)
          cover!.levels(
            c.bar,
            levelsFor(c.bar.floor, levelShare, 2),
            c.bar.center,
          );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(
          c.lands
            ? lerp(HIT_SHAKE, k / Math.max(1, clashes.length - 1))
            : POP_SHAKE,
        );
      },
    );
    const emptying = createBeats(
      volley,
      (c) => c.meets,
      (c) => {
        if (c === finale) {
          for (const bar of bars)
            cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), bar.center);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.at);
          return;
        }
        cover!.burst(c.at, 0.6);
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
          meeting.tick(ms, now);
          emptying.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const c of all) {
            const t = (ms - c.shots[0].firedAt) / FLASH_MS;
            if (t <= 0 || t >= 1) continue;
            drawMuzzleFlash(ctx, c.guns[0], 0, t, FLASH);
            drawMuzzleFlash(ctx, c.guns[1], Math.PI, t, FLASH);
          }
          for (const g of guns)
            drawWispBetween(ctx, g, ms, now, WISP_SIZE * GUN, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
