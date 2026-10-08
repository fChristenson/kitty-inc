// the "Crossroads" event (money; cash): it covers its crit, whose click
// freezes the screen while four rivers of cash burst in at once from the
// middle of each side of the screen and rush head-on at its centre; they
// collide in a towering splash, a bang and a big jolt, and a geyser of cash
// erupts out of the crash straight up into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
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

const KEY = "crossroads";
const REWARD = 4;
const EDGE = 10;
// each river snakes WAVE px side to side on its way in
const WAVE = 40;
const CRASH_SHAKE = 1.4;

export const forceCrossroadsEvent = registerWispEvent(
  KEY,
  "Crossroads",
  () => CONFIG.crossroadsEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, eruptMs, holdMs, mergeMs } =
      CONFIG.crossroadsEvent;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const sides: Point[] = [
      { x: area.left + EDGE, y: center.y },
      { x: area.right - EDGE, y: center.y },
      { x: center.x, y: area.top + 150 },
      { x: center.x, y: area.bottom - EDGE },
    ];
    const rivers = sides.map((from) => {
      const dx = center.x - from.x;
      const dy = center.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      return sampleLine((u) => {
        const side = Math.sin(u * Math.PI * 2) * WAVE * (1 - u);
        return {
          x: lerp([from.x, center.x], u) - (dy / length) * side,
          y: lerp([from.y, center.y], u) + (dx / length) * side,
        };
      }, 40);
    });
    const pour: Pour = { coinsAlong: 800, width: 40, streamMs, travelMs };
    const total = totalSpot(area);
    const geyser = sampleLine(
      (u) => ({ x: center.x, y: lerp([center.y, total.y], u) }),
      30,
    );
    const eruption: Pour = {
      coinsAlong: 900,
      width: 54,
      streamMs: eruptMs,
      travelMs: eruptMs * 0.8,
    };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      pourDurationMs(travelMs, eruption),
      travelMs + holdMs + mergeMs,
    );

    const crashing = createBeats(
      [travelMs],
      (ms) => ms,
      () => {
        pourLine(cover!, geyser, eruption);
        cover!.burst(center, 1.1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CRASH_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs + eruptMs * 0.8],
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
          crashing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    for (const river of rivers) pourLine(cover, river, pour);
    playBoostEventStream();
  },
);
