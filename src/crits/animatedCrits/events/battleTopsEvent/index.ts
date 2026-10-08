// the "Battle Tops" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while two spinning top wisps, rims whirling with
// glitter, are launched into an arena over an income bar; they circle each
// other and smash together, bounce apart and smash again, harder each
// clash with a flash and a jolt, until one is knocked flying off the screen
// and the winner spins down onto the bar in a burst that jumps it a crit
// tier; a battle on every bar, the last ending in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "battleTops";
const MAX_BARS = 4;
const CLASHES = 3;
const ABOVE = 80;
const APART = 70;
const LAUNCH_MS = 220;
const KO_MS = 240;
const RIM = 22;
const RIM_ORBS = 5;
const ORB = 6;
const TOP = 0.4;
const CLASH_SHAKE = 0.4;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Battle {
  bar: RewardBar;
  arena: Point;
  starts: number;
  clashes: number[];
  ko: number;
  winner: number;
  spin: number;
}

export const forceBattleTopsEvent = registerWispEvent(
  KEY,
  "Battle Tops",
  () => CONFIG.battleTopsEvent.chance,
  (floor, context, area) => {
    const { staggerMs, clashesMs, holdMs, mergeMs } = CONFIG.battleTopsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const battles: Battle[] = bars.map((bar, k) => {
      const starts = k * staggerMs;
      let clock = starts + LAUNCH_MS;
      const clashes = Array.from({ length: CLASHES }, (_, j) => {
        clock += lerp(clashesMs, j / (CLASHES - 1));
        return clock;
      });
      return {
        bar,
        arena: { x: bar.center.x, y: bar.box.y - ABOVE },
        starts,
        clashes,
        ko: clock,
        winner: Math.random() < 0.5 ? 0 : 1,
        spin: Math.random() * Math.PI,
      };
    });
    const last = battles.reduce((a, b) => (b.ko > a.ko ? b : a));
    const endAt = last.ko + KO_MS;
    // how far apart the pair is: launched in from the sides, together at every clash
    const apartAt = (b: Battle, ms: number) => {
      const first = b.starts + LAUNCH_MS;
      if (ms < first)
        return (
          (area.right - area.left) *
            0.5 *
            (1 - easeOut(clamp01((ms - b.starts) / LAUNCH_MS))) +
          APART
        );
      let from = first;
      for (let j = 0; j < CLASHES; j++) {
        const at = b.clashes[j];
        if (ms < at) {
          const u = (ms - from) / (at - from);
          return j === 0
            ? APART * (1 - easeIn(u))
            : APART * Math.sin(Math.PI * u);
        }
        from = at;
      }
      return 0;
    };
    const tops = battles.flatMap((b) =>
      [0, 1].map((side) => {
        const spot: Point = { x: 0, y: 0 };
        return {
          battle: b,
          side,
          at: (ms: number): Point => {
            const t = Math.max(0, ms);
            // the pair circles round the arena as it fights
            const a = b.spin + t * 0.006 + (side ? Math.PI : 0);
            const d = apartAt(b, t) / 2;
            spot.x = b.arena.x + Math.cos(a) * d;
            spot.y = b.arena.y + Math.sin(a) * d * 0.5;
            if (t > b.ko) {
              const u = easeIn(clamp01((t - b.ko) / KO_MS));
              if (side === b.winner) spot.y = lerp([spot.y, b.bar.center.y], u);
              else {
                spot.x += (side ? 1 : -1) * u * 500;
                spot.y -= u * 200;
              }
            }
            return spot;
          },
        };
      }),
    );
    const clashes = battles.flatMap((b) => b.clashes.map((ms) => ({ b, ms })));

    const clashing = createBeats(
      clashes,
      (c) => c.ms,
      (c) => {
        cover!.burst(c.b.arena, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CLASH_SHAKE);
      },
    );
    const landing = createBeats(
      battles.slice().sort((a, b) => a.ko - b.ko),
      (b) => b.ko + KO_MS,
      (b, k) => {
        cover!.tierUp(b.bar, b.bar.center);
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          return;
        }
        cover!.burst(b.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, battles.length - 1)));
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
          clashing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          for (const top of tops) {
            const b = top.battle;
            const ends = b.ko + KO_MS;
            if (ms < b.starts || ms > ends) continue;
            drawWispBetween(
              ctx,
              top.at,
              ms,
              now,
              WISP_SIZE * TOP,
              0.8,
              b.starts,
              ends,
            );
            // the whirling rim, faster as the fight goes on
            const p = top.at(ms);
            const spin = (ms - b.starts) * 0.03 * (1 + (ms - b.starts) / 600);
            for (let i = 0; i < RIM_ORBS; i++) {
              const a =
                spin * (top.side ? -1 : 1) + (i / RIM_ORBS) * Math.PI * 2;
              drawGlitterLight(
                ctx,
                p.x + Math.cos(a) * RIM,
                p.y + Math.sin(a) * RIM * 0.4,
                ORB,
                i + top.side * 9,
                0.8,
                now,
              );
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
