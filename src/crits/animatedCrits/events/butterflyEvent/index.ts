// the "Butterfly" event (money): it covers its crit, whose click freezes the
// screen while two rivers of cash gush out of the clicked floor's button
// into the middle of the screen and open out into a butterfly, mirror images
// sweeping round its big upper wings and small lower ones at once, every
// wingtip a flash, a bloop and a jolt on both sides together; then they
// fold back in and rise up its body into the total-income readout in a
// huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "butterfly";
const REWARD = 4;
// the body DROP of the screen's height under its middle; one wing's route
// round it, as shares of the screen's width out and its height down, the
// other wing mirrored. Indexes 2 and 4 are the wingtips
const DROP = 0.06;
const WING: Point[] = [
  { x: 0, y: 0 },
  { x: 0.12, y: -0.12 },
  { x: 0.38, y: -0.2 },
  { x: 0.3, y: 0.02 },
  { x: 0.26, y: 0.16 },
  { x: 0.06, y: 0.06 },
  { x: 0, y: -0.06 },
];
const TIPS = [2, 4];
const STEPS = 24;
const TIP_BURST: [number, number] = [0.6, 1];
const TIP_SHAKE: [number, number] = [1.2, 1.8];

export const forceButterflyEvent = registerWispEvent(
  KEY,
  "Butterfly",
  () => CONFIG.butterflyEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.butterflyEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const body = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const wings = [1, -1].map((side) => {
      const route = [
        button,
        ...WING.map((p) => ({
          x: body.x + side * width * p.x,
          y: body.y + height * p.y,
        })),
        total,
      ];
      return {
        route,
        line: sampleLine(
          (u) => alongRoute(route, u, { x: 0, y: 0 }),
          STEPS * (route.length - 1),
        ),
      };
    });
    // one speed for both wings, so they open in step
    const lengths = wings.map((w) => measure(w.line));
    const longest = Math.max(...lengths.map((a) => a[a.length - 1]));
    const pours: Pour[] = lengths.map((a) => ({
      coinsAlong: 900,
      width: 40,
      streamMs,
      travelMs: (travelMs * a[a.length - 1]) / longest,
    }));
    // the wingtips (route index = WING index + 1), as the right wing's head reaches them
    const tips = TIPS.map((i) => ({
      ms: (travelMs * lengths[0][STEPS * (i + 1)]) / longest,
      at: wings.map((w) => w.route[i + 1]),
    }));
    const inAt = Math.max(...pours.map((p) => p.travelMs));
    const durationMs = Math.max(
      pourDurationMs(0, pours[0]),
      inAt + holdMs + mergeMs,
    );

    const flaps = createBeats(
      tips,
      (t) => t.ms,
      (t, k) => {
        for (const at of t.at) cover!.burst(at, lerp(TIP_BURST, k));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TIP_SHAKE, k));
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flaps.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    wings.forEach((w, k) => pourLine(cover, w.line, pours[k]));
    playBoostEventStream();
  },
);
