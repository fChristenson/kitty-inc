// the "Stadium Wave" event (experiment: a stadium wave over the workers;
// worker perma tiers): it covers its crit, whose click freezes the screen
// while a little stack of wisps pops up over the head of every worker in
// view, bobbing like a crowd in the stands; then a wave rolls across them
// side to side, each stack leaping up in turn as the crest passes, ever
// faster, and every worker it lifts lights up a perma tier with a pop and a
// jolt; then the whole crowd leaps at once in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "stadiumWave";
const MAX_WORKERS = 8;
const STACK = 3;
// each stack starts HEAD px over its worker, its wisps GAP px apart; the
// crest throws wisp j LEAP + j × LEAP_STEP px up over CREST_MS
const HEAD = 34;
const GAP = 22;
const LEAP = 50;
const LEAP_STEP = 26;
const CREST_MS = 280;
const BOB = 4;
const FINAL_LEAP = 1.6;
const WISP = 0.35;
const CREST_SHAKE = 0.6;

export const forceStadiumWaveEvent = registerWispEvent(
  KEY,
  "Stadium Wave",
  () => CONFIG.stadiumWaveEvent.chance,
  (floor, context) => {
    const { riseMs, passMs, finalGapMs, holdMs, mergeMs } =
      CONFIG.stadiumWaveEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    // ever closer together, so the wave speeds up
    const crests = workers.map(
      (_, k) =>
        riseMs +
        passMs * (1 - (1 - k / Math.max(1, workers.length - 1)) ** 1.6),
    );
    const finalAt = crests[crests.length - 1] + finalGapMs;
    const endAt = finalAt + CREST_MS / 2;
    const bump = (ms: number, at: number) => {
      const u = (ms - at) / CREST_MS + 0.5;
      return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
    };
    const stacks = workers.map((worker, k) =>
      Array.from({ length: STACK }, (_, j) => {
        const spot: Point = { x: 0, y: 0 };
        const phase = (k * 0.9 + j * 0.5) % (Math.PI * 2);
        return (ms: number): Point => {
          const grow = easeOutBack(clamp01((ms - j * 60) / riseMs));
          const leap = bump(ms, crests[k]) + FINAL_LEAP * bump(ms, finalAt);
          spot.x = worker.at.x;
          spot.y =
            worker.at.y -
            (HEAD + j * GAP) * grow -
            leap * (LEAP + j * LEAP_STEP) -
            Math.sin(ms / 120 + phase) * BOB;
          return spot;
        };
      }),
    );
    const top: Point = {
      x: (workers[0].at.x + workers[workers.length - 1].at.x) / 2,
      y: Math.min(...workers.map((w) => w.at.y)) - HEAD - STACK * GAP - LEAP,
    };

    const cresting = createBeats(
      workers,
      (_, k) => crests[k],
      (worker) => {
        cover!.promote(worker);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CREST_SHAKE);
      },
    );
    const finale = createBeats(
      [finalAt],
      (ms) => ms,
      () => cover!.blast(top),
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
          cresting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const stack of stacks)
            for (const at of stack)
              drawWispBetween(
                ctx,
                at,
                ms,
                now,
                WISP_SIZE * WISP,
                0.6,
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
