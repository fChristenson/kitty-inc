// the "Dominoes" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// deals out a long line of standing coins that zigzags along every income
// bar in view, end to end and down to the next, like a domino run; the
// first one tips and the topple races down the line, ever faster, every
// coin flipping over onto the next, and each bar it runs off jolts with a
// clack and free levels; at the end the whole fallen line surges up into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { alongRoute, bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "dominoes";
const REWARD = 3;
const MAX_BARS = 4;
const COINS = 700;
const COIN = 0.5;
// the line runs ABOVE px over each bar, INSET px in from its ends, each
// coin up to JITTER px off it; a toppled coin flips HOP px up and lands
// FORWARD of the line on
const ABOVE = 26;
const INSET = 20;
const JITTER = 6;
const HOP = 26;
const FLIP_MS = 160;
const FORWARD = 0.004;
const SURGE_SPREAD = 300;
const LIFT = 70;
const BAR_SHAKE: [number, number] = [0.6, 1.3];

export const forceDominoesEvent = registerWispEvent(
  KEY,
  "Dominoes",
  () => CONFIG.dominoesEvent.chance,
  (floor, context, area) => {
    const { layMs, runMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.dominoesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const route: Point[] = [];
    bars.forEach((bar, k) => {
      const y = bar.box.y - ABOVE;
      const left = { x: bar.box.x + INSET, y };
      const right = { x: bar.box.x + bar.box.width - INSET, y };
      route.push(...(k % 2 === 0 ? [left, right] : [right, left]));
    });
    // where along the line (0..1) the topple has got to at ms, ever faster
    const toppleAt = (s: number) => layMs + runMs * Math.sqrt(s);
    const runOff = bars.map((bar, k) => ({
      bar,
      at: toppleAt((2 * k + 1) / (route.length - 1)),
    }));
    const doneAt = layMs + runMs;
    const endAt = doneAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const s = i / (COINS - 1);
      const spot = alongRoute(route, s, { x: 0, y: 0 });
      spot.y += (Math.random() - 0.5) * 2 * JITTER;
      const fallen = alongRoute(route, Math.min(1, s + FORWARD), {
        x: 0,
        y: 0,
      });
      fallen.y = spot.y + 6;
      const dealt = s * layMs * 0.8;
      const tips = toppleAt(s);
      const leaves = doneAt + Math.random() * SURGE_SPREAD;
      const lift: Point = { x: fallen.x, y: fallen.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < dealt) return { x: button.x, y: button.y, scale: 0 };
        if (ms < dealt + layMs * 0.2) {
          const u = easeOut((ms - dealt) / (layMs * 0.2));
          return {
            x: lerp([button.x, spot.x], u),
            y: lerp([button.y, spot.y], u),
            scale: COIN,
          };
        }
        if (ms < tips) return { x: spot.x, y: spot.y, scale: COIN };
        if (ms < tips + FLIP_MS) {
          const u = (ms - tips) / FLIP_MS;
          return {
            x: lerp([spot.x, fallen.x], u),
            y: lerp([spot.y, fallen.y], u) - Math.sin(Math.PI * u) * HOP,
            scale: COIN * (1 + 0.3 * Math.sin(Math.PI * u)),
          };
        }
        if (ms < leaves) return { x: fallen.x, y: fallen.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        bezier(
          fallen,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const running = createBeats(
      runOff,
      (r) => r.at,
      (r, k) => {
        cover!.levels(
          r.bar,
          levelsFor(r.bar.floor, levelShare, 2),
          r.bar.center,
        );
        cover!.burst(route[2 * k + 1], 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BAR_SHAKE, k / Math.max(1, runOff.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          running.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
