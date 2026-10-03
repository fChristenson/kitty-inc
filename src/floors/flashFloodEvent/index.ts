// the "Flash Flood" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp bolts out of the clicked floor's button and
// flees across the screen with a roaring wall of cash flooding right behind
// it, swerving round corner after corner, every swerve a near miss, a
// whoosh and a jolt; the flood gains on it the whole way and swallows it as
// it reaches the total, in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pointAlong,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "flashFlood";
const REWARD = 4;
const EDGE = 70;
// the runner starts LEAD of the way ahead of the flood, the gap closing
const LEAD = 0.12;
const RUNNER = 0.55;
const SWERVE_SHAKE: [number, number] = [0.4, 1.2];

export const forceFlashFloodEvent = registerWispEvent(
  KEY,
  "Flash Flood",
  () => CONFIG.flashFloodEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.flashFloodEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const h = area.bottom - area.top;
    const ltr = button.x > (left + right) / 2;
    const corners: Point[] = [
      button,
      { x: ltr ? left : right, y: area.top + h * 0.8 },
      { x: ltr ? right : left, y: area.top + h * 0.6 },
      { x: ltr ? left : right, y: area.top + h * 0.38 },
      total,
    ];
    const line = sampleLine((u) => alongRoute(corners, u, { x: 0, y: 0 }), 120);
    const along = measure(line);
    const pour: Pour = { coinsAlong: 1_100, width: 60, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );
    const swerves = corners.slice(1, -1).map((at, i) => ({
      at,
      ms: travelMs * ((i + 1) / (corners.length - 1)) * (1 - LEAD),
    }));
    const runnerAt: Point = { x: 0, y: 0 };
    const runner = (ms: number): Point => {
      const u = clamp01(ms / travelMs);
      return pointAlong(line, along, Math.min(1, u + LEAD * (1 - u)), runnerAt);
    };

    const swerving = createBeats(
      swerves,
      (s) => s.ms,
      (s, k) => {
        cover!.burst(s.at, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SWERVE_SHAKE, k / Math.max(1, swerves.length - 1)));
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
          swerving.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            runner,
            ms,
            now,
            WISP_SIZE * RUNNER,
            0.9,
            0,
            travelMs,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
