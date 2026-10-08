// the "Snow Globe" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a glittering globe of light pops up
// in the middle of the screen with a heap of cash in its bottom; a wisp
// grabs it and shakes it, again and again, harder each time, every shake a
// jolt that whirls the cash up into a swirling blizzard inside; on the last
// it shatters in a huge blast, the cash flying out, and flakes of light
// drift down onto every empty spot as new workers. Pays floor income × floor
// number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "snowGlobe";
const REWARD = 2;
const MAX_HIRES = 5;
const COINS = 420;
const COIN = 0.4;
const RADIUS = 0.28;
const RIM = 44;
const POP_MS = 220;
const SHAKES = 3;
// px the globe jerks sideways at each shake, and how much each whirls the cash
const JERK = 34;
const WHIRL: [number, number] = [1.2, 3.4];
const BURST_MS = 420;
const FLAKE = WISP_SIZE * 0.45;
const FLAKE_MS = 520;
const FLAKE_GAP_MS = 80;
const FORM_MS = 300;
const SHAKE: [number, number] = [0.5, 1.2];

export const forceSnowGlobeEvent = registerWispEvent(
  KEY,
  "Snow Globe",
  () => CONFIG.snowGlobeEvent.chance,
  (floor, context, area) => {
    const { shakeMs, holdMs, mergeMs } = CONFIG.snowGlobeEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    const width = area.right - area.left;
    const r = Math.min(width * RADIUS, (area.bottom - area.top) * 0.25);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.45,
    };
    const shakes = Array.from(
      { length: SHAKES },
      (_, k) => POP_MS + shakeMs * ((k + 0.5) / SHAKES) ** 0.8,
    );
    const shatters = POP_MS + shakeMs;
    // the globe jerking sideways with each shake
    const jerkAt = (ms: number) => {
      let x = 0;
      shakes.forEach((at, k) => {
        const t = (ms - at) / 160;
        if (t > 0 && t < 1)
          x += Math.sin(t * Math.PI * 3) * (1 - t) * JERK * (k % 2 ? -1 : 1);
      });
      return x;
    };
    // how much the cash has been whirled up by ms
    const whirlAt = (ms: number) => {
      let w = 0;
      shakes.forEach((at, k) => {
        if (ms > at)
          w +=
            lerp(WHIRL, k / (SHAKES - 1)) * easeOut(clamp01((ms - at) / 300));
      });
      return w;
    };
    const travel = shatters + BURST_MS;

    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      // heaped in the globe's bottom, then whirled round inside it
      const heap: Point = {
        x: centre.x + (Math.random() - 0.5) * r * 1.4,
        y: centre.y + r * (0.55 + Math.random() * 0.35),
      };
      const angle = Math.random() * Math.PI * 2;
      const orbit = r * (0.2 + 0.7 * Math.sqrt(Math.random()));
      const spin = (Math.random() < 0.5 ? 1 : 1.4) * Math.PI * 2;
      const flyAngle = Math.random() * Math.PI * 2;
      const fly = r * (1.4 + Math.random());
      const inside = (ms: number): Point => {
        const w = whirlAt(ms);
        const lift = clamp01(w);
        const a = angle + spin * w * 0.5 + ms * 0.002 * w;
        return {
          x: lerp([heap.x, centre.x + Math.cos(a) * orbit], lift) + jerkAt(ms),
          y: lerp([heap.y, centre.y + Math.sin(a) * orbit], lift),
        };
      };
      paths.push((f) => {
        const ms = f * travel;
        const grow = easeOut(clamp01(ms / POP_MS));
        if (ms < shatters) return { ...inside(ms), scale: COIN * grow };
        const p = inside(shatters);
        const u = easeOut(clamp01((ms - shatters) / BURST_MS));
        return {
          x: p.x + Math.cos(flyAngle) * fly * u,
          y: p.y + Math.sin(flyAngle) * fly * u,
          scale: COIN,
        };
      });
    }

    // a flake drifting onto each empty spot once it shatters
    const flakes = hires.map((hire, k) => {
      const starts = shatters + k * FLAKE_GAP_MS;
      const from: Point = { x: centre.x, y: centre.y };
      const bend: Point = { x: lerp([centre.x, hire.x], 0.5), y: centre.y - r };
      const p: Point = { x: 0, y: 0 };
      return {
        hire,
        lands: starts + FLAKE_MS,
        starts,
        at: (ms: number): Point | null =>
          ms < starts || ms > starts + FLAKE_MS
            ? null
            : bezier(from, bend, hire, clamp01((ms - starts) / FLAKE_MS), p),
      };
    });
    const endAt = Math.max(travel, ...flakes.map((f) => f.lands));
    const shaker: Point = { x: 0, y: centre.y - r - 30 };
    const shakerAt = (ms: number): Point | null => {
      if (ms < 0 || ms > shatters) return null;
      shaker.x = centre.x + jerkAt(ms);
      return shaker;
    };

    const shaking = createBeats(
      shakes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SHAKE, k / (SHAKES - 1)));
      },
    );
    const shattering = createBeats(
      [shatters],
      (ms) => ms,
      () => cover!.blast(centre, 0),
    );
    const landing = createBeats(
      flakes,
      (f) => f.lands,
      (f) => {
        giveHire(f.hire);
        cover!.burst(f.hire, 0.5);
        if (cover!.isLive()) playBloop();
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
          shaking.tick(ms, now);
          shattering.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          if (ms < shatters) {
            // the globe's glass, a ring of glitter
            const grow = easeOut(clamp01(ms / POP_MS));
            const x = centre.x + jerkAt(ms);
            for (let i = 0; i < RIM; i++) {
              const a = (i / RIM) * Math.PI * 2;
              drawGlitterLight(
                ctx,
                x + Math.cos(a) * r * grow,
                centre.y + Math.sin(a) * r * grow,
                9,
                i,
                0.85,
                now,
              );
            }
          }
          drawWispBetween(
            ctx,
            shakerAt,
            ms,
            now,
            WISP_SIZE * 0.6,
            0.7,
            0,
            shatters,
          );
          for (const f of flakes)
            drawWispBetween(ctx, f.at, ms, now, FLAKE, 0.6, f.starts, f.lands);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
