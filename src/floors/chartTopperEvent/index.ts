// the "Chart Topper" event (money; cash): it covers its crit, whose click
// freezes the screen while fat stacks of coins shoot up out of the bottom of
// the screen one after another like a soaring bar chart, each taller than
// the last and ever quicker, every one topping out with a ka-ching, a flash
// and a jolt; then the first stack topples into the next like dominoes,
// knocking the whole chart over in a crashing cascade, and the coins fly up
// into the total, which goes off in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playCoinDrop, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "chartTopper";
const REWARD = 4;
// STACKS stacks of COLUMNS coins across, a coin every STEP px up, from
// HEIGHT[0] to HEIGHT[1] of the screen tall
const STACKS = 7;
const COLUMNS = 3;
const COLUMN_GAP = 9;
const STEP = 4.5;
const HEIGHT: [number, number] = [0.18, 0.7];
const COIN = 0.7;
// toppled this far over (radians)
const FALL = 1.35;
const TOP_SHAKE: [number, number] = [0.5, 1.4];

export const forceChartTopperEvent = registerWispEvent(
  KEY,
  "Chart Topper",
  () => CONFIG.chartTopperEvent.chance,
  (floor, context, area) => {
    const {
      stackGapsMs,
      growMs,
      toppleGapMs,
      toppleMs,
      flightMs,
      holdMs,
      mergeMs,
    } = CONFIG.chartTopperEvent;
    const width = area.right - area.left;
    const tall = area.bottom - area.top;
    const fallback = totalSpot(area);
    const base = area.bottom - 24;
    const stacks = Array.from({ length: STACKS }, (_, k) => {
      const t = k / (STACKS - 1);
      return {
        x: area.left + width * (0.1 + 0.8 * t),
        height: tall * lerp(HEIGHT, t) * (0.9 + 0.2 * Math.random()),
      };
    });
    const grows: number[] = [];
    let clock = 0;
    for (let k = 0; k < STACKS; k++) {
      grows.push(clock);
      clock += lerp(stackGapsMs, k / (STACKS - 1));
    }
    const toppleAt = grows[STACKS - 1] + growMs + 180;
    const topples = stacks.map((_, k) => toppleAt + k * toppleGapMs);
    const landed = topples.map((ms) => ms + toppleMs);
    const endAt = landed[STACKS - 1] + 120 + flightMs;

    const paths: CoinPath[] = [];
    stacks.forEach((stack, k) => {
      const rows = Math.round(stack.height / STEP);
      for (let row = 0; row < rows; row++)
        for (let c = 0; c < COLUMNS; c++) {
          const dx = (c - (COLUMNS - 1) / 2) * COLUMN_GAP;
          const up = row * STEP;
          // the stack's front reaches this coin when it's this far up
          const shows = grows[k] + growMs * (up / stack.height) ** 1.5;
          const flies = landed[k] + Math.random() * 120;
          const at: Point = { x: 0, y: 0 };
          const from: Point = { x: 0, y: 0 };
          const lift: Point = { x: 0, y: 0 };
          paths.push((f) => {
            const ms = f * endAt;
            if (ms < shows) return { x: stack.x, y: base, scale: 0 };
            // a little overshoot as each stack shoots up
            const grow = easeOutBack(clamp01((ms - grows[k]) / growMs));
            const turn = FALL * easeIn(clamp01((ms - topples[k]) / toppleMs));
            const sin = Math.sin(turn);
            const cos = Math.cos(turn);
            const s = up * Math.max(1, grow);
            from.x = stack.x + dx * cos + s * sin;
            from.y = base + dx * sin - s * cos;
            if (ms < flies) return { x: from.x, y: from.y, scale: COIN };
            const total = cover?.total() ?? fallback;
            lift.x = from.x;
            lift.y = total.y;
            bezier(
              from,
              lift,
              total,
              easeIn(clamp01((ms - flies) / flightMs)),
              at,
            );
            return { x: at.x, y: at.y, scale: COIN };
          });
        }
    });

    const topping = createBeats(
      stacks,
      (_, k) => grows[k] + growMs,
      (stack, k) => {
        const t = k / (STACKS - 1);
        cover!.burst({ x: stack.x, y: base - stack.height }, 0.4 + 0.4 * t);
        if (!cover!.isLive()) return;
        playCoinDrop();
        shakeScreen(lerp(TOP_SHAKE, t));
      },
    );
    const crashing = createBeats(
      stacks,
      (_, k) => landed[k],
      (stack, k) => {
        const tip = {
          x: stack.x + stack.height * Math.sin(FALL),
          y: base - stack.height * Math.cos(FALL),
        };
        cover!.burst(tip, 0.6 + 0.5 * (k / (STACKS - 1)));
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(1.2 + (0.8 * k) / (STACKS - 1));
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
        tick: (ms, now) => {
          topping.tick(ms, now);
          crashing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
