// the "Leaf Fall" event (clutter; worker perma tiers): it covers its crit,
// whose click freezes the screen while glitter leaves come fluttering down
// out of the sky, swaying side to side, until they lie evenly over the whole
// screen; then one huge glittering broom cleans them up in brisk strokes:
// right to left across the top, middle and bottom bands into a line down the
// left edge, then down and up along it into one heap, which it shoves along
// onto a worker; the heap settles with a jolt and the worker lights up a
// perma tier in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawBroom,
  heapSpots,
  planSweep,
  scatterEvenly,
  simulateSweep,
  sweepLane,
  SWEEP_DEPTH,
  type BroomState,
} from "../../../../shared/clutter";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "leafFall";
const LEAVES = 300;
const LEAF = 11;
const MARGIN = 40;
const BANDS = 3;
const SWAY = 26;
// the line the leaves are swept into, off the left edge
const EDGE = 60;
const KEEP_OFF = 24;
const SHORT = 220;
const SETTLE_MS = 80;
const MOUND_W = 120;
const MOUND_H = 60;
const ABOVE = 70;
const FADE_MS = 160;
const GATHER_MS = 180;
const STROKE_SHAKE = 0.3;
const GATHER_SHAKE = 0.8;

export const forceLeafFallEvent = registerWispEvent(
  KEY,
  "Leaf Fall",
  () => CONFIG.leafFallEvent.chance,
  (floor, context, area) => {
    const { fallMs, dragMs, liftMs, holdMs, mergeMs } = CONFIG.leafFallEvent;
    const target = findRewardWorkers(floor, context).sort(
      (a, b) => a.at.x - b.at.x,
    )[0];
    if (!target) return;
    const height = area.bottom - area.top;
    const spots = scatterEvenly(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: area.bottom - MARGIN,
      },
      LEAVES,
    );
    const falls = spots.map(() => ({
      born: Math.random() * fallMs * 0.45,
      sway: Math.random() * Math.PI * 2,
    }));
    const avg = (SWEEP_DEPTH[0] + SWEEP_DEPTH[1]) / 2;
    const front = area.left + EDGE;
    const lineX = front - avg;
    const heap: Point = {
      x: lineX,
      y: Math.min(
        area.bottom - 60,
        Math.max(area.top + 60, target.at.y - ABOVE),
      ),
    };
    const bandH = height / BANDS;
    const pushTo = Math.max(lineX + 40, target.at.x - KEEP_OFF);
    const sweep = planSweep(
      [
        ...Array.from({ length: BANDS }, (_, k) =>
          sweepLane(
            { x: area.right + 20, y: area.top + bandH * (k + 0.5) },
            { x: front, y: area.top + bandH * (k + 0.5) },
            1,
            Math.PI,
            bandH * 1.08,
          ),
        ).flat(),
        ...sweepLane(
          { x: lineX, y: area.top - 20 },
          { x: lineX, y: heap.y - KEEP_OFF },
          1,
          Math.PI / 2,
          SHORT,
        ),
        ...sweepLane(
          { x: lineX, y: area.bottom + 20 },
          { x: lineX, y: heap.y + KEEP_OFF },
          1,
          -Math.PI / 2,
          SHORT,
        ),
        // shoving the heap along onto the worker
        ...sweepLane(
          { x: area.left - 30, y: heap.y + avg },
          { x: pushTo, y: heap.y + avg },
          1,
          0,
          SHORT,
        ),
      ],
      fallMs + SETTLE_MS,
      dragMs,
      liftMs,
    );
    const swept = simulateSweep(sweep, spots);
    const mounds = heapSpots(
      { x: target.at.x, y: target.at.y - ABOVE * 0.4 },
      LEAVES,
      MOUND_W,
      MOUND_H,
    );
    const gathered = sweep.endMs + GATHER_MS;
    const endAt = gathered + FADE_MS * 2;

    const stroking = createBeats(
      sweep.starts,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(STROKE_SHAKE);
      },
    );
    const settling = createBeats(
      [gathered],
      (ms) => ms,
      () => {
        cover!.promote(target);
        cover!.blast(target.at);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(GATHER_SHAKE);
      },
    );

    const broom: BroomState = {
      x: 0,
      y: 0,
      heading: 0,
      length: 0,
      pushing: false,
    };
    const leaf: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers: [target],
        tick: (ms, now) => {
          stroking.tick(ms, now);
          settling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - gathered) / FADE_MS);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < LEAVES; i++) {
            const { born, sway } = falls[i];
            if (ms < born) continue;
            if (ms < sweep.startMs) {
              const t = clamp01((ms - born) / (fallMs - born));
              leaf.x =
                spots[i].x + Math.sin(sway + ms * 0.008) * SWAY * (1 - t);
              leaf.y = lerp([area.top - 30, spots[i].y], easeOut(t));
            } else if (ms < sweep.endMs) {
              swept.at(i, ms, leaf);
            } else {
              const end = swept.end(i);
              const g = easeOut(clamp01((ms - sweep.endMs) / GATHER_MS));
              leaf.x = lerp([end.x, mounds[i].x], g);
              leaf.y = lerp([end.y, mounds[i].y], g);
            }
            stampGlimmer(
              ctx,
              leaf.x,
              leaf.y,
              LEAF,
              sway + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          // faded in on its first stroke's start and out after its last
          const b = sweep.at(
            Math.min(Math.max(ms, sweep.startMs), sweep.endMs - 1),
            broom,
          );
          const shown =
            clamp01((ms - (sweep.startMs - FADE_MS)) / FADE_MS) *
            (1 - clamp01((ms - sweep.endMs) / FADE_MS));
          if (b) drawBroom(ctx, b, shown, ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
