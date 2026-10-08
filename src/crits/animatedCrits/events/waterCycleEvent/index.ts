// the "Water Cycle" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a pool of cash spreads along the
// bottom of the screen and a blazing sun wisp rises over it; under its heat
// the cash evaporates, shimmering up in wavering streams into gold clouds
// gathering over every income bar; then the clouds burst one after another,
// quicker each time, each raining its cash down onto its bar in a downpour
// that jumps it a crit tier with a jolt, the last in a huge blast and shake.
// Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "waterCycle";
const REWARD = 2;
const MAX_BARS = 4;
const POOL = 480;
const COIN = 0.45;
const LOW = 50;
const DEEP = 46;
const SPREAD_MS = 250;
const SUN_MS = 300;
const ABOVE = 170;
const CLOUD_W = 110;
const CLOUD_H = 40;
const WAVER = 14;
const FALL_MS = 260;
const STAGGER_MS = 140;
const SUN = 1.0;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Cloud {
  bar: RewardBar;
  at: Point;
  rains: number;
  hits: number;
}

export const forceWaterCycleEvent = registerWispEvent(
  KEY,
  "Water Cycle",
  () => CONFIG.waterCycleEvent.chance,
  (floor, context, area) => {
    const { riseMs, rainsMs, holdMs, mergeMs } = CONFIG.waterCycleEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const poolY = area.bottom - LOW;
    const lifts = SPREAD_MS + SUN_MS * 0.6;
    const gathered = lifts + riseMs;
    let clock = gathered + 120;
    const clouds: Cloud[] = bars
      .slice()
      .sort((a, b) => a.box.y - b.box.y)
      .map((bar, k) => {
        const rains = clock;
        clock += lerp(rainsMs, k / Math.max(1, bars.length - 1));
        return {
          bar,
          at: {
            x: bar.center.x,
            y: Math.max(area.top + CLOUD_H, bar.box.y - ABOVE),
          },
          rains,
          hits: rains + FALL_MS + STAGGER_MS * 0.5,
        };
      });
    const last = clouds[clouds.length - 1];
    const travel = last.rains + STAGGER_MS + FALL_MS + 100;
    const paths: CoinPath[] = [];
    for (let i = 0; i < POOL; i++) {
      const x = area.left + Math.random() * width;
      const y = poolY - DEEP / 2 + Math.random() * DEEP;
      const cloud = clouds[i % clouds.length];
      const cx = cloud.at.x + (Math.random() - 0.5) * CLOUD_W * 2;
      const cy = cloud.at.y + (Math.random() - 0.5) * CLOUD_H * 2;
      const tx = cloud.bar.box.x + Math.random() * cloud.bar.box.width;
      const ty = cloud.bar.box.y - 4 - Math.random() * 16;
      const appears = Math.random() * SPREAD_MS;
      const rises = lifts + Math.random() * riseMs * 0.4;
      const gathers = rises + riseMs * 0.6;
      const falls = cloud.rains + Math.random() * STAGGER_MS;
      const phase = Math.random() * Math.PI * 2;
      paths.push((f) => {
        const ms = f * travel;
        if (ms < rises)
          return {
            x,
            y: y + Math.sin(x * 0.03 + ms * 0.008 + phase) * 4,
            scale: COIN * easeOut(clamp01((ms - appears) / 200)),
          };
        if (ms < gathers) {
          // shimmering up, wavering side to side
          const u = smoothstep((ms - rises) / (gathers - rises));
          return {
            x: lerp([x, cx], u) + Math.sin(u * 9 + phase) * WAVER * (1 - u),
            y: lerp([y, cy], u),
            scale: COIN,
          };
        }
        if (ms < falls)
          return {
            x: cx + Math.sin(ms * 0.004 + phase) * 6,
            y: cy + Math.cos(ms * 0.005 + phase) * 4,
            scale: COIN,
          };
        const u = easeIn(clamp01((ms - falls) / FALL_MS));
        return { x: lerp([cx, tx], u), y: lerp([cy, ty], u), scale: COIN };
      });
    }
    const sunTo: Point = {
      x: area.left + width * 0.5,
      y: area.top + 60,
    };
    const sunFrom: Point = { x: area.left - 60, y: poolY };
    const sun: Point = { x: 0, y: 0 };
    const sunAt = (ms: number): Point | null => {
      if (ms > gathered + 200) return null;
      const u = easeOut(clamp01((ms - SPREAD_MS) / SUN_MS));
      sun.x = lerp([sunFrom.x, sunTo.x], u);
      sun.y = lerp([sunFrom.y, sunTo.y], u) - Math.sin(Math.PI * u) * 80;
      return sun;
    };

    const rising = createBeats(
      [lifts],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const raining = createBeats(
      clouds,
      (c) => c.hits,
      (c, k) => {
        cover!.tierUp(c.bar, c.bar.center);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, clouds.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          rising.tick(ms, now);
          raining.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < SPREAD_MS || ms > gathered + 600) return;
          drawWisp(ctx, sunAt, ms, now, WISP_SIZE * SUN, 1);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
