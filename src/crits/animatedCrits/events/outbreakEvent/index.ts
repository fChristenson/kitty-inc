// the "Outbreak" event (tornado; free upgrade levels): it covers its crit,
// whose click freezes the screen while a small twister touches down on every
// bar in view, one after another down the screen, and tears along it from
// end to end, quicker as it goes, ripping its glitter off with a pop and
// levels; then they all veer off their bars and race down to one spot at the
// bottom of the screen, where a giant funnel swells out of them, every one
// that joins a jolt, its glitter swept up into it; it whips round flat out,
// the rumble rising, and flings everything back onto the bars, a blast and
// levels on each, collapsing in a huge blast on the clicked one. Then the
// crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import {
  drawTornado,
  flingFrom,
  liftAt,
  planTornado,
  type Tornado,
} from "../../../../shared/animationStyles/tornado";
import { clamp01, lerp, quicken, quickenAt } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { shakeScreen } from "../../../../shared/screenShake";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "outbreak";
// each twister runs its bar from INSET of its width in at one end to the
// other, off at START of its average speed; HEIGHT, FOOT and TOP of the
// screen's width tall and round
const INSET = 0.06;
const START = 0.45;
const HEIGHT = 0.17;
const FOOT = 0.012;
const TOP = 0.055;
const SWAY = 0.015;
const SPIN_HZ: [number, number] = [1, 3.5];
const FADE_MS = 150;
// the giant: at the screen's middle FOOT_UP of its height over its bottom,
// BIG_HEIGHT of its height tall, BIG_FOOT and BIG_TOP of its width round
const FOOT_UP = 0.05;
const BIG_HEIGHT = 0.85;
const BIG_FOOT = 0.03;
const BIG_TOP = 0.3;
const BIG_SWAY = 0.04;
const BIG_SPIN_HZ: [number, number] = [1.2, 4.5];
// the glitter: CATCH specks on each bar, SPECK px; swept into the giant up
// to SWEEP_MS after its twister joins it
const CATCH = 12;
const SPECK = 28;
const SWEEP_MS = 120;
const RUMBLE_MS: [number, number] = [170, 60];
const RUMBLE_SHAKE: [number, number] = [0.3, 1.2];
const CATCH_SHAKE = 0.7;
const JOIN_SHAKE = 0.8;
const LAND_SHAKE = 0.9;
const COLLAPSE_MS = 240;

interface Devil {
  bar: RewardBar;
  tornado: Tornado;
  touchMs: number;
  joinMs: number;
}
interface Speck {
  devil: Devil;
  home: Point;
  caughtMs: number;
  sweptMs: number;
  seed: number;
  landsMs: number;
}

export const forceOutbreakEvent = registerWispEvent(
  KEY,
  "Outbreak",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      touchGapMs,
      runMs,
      driftMs,
      whipMs,
      flingMs,
      flingGapMs,
      levelShare,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    const clicked =
      bars.find((b) => b.floor === floor) ?? bars[bars.length - 1];
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const meet: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - height * FOOT_UP,
    };

    // a twister per bar, top first, along it and then down to the meeting spot
    const specks: Speck[] = [];
    const devils: Devil[] = bars.map((bar, k) => {
      const touchMs = firstMs + k * touchGapMs;
      const runEnd = touchMs + runMs;
      const joinMs = runEnd + driftMs;
      const rightward = k % 2 === 0;
      const near = bar.box.x + bar.box.width * INSET;
      const far = bar.box.x + bar.box.width * (1 - INSET);
      const sx = rightward ? near : far;
      const ex = rightward ? far : near;
      const y = bar.box.y;
      const foot = (ms: number, into: Point): Point => {
        if (ms < runEnd) {
          into.x = lerp(
            [sx, ex],
            quicken(clamp01((ms - touchMs) / runMs), START),
          );
          into.y = y;
          return into;
        }
        const v = clamp01((ms - runEnd) / driftMs) ** 2;
        into.x = ex + (meet.x - ex) * v;
        into.y = y + (meet.y - y) * v;
        return into;
      };
      const devil: Devil = {
        bar,
        touchMs,
        joinMs,
        tornado: planTornado(foot, {
          startMs: touchMs,
          endMs: joinMs,
          height: width * HEIGHT,
          foot: width * FOOT,
          top: width * TOP,
          spinHz: SPIN_HZ,
          sway: width * SWAY,
          growMs: FADE_MS,
        }),
      };
      for (let i = 0; i < CATCH; i++) {
        const v = (i + 0.5) / CATCH;
        const seed = hash01(i + k * CATCH, 3410);
        specks.push({
          devil,
          home: {
            x: lerp([near, far], v),
            y:
              bar.center.y +
              (hash01(i + k * CATCH, 3411) - 0.5) * bar.box.height * 0.6,
          },
          caughtMs: touchMs + runMs * quickenAt(rightward ? v : 1 - v, START),
          sweptMs: joinMs + seed * SWEEP_MS,
          seed,
          landsMs: 0,
        });
      }
      return devil;
    });
    const firstJoin = devils[0].joinMs;
    const mergedMs = devils[devils.length - 1].joinMs;
    const flungMs = mergedMs + whipMs;
    const giant = planTornado(
      (_, into) => {
        into.x = meet.x;
        into.y = meet.y;
        return into;
      },
      {
        startMs: firstJoin - FADE_MS,
        endMs: flungMs,
        height: height * BIG_HEIGHT,
        foot: width * BIG_FOOT,
        top: width * BIG_TOP,
        spinHz: BIG_SPIN_HZ,
        sway: width * BIG_SWAY,
        growMs: mergedMs - firstJoin + FADE_MS * 2,
      },
    );
    // flung back top bar first, the clicked bar last
    const order = bars.filter((b) => b !== clicked);
    order.push(clicked);
    const lands = new Map<RewardBar, number>();
    order.forEach((bar, k) =>
      lands.set(bar, flungMs + flingMs + k * flingGapMs),
    );
    for (const s of specks) s.landsMs = lands.get(s.devil.bar)!;
    const endMs = lands.get(clicked)!;
    const rumbles: number[] = [];
    for (let ms = firstMs; ms < flungMs; ) {
      rumbles.push(ms);
      ms += lerp(RUMBLE_MS, clamp01((ms - firstMs) / (flungMs - firstMs)));
    }

    const at: Point = { x: 0, y: 0 };
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      (ms) => {
        if (!cover?.isLive()) return;
        shakeScreen(
          lerp(RUMBLE_SHAKE, clamp01((ms - firstMs) / (flungMs - firstMs))),
        );
      },
    );
    // each bar's levels as its twister first rips glitter off it
    const catching = createBeats(
      devils,
      (d) => d.touchMs + runMs * 0.1,
      (d) => {
        d.tornado.at(d.touchMs + runMs * 0.1, at);
        cover!.levels(d.bar, levelsFor(d.bar.floor, levelShare, 1), at);
        cover!.burst(at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CATCH_SHAKE);
      },
    );
    const joining = createBeats(
      devils,
      (d) => d.joinMs,
      () => {
        cover!.burst(meet, 0.8);
        if (cover!.isLive()) shakeScreen(JOIN_SHAKE);
      },
    );
    const landing = createBeats(
      order,
      (bar) => lands.get(bar)!,
      (bar) => {
        at.x = meet.x;
        at.y = meet.y - giant.height * 0.5;
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), at);
        if (bar === clicked) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.8);
        if (cover!.isLive()) shakeScreen(LAND_SHAKE);
      },
    );

    const spot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          catching.tick(ms, now);
          joining.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms < firstMs || ms > endMs + COLLAPSE_MS) return;
          for (const d of devils)
            if (ms < d.joinMs)
              drawTornado(
                ctx,
                d.tornado,
                ms,
                clamp01((d.joinMs - ms) / FADE_MS),
              );
          drawTornado(
            ctx,
            giant,
            Math.min(ms, flungMs),
            1 - clamp01((ms - flungMs) / COLLAPSE_MS),
          );
          // the glitter: lying on its bar, spun up its twister, swept into
          // the giant, or flung back
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < specks.length; i++) {
            const s = specks[i];
            if (ms >= s.landsMs) continue;
            if (ms < s.caughtMs) {
              spot.x = s.home.x;
              spot.y = s.home.y;
            } else if (ms < s.sweptMs) {
              liftAt(
                s.devil.tornado,
                Math.min(ms, s.devil.joinMs),
                s.caughtMs,
                s.seed,
                spot,
              );
            } else if (ms < flungMs) {
              liftAt(giant, ms, s.sweptMs, s.seed, spot);
            } else {
              flingFrom(
                giant,
                flungMs,
                s.sweptMs,
                s.seed,
                s.home,
                clamp01((ms - flungMs) / (s.landsMs - flungMs)),
                spot,
              );
            }
            stampGlimmer(
              ctx,
              spot.x,
              spot.y,
              SPECK,
              i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
