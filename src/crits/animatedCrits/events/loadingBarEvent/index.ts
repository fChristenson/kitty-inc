// the "Loading Bar" event (experiment: a loading screen; cash): it covers
// its crit, whose click freezes the screen while a giant progress bar
// frames itself in light across the middle of it, the percentage counting
// over it; cash pours in and fills it from the left, stalling and then
// lurching ahead like every loading bar ever, each lurch a bloop and a
// jolt, the stalls ever shorter; at 100% COMPLETE! slams down and the
// whole bar of cash surges into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawCachedCritText } from "../../../critFlash/critText";
import { totalSpot } from "../../cashFlow";

const KEY = "loadingBar";
const REWARD = 4;
const COINS = 1_000;
const COIN = 0.45;
// the bar spans WIDTH of the screen, TALL px high; coins drop DROP px in
const WIDTH = 0.84;
const TALL = 90;
const DROP = 40;
const DROP_MS = 160;
const FRAME = 6;
// how far it gets by each lurch: a stall, then a jump
const STEPS = [0.12, 0.31, 0.38, 0.66, 0.84, 1];
const LURCH_MS = 80;
const FONT = 40;
const PERCENTS = Array.from({ length: 21 }, (_, i) => `${i * 5}%`);
const DONE_FONT = 58;
const SLAM_MS = 200;
const SURGE_SPREAD = 300;
const LIFT = 70;
const LURCH_SHAKE: [number, number] = [0.3, 0.9];

export const forceLoadingBarEvent = registerWispEvent(
  KEY,
  "Loading Bar",
  () => CONFIG.loadingBarEvent.chance,
  (floor, context, area) => {
    const { frameMs, stallsMs, flightMs, holdMs, mergeMs } =
      CONFIG.loadingBarEvent;
    const fallback = totalSpot(area);
    const width = (area.right - area.left) * WIDTH;
    const left = (area.left + area.right) / 2 - width / 2;
    const right = left + width;
    const cy = (area.top + area.bottom) / 2;
    const top = cy - TALL / 2;
    const bottom = cy + TALL / 2;
    let clock: number = frameMs;
    const lurches = STEPS.map((to, k) => {
      clock += lerp(stallsMs, k / (STEPS.length - 1));
      const from = k === 0 ? 0 : STEPS[k - 1];
      const at = clock;
      clock += LURCH_MS;
      return { from, to, at };
    });
    const doneAt = clock;
    const surgeAt = doneAt + SLAM_MS + 150;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;
    // the fill at ms, 0..1
    const fill = (ms: number) => {
      let p = 0;
      for (const l of lurches) {
        if (ms < l.at) break;
        p = lerp([l.from, l.to], easeOut(clamp01((ms - l.at) / LURCH_MS)));
      }
      return p;
    };
    // when the fill first reaches share s
    const reachedAt = (s: number) => {
      for (const l of lurches)
        if (s <= l.to)
          return l.at + LURCH_MS * clamp01((s - l.from) / (l.to - l.from || 1));
      return doneAt;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const s = Math.random();
      const spot: Point = {
        x: lerp([left + 8, right - 8], s),
        y: lerp([top + 8, bottom - 8], Math.random()),
      };
      const lands = reachedAt(s) + Math.random() * 60;
      const leaves = surgeAt + s * SURGE_SPREAD;
      const lift: Point = { x: spot.x, y: spot.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < lands - DROP_MS) return { x: spot.x, y: spot.y, scale: 0 };
        if (ms < lands) {
          const u = easeIn((ms - lands + DROP_MS) / DROP_MS);
          return { x: spot.x, y: spot.y - DROP * (1 - u), scale: COIN };
        }
        if (ms < leaves) return { x: spot.x, y: spot.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        bezier(
          spot,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const corners: Point[] = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
    const edge: Point = { x: 0, y: 0 };

    const lurching = createBeats(
      lurches,
      (l) => l.at,
      (_, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(LURCH_SHAKE, k / (lurches.length - 1)));
      },
    );
    const finale = createBeats(
      [doneAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        cover!.burst({ x: (left + right) / 2, y: cy }, 0.9);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.3);
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
          lurching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms) => {
          if (ms > surgeAt + 300) return;
          const fade = ms > surgeAt ? 1 - (ms - surgeAt) / 300 : 1;
          // the frame draws itself round, corner to corner
          const drawn = clamp01(ms / frameMs) * 4;
          for (let i = 0; i < 4; i++) {
            const u = clamp01(drawn - i);
            if (u <= 0) break;
            const a = corners[i];
            const b = corners[(i + 1) % 4];
            edge.x = lerp([a.x, b.x], u);
            edge.y = lerp([a.y, b.y], u);
            drawBeam(ctx, a, edge, FRAME, 0.8 * fade);
          }
          if (ms < frameMs) return;
          ctx.save();
          ctx.globalAlpha = fade;
          if (ms < doneAt) {
            const label = PERCENTS[Math.floor(fill(ms) * 20)];
            drawCachedCritText(
              ctx,
              label,
              (left + right) / 2,
              top - FONT,
              COLOR.heavenlyGold,
              {
                fontSize: FONT,
                strokeWidth: 6,
              },
            );
          } else {
            const u = easeOut(clamp01((ms - doneAt) / SLAM_MS));
            ctx.translate((left + right) / 2, top - DONE_FONT);
            ctx.scale(lerp([2.5, 1], u), lerp([2.5, 1], u));
            drawCachedCritText(ctx, "COMPLETE!", 0, 0, COLOR.heavenlyGold, {
              fontSize: DONE_FONT,
              strokeWidth: 8,
            });
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
