// the "Limbo" event (experiment: a limbo contest; free upgrade levels): it
// covers its crit, whose click freezes the screen while a limbo pole of
// light flashes up just over an income bar and a dancer wisp shimmies out
// of the clicked floor's button and slides under it, squeezing through the
// gap with a "HOW LOW?!" and a jolt as the bar lands free levels; on every
// bar down the pole sits lower and the dancer slides faster, the last
// squeeze landing in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";
import { levelsFor } from "../../../../gameState";

const KEY = "limbo";
const MAX_BARS = 4;
// the pole GAP px over the bar, lower each time; the run starts RUN px out
const GAP: [number, number] = [60, 22];
const RUN = 160;
const POLE_WIDTH = 10;
const SHOW_MS = 160;
const CALL_MS = 340;
const STYLE = { fontSize: 44, strokeWidth: 8 };
const DANCER = 0.42;
const SQUEEZE_SHAKE: [number, number] = [0.6, 1.3];

export const forceLimboEvent = registerWispEvent(
  KEY,
  "Limbo",
  () => CONFIG.limboEvent.chance,
  (floor, context) => {
    const { slidesMs, holdMs, mergeMs } = CONFIG.limboEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const howLow = createCritTextSprite("HOW LOW?!", COLOR.heavenlyGold, STYLE);
    const limbo = createCritTextSprite("LIMBO!", COLOR.heavenlyGold, {
      fontSize: 60,
      strokeWidth: 10,
    });
    let clock = 0;
    let from: Point = button;
    const slides = bars.map((bar, k) => {
      const u = k / Math.max(1, bars.length - 1);
      const gap = lerp(GAP, u);
      const poleY = bar.box.y - gap;
      const ltr = k % 2 === 0;
      const start: Point = {
        x: ltr ? bar.box.x - RUN : bar.box.x + bar.box.width + RUN,
        y: poleY - 40,
      };
      const end: Point = {
        x: ltr ? bar.box.x + bar.box.width + RUN : bar.box.x - RUN,
        y: poleY - 40,
      };
      const shows = clock;
      const starts = shows + SHOW_MS;
      const clears = starts + lerp(slidesMs, u);
      clock = clears;
      const slide = {
        bar,
        gap,
        poleL: { x: bar.box.x - 20, y: poleY } as Point,
        poleR: { x: bar.box.x + bar.box.width + 20, y: poleY } as Point,
        from,
        start,
        end,
        shows,
        starts,
        clears,
        under: (bar.box.y + poleY) / 2,
      };
      from = end;
      return slide;
    });
    const last = slides[slides.length - 1];
    const endAt = last.clears;
    const dancerAt: Point = { x: 0, y: 0 };
    const dancer = (ms: number): Point => {
      let s = slides[0];
      for (const slide of slides) if (ms >= slide.shows) s = slide;
      if (ms < s.starts) {
        const u = easeOut(clamp01((ms - s.shows) / SHOW_MS));
        dancerAt.x = lerp([s.from.x, s.start.x], u);
        dancerAt.y = lerp([s.from.y, s.start.y], u);
        return dancerAt;
      }
      const u = clamp01((ms - s.starts) / (s.clears - s.starts));
      // dipping down under the pole in the middle of the slide
      const dip = smoothstep(clamp01(1 - Math.abs(u - 0.5) * 2.5));
      dancerAt.x = lerp([s.start.x, s.end.x], u);
      dancerAt.y = lerp([s.start.y, s.under], dip) + Math.sin(ms / 50) * 3;
      return dancerAt;
    };

    const sliding = createBeats(
      slides,
      (s) => s.starts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const clearing = createBeats(
      slides,
      (s) => s.clears,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor), s.poleL);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.end, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SQUEEZE_SHAKE, k / Math.max(1, slides.length - 1)));
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
          sliding.tick(ms, now);
          clearing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const s of slides) {
            if (ms >= s.shows && ms < s.clears + 120)
              drawBeam(
                ctx,
                s.poleL,
                s.poleR,
                POLE_WIDTH,
                clamp01((ms - s.shows) / SHOW_MS) *
                  (1 - clamp01((ms - s.clears) / 120)),
              );
            const t = (ms - s.clears) / CALL_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              s === last ? limbo : howLow,
              s.bar.center.x,
              s.poleL.y - 60,
              1 + 0.4 * (1 - clamp01(t * 3)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              dancer,
              ms,
              now,
              WISP_SIZE * DANCER,
              0.8,
              0,
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
