// the "Funnel" event (money; cash, free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while cash pours in from
// right across the top of the screen and narrows down as if through a giant
// funnel into one roaring spout onto the clicked floor's income bar, every
// gulp of it a thud, a flash and a jolt landing free levels as the screen
// rumbles and the cash heaps up on the bar; then the bar swallows the lot and
// jumps one crit tier in a huge blast and shake, and the cash sweeps into the
// total. Pays floor income × floor number × REWARD, plus the levels and tier
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";
import type { Point } from "../../shared/wisp";

const KEY = "funnel";
const REWARD = 2;
const COINS = 1_400;
const COIN = 0.7;
// the spout narrows to SPOUT px across, NECK px over the bar
const SPOUT = 40;
const NECK = 300;
// the heap on the bar, of its width and px high
const HEAP: [number, number] = [0.42, 70];
const SETTLE_MS = 120;
const GULPS = 6;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.2];
const GULP_SHAKE: [number, number] = [0.6, 1.4];

export const forceFunnelEvent = registerWispEvent(
  KEY,
  "Funnel",
  () => CONFIG.funnelEvent.chance,
  (floor, context, area) => {
    const { streamMs, fallMs, levelShare, holdMs, mergeMs } =
      CONFIG.funnelEvent;
    const bar = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!bar) return;
    const width = area.right - area.left;
    const neck: Point = { x: bar.center.x, y: bar.box.y - NECK };
    const endAt = streamMs + fallMs + SETTLE_MS;
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const leaves = (i / COINS) * streamMs;
      const start: Point = {
        x: area.left - 40 + (width + 80) * Math.random(),
        y: area.top - 30 - 120 * Math.random(),
      };
      const lane = Math.random() + Math.random() - 1;
      const spout: Point = { x: neck.x + (lane * SPOUT) / 2, y: neck.y };
      const bend: Point = {
        x: start.x * 0.35 + spout.x * 0.65,
        y: spout.y - 40,
      };
      const rest: Point = {
        x: bar.center.x + lane * bar.box.width * HEAP[0],
        y: bar.box.y - (1 - Math.abs(lane)) * HEAP[1] * Math.random(),
      };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: start.x, y: start.y, scale: 0 };
        const u = (ms - leaves) / fallMs;
        if (u < 0.75) {
          bezier(start, bend, spout, easeIn(u / 0.75), at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        if (u < 1) {
          const d = easeIn((u - 0.75) / 0.25);
          return {
            x: spout.x + (rest.x - spout.x) * d,
            y: spout.y + (bar.box.y - spout.y) * d,
            scale: COIN,
          };
        }
        const s = easeOut(clamp01((ms - leaves - fallMs) / SETTLE_MS));
        return {
          x: rest.x,
          y: bar.box.y + (rest.y - bar.box.y) * s,
          scale: COIN,
        };
      };
    });
    const gulps = Array.from(
      { length: GULPS },
      (_, k) => fallMs + ((streamMs - 60) * k) / (GULPS - 1),
    );
    const swallowAt = endAt;

    let lastRumble = -Infinity;
    const gulping = createBeats(
      gulps,
      (ms) => ms,
      (_, k) => {
        const t = k / (GULPS - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), neck);
        cover!.burst({ x: bar.center.x, y: bar.box.y }, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(GULP_SHAKE, t));
      },
    );
    const swallowing = createBeats(
      [swallowAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, neck);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: swallowAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars: [bar],
        tick: (ms, now) => {
          gulping.tick(ms, now);
          swallowing.tick(ms, now);
          if (
            ms < swallowAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / swallowAt)));
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
