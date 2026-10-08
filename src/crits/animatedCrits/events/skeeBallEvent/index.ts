// the "Skee Ball" event (an experiment beyond the seven looks: an arcade
// skee-ball lane; cash): it covers its crit, whose click freezes the screen
// while three hovering wisps mark the holes up the screen, 10, 50 and 100;
// wisp balls roll up from the bottom one after another, ever faster, hop
// and drop into the holes, each sinking with a flash, a pop and a jolt, its
// score popping up in gold and coins spraying out, more for the higher
// holes; the last ball sinks the 100 in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";

const KEY = "skeeBall";
const REWARD = 4;
const BALLS = 9;
const STYLE = { fontSize: 32, strokeWidth: 6 };
// the holes: score, height up the screen 0..1, sideways offset, coins
const HOLES = [
  { score: "10", up: 0.35, side: -90, coins: 4 },
  { score: "50", up: 0.55, side: 90, coins: 8 },
  { score: "100", up: 0.75, side: 0, coins: 14 },
];
const HOP = 140;
const BALL = 0.38;
const MARK = 0.55;
const RISE = 60;
const SCORE_MS = 500;
const COIN_REACH: [number, number] = [30, 120];
const SINK_SHAKE: [number, number] = [0.4, 1.1];

export const forceSkeeBallEvent = registerWispEvent(
  KEY,
  "Skee Ball",
  () => CONFIG.skeeBallEvent.chance,
  (floor, context, area) => {
    const { rollMs, ballsMs, holdMs, mergeMs } = CONFIG.skeeBallEvent;
    const cx = (area.left + area.right) / 2;
    const height = area.bottom - area.top;
    const start: Point = { x: cx, y: area.bottom - 40 };
    const holes = HOLES.map((h) => {
      const at: Point = { x: cx + h.side, y: area.bottom - height * h.up };
      return {
        ...h,
        at,
        mark: () => at,
        sprite: createCritTextSprite(
          h.score,
          COLOR.heavenlyGold,
          STYLE,
        ) as CritTextSprite,
      };
    });
    let clock: number = rollMs * 0.3;
    const balls = Array.from({ length: BALLS }, (_, k) => {
      const last = k === BALLS - 1;
      const hole = last ? holes[2] : holes[Math.floor(Math.random() * 3)];
      const rolls = clock;
      const sinks = rolls + rollMs;
      clock += lerp(ballsMs, k / (BALLS - 1));
      const ctrl: Point = { x: (start.x + hole.at.x) / 2, y: hole.at.y - HOP };
      const into: Point = { x: 0, y: 0 };
      return {
        hole,
        rolls,
        sinks,
        last,
        at: (ms: number): Point =>
          bezier(
            start,
            ctrl,
            hole.at,
            easeOut(clamp01((ms - rolls) / rollMs)),
            into,
          ),
      };
    });
    const endAt = balls[BALLS - 1].sinks;

    const sinking = createBeats(
      balls,
      (b) => b.sinks,
      (b, k) => {
        if (b.last) {
          cover!.blast(b.hole.at);
          return;
        }
        cover!.launchFrom(
          b.hole.at,
          ringTargets(b.hole.at, b.hole.coins, COIN_REACH),
        );
        if (!cover!.isLive()) return;
        if (b.hole.coins > 4) playExplosion();
        else playBloop();
        shakeScreen(lerp(SINK_SHAKE, k / (BALLS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => sinking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + SCORE_MS) return;
          for (const h of holes)
            drawWispBetween(
              ctx,
              h.mark,
              ms,
              now,
              WISP_SIZE * MARK,
              0.3,
              0,
              endAt,
            );
          for (const b of balls) {
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BALL,
              0.9,
              b.rolls,
              b.sinks,
            );
            const t = (ms - b.sinks) / SCORE_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              b.hole.sprite,
              b.hole.at.x,
              b.hole.at.y - RISE * t - 30,
              1 + 0.3 * (1 - t),
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
