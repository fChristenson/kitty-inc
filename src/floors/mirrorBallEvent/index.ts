// the "Mirror Ball" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a big wisp drops into the middle of
// the screen like a mirror ball and throws three blazing beams that wheel
// round it, ever faster; every worker a beam sweeps over lights up a perma
// tier with a flash, a bloop and a jolt; then the ball blazes every way at
// once in a blinding burst of beams and blows in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardWorkers } from "../eventRewards";

const KEY = "mirrorBall";
const MAX_WORKERS = 8;
const BEAMS = 3;
const TURNS = 1.25;
const FINALE_BEAMS = 12;
const REACH = 1_600;
const BEAM = 26;
const FLASH_MS = 220;
const BALL = 1.5;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceMirrorBallEvent = registerWispEvent(
  KEY,
  "Mirror Ball",
  () => CONFIG.mirrorBallEvent.chance,
  (floor, context, area) => {
    const { dropMs, spinMs, holdMs, mergeMs } = CONFIG.mirrorBallEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const ball: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.4,
    };
    const dir = Math.random() < 0.5 ? 1 : -1;
    const start = Math.random() * Math.PI * 2;
    const endAt = dropMs + spinMs;
    const spin = (ms: number) =>
      start + dir * Math.PI * 2 * TURNS * clamp01((ms - dropMs) / spinMs) ** 2;
    // when a beam first sweeps over each worker
    const sector = (Math.PI * 2) / BEAMS;
    const slot = (angle: number, ms: number) =>
      Math.floor((angle - spin(ms)) / sector);
    const hits = workers
      .map((worker) => {
        const angle = Math.atan2(worker.at.y - ball.y, worker.at.x - ball.x);
        const first = slot(angle, dropMs);
        let at = endAt;
        for (let ms = dropMs; ms <= endAt; ms += 8)
          if (slot(angle, ms) !== first) {
            at = ms;
            break;
          }
        return { worker, at };
      })
      .sort((a, b) => a.at - b.at);
    const drop: Point = { x: 0, y: 0 };
    const mirror = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      drop.x = ball.x;
      drop.y = lerp([area.top - 80, ball.y], easeOut(clamp01(ms / dropMs)));
      return drop;
    };
    const tip: Point = { x: 0, y: 0 };
    const beamAt = (angle: number) => {
      tip.x = ball.x + Math.cos(angle) * REACH;
      tip.y = ball.y + Math.sin(angle) * REACH;
      return tip;
    };

    const hitting = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        const t = k / Math.max(1, hits.length - 1);
        cover!.promote(h.worker);
        cover!.burst(h.worker.at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const blazing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(ball),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers: hits.map((h) => h.worker),
        tick: (ms, now) => {
          hitting.tick(ms, now);
          blazing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          if (ms >= endAt) {
            const fade = 1 - (ms - endAt) / FLASH_MS;
            for (let j = 0; j < FINALE_BEAMS; j++)
              drawBeam(
                ctx,
                ball,
                beamAt(start + (j * Math.PI * 2) / FINALE_BEAMS),
                BEAM,
                fade,
              );
            drawBeamFlare(ctx, ball, 50, fade, now);
            return;
          }
          if (ms >= dropMs) {
            const a = spin(ms);
            for (let j = 0; j < BEAMS; j++)
              drawBeam(ctx, ball, beamAt(a + j * sector), BEAM, 0.85);
            drawBeamFlare(ctx, ball, 30, 1, now);
          }
          drawWispBetween(
            ctx,
            mirror,
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
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
