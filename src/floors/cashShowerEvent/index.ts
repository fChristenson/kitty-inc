// the "Cash Shower" event (money; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a thick column of cash crashes
// straight down out of the sky onto one worker in view after another, the
// showers ever quicker and overlapping, each landing on its worker's head in
// a splash, a bang and a jolt that lights it up a perma tier, the last in a
// huge blast and shake, and the cash runs on into the total. Pays floor
// income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardWorkers } from "../eventRewards";
import { WORKER_HEIGHT } from "../worker";

const KEY = "cashShower";
const REWARD = 2;
const MAX_WORKERS = 6;
// each shower starts SKY px above the screen
const SKY = 40;
const SPLASH_SHAKE: [number, number] = [0.9, 1.8];
const SPLASH_BURST: [number, number] = [0.6, 1];

export const forceCashShowerEvent = registerWispEvent(
  KEY,
  "Cash Shower",
  () => CONFIG.cashShowerEvent.chance,
  (floor, context, area) => {
    const { gapsMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.cashShowerEvent;
    // sweeping across the screen from a random side
    const flip = Math.random() < 0.5 ? 1 : -1;
    const workers = findRewardWorkers(floor, context)
      .sort((a, b) => (a.at.x - b.at.x) * flip)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const heads = workers.map((w) => ({
      x: w.at.x,
      y: w.at.y - WORKER_HEIGHT * 0.45,
    }));
    const starts: number[] = [];
    let clock = 0;
    workers.forEach((_, k) => {
      starts.push(clock);
      clock += lerp(gapsMs, k / Math.max(1, workers.length - 1));
    });
    const pour: Pour = { coinsAlong: 190, width: 44, streamMs, travelMs };
    const showers = heads.map((head) =>
      sampleLine(
        (u) => ({ x: head.x, y: lerp([area.top - SKY, head.y], u) }),
        12,
      ),
    );

    const pouring = createBeats(
      showers,
      (_, k) => starts[k],
      (line) => pourLine(cover!, line, pour),
    );
    const splashing = createBeats(
      workers,
      (_, k) => starts[k] + travelMs,
      (worker, k) => {
        cover!.promote(worker);
        if (k === workers.length - 1) {
          cover!.blast(heads[k]);
          return;
        }
        const t = k / Math.max(1, workers.length - 2);
        cover!.burst(heads[k], lerp(SPLASH_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLASH_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(starts[starts.length - 1], pour),
          starts[starts.length - 1] + travelMs + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        workers,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          splashing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
