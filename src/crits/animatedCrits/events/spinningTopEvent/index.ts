// the "Spinning Top" event (wisp; free upgrade levels): it covers its
// crit, whose click freezes the screen while a wisp shoots out of the
// clicked floor's button and lands spinning in the middle of the screen as
// a top, a ring of little wisps whirling round it; as it slows it wobbles
// and wanders in ever wider loops across the screen, and every income bar
// it grinds over jolts with a screech of sparks and free levels; then it
// totters, topples and goes off in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "spinningTop";
const MAX_BARS = 5;
const RIM = 6;
// it loops LOOPS times, its loop growing from START px to REACH of the
// screen's half-height, seen FLAT; the rim spins SPIN laps a second down
// to a tenth of that, RING px round, seen RING_FLAT
const LOOPS = 2.5;
const START = 30;
const REACH = 0.85;
const FLAT = 0.75;
const SPIN = 7;
const RING = 34;
const RING_FLAT = 0.35;
const CORE = 0.7;
const RIM_SIZE = 0.3;
const SAMPLE_MS = 8;
const GRIND_SHAKE: [number, number] = [0.6, 1.3];

export const forceSpinningTopEvent = registerWispEvent(
  KEY,
  "Spinning Top",
  () => CONFIG.spinningTopEvent.chance,
  (floor, context, area) => {
    const { launchMs, spinMs, levelShare, holdMs, mergeMs } =
      CONFIG.spinningTopEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const reach = ((area.bottom - area.top) / 2) * REACH;
    const width = (area.right - area.left) / 2 - 40;
    const endAt = launchMs + spinMs;
    const topAt = (ms: number, into: Point): Point => {
      if (ms < launchMs) {
        const u = easeOut(ms / launchMs);
        into.x = lerp([button.x, center.x], u);
        into.y = lerp([button.y, center.y], u) - Math.sin(Math.PI * u) * 80;
        return into;
      }
      const u = clamp01((ms - launchMs) / spinMs);
      const r = lerp([START, reach], u * u);
      const angle = Math.PI * 2 * LOOPS * u;
      into.x = center.x + Math.sin(angle) * Math.min(width, r / FLAT);
      into.y = center.y - Math.cos(angle) * r;
      return into;
    };
    // every bar it first crosses, and when
    const found = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const grinds: { bar: RewardBar; at: number; spot: Point }[] = [];
    const p: Point = { x: 0, y: 0 };
    let lastY = center.y;
    for (let ms = launchMs; ms <= endAt; ms += SAMPLE_MS) {
      topAt(ms, p);
      for (const bar of found) {
        if (grinds.some((g) => g.bar === bar)) continue;
        const y = bar.center.y;
        const crossed = (lastY - y) * (p.y - y) <= 0;
        if (crossed && p.x > bar.box.x && p.x < bar.box.x + bar.box.width)
          grinds.push({ bar, at: ms, spot: { x: p.x, y } });
      }
      lastY = p.y;
    }
    const topPoint: Point = { x: 0, y: 0 };
    const top = (ms: number) => (ms > endAt ? null : topAt(ms, topPoint));
    const rimPoints = Array.from({ length: RIM }, () => ({ x: 0, y: 0 }));
    const spinTurn = (ms: number) => {
      const s = clamp01((ms - launchMs) / spinMs);
      return Math.PI * 2 * SPIN * ((ms / 1000) * (1 - 0.45 * s));
    };
    const rim = rimPoints.map((pt, i) => (ms: number): Point | null => {
      if (ms < launchMs || ms > endAt) return null;
      topAt(ms, pt);
      const a = spinTurn(ms) + (i / RIM) * Math.PI * 2;
      const wobble = 1 + 0.4 * clamp01((ms - launchMs) / spinMs);
      pt.x += Math.cos(a) * RING * wobble;
      pt.y += Math.sin(a) * RING * RING_FLAT * wobble;
      return pt;
    });
    const toppled: Point = topAt(endAt, { x: 0, y: 0 });

    const grinding = createBeats(
      grinds.sort((a, b) => a.at - b.at),
      (g) => g.at,
      (g, k) => {
        cover!.levels(g.bar, levelsFor(g.bar.floor, levelShare, 2), g.spot);
        cover!.burst(g.spot, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(GRIND_SHAKE, k / Math.max(1, grinds.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const g of grinds) cover!.slam(g.bar);
        cover!.blast(toppled);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: grinds.map((g) => g.bar),
        tick: (ms, now) => {
          grinding.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(ctx, top, ms, now, WISP_SIZE * CORE, 0.8, 0, endAt);
          for (const r of rim)
            drawWispBetween(
              ctx,
              r,
              ms,
              now,
              WISP_SIZE * RIM_SIZE,
              0.4,
              launchMs,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
