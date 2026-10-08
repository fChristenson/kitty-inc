// the "Scrum" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while two packs of wisps charge in from either end of
// an income bar and lock together in the middle of it like a rugby scrum;
// they shove back and forth, heaving harder with every surge, each clash a
// flash and a jolt, until one pack drives straight through, sweeping the
// bar end to end in a flash that jumps it a crit tier; the scrums form on
// one bar after another, the last breaking in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "scrum";
const MAX_BARS = 4;
const PACK = 4;
const ROW = 22;
const GAP = 16;
const ABOVE = 24;
const CHARGE_MS = 220;
const SHOVES = 3;
const HEAVE = [30, 55, 85];
const DRIVE_MS = 220;
const PLAYER = 0.35;
const CLASH_SHAKE = 0.35;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Scrum {
  bar: RewardBar;
  starts: number;
  shoves: number[];
  breaks: number;
  dir: number;
}

export const forceScrumEvent = registerWispEvent(
  KEY,
  "Scrum",
  () => CONFIG.scrumEvent.chance,
  (floor, context) => {
    const { staggerMs, shovesMs, holdMs, mergeMs } = CONFIG.scrumEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const scrums: Scrum[] = bars.map((bar, k) => {
      const starts = k * staggerMs;
      let clock = starts + CHARGE_MS;
      const shoves = HEAVE.map((_, j) => {
        clock += lerp(shovesMs, j / (SHOVES - 1));
        return clock;
      });
      return {
        bar,
        starts,
        shoves,
        breaks: clock + DRIVE_MS,
        dir: Math.random() < 0.5 ? -1 : 1,
      };
    });
    const last = scrums.reduce((a, b) => (b.breaks > a.breaks ? b : a));
    const endAt = last.breaks;
    // where the two packs meet along the bar at ms
    const frontAt = (s: Scrum, ms: number) => {
      const { box } = s.bar;
      const mid = box.x + box.width / 2;
      let x = mid;
      let from = s.starts + CHARGE_MS;
      for (let j = 0; j < SHOVES; j++) {
        const at = s.shoves[j];
        if (ms < at) {
          const u = (ms - from) / (at - from);
          return (
            mid + Math.sin(u * Math.PI) * HEAVE[j] * (j % 2 ? -1 : 1) * s.dir
          );
        }
        from = at;
      }
      const drive = easeIn(clamp01((ms - from) / DRIVE_MS));
      x = lerp([mid, s.dir > 0 ? box.x + box.width : box.x], drive);
      return x;
    };
    const players = scrums.flatMap((s) =>
      [-1, 1].flatMap((side) =>
        Array.from({ length: PACK }, (_, i) => {
          const spot: Point = { x: 0, y: 0 };
          const row = i % 2;
          const rank = Math.floor(i / 2);
          return {
            scrum: s,
            at: (ms: number): Point => {
              const t = Math.max(0, ms);
              const { box } = s.bar;
              const charge = easeOut(clamp01((t - s.starts) / CHARGE_MS));
              const home = side < 0 ? box.x - 40 : box.x + box.width + 40;
              const front = frontAt(s, t);
              const packed = front + side * (GAP / 2 + rank * ROW);
              // the losing pack is scattered as the winners drive through
              const scatter =
                side === -s.dir
                  ? 0
                  : easeOut(clamp01((t - s.shoves[SHOVES - 1]) / DRIVE_MS)) *
                    60;
              spot.x = lerp([home, packed], charge) + side * scatter;
              spot.y =
                box.y -
                ABOVE +
                (row ? ROW * 0.6 : -ROW * 0.6) * 0.5 +
                Math.sin(t * 0.04 + i) * 3 -
                scatter * 0.8;
              return spot;
            },
          };
        }),
      ),
    );
    const clashes = scrums.flatMap((s) =>
      [s.starts + CHARGE_MS, ...s.shoves.slice(0, -1)].map((ms) => ({ s, ms })),
    );

    const clashing = createBeats(
      clashes,
      (c) => c.ms,
      (c) => {
        cover!.burst({ x: frontAt(c.s, c.ms), y: c.s.bar.box.y - ABOVE }, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CLASH_SHAKE);
      },
    );
    const breaking = createBeats(
      scrums.slice().sort((a, b) => a.breaks - b.breaks),
      (s) => s.breaks,
      (s, k) => {
        cover!.tierUp(s.bar, s.bar.center);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, scrums.length - 1)));
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
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          for (const p of players)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * PLAYER,
              0.8,
              p.scrum.starts,
              p.scrum.breaks + 150,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
