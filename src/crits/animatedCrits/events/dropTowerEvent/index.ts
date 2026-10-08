// the "Drop Tower" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a rider wisp is shot straight up out
// of the clicked floor's button to the top of the screen, hangs there for a
// heartbeat, then drops: it plunges onto the first income bar and brakes
// hard on it with a slam, a bang and a jolt as the bar lands free levels,
// then drops again onto the next, each drop faster, the last slamming to a
// stop in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
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
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "dropTower";
const MAX_BARS = 4;
const TOP = 150;
const BRAKE = 16;
const RIDER = 0.55;
const HIT_SHAKE: [number, number] = [0.8, 1.4];

export const forceDropTowerEvent = registerWispEvent(
  KEY,
  "Drop Tower",
  () => CONFIG.dropTowerEvent.chance,
  (floor, context, area) => {
    const { launchMs, hangMs, dropsMs, brakeMs, holdMs, mergeMs } =
      CONFIG.dropTowerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const x = bars[0].center.x;
    const top: Point = { x, y: area.top + TOP };
    let clock: number = launchMs + hangMs;
    let fromY = top.y;
    const drops = bars.map((bar, k) => {
      const leaves = clock;
      const lands = leaves + lerp(dropsMs, k / Math.max(1, bars.length - 1));
      clock = lands + brakeMs;
      const drop = { bar, fromY, leaves, lands };
      fromY = bar.center.y;
      return drop;
    });
    const last = drops[drops.length - 1];
    const endAt = last.lands;
    const riderAt: Point = { x, y: 0 };
    const rider = (ms: number): Point => {
      if (ms < launchMs) {
        const u = easeOut(ms / launchMs);
        riderAt.x = lerp([button.x, x], u);
        riderAt.y = lerp([button.y, top.y], u);
        return riderAt;
      }
      riderAt.x = x;
      let d = drops[0];
      for (const drop of drops) if (ms >= drop.leaves) d = drop;
      if (ms < d.leaves) {
        riderAt.y = top.y + Math.sin(ms / 30) * 2;
        return riderAt;
      }
      if (ms < d.lands) {
        riderAt.y = lerp(
          [d.fromY, d.bar.center.y],
          easeIn(clamp01((ms - d.leaves) / (d.lands - d.leaves))),
        );
        return riderAt;
      }
      // braking: a hard bounce down past the bar and back
      const b = clamp01((ms - d.lands) / brakeMs);
      riderAt.y = d.bar.center.y + Math.sin(b * Math.PI) * BRAKE * (1 - b);
      return riderAt;
    };

    const launching = createBeats(
      [0, launchMs + hangMs],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const braking = createBeats(
      drops,
      (d) => d.lands,
      (d, k) => {
        cover!.levels(d.bar, levelsFor(d.bar.floor), top);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.bar.center);
          return;
        }
        cover!.burst(d.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, drops.length - 1)));
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
          launching.tick(ms, now);
          braking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              rider,
              ms,
              now,
              WISP_SIZE * RIDER,
              0.8,
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
