// the "Thunder Drum" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while lightning starts drumming on
// the income bars: bolt after bolt cracks down onto them to a beat, each
// strike a flash, a crack and a jolt landing free levels, the tempo
// climbing beat by beat into a frantic drum roll, until a final crash of
// bolts hits every bar at once in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "thunderDrum";
const MAX_BARS = 4;
const BEATS = 10;
const ROLL = 8;
const ROLL_MS = 45;
const TOP = 120;
const BOLT_MS = 120;
const BANG_GAP_MS = 60;
const BEAT_SHAKE: [number, number] = [0.5, 1];

export const forceThunderDrumEvent = registerWispEvent(
  KEY,
  "Thunder Drum",
  () => CONFIG.thunderDrumEvent.chance,
  (floor, context, area) => {
    const { beatsMs, levelShare, holdMs, mergeMs } = CONFIG.thunderDrumEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const sky = area.top + TOP;
    // a drummer's pattern across the bars, then a roll, then the crash
    const order = [0, 2, 1, 3, 0, 1, 2, 3];
    const strike = (
      bar: (typeof bars)[number],
      ms: number,
      kind: "beat" | "roll" | "crash",
    ) => {
      const x = bar.box.x + bar.box.width * (0.2 + 0.6 * Math.random());
      const hit: Point = { x, y: bar.center.y };
      return {
        bar,
        hit,
        ms,
        kind,
        bolt: createBolt(
          { x: x + (Math.random() - 0.5) * 120, y: sky },
          hit,
          kind === "crash" ? 3 : 1,
        ) as Bolt,
      };
    };
    const strikes: ReturnType<typeof strike>[] = [];
    let clock = 0;
    for (let i = 0; i < BEATS; i++) {
      strikes.push(
        strike(bars[order[i % order.length] % bars.length], clock, "beat"),
      );
      clock += lerp(beatsMs, i / (BEATS - 1));
    }
    for (let i = 0; i < ROLL; i++) {
      strikes.push(strike(bars[i % bars.length], clock, "roll"));
      clock += ROLL_MS;
    }
    const crashAt = clock + ROLL_MS * 2;
    for (const bar of bars) strikes.push(strike(bar, crashAt, "crash"));
    const endAt = crashAt;
    let lastBang = -Infinity;

    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k) => {
        if (s.kind === "crash") {
          cover!.levels(s.bar, levelsFor(s.bar.floor), s.hit);
          cover!.slam(s.bar);
          if (s === strikes[strikes.length - 1]) cover!.blast(bars[0].center);
          return;
        }
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), s.hit);
        cover!.burst(s.hit, 0.3);
        if (!cover!.isLive() || s.ms - lastBang < BANG_GAP_MS) return;
        lastBang = s.ms;
        playExplosion();
        shakeScreen(lerp(BEAT_SHAKE, k / (BEATS + ROLL)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BOLT_MS * 2) return;
          for (const s of strikes) {
            const span = s.kind === "crash" ? BOLT_MS * 2 : BOLT_MS;
            const t = (ms - s.ms) / span;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, s.kind === "crash" ? 1.6 : 1);
            drawStrike(ctx, s.hit, 1 - t, s.kind === "crash" ? 1.8 : 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
