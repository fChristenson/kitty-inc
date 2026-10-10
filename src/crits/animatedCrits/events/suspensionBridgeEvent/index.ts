// the "Suspension Bridge" event (beam; free upgrade levels): it covers its
// crit, whose click freezes the screen while a pylon wisp rises up the side
// of the screen beside the income bars; cables of light shoot out from its
// top one after another, quicker and quicker, each snapping taut onto a bar
// with a twang, a flare and a jolt, until every bar is slung from it and
// jolts with free levels; then every cable heaves tight at once in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "suspensionBridge";
const MAX_BARS = 4;
const ANCHORS = [0.35, 0.65, 0.95];
const SIDE = 60;
const ABOVE = 140;
const RISE_MS = 260;
const SNAP_MS = 110;
const FLARE_MS = 220;
const CABLE_W = 7;
const TAUT_MS = 200;
const PYLON = 0.7;
const TWANG_SHAKE: [number, number] = [0.25, 0.6];
const BAR_SHAKE: [number, number] = [0.6, 1.2];

interface Cable {
  bar: RewardBar;
  at: Point;
  starts: number;
  lands: number;
  tip: Point;
  closes: boolean;
}

export const forceSuspensionBridgeEvent = registerWispEvent(
  KEY,
  "Suspension Bridge",
  () => CONFIG.suspensionBridgeEvent.chance,
  (floor, context, area) => {
    const { cablesMs, tautGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.suspensionBridgeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // the pylon stands on the side nearer the bars' ends
    const onLeft = Math.random() < 0.5;
    const top: Point = {
      x: onLeft ? area.left + SIDE : area.right - SIDE,
      y: Math.max(area.top + 60, bars[0].box.y - ABOVE),
    };
    const base: Point = { x: top.x, y: area.bottom + 40 };
    const count = bars.length * ANCHORS.length;
    let clock = RISE_MS;
    let index = 0;
    const cables: Cable[] = bars.flatMap((bar) =>
      ANCHORS.map((f, j) => {
        const starts = clock;
        clock += lerp(cablesMs, index++ / Math.max(1, count - 1));
        const x = onLeft
          ? bar.box.x + bar.box.width * f
          : bar.box.x + bar.box.width * (1 - f);
        return {
          bar,
          at: { x, y: bar.box.y },
          starts,
          lands: starts + SNAP_MS,
          tip: { x: top.x, y: top.y },
          closes: j === ANCHORS.length - 1,
        };
      }),
    );
    const tautAt = cables[cables.length - 1].lands + tautGapMs;
    const endAt = tautAt + TAUT_MS;
    const pylon: Point = { x: top.x, y: top.y };
    const pylonAt = (ms: number): Point => {
      pylon.y = lerp([base.y, top.y], easeOutBack(clamp01(ms / RISE_MS)));
      return pylon;
    };
    const closers = cables.filter((c) => c.closes);

    const twanging = createBeats(
      cables,
      (c) => c.lands,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TWANG_SHAKE, k / Math.max(1, count - 1)));
      },
    );
    const slinging = createBeats(
      closers,
      (c) => c.lands,
      (c, k) => {
        cover!.levels(
          c.bar,
          levelsFor(c.bar.floor, levelShare, 2),
          c.bar.center,
        );
        cover!.burst(c.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BAR_SHAKE, k / Math.max(1, closers.length - 1)));
      },
    );
    const tautening = createBeats(
      [tautAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(top);
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
          twanging.tick(ms, now);
          slinging.tick(ms, now);
          tautening.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const taut = clamp01((ms - tautAt) / TAUT_MS);
          const head = pylonAt(ms);
          drawBeam(ctx, base, head, CABLE_W * 2, 0.6);
          for (const c of cables) {
            if (ms < c.starts) continue;
            const u = easeOut(clamp01((ms - c.starts) / SNAP_MS));
            c.tip.x = lerp([top.x, c.at.x], u);
            c.tip.y = lerp([top.y, c.at.y], u);
            // a twang that dies away, and a heave when they all pull tight
            const twang = Math.max(0, 1 - (ms - c.lands) / FLARE_MS);
            drawBeam(
              ctx,
              top,
              c.tip,
              CABLE_W * (1 + 0.8 * twang + 1.5 * taut),
              0.8 + 0.2 * twang,
            );
            if (ms >= c.lands && twang > 0)
              drawBeamFlare(ctx, c.at, 18, twang, now);
          }
          drawWispBetween(
            ctx,
            pylonAt,
            ms,
            now,
            WISP_SIZE * PYLON,
            0.9,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
