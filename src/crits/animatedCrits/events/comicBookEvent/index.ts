// the "Comic Book" event (experiment: comic-book sound effects; free levels,
// worker perma tiers and a crit tier): it covers its crit, whose click
// freezes the screen while the rewards land like punches in a comic: one
// after another, ever faster, an income bar or a worker takes a hit and a
// starburst slams in by it with a big "POW!", "BAM!" or "ZAP!", each a
// flash, a bang and a jolt landing free levels on the bar or a perma tier on
// the worker; then a giant "KA-BOOM!" slams onto the clicked floor's bar in
// a huge blast and shake and it jumps one crit tier. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";
import {
  createGlowSprite,
  drawGlowSprite,
  type GlowSprite,
} from "../../../../shared/glowShape";
import {
  findRewardBars,
  findRewardWorkers,
  levelsFor,
  type RewardBar,
  type RewardWorker,
} from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";
import type { Point } from "../../../../shared/wisp";

const KEY = "comicBook";
const MAX_BARS = 3;
const MAX_WORKERS = 4;
const MIN_HITS = 6;
const WORDS = ["POW!", "BAM!", "ZAP!", "WHAM!", "KRAK!", "THWACK!", "BONK!"];
const COLORS = [COLOR.red, COLOR.blue, COLOR.purple, COLOR.orange];
const FINAL = "KA-BOOM!";
// a starburst's points, outer and inner radius
const POINTS = 12;
const OUTER = 130;
const INNER = 82;
// each word slams in from SLAM times its size over SLAM_MS, holds, then
// fades over FADE_MS from SHOW_MS on
const SLAM = 2.4;
const SLAM_MS = 140;
const SHOW_MS = 480;
const FADE_MS = 160;
const HIT_SHAKE: [number, number] = [1, 1.9];
const HIT_BURST: [number, number] = [0.6, 0.9];

type Hit = {
  at: Point;
  spot: Point;
  tilt: number;
  word: CritTextSprite;
  burst: GlowSprite;
  bar?: RewardBar;
  worker?: RewardWorker;
};

const starburst = (fill: string, edge: string, size: number): GlowSprite =>
  createGlowSprite(
    {
      left: -OUTER * size,
      top: -OUTER * size,
      width: OUTER * 2 * size,
      height: OUTER * 2 * size,
    },
    (ctx) => {
      for (let i = 0; i <= POINTS * 2; i++) {
        const r =
          (i % 2 === 0 ? OUTER : INNER) * size * (0.9 + 0.2 * Math.random());
        const a = (i / (POINTS * 2)) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    },
    { fill, edge, edgeWidth: 6, maxScale: SLAM },
  );

export const forceComicBookEvent = registerWispEvent(
  KEY,
  "Comic Book",
  () => CONFIG.comicBookEvent.chance,
  (floor, context, area) => {
    const { gapsMs, levelShare, holdMs, mergeMs } = CONFIG.comicBookEvent;
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const workers = findRewardWorkers(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_WORKERS);
    const own = bars.find((b) => b.floor === floor);
    const pool = [
      ...bars.map((bar) => ({ bar })),
      ...workers.map((worker) => ({ worker })),
    ].sort(() => Math.random() - 0.5);
    if (pool.length === 0) return;
    const bursts = [
      starburst(COLOR.sunshineGold, COLOR.red, 1),
      starburst(COLOR.white, COLOR.blue, 1),
    ];
    const big = starburst(COLOR.sunshineGold, COLOR.red, 1.8);
    const clampX = (x: number) =>
      Math.min(area.right - OUTER, Math.max(area.left + OUTER, x));
    const hit = (
      target: { bar?: RewardBar; worker?: RewardWorker },
      k: number,
    ): Hit => {
      const at = target.bar
        ? {
            x:
              target.bar.box.x +
              target.bar.box.width * lerp([0.2, 0.8], Math.random()),
            y: target.bar.center.y,
          }
        : {
            x: target.worker!.at.x,
            y: target.worker!.at.y - WORKER_HEIGHT * 0.4,
          };
      const side = Math.random() < 0.5 ? -1 : 1;
      return {
        ...target,
        at,
        spot: {
          x: clampX(at.x + side * 90),
          y: Math.max(area.top + OUTER, at.y - 120),
        },
        tilt: side * lerp([0.1, 0.3], Math.random()),
        word: createCritTextSprite(
          WORDS[k % WORDS.length],
          COLORS[k % COLORS.length],
          {
            fontSize: 76,
            strokeWidth: 12,
          },
        ),
        burst: bursts[k % bursts.length],
      };
    };
    const count = Math.max(MIN_HITS, pool.length);
    const hits = Array.from({ length: count }, (_, k) =>
      hit(pool[k % pool.length], k),
    );
    const finalHit: Hit = own
      ? {
          bar: own,
          at: own.center,
          spot: {
            x: clampX(own.center.x),
            y: Math.max(area.top + OUTER * 1.8, own.center.y - 60),
          },
          tilt: -0.15,
          word: createCritTextSprite(FINAL, COLOR.red, {
            fontSize: 120,
            strokeWidth: 16,
          }),
          burst: big,
        }
      : {
          ...hit(pool[0], 0),
          word: createCritTextSprite(FINAL, COLOR.red, {
            fontSize: 120,
            strokeWidth: 16,
          }),
          burst: big,
        };
    const times: number[] = [];
    let clock = 0;
    hits.forEach((_, k) => {
      times.push(clock);
      clock += lerp(gapsMs, k / (count - 1));
    });
    const finalAt = clock + 120;
    const all = [...hits, finalHit];
    const at = [...times, finalAt];
    const share = new Map<RewardBar, number>();
    for (const h of hits)
      if (h.bar) share.set(h.bar, (share.get(h.bar) ?? 0) + 1);

    const punching = createBeats(
      hits,
      (_, k) => times[k],
      (h, k) => {
        if (h.bar)
          cover!.levels(
            h.bar,
            Math.max(
              1,
              Math.ceil(levelsFor(h.bar.floor, levelShare) / share.get(h.bar)!),
            ),
            h.spot,
          );
        if (h.worker) cover!.promote(h.worker);
        const t = k / (count - 1);
        cover!.burst(h.at, lerp(HIT_BURST, t));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const finale = createBeats(
      [finalAt],
      (ms) => ms,
      () => {
        if (finalHit.bar) {
          cover!.levels(
            finalHit.bar,
            levelsFor(finalHit.bar.floor, levelShare, 2),
            finalHit.spot,
          );
          cover!.tierUp(finalHit.bar, finalHit.spot);
        }
        if (finalHit.worker) cover!.promote(finalHit.worker);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(finalHit.at);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finalAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        workers,
        tick: (ms, now) => {
          punching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          all.forEach((h, k) => {
            const since = ms - at[k];
            const last = k === all.length - 1;
            if (since < 0 || (!last && since >= SHOW_MS + FADE_MS)) return;
            const slam =
              1 + (SLAM - 1) * (1 - easeOutBack(clamp01(since / SLAM_MS)));
            const fade = last ? 1 : 1 - clamp01((since - SHOW_MS) / FADE_MS);
            ctx.save();
            ctx.globalAlpha = fade * clamp01(since / 40 + 0.4);
            ctx.translate(h.spot.x, h.spot.y);
            ctx.rotate(h.tilt);
            drawGlowSprite(ctx, h.burst, 0, 0, slam);
            drawCritTextSprite(ctx, h.word, 0, 0, slam);
            ctx.restore();
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    (context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0) ||
    findRewardWorkers(floor, context).length > 0,
);
