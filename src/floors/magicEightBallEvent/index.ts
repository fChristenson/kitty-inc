// the "Magic 8-Ball" event (experiment: a magic 8-ball; crit tiers): it
// covers its crit, whose click freezes the screen while a big ball wisp
// flies out of the clicked floor's button over an income bar and is shaken
// hard, jittering as the screen rumbles, then answers in big text: "ASK
// AGAIN...", shake shake, "SIGNS POINT TO YES!" and the bar jumps a crit
// tier with a flash and a jolt; it flies on to the next bar for a new
// answer, "IT IS CERTAIN!", "WITHOUT A DOUBT!", quicker each time, the last
// landing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../shared/critText";
import { findRewardBars, type RewardBar } from "../eventRewards";
import { COLOR } from "../../palette";

const KEY = "magicEightBall";
const MAX_BARS = 3;
const ASK_AGAIN = "ASK AGAIN...";
const YESES = ["SIGNS POINT TO YES!", "IT IS CERTAIN!", "WITHOUT A DOUBT!"];
const HOVER = 150;
const MOVE_MS: [number, number] = [200, 120];
const JITTER: [number, number] = [10, 34];
const RUMBLE_MS = 70;
const TEXT_UP = 140;
const CALL_MS = 340;
const STYLE = { fontSize: 52, strokeWidth: 9 };
const FINAL_STYLE = { fontSize: 64, strokeWidth: 11 };
const BALL = 1;
const ANSWER_SHAKE: [number, number] = [0.9, 1.3];

interface Round {
  bar: RewardBar;
  spot: Point;
  from: Point;
  moves: number;
  shakes: number;
  answers: number;
  sprite: CritTextSprite;
  yes: boolean;
  final: boolean;
}

export const forceMagicEightBallEvent = registerWispEvent(
  KEY,
  "Magic 8-Ball",
  () => CONFIG.magicEightBallEvent.chance,
  (floor, context) => {
    const { shakesMs, answerMs, holdMs, mergeMs } = CONFIG.magicEightBallEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const askAgain = createCritTextSprite(ASK_AGAIN, COLOR.heavenlyGold, STYLE);
    // the first bar makes it ask twice; every other answers straight away
    const plan = bars.flatMap((bar, k) => [
      ...(k === 0 ? [{ bar, k, yes: false }] : []),
      { bar, k, yes: true },
    ]);
    let clock = 0;
    let from: Point = button;
    const rounds: Round[] = plan.map((p, i) => {
      const t = i / Math.max(1, plan.length - 1);
      const spot: Point = { x: p.bar.center.x, y: p.bar.center.y - HOVER };
      const moved = i === 0 || plan[i - 1].bar !== p.bar;
      const moves = clock;
      const shakes = moved
        ? moves + lerp(MOVE_MS, p.k / Math.max(1, bars.length - 1))
        : moves;
      const answers = shakes + lerp(shakesMs, t);
      clock = answers + answerMs;
      const final = i === plan.length - 1;
      const round: Round = {
        bar: p.bar,
        spot,
        from: moved ? from : spot,
        moves,
        shakes,
        answers,
        sprite: p.yes
          ? createCritTextSprite(
              YESES[p.k % YESES.length],
              COLOR.heavenlyGold,
              final ? FINAL_STYLE : STYLE,
            )
          : askAgain,
        yes: p.yes,
        final,
      };
      from = spot;
      return round;
    });
    const last = rounds[rounds.length - 1];
    const endAt = last.answers;
    const rumbles = rounds.flatMap((r) => {
      const beats: number[] = [];
      for (let ms = r.shakes + RUMBLE_MS / 2; ms < r.answers; ms += RUMBLE_MS)
        beats.push(ms);
      return beats;
    });
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      ms = Math.max(0, ms);
      let r = rounds[0];
      for (const round of rounds) if (ms >= round.moves) r = round;
      if (ms < r.shakes) {
        const u = easeOut(clamp01((ms - r.moves) / (r.shakes - r.moves)));
        ballAt.x = lerp([r.from.x, r.spot.x], u);
        ballAt.y = lerp([r.from.y, r.spot.y], u);
        return ballAt;
      }
      ballAt.x = r.spot.x;
      ballAt.y = r.spot.y;
      if (ms < r.answers) {
        // shaken ever harder up to the answer
        const j = lerp(JITTER, (ms - r.shakes) / (r.answers - r.shakes));
        ballAt.x += Math.sin(ms * 0.13) * j;
        ballAt.y += Math.sin(ms * 0.21 + 1) * j * 0.6;
      }
      return ballAt;
    };

    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(0.35);
      },
    );
    const answering = createBeats(
      rounds,
      (r) => r.answers,
      (r, k) => {
        if (!r.yes) {
          cover!.burst(r.spot, 0.4);
          return;
        }
        cover!.tierUp(r.bar, r.spot);
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
          rumbling.tick(ms, now);
          answering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS * 2) return;
          for (let i = 0; i < rounds.length; i++) {
            const r = rounds[i];
            const until = rounds[i + 1]?.shakes ?? endAt + CALL_MS * 2;
            if (ms < r.answers || ms >= until) continue;
            const c = (ms - r.answers) / CALL_MS;
            ctx.globalAlpha = r.final ? 1 - clamp01(c - 1) : 1;
            drawCritTextSprite(
              ctx,
              r.sprite,
              r.spot.x,
              r.spot.y - TEXT_UP,
              1 + 0.5 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
          drawWispBetween(
            ctx,
            ball,
            ms,
            now,
            WISP_SIZE * BALL,
            clamp01(ms / endAt),
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
