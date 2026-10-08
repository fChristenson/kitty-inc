// the "Ticker Tape" event (money; cash): it covers its crit, whose click
// freezes the screen while bands of cash come racing across the screen like
// a stock ticker, one after another, each from the opposite side to the
// last and stacked down the screen, every band hitting the far edge with a
// splash and a jolt; ever faster, until every band swings round at once and
// they all pour together into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
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

const KEY = "tickerTape";
const REWARD = 4;
const BANDS = 4;
const EDGE = 50;
const TOP = 230;
const BOTTOM = 90;
const STEPS = 30;
const SWING_MS = 420;
const BAND_SHAKE: [number, number] = [0.5, 1.1];

export const forceTickerTapeEvent = registerWispEvent(
  KEY,
  "Ticker Tape",
  () => CONFIG.tickerTapeEvent.chance,
  (floor, context, area) => {
    const { bandsMs, crossMs, holdMs, mergeMs } = CONFIG.tickerTapeEvent;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - BOTTOM;
    const total = totalSpot(area);
    const band: Pour = {
      coinsAlong: 380,
      width: 30,
      streamMs: crossMs * 0.7,
      travelMs: crossMs,
    };
    const swing: Pour = {
      coinsAlong: 300,
      width: 26,
      streamMs: SWING_MS * 0.5,
      travelMs: SWING_MS,
    };
    const into: Point = { x: 0, y: 0 };
    let clock = 0;
    const bands = Array.from({ length: BANDS }, (_, k) => {
      const ltr = k % 2 === 0;
      const y = lerp([top, bottom], k / (BANDS - 1));
      const from = ltr ? left : right;
      const to = ltr ? right : left;
      const end: Point = { x: to, y };
      const line = sampleLine((u) => ({ x: lerp([from, to], u), y }), STEPS);
      const ctrl: Point = {
        x: to + (ltr ? -1 : 1) * 60,
        y: Math.min(y, total.y) - 80,
      };
      const home = sampleLine(
        (u) => ({ ...bezier(end, ctrl, total, u, into) }),
        STEPS,
      );
      const starts = clock;
      clock += lerp(bandsMs, k / (BANDS - 1));
      return { line, home, end, starts, arrives: starts + crossMs };
    });
    const swingsAt = bands[BANDS - 1].arrives;
    const endAt = swingsAt + SWING_MS;
    const durationMs = Math.max(
      pourDurationMs(swingsAt, swing),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      bands,
      (b) => b.starts,
      (b) => pourLine(cover!, b.line, band),
    );
    const arriving = createBeats(
      bands,
      (b) => b.arrives,
      (b, k) => {
        cover!.burst(b.end, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BAND_SHAKE, k / (BANDS - 1)));
      },
    );
    const swinging = createBeats(
      [swingsAt],
      (ms) => ms,
      () => {
        for (const b of bands) pourLine(cover!, b.home, swing);
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
          arriving.tick(ms, now);
          swinging.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
