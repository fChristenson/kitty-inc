// the "Whistlers" event (explosion; worker perma tiers): it covers its crit,
// whose click freezes the screen while whistling rockets shoot up from the
// bottom of the screen one after another, fuses spitting sparks, wobbling
// and corkscrewing wildly as they climb, each veering onto a worker and
// going off on them in a white blast, a bang and a big jolt as they climb a
// perma tier; they launch ever faster, and the last goes off in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "whistlers";
const MAX_WORKERS = 6;
// each rocket wobbles WOBBLE px side to side, WOBBLES times on its way
const WOBBLE = 40;
const WOBBLES = 4;
const ROCKET = 0.35;
const FUSE = 14;
const BLAST = 150;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

export const forceWhistlersEvent = registerWispEvent(
  KEY,
  "Whistlers",
  () => CONFIG.whistlersEvent.chance,
  (floor, context, area) => {
    const { gapsMs, flightMs, holdMs, mergeMs } = CONFIG.whistlersEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    let clock = 0;
    const rockets = workers.map((worker, k) => {
      const from: Point = {
        x: worker.at.x + (Math.random() - 0.5) * 240,
        y: area.bottom + 20,
      };
      const launches = clock;
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
      const phase = Math.random() * Math.PI * 2;
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        launches,
        blows: launches + flightMs,
        at: (ms: number): Point => {
          const u = clamp01((ms - launches) / flightMs);
          const v = easeIn(u) * 0.6 + u * 0.4;
          const wobble =
            Math.sin(u * WOBBLES * Math.PI * 2 + phase) * WOBBLE * (1 - u);
          at.x = lerp([from.x, worker.at.x], v) + wobble;
          at.y = lerp([from.y, worker.at.y], v) + Math.cos(u * 23 + phase) * 6;
          return at;
        },
      };
    });
    const last = rockets[rockets.length - 1];
    const endAt = last.blows;

    const launching = createBeats(
      rockets,
      (r) => r.launches,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const blowing = createBeats(
      rockets,
      (r) => r.blows,
      (r, k) => {
        cover!.promote(r.worker);
        if (r === last) {
          cover!.blast(r.worker.at);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, rockets.length - 1)));
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
          launching.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const r of rockets) {
            if (r !== last)
              drawDetonation(ctx, r.worker.at, ms - r.blows, BLAST, now);
            if (ms < r.launches || ms >= r.blows) continue;
            drawLitFuse(
              ctx,
              r.at(ms),
              clamp01((ms - r.launches) / flightMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              r.at,
              ms,
              now,
              WISP_SIZE * ROCKET,
              0.9,
              r.launches,
              r.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
