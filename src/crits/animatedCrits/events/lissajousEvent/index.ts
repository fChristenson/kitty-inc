// the "Lissajous" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a wisp shoots out of the clicked
// floor's button and traces a huge Lissajous figure over the income bars,
// looping three across for every two up and down, ever faster, its glitter
// trail weaving the figure; every time it streaks across a bar the bar
// flashes with a pop, a jolt and free levels; on its last loop it dives to
// the figure's heart and blows in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "lissajous";
const MAX_BARS = 5;
const TURNS = 2.5;
const REACH = 0.4;
const OVER = 70;
const ENTER_MS = 200;
const DIVE_MS = 180;
const SAMPLE_MS = 6;
const WISP = 0.6;
const PASS_SHAKE: [number, number] = [0.3, 0.9];
const POP_GAP_MS = 50;

export const forceLissajousEvent = registerWispEvent(
  KEY,
  "Lissajous",
  () => CONFIG.lissajousEvent.chance,
  (floor, context, area) => {
    const { traceMs, levelShare, holdMs, mergeMs } = CONFIG.lissajousEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const top = bars[0].center.y;
    const bottom = bars[bars.length - 1].center.y;
    const heart: Point = {
      x: (area.left + area.right) / 2,
      y: (top + bottom) / 2,
    };
    const a = (area.right - area.left) * REACH;
    const b = (bottom - top) / 2 + OVER;
    const figure = (ms: number, into: Point): Point => {
      const u = clamp01(ms / traceMs);
      const s = Math.PI * 2 * TURNS * (0.6 * u + 0.4 * u * u);
      into.x = heart.x + a * Math.sin(3 * s + Math.PI / 2);
      into.y = heart.y + b * Math.sin(2 * s);
      return into;
    };
    const endAt = ENTER_MS + traceMs + DIVE_MS;
    const first = figure(0, { x: 0, y: 0 });
    const last = figure(traceMs, { x: 0, y: 0 });
    const wispAt: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point => {
      if (ms < ENTER_MS) {
        const e = easeOut(clamp01(ms / ENTER_MS));
        wispAt.x = lerp([button.x, first.x], e);
        wispAt.y = lerp([button.y, first.y], e);
        return wispAt;
      }
      if (ms < ENTER_MS + traceMs) return figure(ms - ENTER_MS, wispAt);
      const e = easeIn(clamp01((ms - ENTER_MS - traceMs) / DIVE_MS));
      wispAt.x = lerp([last.x, heart.x], e);
      wispAt.y = lerp([last.y, heart.y], e);
      return wispAt;
    };

    // every crossing of a bar's middle while over the bar
    const passes: { bar: RewardBar; at: number }[] = [];
    const p: Point = { x: 0, y: 0 };
    const q: Point = { x: 0, y: 0 };
    for (let ms = 0; ms < traceMs; ms += SAMPLE_MS) {
      figure(ms, p);
      figure(ms + SAMPLE_MS, q);
      for (const bar of bars) {
        const c = bar.center.y;
        if ((p.y - c) * (q.y - c) > 0) continue;
        if (p.x < bar.box.x || p.x > bar.box.x + bar.box.width) continue;
        passes.push({ bar, at: ENTER_MS + ms });
      }
    }
    let lastPop = -Infinity;

    const passing = createBeats(
      passes,
      (pass) => pass.at,
      (pass, k) => {
        cover!.levels(pass.bar, levelsFor(pass.bar.floor, levelShare, 1));
        cover!.burst(pass.bar.center, 0.4);
        if (!cover!.isLive() || pass.at - lastPop < POP_GAP_MS) return;
        lastPop = pass.at;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(heart);
        if (cover!.isLive()) playExplosion();
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
          passing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE * WISP,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
