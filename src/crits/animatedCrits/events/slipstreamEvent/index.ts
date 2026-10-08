// the "Slipstream" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a column of wisps streams out of the
// clicked floor's button and races round a great loop of the screen nose to
// tail; one after another the one at the back pulls out of the slipstream,
// slingshots past the rest in a burst of speed and peels off onto an income
// bar with a flash and a jolt and free levels; the leader dives in last in
// a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "slipstream";
const MAX_BARS = 4;
// the loop is RADIUS of the screen across and down; racers sit GAP of a
// lap apart, lapping LAPS_HZ laps a second
const RADIUS = 0.36;
const GAP = 0.05;
const LAPS_HZ = 0.55;
const PEEL_MS = 380;
const RACER = 0.36;
const PEEL_SHAKE: [number, number] = [0.6, 1.3];

export const forceSlipstreamEvent = registerWispEvent(
  KEY,
  "Slipstream",
  () => CONFIG.slipstreamEvent.chance,
  (floor, context, area) => {
    const { raceMs, gapsMs, holdMs, mergeMs } = CONFIG.slipstreamEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const rx = (area.right - area.left) * RADIUS;
    const ry = (area.bottom - area.top) * RADIUS;
    const loop = (lap: number, into: Point) => {
      const a = lap * Math.PI * 2 - Math.PI / 2;
      into.x = center.x + Math.cos(a) * rx;
      into.y = center.y + Math.sin(a) * ry;
      return into;
    };
    const lapAt = (ms: number) => (ms / 1000) * LAPS_HZ * (1 + ms / 4000);
    let clock: number = raceMs;
    // the back of the column peels off first; the leader last
    const peels = bars.map((bar, k) => {
      const slot = bars.length - 1 - k;
      const leaves = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const from = loop(lapAt(leaves) - slot * GAP, { x: 0, y: 0 });
      const ahead = loop(lapAt(leaves) + 0.12, { x: 0, y: 0 });
      return { bar, slot, leaves, lands: leaves + PEEL_MS, from, ahead };
    });
    const last = peels[peels.length - 1];
    const endAt = last.lands;
    const racers = peels.map((p) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms >= p.lands) return null;
        if (ms < p.leaves) {
          loop(lapAt(ms) - p.slot * GAP, at);
          const enter = easeOut(clamp01(ms / 400));
          at.x = lerp([button.x, at.x], enter);
          at.y = lerp([button.y, at.y], enter);
          return at;
        }
        return bezier(
          p.from,
          p.ahead,
          p.bar.center,
          easeIn((ms - p.leaves) / PEEL_MS),
          at,
        );
      };
    });

    const pulling = createBeats(
      peels,
      (p) => p.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      peels,
      (p) => p.lands,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor), p.ahead);
        if (p === last) {
          cover!.slam(p.bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PEEL_SHAKE, k / Math.max(1, peels.length - 1)));
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
          pulling.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          peels.forEach((p, k) =>
            drawWispBetween(
              ctx,
              racers[k],
              ms,
              now,
              WISP_SIZE * RACER,
              0.5,
              0,
              p.lands,
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
