// the "Thunderdome" event (lightning; free upgrade levels and a crit tier):
// it covers its crit, whose click freezes the screen while a cage of
// crackling lightning cracks into being round the screen's edges, then
// snaps inward in jumps, ever faster, closing on the clicked floor's income
// bar, every snap a crack, a bang and a big jolt that lands free levels on
// it; then the cage slams shut on the bar, which jumps a crit tier in a huge
// blast and shake
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "thunderdome";
const SNAPS = 4;
// the cage closes to PAD px round the bar
const PAD = 26;
const INSET = 24;
const SNAP_MS = 90;
const SLAM_MS = 120;
const FADE_MS = 200;
const SNAP_SHAKE: [number, number] = [0.9, 1.7];

export const forceThunderdomeEvent = registerWispEvent(
  KEY,
  "Thunderdome",
  () => CONFIG.thunderdomeEvent.chance,
  (floor, context, area) => {
    const { formMs, holdsMs, levelShare, holdMs, mergeMs } =
      CONFIG.thunderdomeEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const outer = {
      x0: area.left + INSET,
      y0: area.top + INSET,
      x1: area.right - INSET,
      y1: area.bottom - INSET,
    };
    const inner = {
      x0: own.box.x - PAD,
      y0: own.box.y - PAD,
      x1: own.box.x + own.box.width + PAD,
      y1: own.box.y + own.box.height + PAD,
    };
    // snap k closes the cage to share (k + 1) / (SNAPS + 1) of the way in
    const snaps: number[] = [];
    let clock: number = formMs;
    for (let k = 0; k < SNAPS; k++) {
      clock += lerp(holdsMs, k / (SNAPS - 1));
      snaps.push(clock);
    }
    const slamAt = clock + lerp(holdsMs, 1);
    const endAt = slamAt + SLAM_MS;
    const closed = (ms: number) => {
      if (ms >= slamAt)
        return lerp(
          [SNAPS / (SNAPS + 1), 1],
          easeIn(clamp01((ms - slamAt) / SLAM_MS)),
        );
      let k = 0;
      while (k < SNAPS && ms >= snaps[k]) k++;
      if (k === 0) return 0;
      const from = (k - 1) / (SNAPS + 1);
      const to = k / (SNAPS + 1);
      return lerp([from, to], easeOut(clamp01((ms - snaps[k - 1]) / SNAP_MS)));
    };
    const corners: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const bolts = corners.map((c, i) => createBolt(c, corners[(i + 1) % 4], 1));
    const justSnapped = (ms: number) => {
      for (const at of snaps)
        if (ms >= at && ms < at + SNAP_MS * 2) return true;
      return false;
    };
    const place = (s: number) => {
      const x0 = lerp([outer.x0, inner.x0], s);
      const y0 = lerp([outer.y0, inner.y0], s);
      const x1 = lerp([outer.x1, inner.x1], s);
      const y1 = lerp([outer.y1, inner.y1], s);
      corners[0].x = x0;
      corners[0].y = y0;
      corners[1].x = x1;
      corners[1].y = y0;
      corners[2].x = x1;
      corners[2].y = y1;
      corners[3].x = x0;
      corners[3].y = y1;
    };

    const snapping = createBeats(
      snaps,
      (ms) => ms,
      (_, k) => {
        const t = k / (SNAPS - 1);
        cover!.levels(own, levelsFor(own.floor, levelShare, 2));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNAP_SHAKE, t));
      },
    );
    const slamming = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 3));
        cover!.tierUp(own);
        cover!.slam(own);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own],
        tick: (ms, now) => {
          snapping.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FADE_MS) return;
          place(closed(ms));
          const alpha =
            ms < formMs
              ? clamp01(ms / formMs)
              : ms > endAt
                ? 1 - (ms - endAt) / FADE_MS
                : 1;
          const snapped = justSnapped(ms);
          for (const bolt of bolts)
            drawBolt(ctx, bolt, alpha, snapped ? 1.3 : 0.9);
          for (const c of corners)
            drawStrike(ctx, c, alpha * 0.8, snapped ? 1.1 : 0.7, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
