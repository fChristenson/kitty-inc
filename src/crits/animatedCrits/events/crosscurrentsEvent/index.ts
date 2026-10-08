// the "Crosscurrents" event (money; cash): it covers its crit, whose click
// freezes the screen while two rivers of cash burst in from the screen's
// bottom corners and weave up it, swinging across each other again and
// again, narrowing as they climb; every crossing smashes them together in a
// splash of coins, a bang and a jolt, harder each time, until they braid
// into one and slam into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "crosscurrents";
const REWARD = 4;
const CROSSES = 4;
const STEPS = 96;
const BOTTOM = 40;
const REACH = 0.44;
const EDGE = 50;
const COINS = 16;
const COIN_REACH: [number, number] = [40, 160];
const CROSS_SHAKE: [number, number] = [0.6, 1.5];

export const forceCrosscurrentsEvent = registerWispEvent(
  KEY,
  "Crosscurrents",
  () => CONFIG.crosscurrentsEvent.chance,
  (floor, context, area) => {
    const { travelMs, holdMs, mergeMs } = CONFIG.crosscurrentsEvent;
    const total = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const halfW = (area.right - area.left) * REACH;
    const y0 = area.bottom - BOTTOM;
    const rivers = [1, -1].map((side) =>
      sampleLine(
        (u): Point => ({
          x: cx + side * halfW * (1 - u) * Math.cos(u * Math.PI * CROSSES),
          y: lerp([y0, total.y], u),
        }),
        STEPS,
      ),
    );
    const along = measure(rivers[0]);
    const length = along[STEPS];
    const crossings = Array.from({ length: CROSSES }, (_, k) => {
      const i = Math.round(((k + 0.5) / CROSSES) * STEPS);
      return { at: rivers[0][i], ms: (travelMs * along[i]) / length };
    });
    const pour: Pour = {
      coinsAlong: 260,
      width: 40,
      streamMs: travelMs * 0.7,
      travelMs,
    };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => {
        for (const line of rivers) pourLine(cover!, line, pour);
      },
    );
    const crossing = createBeats(
      crossings,
      (c) => c.ms,
      (c, k) => {
        cover!.burst(c.at, 0.6 + 0.15 * k);
        cover!.launchFrom(
          c.at,
          clampTargetsY(
            ringTargets(c.at, COINS, COIN_REACH),
            area.top + EDGE,
            area.bottom - EDGE,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, k / (CROSSES - 1)));
      },
    );
    const finale = createBeats(
      [travelMs],
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
          pouring.tick(ms, now);
          crossing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
