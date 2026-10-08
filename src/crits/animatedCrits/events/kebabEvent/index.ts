// the "Kebab" event (drill; worker perma tiers): it covers its crit, whose
// click freezes the screen while a drill screams in from the side of the
// screen level with a row of workers and bites into the first; it stalls,
// juddering and gushing sparks, then grinds through in heavy shoves and
// punches out the far side, the worker climbing a perma tier; it bites
// straight into the next and the next, quicker each time, skewering the
// whole row on a glittering spit, which blazes in a big blast. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  drawGrind,
  planDrill,
  planGrind,
  type Grind,
} from "../../../../shared/drill";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "kebab";
const MAX_SKEWERED = 3;
// workers this close in height count as one row
const ROW = 60;
const DRILL = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
// the first bite stalls and bores longest; each next one this share of it
const QUICKEN = 0.5;
const PUSHES = 8;
const REACH = 40;
const SPIT_W = 8;
const BITE_SHAKE = 0.7;
const RUMBLE_SHAKE = 0.3;
const PUSH_SHAKE = 0.45;
const THROUGH_SHAKE = 1;
const SOUND_GAP_MS = 60;

interface Bite {
  worker: RewardWorker;
  grind: Grind;
}

export const forceKebabEvent = registerWispEvent(
  KEY,
  "Kebab",
  () => CONFIG.kebabEvent.chance,
  (floor, context, area) => {
    const { approachMs, stallMs, boreMs, holdMs, mergeMs } = CONFIG.kebabEvent;
    const workers = findRewardWorkers(floor, context);
    if (workers.length === 0) return;
    // the longest row of workers, left to right
    const rows = workers.map((w) =>
      workers.filter((o) => Math.abs(o.at.y - w.at.y) < ROW),
    );
    const row = rows
      .sort((a, b) => b.length - a.length)[0]
      .sort((a, b) => a.at.x - b.at.x)
      .slice(0, MAX_SKEWERED);
    const from: Point = { x: area.left - 160, y: row[0].at.y };
    let start: Point = from;
    let clock = 0;
    const bites: Bite[] = row.map((worker, k) => {
      const pace = k === 0 ? 1 : QUICKEN;
      const drill = planDrill(start, worker.at, {
        approachMs: k === 0 ? approachMs : approachMs * QUICKEN,
        boreMs: boreMs * pace,
        pushes: k === 0 ? PUSHES : Math.ceil(PUSHES * QUICKEN),
        reach: REACH,
        startMs: clock,
      });
      const grind = planGrind(drill, stallMs * pace);
      start = { x: worker.at.x + REACH, y: worker.at.y };
      clock = grind.through;
      return { worker, grind };
    });
    const last = bites[bites.length - 1];
    const endMs = last.grind.through;
    let soundAt = -Infinity;
    const thud = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const flying = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const biting = createBeats(
      bites,
      (b) => b.grind.bites,
      (b, _, now) => {
        cover!.burst(b.worker.at, 0.4);
        if (!cover!.isLive()) return;
        shakeScreen(BITE_SHAKE);
        thud(now);
      },
    );
    const rumbling = createBeats(
      bites.flatMap((b) => b.grind.rumbles),
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      bites.flatMap((b) => b.grind.pushes),
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(PUSH_SHAKE);
        thud(now);
      },
    );
    const punching = createBeats(
      bites,
      (b) => b.grind.through,
      (b) => {
        cover!.promote(b.worker);
        if (b === last) {
          cover!.blast(b.worker.at);
          return;
        }
        cover!.burst(b.worker.at, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(THROUGH_SHAKE);
      },
    );

    const tail: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers: row,
        tick: (ms, now) => {
          flying.tick(ms, now);
          biting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          punching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 600) return;
          // the spit left threaded through every worker it's skewered
          let latest: Grind | null = null;
          for (const b of bites) if (ms >= b.grind.bites) latest = b.grind;
          if (latest) {
            const { drill, bites: bit, gives, stallMs: stall } = latest;
            const reached = drill.at(ms < gives ? bit : ms - stall);
            tail.x = row[0].at.x - REACH;
            tail.y = row[0].at.y;
            const blaze = ms >= endMs ? 1 - clamp01((ms - endMs) / 600) : 0.6;
            drawBeam(
              ctx,
              tail,
              reached,
              lerp([SPIT_W, SPIT_W * 2], blaze),
              blaze,
            );
          }
          for (const b of bites) drawGrind(ctx, b.grind, ms, now, DRILL, SPRAY);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
