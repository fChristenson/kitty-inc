// the "Tape Measure" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a wisp shoots out of the clicked
// floor's button to the end of an income bar and pulls out a tape measure of
// blazing light along it, every mark it passes ticking with a flare; at the
// far end the bar lands free levels with a bang and a jolt and the tape
// snaps back with a whip-crack; it measures bar after bar ever faster, the
// last snap a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "tapeMeasure";
const MAX_BARS = 5;
const MOVE_MS = 150;
const SNAP_MS = 110;
// MARKS marks along each bar, each flaring FLARE px as the tape passes
const MARKS = 6;
const FLARE = 16;
const FLARE_MS = 150;
const TAPE = 12;
const TIP = 0.4;
const DONE_SHAKE: [number, number] = [0.5, 1.3];

export const forceTapeMeasureEvent = registerWispEvent(
  KEY,
  "Tape Measure",
  () => CONFIG.tapeMeasureEvent.chance,
  (floor, context) => {
    const { pullsMs, holdMs, mergeMs } = CONFIG.tapeMeasureEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const pulls = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const y = bar.center.y;
      const anchor: Point = {
        x: ltr ? bar.box.x : bar.box.x + bar.box.width,
        y,
      };
      const end: Point = { x: ltr ? bar.box.x + bar.box.width : bar.box.x, y };
      const moves = clock;
      const pulls = moves + MOVE_MS;
      const span = lerp(pullsMs, k / Math.max(1, bars.length - 1));
      const done = pulls + span;
      clock = done + SNAP_MS;
      const marks = Array.from({ length: MARKS }, (_, i) => ({
        at: { x: lerp([anchor.x, end.x], (i + 1) / MARKS), y } as Point,
        ms: pulls + span * Math.sqrt((i + 1) / MARKS),
      }));
      const pull = {
        bar,
        from,
        anchor,
        end,
        moves,
        pulls,
        done,
        snapped: clock,
        marks,
      };
      from = anchor;
      return pull;
    });
    const last = pulls[pulls.length - 1];
    const endAt = last.snapped;
    const marks = pulls.flatMap((p) => p.marks);
    const tipAt: Point = { x: 0, y: 0 };
    const tip = (ms: number): Point => {
      let p = pulls[0];
      for (const pull of pulls) if (ms >= pull.moves) p = pull;
      if (ms < p.pulls) {
        const u = smoothstep(clamp01((ms - p.moves) / MOVE_MS));
        tipAt.x = lerp([p.from.x, p.anchor.x], u);
        tipAt.y = lerp([p.from.y, p.anchor.y], u);
      } else if (ms < p.done) {
        tipAt.x = lerp(
          [p.anchor.x, p.end.x],
          easeOut((ms - p.pulls) / (p.done - p.pulls)),
        );
        tipAt.y = p.anchor.y;
      } else {
        tipAt.x = lerp(
          [p.end.x, p.anchor.x],
          easeIn(clamp01((ms - p.done) / SNAP_MS)),
        );
        tipAt.y = p.anchor.y;
      }
      return tipAt;
    };

    const ticking = createBeats(
      marks,
      (m) => m.ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const measuring = createBeats(
      pulls,
      (p) => p.done,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor), p.anchor);
        if (p === last) {
          cover!.slam(p.bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.end, 0.45);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(DONE_SHAKE, k / Math.max(1, pulls.length - 1)));
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
          ticking.tick(ms, now);
          measuring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const at = tip(ms);
          for (const p of pulls)
            if (ms >= p.pulls && ms < p.snapped)
              drawBeam(ctx, p.anchor, at, TAPE, 0.85);
          for (const m of marks) {
            const f = (ms - m.ms) / FLARE_MS;
            if (f >= 0 && f < 1) drawBeamFlare(ctx, m.at, FLARE, 1 - f, now);
          }
          drawWispBetween(ctx, tip, ms, now, WISP_SIZE * TIP, 0.9, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
