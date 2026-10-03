// the "Blink" event (wisp; worker perma tiers): it covers its crit, whose
// click freezes the screen while a wisp on the clicked floor's button
// vanishes in a flash and blinks into being over a worker, then blinks to
// the next and the next, never travelling, just gone and there, each arrival
// a flash, a crack and a jolt as the worker climbs a perma tier, a fading
// afterimage left wherever it was; every blink quicker, the last in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "blink";
const MAX_WORKERS = 6;
const FIRST_MS = 200;
const ABOVE = 40;
const JITTER = 3;
const BLINKER = 0.6;
const GHOST = 0.35;
const GHOST_MS = 350;
const BLINK_SHAKE: [number, number] = [0.5, 1.3];

export const forceBlinkEvent = registerWispEvent(
  KEY,
  "Blink",
  () => CONFIG.blinkEvent.chance,
  (floor, context) => {
    const { staysMs, holdMs, mergeMs } = CONFIG.blinkEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // each stop: where it hangs, from when until it blinks on
    const stops = [
      { worker: null, at: button, from: 0, to: FIRST_MS },
      ...workers.map((worker) => ({
        worker,
        at: { x: worker.at.x, y: worker.at.y - ABOVE } as Point,
        from: 0,
        to: 0,
      })),
    ];
    let clock = FIRST_MS;
    for (let k = 1; k < stops.length; k++) {
      stops[k].from = clock;
      clock += lerp(staysMs, (k - 1) / Math.max(1, stops.length - 2));
      stops[k].to = clock;
    }
    const last = stops[stops.length - 1];
    const endAt = last.from;
    const hangs = stops.map((stop) => {
      const at: Point = { x: 0, y: 0 };
      return {
        ...stop,
        wisp: (ms: number): Point => {
          at.x = stop.at.x + Math.sin(ms * 0.9) * JITTER;
          at.y = stop.at.y + Math.cos(ms * 1.3) * JITTER;
          return at;
        },
        ghost: (): Point => stop.at,
      };
    });

    const blinking = createBeats(
      hangs.slice(1),
      (h) => h.from,
      (h, k) => {
        cover!.promote(h.worker!);
        if (h === hangs[hangs.length - 1]) {
          cover!.blast(h.at);
          return;
        }
        cover!.burst(h.at, 0.5);
        cover!.burst(stops[k].at, 0.25);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(BLINK_SHAKE, k / Math.max(1, workers.length - 1)));
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
        tick: (ms, now) => blinking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > last.to) return;
          for (const h of hangs) {
            drawWispBetween(
              ctx,
              h.ghost,
              ms,
              now,
              WISP_SIZE * GHOST,
              0.2,
              h.to,
              h.to + GHOST_MS,
            );
            drawWispBetween(
              ctx,
              h.wisp,
              ms,
              now,
              WISP_SIZE * BLINKER,
              0.9,
              h.from,
              h.to,
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
