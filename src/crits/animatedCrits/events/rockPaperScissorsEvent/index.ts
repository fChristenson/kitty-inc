// the "Rock Paper Scissors" event (experiment: the hand game; worker perma
// tiers): it covers its crit, whose click freezes the screen while a fist
// wisp pops up over every worker and they all pump together to the call,
// "ROCK!", "PAPER!", "SCISSORS!", each beat a thump and a jolt; on
// "SHOOT!" the results come in down the line, worker after worker winning
// with a "WIN!", a pop and a jolt as they climb a perma tier, the last win
// landing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardWorkers } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "rockPaperScissors";
const MAX_WORKERS = 6;
const CALLS = ["ROCK!", "PAPER!", "SCISSORS!", "SHOOT!"];
const ABOVE = 60;
const PUMP = 26;
const SETUP_MS = 240;
const CALL_MS = 300;
const TOP = 220;
const STYLE = { fontSize: 58, strokeWidth: 9 };
const WIN_STYLE = { fontSize: 38, strokeWidth: 7 };
const FIST = 0.4;
const WIN_SHAKE: [number, number] = [0.5, 1.2];

export const forceRockPaperScissorsEvent = registerWispEvent(
  KEY,
  "Rock Paper Scissors",
  () => CONFIG.rockPaperScissorsEvent.chance,
  (floor, context, area) => {
    const { beatMs, winsMs, holdMs, mergeMs } = CONFIG.rockPaperScissorsEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const sprites = CALLS.map((c) =>
      createCritTextSprite(c, COLOR.heavenlyGold, STYLE),
    );
    const win = createCritTextSprite("WIN!", COLOR.heavenlyGold, WIN_STYLE);
    const caller: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + TOP,
    };
    const calls = CALLS.map((_, i) => ({ i, ms: SETUP_MS + i * beatMs }));
    const shoot = calls[CALLS.length - 1].ms;
    const wins = workers.map((worker, k) => ({
      worker,
      head: { x: worker.at.x, y: worker.at.y - ABOVE } as Point,
      ms: shoot + 120 + k * lerp(winsMs, k / Math.max(1, workers.length - 1)),
    }));
    const last = wins[wins.length - 1];
    const endAt = last.ms;
    const fists = wins.map((w, k) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = easeOut(clamp01((ms - k * 30) / SETUP_MS));
        // pumping down on every beat until the shoot
        const beat =
          ms < SETUP_MS || ms > shoot ? 0 : ((ms - SETUP_MS) % beatMs) / beatMs;
        at.x = lerp([button.x, w.head.x], u);
        at.y = lerp([button.y, w.head.y], u) + Math.sin(beat * Math.PI) * PUMP;
        return at;
      };
    });

    const calling = createBeats(
      calls,
      (c) => c.ms,
      (c) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(c.i === CALLS.length - 1 ? 0.9 : 0.4);
      },
    );
    const winning = createBeats(
      wins,
      (w) => w.ms,
      (w, k) => {
        cover!.promote(w.worker);
        if (w === last) {
          cover!.blast(w.worker.at);
          return;
        }
        cover!.burst(w.head, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(WIN_SHAKE, k / Math.max(1, wins.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          calling.tick(ms, now);
          winning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const c of calls) {
            const t = (ms - c.ms) / CALL_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              sprites[c.i],
              caller.x,
              caller.y,
              1 + 0.4 * (1 - clamp01(t * 3)),
            );
            ctx.globalAlpha = 1;
          }
          for (const w of wins) {
            const t = (ms - w.ms) / CALL_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              win,
              w.head.x,
              w.head.y - 40,
              1 + 0.4 * (1 - clamp01(t * 3)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms > endAt) return;
          for (let k = 0; k < fists.length; k++)
            drawWispBetween(
              ctx,
              fists[k],
              ms,
              now,
              WISP_SIZE * FIST,
              0.6,
              0,
              wins[k].ms,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
