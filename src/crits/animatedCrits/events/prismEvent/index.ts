// the "Prism" event: it covers its crit, whose click freezes the screen while
// a fat beam of cash shoots up out of the clicked floor's button and hits a
// point in the middle of the screen like light hitting a prism, splitting
// there with a flash, a bang and a jolt into a wide fan of thin rivers that
// spray out across the upper screen and curl back in to the total-income
// readout, each landing with a flash and the last in a huge blast and shake,
// and the coins sweep into the total. Pays floor income × floor number ×
// REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
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

const KEY = "prism";
const REWARD = 4;
// the split DROP of the screen's height under its middle; the rays fan out
// over these angles (degrees, -90 = straight up), each reaching RAY of the
// screen's width (or height, if less) out before it curls in
const DROP = 0.08;
const RAYS = [-170, -145, -120, -95, -70, -45, -20];
const RAY = 0.5;
const STEPS = 30;
const SPLIT_BURST = 1.3;
const SPLIT_SHAKE = 2.2;
const LAND_BURST = 0.5;

export const forcePrismEvent = registerWispEvent(
  KEY,
  "Prism",
  () => CONFIG.prismEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.prismEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const prism: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const lines = RAYS.map((deg) => {
      const a = (deg * Math.PI) / 180;
      const out = {
        x: Math.min(
          area.right,
          Math.max(area.left, prism.x + Math.cos(a) * span * RAY),
        ),
        y: Math.max(area.top, prism.y + Math.sin(a) * span * RAY),
      };
      return [
        ...sampleLine(
          (u) => ({
            x: button.x + (prism.x - button.x) * u,
            y: button.y + (prism.y - button.y) * u,
          }),
          STEPS,
        ),
        ...sampleLine(
          (u) => bezier(prism, out, total, u, { x: 0, y: 0 }),
          50,
        ).slice(1),
      ];
    });
    // one speed for every ray, so they leave the beam together
    const lengths = lines.map((line) => measure(line));
    const longest = Math.max(...lengths.map((a) => a[a.length - 1]));
    const pours: Pour[] = lengths.map((a) => ({
      coinsAlong: 260,
      width: 22,
      streamMs,
      travelMs: (travelMs * a[a.length - 1]) / longest,
    }));
    const splitAt = (travelMs * lengths[0][STEPS]) / longest;
    const arrivals = pours.map((p) => p.travelMs);
    const lastIn = arrivals.indexOf(Math.max(...arrivals));
    const durationMs = Math.max(
      pourDurationMs(0, pours[lastIn]),
      arrivals[lastIn] + holdMs + mergeMs,
    );

    const split = createBeats(
      [splitAt],
      (ms) => ms,
      () => {
        cover!.burst(prism, SPLIT_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SPLIT_SHAKE);
      },
    );
    const landings = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? total;
        if (k === lastIn) cover!.blast(at);
        else cover!.burst(at, LAND_BURST);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          split.tick(ms, now);
          landings.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    lines.forEach((line, k) => pourLine(cover, line, pours[k]));
    playBoostEventStream();
  },
);
