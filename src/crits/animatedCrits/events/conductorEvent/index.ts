// the "Conductor" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while a conductor wisp rises out of the clicked
// floor's button and starts to beat time with its baton wisp, one, two,
// three, each beat a crackle of sparks at the baton's tip; on every four a
// bolt of lightning cracks down onto an income bar in a blinding flash, a
// crack and a big jolt, and the bar jumps a crit tier; the tempo quickens
// bar by bar, the last downbeat a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars } from "../../eventRewards";

const KEY = "conductor";
const MAX_BARS = 3;
const RISE_MS = 250;
// the baton's four-beat pattern round the conductor: down, left, right, up
const PATTERN: Point[] = [
  { x: 0, y: 70 },
  { x: -80, y: 20 },
  { x: 80, y: 20 },
  { x: 0, y: -70 },
];
const BEATS = 4;
const BOLT_MS = 220;
const CONDUCTOR = 0.55;
const BATON = 0.3;
const BEAT_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.8, 1.5];

export const forceConductorEvent = registerWispEvent(
  KEY,
  "Conductor",
  () => CONFIG.conductorEvent.chance,
  (floor, context, area) => {
    const { barsMs, holdMs, mergeMs } = CONFIG.conductorEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const podium: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - 180,
    };
    let clock = RISE_MS;
    const beats: {
      at: number;
      spot: number;
      bar: (typeof bars)[number] | null;
    }[] = [];
    const measures = bars.map((bar, k) => {
      const span = lerp(barsMs, k / Math.max(1, bars.length - 1));
      for (let b = 0; b < BEATS; b++)
        beats.push({
          at: clock + (span * (b + 1)) / BEATS,
          spot: b,
          bar: b === BEATS - 1 ? bar : null,
        });
      clock += span;
      return {
        bar,
        downbeat: clock,
        bolt: createBolt({ x: bar.center.x, y: area.top }, bar.center, 2),
      };
    });
    const last = measures[measures.length - 1];
    const endAt = last.downbeat;
    const conductorAt: Point = { x: 0, y: 0 };
    const conductor = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / RISE_MS));
      conductorAt.x = lerp([button.x, podium.x], u);
      conductorAt.y = lerp([button.y, podium.y], u);
      return conductorAt;
    };
    const batonAt: Point = { x: 0, y: 0 };
    const baton = (ms: number): Point => {
      let prev = PATTERN[BEATS - 1];
      let next = PATTERN[0];
      let from = RISE_MS;
      let to = beats[0].at;
      for (let i = 0; i < beats.length; i++) {
        if (ms < beats[i].at) {
          to = beats[i].at;
          next = PATTERN[beats[i].spot];
          break;
        }
        from = beats[i].at;
        prev = PATTERN[beats[i].spot];
      }
      const u = smoothstep(clamp01((ms - from) / Math.max(1, to - from)));
      const c = conductor(ms);
      batonAt.x = c.x + lerp([prev.x, next.x], u);
      batonAt.y = c.y - 60 + lerp([prev.y, next.y], u);
      return batonAt;
    };
    const tip: Point = { x: 0, y: 0 };

    const beating = createBeats(
      beats,
      (b) => b.at,
      () => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(BEAT_SHAKE);
      },
    );
    const striking = createBeats(
      measures,
      (m) => m.downbeat,
      (m, k) => {
        cover!.tierUp(m.bar, podium);
        if (m === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(m.bar.center);
          return;
        }
        cover!.burst(m.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, measures.length - 1)));
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
          beating.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BOLT_MS) return;
          for (const m of measures) {
            const t = (ms - m.downbeat) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, m.bolt, 1 - t, 1.3);
            drawStrike(ctx, m.bar.center, 1 - t, 1.2, now);
          }
          if (ms > endAt) return;
          for (const b of beats) {
            const t = (ms - b.at) / 160;
            if (t < 0 || t >= 1) continue;
            const at = baton(b.at);
            tip.x = at.x;
            tip.y = at.y;
            drawStrike(ctx, tip, 1 - t, 0.5, now);
          }
          drawWispBetween(
            ctx,
            conductor,
            ms,
            now,
            WISP_SIZE * CONDUCTOR,
            0.6,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            baton,
            ms,
            now,
            WISP_SIZE * BATON,
            1,
            RISE_MS,
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
