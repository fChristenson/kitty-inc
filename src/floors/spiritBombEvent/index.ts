// the "Spirit Bomb" event (mix; a crit tier and cash): it covers its crit,
// whose click freezes the screen while a wisp rises over the clicked
// floor's income bar and rivers of cash stream up into it from every worker
// in view, the wisp swelling into a huge trembling orb that pulses ever
// faster with a thud and a jolt; then it's hurled down onto the bar, which
// jumps a crit tier in a huge blast and shake. Pays floor income × floor
// number × REWARD, plus the tier
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardBars, findRewardWorkers } from "../eventRewards";

const KEY = "spiritBomb";
const REWARD = 2;
const MAX_SOURCES = 6;
const RISE = 280;
const SOURCE_GAP_MS = 45;
// the orb's size over the gathering, as multiples of a wisp
const SWELL: [number, number] = [0.6, 3];
const TREMBLE = 7;
const PULSES = 6;
const PULSE_SHAKE: [number, number] = [0.25, 0.8];

export const forceSpiritBombEvent = registerWispEvent(
  KEY,
  "Spirit Bomb",
  () => CONFIG.spiritBombEvent.chance,
  (floor, context, area) => {
    const { gatherMs, throwMs, holdMs, mergeMs } = CONFIG.spiritBombEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const orb: Point = {
      x: bar.center.x,
      y: Math.max(area.top + 140, bar.box.y - RISE),
    };
    // every worker in view, or the screen's corners and sides without any
    const sources: Point[] = findRewardWorkers(floor, context, true)
      .map((w) => w.at)
      .slice(0, MAX_SOURCES);
    if (sources.length < 3)
      sources.push(
        { x: area.left, y: area.bottom },
        { x: area.right, y: area.bottom },
        { x: area.left, y: (area.top + area.bottom) / 2 },
        { x: area.right, y: (area.top + area.bottom) / 2 },
      );
    const starts = sources.map((_, k) => k * SOURCE_GAP_MS);
    const lines = sources.map((from, k) => {
      const dx = orb.x - from.x;
      const dy = orb.y - from.y;
      const bow = (k % 2 ? 0.3 : -0.3) * Math.hypot(dx, dy);
      const len = Math.hypot(dx, dy) || 1;
      const ctrl = {
        x: from.x + dx / 2 - (dy / len) * bow,
        y: from.y + dy / 2 + (dx / len) * bow,
      };
      return sampleLine((u) => bezier(from, ctrl, orb, u, { x: 0, y: 0 }), 40);
    });
    const pours: Pour[] = starts.map((start) => ({
      coinsAlong: 140,
      width: 12,
      streamMs: gatherMs - start,
      travelMs: 420,
    }));
    const hitAt = gatherMs + throwMs;
    const durationMs = Math.max(
      pourDurationMs(starts[starts.length - 1], pours[pours.length - 1]),
      hitAt + holdMs + mergeMs,
    );

    const spot: Point = { x: 0, y: 0 };
    const orbAt = (ms: number): Point | null => {
      if (ms < 0 || ms > hitAt) return null;
      if (ms < gatherMs) {
        const t = clamp01(ms / gatherMs);
        spot.x = orb.x + Math.sin(ms * 0.7) * TREMBLE * t;
        spot.y = orb.y + Math.cos(ms * 0.9) * TREMBLE * t;
        return spot;
      }
      const u = easeIn(clamp01((ms - gatherMs) / throwMs));
      spot.x = lerp([orb.x, bar.center.x], u);
      spot.y = lerp([orb.y, bar.center.y], u);
      return spot;
    };

    const pouring = createBeats(
      lines,
      (_, k) => starts[k],
      (line, k) => pourLine(cover!, line, pours[k]),
    );
    const pulsing = createBeats(
      Array.from(
        { length: PULSES },
        (_, k) => gatherMs * (1 - ((PULSES - k) / (PULSES + 1)) ** 1.4),
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PULSE_SHAKE, k / (PULSES - 1)));
      },
    );
    const hurling = createBeats(
      [gatherMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      [hitAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, bar.center);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars: [bar],
        tick: (ms, now) => {
          pouring.tick(ms, now);
          pulsing.tick(ms, now);
          hurling.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const swell = easeOut(clamp01(ms / gatherMs));
          drawWispBetween(
            ctx,
            orbAt,
            ms,
            now,
            WISP_SIZE * lerp(SWELL, swell),
            lerp([0.4, 1], swell),
            0,
            hitAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
