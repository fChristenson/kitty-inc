// the "Airburst" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while the clicked floor's button fires shell
// after shell up the screen, fuses fizzing; each stops dead high over an
// income bar and bursts in mid-air in a white blast and a bang, raining a
// curtain of sparks down onto the bar, which jumps a crit tier with a jolt
// as they land; ever faster, bar after bar; the last bursts in a huge blast
// and shake as every bar slams. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardBars } from "../../eventRewards";

const KEY = "airburst";
const MAX_BARS = 3;
const SPARKS = 7;
// a shell bursts HIGH px over its bar; sparks rain over RAIN_MS
const HIGH = 130;
const RAIN_MS = 280;
const SHELL = 0.45;
const SPARK = 0.22;
const FUSE = 22;
const BLAST = 200;
const RAIN_SHAKE: [number, number] = [0.9, 1.5];

export const forceAirburstEvent = registerWispEvent(
  KEY,
  "Airburst",
  () => CONFIG.airburstEvent.chance,
  (floor, context, area) => {
    const { gapsMs, climbMs, holdMs, mergeMs } = CONFIG.airburstEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const shells = bars.map((bar, k) => {
      const fired = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const burst: Point = {
        x: bar.center.x,
        y: Math.max(area.top + 30, bar.box.y - HIGH),
      };
      const bursts = fired + climbMs;
      const rains = bursts + RAIN_MS;
      const at: Point = { x: 0, y: 0 };
      const sparks = Array.from({ length: SPARKS }, (_, i) => {
        const to: Point = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / SPARKS),
          y: bar.center.y,
        };
        const p: Point = { x: 0, y: 0 };
        return (ms: number): Point | null => {
          if (ms < bursts || ms >= rains) return null;
          const u = (ms - bursts) / RAIN_MS;
          p.x = lerp([burst.x, to.x], easeOut(u));
          p.y = lerp([burst.y, to.y], easeIn(u));
          return p;
        };
      });
      return {
        bar,
        burst,
        fired,
        bursts,
        rains,
        sparks,
        at: (ms: number): Point | null => {
          if (ms < fired || ms >= bursts) return null;
          const u = easeOut((ms - fired) / climbMs);
          at.x = lerp([button.x, burst.x], u);
          at.y = lerp([button.y, burst.y], u);
          return at;
        },
      };
    });
    const last = shells[shells.length - 1];
    const endAt = last.rains;

    const firing = createBeats(
      shells,
      (s) => s.fired,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const bursting = createBeats(
      shells,
      (s) => s.bursts,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(0.6);
      },
    );
    const raining = createBeats(
      shells,
      (s) => s.rains,
      (s, k) => {
        cover!.tierUp(s.bar, s.burst);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        if (cover!.isLive())
          shakeScreen(lerp(RAIN_SHAKE, k / Math.max(1, shells.length - 1)));
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
          firing.tick(ms, now);
          bursting.tick(ms, now);
          raining.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const s of shells) {
            const p = s.at(ms);
            if (p)
              drawLitFuse(ctx, p, clamp01((ms - s.fired) / climbMs), FUSE, now);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.7,
              s.fired,
              s.bursts,
            );
            drawDetonation(ctx, s.burst, ms - s.bursts, BLAST, now);
            for (const spark of s.sparks)
              drawWispBetween(
                ctx,
                spark,
                ms,
                now,
                WISP_SIZE * SPARK,
                1,
                s.bursts,
                s.rains,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
