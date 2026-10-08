// the "Calligraphy" event (mix; cash): it covers its crit, whose click
// freezes the screen while a wisp swoops out of the clicked floor's button
// as a brush tip and paints great sweeping calligraphy strokes of cash
// across the screen, fat where it lingers and hairline where it flies,
// stroke after stroke, ever bolder, each ending in a flick, a splat and a
// jolt; then the brush dives into the total and every stroke of wet cash
// lifts off the screen after it in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { alongRoute, bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "calligraphy";
const REWARD = 4;
const STROKES = 3;
const PER_STROKE = 420;
const COIN = 0.5;
// a stroke is THICK px across where the brush lingers, THIN of that where
// it flies; each swoops through BENDS points
const THICK = 46;
const THIN = 0.15;
const BENDS = 5;
const GAP_MS = 140;
const DIVE_MS = 260;
const SURGE_SPREAD = 260;
const LIFT = 60;
const BRUSH = 0.6;
const FLICK_SHAKE: [number, number] = [0.6, 1.2];

export const forceCalligraphyEvent = registerWispEvent(
  KEY,
  "Calligraphy",
  () => CONFIG.calligraphyEvent.chance,
  (floor, context, area) => {
    const { strokesMs, flightMs, holdMs, mergeMs } = CONFIG.calligraphyEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    let clock = 0;
    const strokes = Array.from({ length: STROKES }, (_, k) => {
      const band = (k + 0.5) / STROKES;
      const ltr = k % 2 === 0;
      const route: Point[] = Array.from({ length: BENDS }, (_, i) => {
        const u = i / (BENDS - 1);
        return {
          x: area.left + width * (0.08 + 0.84 * (ltr ? u : 1 - u)),
          y:
            area.top +
            height * (band * 0.8 + 0.1) +
            Math.sin(u * Math.PI * 2 + k) * height * 0.09,
        };
      });
      const span = lerp(strokesMs, k / (STROKES - 1));
      const starts = clock + GAP_MS;
      clock = starts + span;
      return { route, starts, ends: clock, span };
    });
    const diveAt = clock + GAP_MS;
    const endAt = diveAt + DIVE_MS + SURGE_SPREAD + flightMs;
    const brushU = (stroke: (typeof strokes)[number], ms: number) =>
      smoothstep(clamp01((ms - stroke.starts) / stroke.span));

    const paths: CoinPath[] = [];
    for (const stroke of strokes) {
      for (let i = 0; i < PER_STROKE; i++) {
        const t = i / (PER_STROKE - 1);
        const s = smoothstep(t);
        const spot = alongRoute(stroke.route, s, { x: 0, y: 0 });
        const ahead = alongRoute(stroke.route, Math.min(1, s + 0.01), {
          x: 0,
          y: 0,
        });
        const behind = alongRoute(stroke.route, Math.max(0, s - 0.01), {
          x: 0,
          y: 0,
        });
        const dx = ahead.x - behind.x;
        const dy = ahead.y - behind.y;
        const length = Math.hypot(dx, dy) || 1;
        // the brush flies fastest mid-stroke: thinnest there
        const pace = 4 * t * (1 - t);
        const thick = THICK * lerp([1, THIN], pace);
        const off = (Math.random() - 0.5) * thick;
        spot.x += (-dy / length) * off;
        spot.y += (dx / length) * off;
        const laid = stroke.starts + stroke.span * t;
        const leaves = diveAt + DIVE_MS + Math.random() * SURGE_SPREAD;
        const lift: Point = { x: spot.x, y: spot.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < laid) return { x: spot.x, y: spot.y, scale: 0 };
          if (ms < leaves) {
            const grow = clamp01((ms - laid) / 80);
            return { x: spot.x, y: spot.y, scale: COIN * grow };
          }
          const total = cover?.total() ?? fallback;
          bezier(
            spot,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    }
    const brushAt: Point = { x: 0, y: 0 };
    const brush = (ms: number): Point | null => {
      if (ms < 0 || ms > diveAt + DIVE_MS) return null;
      if (ms < strokes[0].starts) {
        const u = smoothstep(ms / strokes[0].starts);
        brushAt.x = lerp([button.x, strokes[0].route[0].x], u);
        brushAt.y = lerp([button.y, strokes[0].route[0].y], u);
        return brushAt;
      }
      let k = 0;
      while (k < STROKES - 1 && ms >= strokes[k + 1].starts) k++;
      const s = strokes[k];
      if (ms <= s.ends) return alongRoute(s.route, brushU(s, ms), brushAt);
      const next = strokes[k + 1];
      const end = s.route[BENDS - 1];
      if (next) {
        const u = smoothstep((ms - s.ends) / (next.starts - s.ends));
        brushAt.x = lerp([end.x, next.route[0].x], u);
        brushAt.y =
          lerp([end.y, next.route[0].y], u) - Math.sin(Math.PI * u) * 40;
        return brushAt;
      }
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - diveAt) / DIVE_MS));
      brushAt.x = lerp([end.x, total.x], u);
      brushAt.y = lerp([end.y, total.y], u);
      return brushAt;
    };

    const flicking = createBeats(
      strokes,
      (s) => s.ends,
      (s, k) => {
        cover!.burst(s.route[BENDS - 1], 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        playSwoosh();
        shakeScreen(lerp(FLICK_SHAKE, k / (STROKES - 1)));
      },
    );
    const finale = createBeats(
      [diveAt + DIVE_MS, endAt],
      (ms) => ms,
      (_, k) => {
        const total = cover!.total() ?? fallback;
        if (k === 1) cover!.blast(total);
        else cover!.burst(total, 0.8);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flicking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            brush,
            ms,
            now,
            WISP_SIZE * BRUSH,
            0.8,
            0,
            diveAt + DIVE_MS,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
