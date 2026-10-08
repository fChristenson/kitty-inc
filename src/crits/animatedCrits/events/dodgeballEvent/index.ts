// the "Dodgeball" event (wisp; cash): it covers its crit, whose click
// freezes the screen while two teams of wisps burst out of the clicked
// floor's button and line up down the screen's two sides; they hurl wisp
// balls at each other across the screen, volley after volley, ever faster,
// every pair of balls smashing together in the middle in a flash, a smack,
// a jolt and a spray of coins; then both whole teams let fly at once and
// every ball meets dead center in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
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
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "dodgeball";
const REWARD = 4;
const TEAM = 4;
const VOLLEYS = 6;
const EDGE = 34;
// the team stands down Y of the screen; balls arc LOFT px
const Y: [number, number] = [0.2, 0.8];
const LOFT = 40;
const PLAYER = 0.55;
const BALL = 0.35;
const SMACK_COINS = 14;
const SMACK: [number, number] = [30, 110];
const SMACK_SHAKE: [number, number] = [0.5, 1.2];

export const forceDodgeballEvent = registerWispEvent(
  KEY,
  "Dodgeball",
  () => CONFIG.dodgeballEvent.chance,
  (floor, context, area) => {
    const { lineUpMs, gapsMs, flyMs, holdMs, mergeMs } = CONFIG.dodgeballEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const height = area.bottom - area.top;
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const spots = (x: number) =>
      Array.from({ length: TEAM }, (_, i) => ({
        x,
        y: area.top + height * lerp(Y, i / (TEAM - 1)),
      }));
    const left = spots(area.left + EDGE);
    const right = spots(area.right - EDGE);
    const players = [...left, ...right].map((spot, i) => {
      const at: Point = { x: 0, y: 0 };
      const delay = (i % TEAM) * 40;
      return (ms: number): Point => {
        const u = easeOut(Math.min(1, Math.max(0, ms - delay) / lineUpMs));
        at.x = lerp([button.x, spot.x], u);
        at.y = lerp([button.y, spot.y], u);
        return at;
      };
    });
    // each ball from a thrower to the meeting point, arcing
    const ball = (from: Point, to: Point, thrown: number, hits: number) => {
      const at: Point = { x: 0, y: 0 };
      return {
        thrown,
        hits,
        at: (ms: number): Point | null => {
          if (ms < thrown || ms >= hits) return null;
          const u = (ms - thrown) / (hits - thrown);
          at.x = lerp([from.x, to.x], u);
          at.y = lerp([from.y, to.y], u) - Math.sin(Math.PI * u) * LOFT;
          return at;
        },
      };
    };
    let clock: number = lineUpMs + 120;
    const volleys = Array.from({ length: VOLLEYS }, (_, k) => {
      const thrown = clock;
      clock += lerp(gapsMs, k / (VOLLEYS - 1));
      const a = left[Math.floor(Math.random() * TEAM)];
      const b = right[Math.floor(Math.random() * TEAM)];
      const meet: Point = {
        x: cx + (Math.random() - 0.5) * 80,
        y: (a.y + b.y) / 2,
      };
      const hits = thrown + flyMs;
      return {
        meet,
        hits,
        balls: [ball(a, meet, thrown, hits), ball(b, meet, thrown, hits)],
      };
    });
    const finalThrow = clock;
    const finalHit = finalThrow + flyMs;
    const center: Point = { x: cx, y: cy };
    const finals = [...left, ...right].map((p) =>
      ball(p, center, finalThrow, finalHit),
    );
    const balls = [...volleys.flatMap((v) => v.balls), ...finals];
    const endAt = finalHit;

    const throwing = createBeats(
      [...volleys.map((v) => v.balls[0].thrown), finalThrow],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const smacking = createBeats(
      volleys,
      (v) => v.hits,
      (v, k) => {
        cover!.burst(v.meet, 0.5);
        cover!.launchFrom(v.meet, ringTargets(v.meet, SMACK_COINS, SMACK));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SMACK_SHAKE, k / (VOLLEYS - 1)));
      },
    );
    const finale = createBeats(
      [finalHit],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          throwing.tick(ms, now);
          smacking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const b of balls)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BALL,
              0.8,
              b.thrown,
              b.hits,
            );
          for (const p of players)
            drawWispBetween(ctx, p, ms, now, WISP_SIZE * PLAYER, 0.5, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
