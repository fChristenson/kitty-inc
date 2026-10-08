// the "Quiz Show" event (experiment: a game show; crit tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// becomes a buzzer: a contestant wisp slams it, "BZZT!", the screen
// jolting, and a beat later "CORRECT!" slams up as a beam of light leaps
// from the buzzer to an income bar, which jumps a crit tier with a bang;
// question after question, ever faster, until the final answer is "JACKPOT!"
// in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "quizShow";
const MAX_BARS = 3;
const TOP = 220;
const RAISE = 70;
const BEAM_MS = 200;
const BEAM_WIDTH = 22;
const CALL_MS = 360;
const STYLE = { fontSize: 54, strokeWidth: 9 };
const CONTESTANT = 0.45;
const ANSWER_SHAKE: [number, number] = [0.9, 1.4];

export const forceQuizShowEvent = registerWispEvent(
  KEY,
  "Quiz Show",
  () => CONFIG.quizShowEvent.chance,
  (floor, context, area) => {
    const { questionsMs, answerMs, holdMs, mergeMs } = CONFIG.quizShowEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const host: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    const bzzt = createCritTextSprite("BZZT!", COLOR.heavenlyGold, STYLE);
    const correct = createCritTextSprite("CORRECT!", COLOR.heavenlyGold, STYLE);
    const jackpot = createCritTextSprite("JACKPOT!", COLOR.heavenlyGold, {
      fontSize: 72,
      strokeWidth: 11,
    });
    let clock = 0;
    const rounds = bars.map((bar, k) => {
      const raise = clock;
      const buzzes =
        raise + lerp(questionsMs, k / Math.max(1, bars.length - 1));
      const answers = buzzes + answerMs;
      clock = answers;
      return { bar, raise, buzzes, answers, final: k === bars.length - 1 };
    });
    const last = rounds[rounds.length - 1];
    const endAt = last.answers;
    const handAt: Point = { x: 0, y: 0 };
    const hand = (ms: number): Point => {
      let r = rounds[0];
      for (const round of rounds) if (ms >= round.raise) r = round;
      // raised up over the buzzer, then slammed down onto it
      const u = clamp01((ms - r.raise) / (r.buzzes - r.raise));
      const lift =
        ms >= r.buzzes
          ? 0
          : u < 0.8
            ? easeOut(Math.min(1, u / 0.4))
            : 1 - easeIn((u - 0.8) / 0.2);
      handAt.x = button.x;
      handAt.y = button.y - RAISE * lift;
      return handAt;
    };

    const buzzing = createBeats(
      rounds,
      (r) => r.buzzes,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(0.6);
      },
    );
    const answering = createBeats(
      rounds,
      (r) => r.answers,
      (r, k) => {
        cover!.tierUp(r.bar, button);
        if (r.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(r.bar.center);
          return;
        }
        cover!.burst(r.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ANSWER_SHAKE, k / Math.max(1, rounds.length - 1)));
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
          buzzing.tick(ms, now);
          answering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const r of rounds) {
            const b = (ms - r.answers) / BEAM_MS;
            if (b >= 0 && b < 1) {
              drawBeam(ctx, button, r.bar.center, BEAM_WIDTH * (1 - b), 1 - b);
              drawBeamFlare(ctx, r.bar.center, 50, 1 - b, now);
            }
            const z = (ms - r.buzzes) / CALL_MS;
            if (z >= 0 && z < 1 && ms < r.answers) {
              drawCritTextSprite(
                ctx,
                bzzt,
                host.x,
                host.y,
                1 + 0.4 * (1 - clamp01(z * 3)),
              );
            }
            const c = (ms - r.answers) / CALL_MS;
            if (c >= 0 && c < 1) {
              ctx.globalAlpha = 1 - c * c;
              drawCritTextSprite(
                ctx,
                r.final ? jackpot : correct,
                host.x,
                host.y,
                1 + 0.5 * (1 - clamp01(c * 3)),
              );
              ctx.globalAlpha = 1;
            }
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              hand,
              ms,
              now,
              WISP_SIZE * CONTESTANT,
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
