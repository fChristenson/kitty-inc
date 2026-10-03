// the "Lacrosse" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while two player wisps sprint out of the
// clicked floor's button and fire a ball wisp back and forth in rifled
// passes, each caught at the end of an income bar with a smack and a jolt
// as the bar lands free levels, the passes zigzagging down the bars ever
// harder, until the last catch is flung straight into the bar's middle in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "lacrosse";
const MAX_BARS = 4;
const OUTSIDE = 40;
const ARC = 30;
const MOVE_MS = 160;
const SHOT_MS = 120;
const PLAYER = 0.45;
const BALL = 0.3;
const CATCH_SHAKE: [number, number] = [0.6, 1.2];

export const forceLacrosseEvent = registerWispEvent(
  KEY,
  "Lacrosse",
  () => CONFIG.lacrosseEvent.chance,
  (floor, context) => {
    const { passesMs, holdMs, mergeMs } = CONFIG.lacrosseEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = MOVE_MS;
    let from: Point = button;
    const passes = bars.map((bar, k) => {
      const side = k % 2 === 0 ? 1 : -1;
      const to: Point = {
        x: side > 0 ? bar.box.x + bar.box.width + OUTSIDE : bar.box.x - OUTSIDE,
        y: bar.center.y,
      };
      const a = from;
      const leaves = clock;
      clock += lerp(passesMs, k / Math.max(1, bars.length - 1));
      const caught = clock;
      from = to;
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        to,
        side,
        leaves,
        caught,
        at: (ms: number): Point => {
          const u = clamp01((ms - leaves) / (caught - leaves));
          at.x = lerp([a.x, to.x], u);
          at.y = lerp([a.y, to.y], u) - Math.sin(u * Math.PI) * ARC;
          return at;
        },
      };
    });
    const last = passes[passes.length - 1];
    const shot = { leaves: last.caught, lands: last.caught + SHOT_MS };
    const endAt = shot.lands;
    // each player runs to its next catch while the ball's in the air
    const players = [0, 1].map((p) => {
      const mine = passes.filter((_, k) => k % 2 === p);
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        let prev: Point = button;
        for (const pass of mine) {
          const starts = Math.max(0, pass.leaves - MOVE_MS);
          if (ms < pass.leaves) {
            const u = easeOut(clamp01((ms - starts) / MOVE_MS));
            at.x = lerp([prev.x, pass.to.x], u);
            at.y = lerp([prev.y, pass.to.y], u);
            return at;
          }
          prev = pass.to;
        }
        at.x = prev.x;
        at.y = prev.y;
        return at;
      };
    });
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      if (ms >= shot.leaves) {
        const u = clamp01((ms - shot.leaves) / SHOT_MS);
        ballAt.x = lerp([last.to.x, last.bar.center.x], u);
        ballAt.y = last.to.y;
        return ballAt;
      }
      let p = passes[0];
      for (const pass of passes) if (ms >= pass.leaves) p = pass;
      return p.at(ms);
    };

    const throwing = createBeats(
      passes,
      (p) => p.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const catching = createBeats(
      passes,
      (p) => p.caught,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor), p.to);
        cover!.burst(p.to, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CATCH_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const scoring = createBeats(
      [shot.lands],
      (ms) => ms,
      () => {
        cover!.levels(last.bar, levelsFor(last.bar.floor), last.to);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(last.bar.center);
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
          throwing.tick(ms, now);
          catching.tick(ms, now);
          scoring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const player of players)
            drawWispBetween(
              ctx,
              player,
              ms,
              now,
              WISP_SIZE * PLAYER,
              0.5,
              0,
              endAt,
            );
          drawWispBetween(
            ctx,
            ball,
            ms,
            now,
            WISP_SIZE * BALL,
            1,
            passes[0].leaves,
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
