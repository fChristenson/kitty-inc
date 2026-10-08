// the "Water Show" event (money): it covers its crit, whose click freezes the
// screen while a row of fountain jets along its bottom puts on a show in
// cash, like a choreographed water show: first a row of leaping arches from
// jet to jet, then jets crossing over each other in a great lattice, each act
// a jolt and a burst along the row; then every jet shoots straight up and
// curls over into the total-income readout in a huge blast and shake, and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "waterShow";
const REWARD = 4;
// JETS nozzles over SPREAD of the screen's width, LIFT of its height up from
// its bottom; arches leap ARCH of its height, crossovers CROSS
const JETS = 7;
const SPREAD = 0.86;
const LIFT = 0.04;
const ARCH = 0.22;
const CROSS = 0.5;
const ACT_BURST = 0.4;
const ACT_SHAKE: [number, number] = [1, 1.8];

export const forceWaterShowEvent = registerWispEvent(
  KEY,
  "Water Show",
  () => CONFIG.waterShowEvent.chance,
  (floor, context, area) => {
    const { actMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.waterShowEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const nozzles: Point[] = Array.from({ length: JETS }, (_, k) => ({
      x: area.left + width * ((1 - SPREAD) / 2 + (SPREAD * k) / (JETS - 1)),
      y: area.bottom - height * LIFT,
    }));
    const arc = (a: Point, b: Point, rise: number) =>
      sampleLine(
        (u) =>
          bezier(
            a,
            { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - height * rise * 2 },
            b,
            u,
            { x: 0, y: 0 },
          ),
        40,
      );
    // act one: arches from each jet to the next; two: every jet across to its
    // mirror; three: all of them up and over into the total
    const acts = [
      nozzles.slice(0, -1).map((n, k) => arc(n, nozzles[k + 1], ARCH)),
      nozzles
        .filter((_, k) => k !== (JETS - 1) / 2)
        .map((n, k, all) => arc(n, all[all.length - 1 - k], CROSS)),
      nozzles.map((n) =>
        sampleLine(
          (u) =>
            bezier(n, { x: n.x, y: total.y - height * 0.1 }, total, u, {
              x: 0,
              y: 0,
            }),
          40,
        ),
      ),
    ];
    const pours: Pour[] = [
      { coinsAlong: 130, width: 22, streamMs, travelMs },
      { coinsAlong: 130, width: 22, streamMs, travelMs },
      {
        coinsAlong: 200,
        width: 30,
        streamMs: streamMs * 1.3,
        travelMs: travelMs * 1.3,
      },
    ];
    const starts = acts.map((_, k) => k * actMs);
    const finaleAt = starts[2] + pours[2].travelMs;
    const durationMs = Math.max(
      pourDurationMs(starts[2], pours[2]),
      finaleAt + holdMs + mergeMs,
    );

    const show = createBeats(
      acts,
      (_, k) => starts[k],
      (lines, k) => {
        for (const line of lines) pourLine(cover!, line, pours[k]);
        for (const n of nozzles) cover!.burst(n, ACT_BURST);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(ACT_SHAKE, k / (acts.length - 1)));
      },
    );
    const finale = createBeats(
      [finaleAt],
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
          show.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
