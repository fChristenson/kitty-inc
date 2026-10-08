// the "Gerb" event (explosion; crit tiers): it covers its crit, whose click
// freezes the screen while a lit bomb wisp drops onto an income bar like a
// firework fountain planted on it; its fuse catches and it spurts bomblets
// up in a fan, each bursting overhead one after another in a rolling chain
// of blasts, every one a bang and a shake, the last three bursting together
// in a cluster; then the fountain itself blows in a big blast and the bar
// jumps a crit tier; the next one drops onto the next bar, quicker each
// time, the last blowing in a colossal blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "gerb";
const MAX_BARS = 4;
const SPURTS = 6;
// the last CLUSTER spurts burst together
const CLUSTER = 3;
const FAN = 1.1;
const HEIGHT: [number, number] = [220, 340];
const DROP = 260;
const BURST = 120;
const BASE_BLAST = 240;
const SPURT_MS = 260;
const BOMB = 0.5;
const BOMBLET = 0.3;
const FUSE = 24;
const BURST_SHAKE: [number, number] = [0.4, 0.9];
const BASE_SHAKE: [number, number] = [1.2, 1.8];

interface Fountain {
  bar: RewardBar;
  base: Point;
  drops: number;
  lands: number;
  blows: number;
  spurts: { fired: number; bursts: number; apex: Point }[];
}

export const forceGerbEvent = registerWispEvent(
  KEY,
  "Gerb",
  () => CONFIG.gerbEvent.chance,
  (floor, context) => {
    const { dropMs, spurtsMs, holdMs, mergeMs } = CONFIG.gerbEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const fountains: Fountain[] = bars.map((bar, k) => {
      const gap = lerp(spurtsMs, k / Math.max(1, bars.length - 1));
      const drops = clock;
      const lands = drops + dropMs;
      const spurts = Array.from({ length: SPURTS }, (_, i) => {
        const together = i >= SPURTS - CLUSTER;
        const fired = lands + (together ? SPURTS - CLUSTER : i) * gap;
        const a = -Math.PI / 2 + FAN * ((i + 0.5) / SPURTS - 0.5);
        const height = lerp(HEIGHT, Math.random());
        return {
          fired,
          bursts: fired + SPURT_MS,
          apex: {
            x: bar.center.x + Math.cos(a) * height,
            y: bar.center.y + Math.sin(a) * height,
          },
        };
      });
      const blows = spurts[SPURTS - 1].bursts + 80;
      // the next drops in as this one's first bomblet bursts
      clock = spurts[0].bursts;
      return { bar, base: bar.center, drops, lands, blows, spurts };
    });
    const last = fountains[fountains.length - 1];
    const endAt = last.blows;
    const blasts = fountains.flatMap((f) => [
      ...f.spurts.map((s) => ({ at: s.apex, ms: s.bursts, size: BURST })),
      { at: f.base, ms: f.blows, size: BASE_BLAST },
    ]);
    const bombAts = fountains.map((f) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < f.drops || ms >= f.blows) return null;
        at.x = f.base.x;
        at.y =
          f.base.y -
          DROP * (1 - easeIn(clamp01((ms - f.drops) / (f.lands - f.drops))));
        return at;
      };
    });
    const bombletAts = fountains.flatMap((f) =>
      f.spurts.map((s) => {
        const at: Point = { x: 0, y: 0 };
        return (ms: number): Point | null => {
          if (ms < s.fired || ms >= s.bursts) return null;
          const u = easeOut((ms - s.fired) / SPURT_MS);
          at.x = lerp([f.base.x, s.apex.x], u);
          at.y = lerp([f.base.y, s.apex.y], u);
          return at;
        };
      }),
    );
    const bursts = fountains.flatMap((f) =>
      f.spurts.slice(0, SPURTS - CLUSTER + 1).map((s, i) => ({
        ms: s.bursts,
        t: i / (SPURTS - CLUSTER),
      })),
    );

    const bursting = createBeats(
      bursts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BURST_SHAKE, b.t));
      },
    );
    const blowing = createBeats(
      fountains,
      (f) => f.blows,
      (f, k) => {
        cover!.tierUp(f.bar, { x: f.base.x, y: f.base.y - 200 });
        if (f === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(f.base);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BASE_SHAKE, k / Math.max(1, fountains.length - 1)));
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
          bursting.tick(ms, now);
          blowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (let i = 0; i < fountains.length; i++) {
            const f = fountains[i];
            const at = bombAts[i](ms);
            if (!at) continue;
            if (ms >= f.lands)
              drawLitFuse(
                ctx,
                at,
                clamp01((ms - f.lands) / (f.blows - f.lands)),
                FUSE,
                now,
              );
            drawWispHead(ctx, bombAts[i], ms, now, WISP_SIZE * BOMB);
          }
          for (const bomblet of bombletAts)
            drawWispHead(ctx, bomblet, ms, now, WISP_SIZE * BOMBLET);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
