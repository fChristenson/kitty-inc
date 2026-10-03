// the "Gold Leaf" event (experiment: the frozen screen turns to gold; free
// upgrade levels): it covers its crit, whose click freezes the screen while
// a wisp darts out of the clicked floor's button and touches each income
// bar; everything it touches turns to gold, a gilded circle spreading out
// over the frozen screen from the touch as the bar flashes with a bang, a
// jolt and free levels; the circles grow and merge until the whole screen
// is gold, then it flashes back in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, easeOutCubic, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "goldLeaf";
const MAX_BARS = 5;
const GROW_MS = 900;
const RIM = 8;
const RIM_ALPHA = 0.7;
const WISP = 0.5;
const TOUCH_SHAKE: [number, number] = [0.6, 1.3];

interface Touch {
  bar: RewardBar;
  at: Point;
  leaves: number;
  lands: number;
  from: Point;
}

export const forceGoldLeafEvent = registerWispEvent(
  KEY,
  "Gold Leaf",
  () => CONFIG.goldLeafEvent.chance,
  (floor, context, area) => {
    const { dartsMs, levelShare, holdMs, mergeMs } = CONFIG.goldLeafEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const wide = Math.hypot(area.right - area.left, area.bottom - area.top);
    let clock = 0;
    let from: Point = button;
    const touches: Touch[] = bars.map((bar, k) => {
      const leaves = clock;
      clock += lerp(dartsMs, k / Math.max(1, bars.length - 1));
      const touch = { bar, at: bar.center, leaves, lands: clock, from };
      from = bar.center;
      return touch;
    });
    const lastTouch = touches[touches.length - 1].lands;
    // every circle has grown past the screen's corners by then
    const goldAt = lastTouch + GROW_MS;
    const endAt = goldAt + 120;
    const wispAt: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point => {
      const t = Math.max(0, ms);
      let s = touches[0];
      for (const touch of touches) if (t >= touch.leaves) s = touch;
      const e = easeOut(clamp01((t - s.leaves) / (s.lands - s.leaves)));
      wispAt.x = lerp([s.from.x, s.at.x], e);
      wispAt.y = lerp([s.from.y, s.at.y], e);
      return wispAt;
    };

    const touching = createBeats(
      touches,
      (s) => s.lands,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TOUCH_SHAKE, k / Math.max(1, touches.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(touches[touches.length - 1].at);
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
          touching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) return;
          ctx.save();
          // gold's hue over the frozen screen, keeping its light and shade
          ctx.globalCompositeOperation = "color";
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.beginPath();
          for (const s of touches) {
            if (ms < s.lands) continue;
            const r = wide * easeOutCubic(clamp01((ms - s.lands) / GROW_MS));
            ctx.moveTo(s.at.x + r, s.at.y);
            ctx.arc(s.at.x, s.at.y, r, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = COLOR.heavenlyGold;
          ctx.lineWidth = RIM;
          for (const s of touches) {
            const u = (ms - s.lands) / GROW_MS;
            if (u <= 0 || u >= 1) continue;
            ctx.globalAlpha = RIM_ALPHA * (1 - u);
            ctx.beginPath();
            ctx.arc(s.at.x, s.at.y, wide * easeOutCubic(u), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, wisp, ms, now, WISP_SIZE * WISP, 0.7, 0, lastTouch),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
