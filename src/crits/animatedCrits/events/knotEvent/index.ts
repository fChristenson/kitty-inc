// the "Knot" event (money; cash): it covers its crit, whose click freezes
// the screen while a river of cash loops through the middle of the screen
// in a great three-lobed knot; as it closes the loop it's pulled tight, a
// smaller, faster knot looping inside it, then a smaller one again, every
// knot tied with a splash, a bang and a jolt, until the tightest knot snaps
// and whips the cash up into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "knot";
const REWARD = 4;
// each knot SCALES of the first, turned TURN further
const SCALES = [1, 0.68, 0.42];
const TURN = 0.6;
const SIZE = 0.3;
const STEPS = 120;
const WHIP_MS = 380;
const TIE_SHAKE: [number, number] = [0.7, 1.3];

export const forceKnotEvent = registerWispEvent(
  KEY,
  "Knot",
  () => CONFIG.knotEvent.chance,
  (floor, context, area) => {
    const { knotsMs, holdMs, mergeMs } = CONFIG.knotEvent;
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const reach =
      Math.min(area.right - area.left, area.bottom - area.top) * SIZE;
    let clock = 0;
    const knots = SCALES.map((scale, k) => {
      const turn = k * TURN;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      // a trefoil, 3 units across, scaled to the screen
      const line = sampleLine((u) => {
        const t = u * Math.PI * 2;
        const x = (Math.sin(t) + 2 * Math.sin(2 * t)) / 3;
        const y = (Math.cos(t) - 2 * Math.cos(2 * t)) / 3;
        return {
          x: hub.x + (x * cos - y * sin) * reach * scale,
          y: hub.y + (x * sin + y * cos) * reach * scale,
        };
      }, STEPS);
      const travelMs = lerp(knotsMs, k / (SCALES.length - 1));
      const pour: Pour = {
        coinsAlong: 440,
        width: 30 * (0.6 + 0.4 * scale),
        streamMs: travelMs * 0.7,
        travelMs,
      };
      const starts = clock;
      clock += travelMs * 0.85;
      return { line, pour, starts, ties: starts + travelMs, at: line[0] };
    });
    const last = knots[knots.length - 1];
    const total = totalSpot(area);
    const whip = sampleLine(
      (u) => ({
        x: lerp([hub.x, total.x], u),
        y: lerp([hub.y, total.y], u * u),
      }),
      30,
    );
    const flight: Pour = {
      coinsAlong: 520,
      width: 36,
      streamMs: WHIP_MS * 0.6,
      travelMs: WHIP_MS,
    };
    const endAt = last.ties + WHIP_MS;
    const durationMs = Math.max(
      pourDurationMs(last.ties, flight),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      knots,
      (k) => k.starts,
      (k) => pourLine(cover!, k.line, k.pour),
    );
    const tying = createBeats(
      knots,
      (k) => k.ties,
      (k, i) => {
        cover!.burst(k.at, 0.6 + 0.2 * i);
        if (k === last) pourLine(cover!, whip, flight);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TIE_SHAKE, i / (knots.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
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
          tying.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
