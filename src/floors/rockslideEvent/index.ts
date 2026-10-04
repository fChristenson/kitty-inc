// the "Rockslide" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a rockslide of lit bombs
// tumbles off the top of the screen and comes bounding down the income
// bars like boulders down a cliff, every bounce on a bar a blast, a bang and
// a jolt that knocks free levels into it, the hops shrinking as they fall;
// they pile up at the bottom and the whole heap blows together under a
// colossal blast and the hardest shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { hops, type BouncePath } from "../../shared/bounce";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "rockslide";
const MAX_BARS = 4;
const BOMBS = 7;
const PILE = 70;
const PILE_SPREAD = 0.3;
const LIFT: [number, number] = [160, 60];
const BLAST = 120;
const PILE_BLAST = 210;
const COLOSSAL = 500;
const CORE_DELAY_MS = 140;
const BOMB = 0.4;
const FUSE = 12;
const BANG_GAP_MS = 60;
const HIT_SHAKE: [number, number] = [0.4, 1];
const PILE_SHAKE = 2;

interface Hit {
  at: Point;
  ms: number;
  bar: RewardBar | null;
  size: number;
}

export const forceRockslideEvent = registerWispEvent(
  KEY,
  "Rockslide",
  () => CONFIG.rockslideEvent.chance,
  (floor, context, area) => {
    const { tumblesMs, legsMs, levelShare, holdMs, mergeMs } =
      CONFIG.rockslideEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.center.y - b.center.y);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const mid = area.left + width / 2;
    const pileY = area.bottom - PILE;
    // they all tumble off at once at the bottom, each having bounced down every bar
    let landsAt = 0;
    const slides = Array.from({ length: BOMBS }, (_, i) => {
      const starts = i * lerp(tumblesMs, i / (BOMBS - 1));
      const points: Point[] = [
        { x: area.left + width * between([0.2, 0.8]), y: area.top - 120 },
        ...bars.map((bar) => ({
          x: bar.box.x + bar.box.width * between([0.15, 0.85]),
          y: bar.box.y,
        })),
        { x: mid + (Math.random() - 0.5) * width * PILE_SPREAD, y: pileY },
      ];
      const path: BouncePath = hops(points, legsMs, LIFT, starts);
      landsAt = Math.max(landsAt, path.endMs);
      return { path, starts };
    });
    const hits: Hit[] = slides.flatMap((s) =>
      s.path.bounces
        .slice(0, -1)
        .map((b, k) => ({ at: b.at, ms: b.ms, bar: bars[k], size: BLAST })),
    );
    // the heap waits for the last bomb, then goes up all together
    const pileAt = landsAt + 60;
    const piles: Hit[] = slides.map((s) => ({
      at: s.path.bounces[s.path.bounces.length - 1].at,
      ms: pileAt,
      bar: null,
      size: PILE_BLAST,
    }));
    const coreAt = pileAt + CORE_DELAY_MS;
    const core: Point = { x: mid, y: pileY };
    const blasts = [...hits, ...piles];
    let lastBang = -Infinity;

    const blasting = createBeats(
      blasts,
      (h) => h.ms,
      (h, i) => {
        if (h.bar)
          cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 1), h.at);
        if (!cover!.isLive()) return;
        if (!h.bar) {
          if (i === hits.length) {
            playExplosion();
            shakeScreen(PILE_SHAKE);
          }
          return;
        }
        shakeScreen(lerp(HIT_SHAKE, clamp01(h.ms / landsAt)));
        if (h.ms - lastBang >= BANG_GAP_MS) {
          lastBang = h.ms;
          playExplosion();
        }
      },
    );
    const finale = createBeats(
      [coreAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(core);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          blasting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const h of blasts)
            drawDetonation(ctx, h.at, ms - h.ms, h.size, now);
          drawDetonation(ctx, core, ms - coreAt, COLOSSAL, now);
          if (ms >= pileAt) return;
          for (const s of slides) {
            if (ms < s.starts) continue;
            drawLitFuse(ctx, s.path.at(ms), clamp01(ms / pileAt), FUSE, now);
            drawWispBetween(
              ctx,
              s.path.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              s.starts,
              pileAt,
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
