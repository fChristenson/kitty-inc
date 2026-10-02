// the "Pass the Parcel" event (wisp; worker perma tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// tosses up a wisp and the workers in view pass it on, hurling it from one
// to the next in high arcs all over the screen, ever faster and hotter;
// every catch lights the worker up a perma tier with a flash, a bloop and a
// jolt; the last catch blows it in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "passTheParcel";
const MAX_WORKERS = 6;
// each toss arcs LOFT px plus a share of its length above its higher end
const LOFT = 110;
const LOFT_SHARE = 0.3;
const SIZE: [number, number] = [0.8, 1.3];
const CATCH_SHAKE: [number, number] = [0.6, 1.4];

export const forcePassTheParcelEvent = registerWispEvent(
  KEY,
  "Pass the Parcel",
  () => CONFIG.passTheParcelEvent.chance,
  (floor, context) => {
    const { tossesMs, holdMs, mergeMs } = CONFIG.passTheParcelEvent;
    const workers = findRewardWorkers(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const tosses = workers.map((worker, k) => {
      const from = k === 0 ? button : workers[k - 1].at;
      const to = worker.at;
      return {
        from,
        to,
        height: LOFT + Math.hypot(to.x - from.x, to.y - from.y) * LOFT_SHARE,
        ms: lerp(tossesMs, k / Math.max(1, workers.length - 1)),
        startsAt: 0,
      };
    });
    let clock = 0;
    for (const toss of tosses) {
      toss.startsAt = clock;
      clock += toss.ms;
    }
    const endAt = clock;
    const head: Point = { x: 0, y: 0 };
    const parcel = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const toss =
        tosses.find((t) => ms <= t.startsAt + t.ms) ??
        tosses[tosses.length - 1];
      const u = clamp01((ms - toss.startsAt) / toss.ms);
      head.x = toss.from.x + (toss.to.x - toss.from.x) * u;
      head.y =
        toss.from.y +
        (toss.to.y - toss.from.y) * u -
        4 * toss.height * u * (1 - u);
      return head;
    };

    const catching = createBeats(
      tosses,
      (t) => t.startsAt + t.ms,
      (_, k) => {
        const t = k / Math.max(1, workers.length - 1);
        cover!.promote(workers[k]);
        if (k === workers.length - 1) {
          cover!.blast(workers[k].at);
          return;
        }
        cover!.burst(workers[k].at, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CATCH_SHAKE, t));
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
        tick: (ms, now) => catching.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          drawWispBetween(
            ctx,
            parcel,
            ms,
            now,
            WISP_SIZE * lerp(SIZE, heat),
            heat,
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
