// the "Jacks" event (bounce; free hires): it covers its crit, whose click
// freezes the screen while a handful of jack wisps scatters across the
// bottom of the screen; a hand wisp tosses a ball up, swoops down to scoop
// a jack while the ball bounces with a splash and a boing, and catches the
// ball on the rebound, flicking the jack in a high arc onto an empty spot,
// where a new worker forms with a pop and a jolt; toss after toss, ever
// quicker, the last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawBounceSplash,
  hops,
  SPLASH_MS,
  type BouncePath,
} from "../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "jacks";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
const FLOOR = 150;
const HAND = 230;
const SCATTER = 260;
const TOSS: [number, number] = [240, 50];
const FLICK = 200;
const HAND_SIZE = 0.6;
const BALL = 0.45;
const JACK = 0.3;
const SPLASH = 90;
const BOUNCE_SHAKE = 0.3;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

interface Toss {
  hire: RewardHire;
  jack: Point;
  ball: BouncePath;
  flick: BouncePath;
  starts: number;
  bounces: number;
  catches: number;
}

export const forceJacksEvent = registerWispEvent(
  KEY,
  "Jacks",
  () => CONFIG.jacksEvent.chance,
  (floor, context, area) => {
    const { tossesMs, flickMs, holdMs, mergeMs } = CONFIG.jacksEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const cx = (area.left + area.right) / 2;
    const floorY = area.bottom - FLOOR;
    const hand: Point = { x: cx, y: floorY - HAND };
    const ground: Point = { x: cx + 30, y: floorY };
    let clock = 0;
    const tosses: Toss[] = hires.map((hire, k) => {
      const toss = lerp(tossesMs, k / Math.max(1, hires.length - 1));
      const jack: Point = {
        x: cx + (k / Math.max(1, hires.length - 1) - 0.5) * 2 * SCATTER,
        y: floorY + (k % 2 === 0 ? 0 : 20),
      };
      const ball = hops(
        [hand, ground, hand],
        [toss * 0.6, toss * 0.4],
        TOSS,
        clock,
      );
      const catches = ball.endMs;
      const t: Toss = {
        hire,
        jack,
        ball,
        flick: hops(
          [hand, { x: hire.x, y: hire.y - LIFT }],
          [flickMs, flickMs],
          [FLICK, FLICK],
          catches,
        ),
        starts: clock,
        bounces: ball.bounces[0].ms,
        catches,
      };
      clock = catches;
      return t;
    });
    const last = tosses[tosses.length - 1];
    const endAt = last.flick.endMs;
    const handPt: Point = { x: 0, y: 0 };
    // swooping down to the jack while the ball's up, back up for the catch
    const handAt = (ms: number): Point => {
      let t = tosses[0];
      for (const toss of tosses) if (ms >= toss.starts) t = toss;
      const span = t.catches - t.starts;
      const u = clamp01((ms - t.starts) / span);
      const dip = Math.sin(Math.PI * smoothstep(u));
      handPt.x = lerp([hand.x, t.jack.x], dip);
      handPt.y = lerp([hand.y, t.jack.y - 20], dip);
      return handPt;
    };
    const jackPts = tosses.map(() => ({ x: 0, y: 0 }));
    const jackAt =
      (k: number) =>
      (ms: number): Point => {
        const t = tosses[k];
        const p = jackPts[k];
        const scooped = t.starts + (t.catches - t.starts) / 2;
        if (ms < scooped) {
          p.x = t.jack.x;
          p.y = t.jack.y;
          return p;
        }
        const at = ms < t.catches ? handAt(ms) : t.flick.at(ms);
        p.x = at.x;
        p.y = at.y;
        return p;
      };
    const jacks = tosses.map((_, k) => jackAt(k));

    const bouncing = createBeats(
      tosses,
      (t) => t.bounces,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BOUNCE_SHAKE);
      },
    );
    const landing = createBeats(
      tosses,
      (t) => t.flick.endMs,
      (t, k) => {
        giveHire(t.hire);
        const spot = t.flick.bounces[0].at;
        if (t === last) {
          cover!.blast(spot);
          return;
        }
        cover!.burst(spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, tosses.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + SPLASH_MS) return;
          for (const t of tosses) {
            drawBounceSplash(
              ctx,
              t.ball.bounces[0],
              ms - t.bounces,
              SPLASH,
              now,
            );
            drawWispBetween(
              ctx,
              t.ball.at,
              ms,
              now,
              WISP_SIZE * BALL,
              0.8,
              t.starts,
              t.catches,
            );
          }
          for (let k = 0; k < tosses.length; k++)
            drawWispBetween(
              ctx,
              jacks[k],
              ms,
              now,
              WISP_SIZE * JACK,
              0.5,
              0,
              tosses[k].flick.endMs,
            );
          drawWispBetween(
            ctx,
            handAt,
            ms,
            now,
            WISP_SIZE * HAND_SIZE,
            0.6,
            0,
            last.catches,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
