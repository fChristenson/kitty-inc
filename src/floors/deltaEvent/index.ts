// the "Delta" event (money; worker perma tiers and cash): it covers its crit,
// whose click freezes the screen while a broad river of cash gushes out of
// the clicked floor's button up to the top of the screen and pours straight
// down its middle; partway down it fans out into a delta, a channel of cash
// snaking off to every worker in view, each soaking its worker with a splash,
// a bloop and a jolt as they climb a perma tier; the last lands in a huge
// blast and shake and the coins sweep into the total. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardWorkers } from "../eventRewards";

const KEY = "delta";
const REWARD = 2;
const MAX_WORKERS = 6;
const TOP = 150;
// the delta fans out SPLIT of the way down the screen
const SPLIT = 0.3;
const FAN_MS = 70;
const LAND_SHAKE: [number, number] = [0.5, 1.3];

export const forceDeltaEvent = registerWispEvent(
  KEY,
  "Delta",
  () => CONFIG.deltaEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, channelMs, holdMs, mergeMs } =
      CONFIG.deltaEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const top: Point = { x: cx, y: area.top + TOP };
    const split: Point = { x: cx, y: lerp([top.y, area.bottom], SPLIT) };
    const rise: Point = { x: button.x, y: top.y };
    const trunk = [
      ...sampleLine((u) => bezier(button, rise, top, u, { x: 0, y: 0 }), 40),
      ...sampleLine((u) => ({ x: cx, y: lerp([top.y, split.y], u) }), 20).slice(
        1,
      ),
    ];
    const trunkPour: Pour = { coinsAlong: 700, width: 46, streamMs, travelMs };
    const channelPour: Pour = {
      coinsAlong: 320,
      width: 18,
      streamMs: streamMs * 0.7,
      travelMs: channelMs,
    };
    const channels = workers.map((worker, k) => {
      const ctrl: Point = { x: worker.at.x, y: split.y };
      const line = sampleLine(
        (u) => bezier(split, ctrl, worker.at, u, { x: 0, y: 0 }),
        30,
      );
      const opens = travelMs * 0.9 + k * FAN_MS;
      return { worker, line, opens, lands: opens + channelMs };
    });
    const last = channels[channels.length - 1];
    const durationMs = Math.max(
      pourDurationMs(0, trunkPour),
      pourDurationMs(last.opens, channelPour),
      last.lands + holdMs + mergeMs,
    );

    const opening = createBeats(
      channels,
      (c) => c.opens,
      (c) => pourLine(cover!, c.line, channelPour),
    );
    const landing = createBeats(
      channels,
      (c) => c.lands,
      (c, k) => {
        cover!.promote(c.worker);
        if (c === last) {
          cover!.blast(c.worker.at);
          return;
        }
        cover!.burst(c.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, channels.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          opening.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, trunk, trunkPour);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
