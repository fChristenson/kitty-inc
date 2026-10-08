// the "Willow" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a firework shell wisp whooshes up from the
// bottom of the screen and bursts high over an income bar in a big blast
// and shake, raining a willow of drooping bomb stars that blow along the bar
// in a cluster of blasts, each with its own bang and jolt, jumping it a
// crit tier; every burst sends the next shell up over the next bar, quicker
// each time, and the last bursts in one colossal blast with the hardest
// shake of all. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "willow";
const MAX_BARS = 4;
const STARS = 5;
const HIGH = 170;
const SHELL = 0.45;
const STAR = 0.3;
const FUSE = 40;
const BURST = 300;
const STAR_BLAST = 170;
const COLOSSAL = 680;
const BANG_GAP_MS = 50;
const BLAST_SHAKE: [number, number] = [0.6, 1.2];
const FINAL_SHAKE = 2.4;

interface Shell {
  bar: RewardBar;
  from: Point;
  burst: Point;
  launches: number;
  bursts: number;
  at: (ms: number) => Point;
  stars: { lands: number; to: Point; at: (ms: number) => Point }[];
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

export const forceWillowEvent = registerWispEvent(
  KEY,
  "Willow",
  () => CONFIG.willowEvent.chance,
  (floor, context, area) => {
    const { riseMs, droopMs, holdMs, mergeMs } = CONFIG.willowEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    let clock = 0;
    const shells: Shell[] = bars.map((bar, k) => {
      const launches = clock;
      const rise = lerp(riseMs, k / Math.max(1, bars.length - 1));
      const bursts = launches + rise;
      clock = bursts;
      const from: Point = { x: bar.center.x, y: area.bottom + 20 };
      const burst: Point = {
        x: bar.center.x,
        y: Math.max(area.top + 60, bar.box.y - HIGH),
      };
      const spot: Point = { x: 0, y: 0 };
      return {
        bar,
        from,
        burst,
        launches,
        bursts,
        at: (ms) => {
          const u = easeOut(Math.min(1, Math.max(0, (ms - launches) / rise)));
          spot.x = from.x + Math.sin(u * Math.PI * 2) * 12 * (1 - u);
          spot.y = lerp([from.y, burst.y], u);
          return spot;
        },
        // drooping out and down onto the bar like a willow's branches
        stars: Array.from({ length: STARS }, (_, i) => {
          const to: Point = {
            x: bar.box.x + (bar.box.width * (i + 0.5)) / STARS,
            y: bar.center.y,
          };
          const lands = bursts + droopMs * (0.8 + 0.4 * Math.random());
          const star: Point = { x: 0, y: 0 };
          return {
            lands,
            to,
            at: (ms: number): Point => {
              const u = Math.min(
                1,
                Math.max(0, (ms - bursts) / (lands - bursts)),
              );
              star.x = lerp([burst.x, to.x], easeOut(u));
              star.y =
                lerp([burst.y, to.y], easeIn(u)) - Math.sin(Math.PI * u) * 50;
              return star;
            },
          };
        }),
      };
    });
    const last = shells[shells.length - 1];
    const blasts: Blast[] = shells.flatMap((s) => [
      { at: s.burst, ms: s.bursts, size: s === last ? COLOSSAL : BURST },
      ...s.stars.map((st) => ({ at: st.to, ms: st.lands, size: STAR_BLAST })),
    ]);
    const endAt = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;
    const firstStars = shells.map((s) => ({
      s,
      ms: Math.min(...s.stars.map((st) => st.lands)),
    }));
    const finaleAt = firstStars[firstStars.length - 1].ms;

    const launching = createBeats(
      shells,
      (s) => s.launches,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    let bang = -Infinity;
    const banging = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.size === COLOSSAL) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          return;
        }
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(
          lerp(BLAST_SHAKE, Math.min(1, b.ms / finaleAt)) * (b.size / BURST),
        );
      },
    );
    const tiering = createBeats(
      firstStars,
      (f) => f.ms,
      (f) => {
        cover!.tierUp(f.s.bar, f.s.bar.center);
        if (f.s !== last) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(f.s.bar.center);
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
          banging.tick(ms, now);
          tiering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const s of shells) {
            if (ms >= s.launches && ms < s.bursts) {
              drawLitFuse(
                ctx,
                s.at(ms),
                (ms - s.launches) / (s.bursts - s.launches),
                FUSE,
                now,
              );
              drawWispBetween(
                ctx,
                s.at,
                ms,
                now,
                WISP_SIZE * SHELL,
                1,
                s.launches,
                s.bursts,
              );
            }
            for (const st of s.stars)
              drawWispBetween(
                ctx,
                st.at,
                ms,
                now,
                WISP_SIZE * STAR,
                1,
                s.bursts,
                st.lands,
              );
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
