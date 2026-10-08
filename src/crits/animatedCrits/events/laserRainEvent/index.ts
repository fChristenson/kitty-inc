// the "Laser Rain" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a storm of laser beams rains down out
// of the top of the screen, each a blazing streak stabbing down onto an
// income bar with a flare and a tick, the downpour thickening drop by drop,
// every bar jolting with free levels as its share lands; then the whole sky
// comes down at once, a curtain of beams onto every bar in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "laserRain";
const MAX_BARS = 4;
const DROPS = 28;
const CURTAIN = 5;
const TOP = 120;
const FALL_MS = 90;
const FADE_MS = 160;
const WIDTH = 14;
const FLARE = 26;
const BANG_GAP_MS = 60;

export const forceLaserRainEvent = registerWispEvent(
  KEY,
  "Laser Rain",
  () => CONFIG.laserRainEvent.chance,
  (floor, context, area) => {
    const { rainMs, levelShare, holdMs, mergeMs } = CONFIG.laserRainEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const top = area.top + TOP;
    // drops spaced ever closer, so the rain thickens
    const drops = Array.from({ length: DROPS }, (_, i) => {
      const bar = bars[i % bars.length];
      const x = bar.box.x + bar.box.width * (0.08 + 0.84 * Math.random());
      const falls = rainMs * Math.sqrt(i / DROPS);
      return {
        bar,
        sky: { x: x + (Math.random() - 0.5) * 60, y: top } as Point,
        hit: { x, y: bar.center.y } as Point,
        tip: { x: 0, y: 0 } as Point,
        falls,
        hits: falls + FALL_MS,
        last: false,
      };
    });
    const curtainAt = rainMs + FALL_MS;
    for (const bar of bars)
      for (let c = 0; c < CURTAIN; c++) {
        const x = bar.box.x + bar.box.width * ((c + 0.5) / CURTAIN);
        drops.push({
          bar,
          sky: { x, y: top },
          hit: { x, y: bar.center.y },
          tip: { x: 0, y: 0 },
          falls: curtainAt,
          hits: curtainAt + FALL_MS,
          last: true,
        });
      }
    const endAt = curtainAt + FALL_MS;
    let lastBang = -Infinity;

    const hitting = createBeats(
      drops.filter((d) => !d.last),
      (d) => d.hits,
      (d, k) => {
        cover!.levels(d.bar, levelsFor(d.bar.floor, levelShare, 1), d.sky);
        if (!cover!.isLive() || d.hits - lastBang < BANG_GAP_MS) return;
        lastBang = d.hits;
        playBloop();
        shakeScreen(lerp([0.3, 0.8], k / DROPS));
      },
    );
    const curtain = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) {
          cover!.levels(bar, levelsFor(bar.floor), bar.center);
          cover!.slam(bar);
        }
        cover!.blast(bars[0].center);
        if (cover!.isLive()) playExplosion();
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
          hitting.tick(ms, now);
          curtain.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FADE_MS) return;
          for (const d of drops) {
            if (ms < d.falls || ms > d.hits + FADE_MS) continue;
            const grow = clamp01((ms - d.falls) / FALL_MS);
            const fade = 1 - clamp01((ms - d.hits) / FADE_MS);
            d.tip.x = lerp([d.sky.x, d.hit.x], grow);
            d.tip.y = lerp([d.sky.y, d.hit.y], grow);
            drawBeam(
              ctx,
              d.sky,
              d.tip,
              (d.last ? WIDTH * 2 : WIDTH) * fade,
              fade,
            );
            if (ms >= d.hits)
              drawBeamFlare(ctx, d.hit, d.last ? FLARE * 2 : FLARE, fade, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
