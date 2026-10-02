// the "Hoover" event: it covers its crit, whose click freezes the screen
// while the clicked floor's button gushes cash out in jet after jet, each
// splashing down into a sloshing puddle across the screen; a wisp swoops out
// after them like a vacuum, slurping each puddle up into itself in a swirling
// stream as it passes, swelling and burning hotter, each gulp a bloop and a
// jolt, then rockets the whole hoard into the total-income readout in a huge
// blast and shake, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { alongRoute, bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "hoover";
const REWARD = 4;
// the puddles, as shares of the screen across and down, in the order the
// vacuum takes them; each SPLASH of its width across (half as tall)
const PUDDLES: Point[] = [
  { x: 0.18, y: 0.7 },
  { x: 0.5, y: 0.76 },
  { x: 0.82, y: 0.68 },
  { x: 0.8, y: 0.44 },
  { x: 0.5, y: 0.5 },
  { x: 0.2, y: 0.42 },
];
const SPLASH = 0.09;
const COINS_EACH = 220;
// each jet arcs LOB of the screen's height over the straight line
const LOB = 0.2;
const COIN = 0.85;
// sucked up over SUCK_MS, starting up to SUCK_MS before the vacuum arrives,
// then riding inside it, swirling SWIRL px round it, shrinking to RIDE
const SUCK_MS = 170;
const SWIRL = 10;
const RIDE = 0.5;
// the vacuum, swelling over VACUUM of the screen's width
const VACUUM: [number, number] = [0.05, 0.12];
const POP_MS = 180;
// each gulp: a burst, a bloop and a jolt, growing
const GULP_BURST: [number, number] = [0.4, 0.9];
const GULP_SHAKE: [number, number] = [0.6, 1.8];

export const forceHooverEvent = registerWispEvent(
  KEY,
  "Hoover",
  () => CONFIG.hooverEvent.chance,
  (floor, context, area) => {
    const { gapMs, jetMs, flyMs, leadMs, vacuumMs, holdMs, mergeMs } =
      CONFIG.hooverEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const flip = Math.random() < 0.5;
    const puddles = PUDDLES.map((p) => ({
      x: area.left + width * (flip ? 1 - p.x : p.x),
      y: area.top + height * p.y,
    }));
    const route = [button, ...puddles, fallback];
    const gulps = puddles.map(
      (_, p) => leadMs + (vacuumMs * (p + 1)) / (route.length - 1),
    );
    const travelMs = leadMs + vacuumMs;
    const vacuum = (ms: number, into: Point): Point => {
      route[route.length - 1] = cover?.total() ?? fallback;
      return alongRoute(route, clamp01((ms - leadMs) / vacuumMs), into);
    };
    const wisp = { x: 0, y: 0 };
    const vacuumAt = (ms: number): Point | null =>
      ms < leadMs || ms >= travelMs ? null : vacuum(ms, wisp);

    const paths: CoinPath[] = [];
    puddles.forEach((puddle, p) => {
      for (let n = 0; n < COINS_EACH; n++) {
        const launch = p * gapMs + Math.random() * jetMs;
        const r = Math.sqrt(Math.random()) * width * SPLASH;
        const a = Math.random() * Math.PI * 2;
        const rest = {
          x: puddle.x + Math.cos(a) * r,
          y: puddle.y + Math.sin(a) * r * 0.5,
        };
        const bend = {
          x: (button.x + rest.x) / 2,
          y: Math.min(button.y, rest.y) - height * LOB,
        };
        const suck = Math.max(
          launch + flyMs,
          gulps[p] - SUCK_MS * Math.random(),
        );
        const bob = Math.random() * Math.PI * 2;
        const swirl = SWIRL * Math.sqrt(Math.random());
        paths.push((f) => {
          const ms = f * travelMs;
          if (ms < launch) return { x: button.x, y: button.y, scale: 0 };
          if (ms < launch + flyMs) {
            const q = bezier(button, bend, rest, (ms - launch) / flyMs, {
              x: 0,
              y: 0,
            });
            return { x: q.x, y: q.y, scale: COIN };
          }
          if (ms < suck)
            return {
              x: rest.x,
              y: rest.y + Math.sin(ms / 90 + bob) * 1.5,
              scale: COIN,
            };
          const v = vacuum(ms, { x: 0, y: 0 });
          const spin = ms / 60 + bob;
          v.x += Math.cos(spin) * swirl;
          v.y += Math.sin(spin) * swirl;
          if (ms >= travelMs) return { x: v.x, y: v.y, scale: RIDE };
          const u = easeIn(clamp01((ms - suck) / SUCK_MS));
          return {
            x: rest.x + (v.x - rest.x) * u,
            y: rest.y + (v.y - rest.y) * u,
            scale: COIN + (RIDE - COIN) * u,
          };
        });
      }
    });

    let swollen = 0;
    const gulping = createBeats(
      gulps,
      (ms) => ms,
      (_, k) => {
        swollen = (k + 1) / puddles.length;
        cover!.burst(puddles[k], lerp(GULP_BURST, swollen));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(GULP_SHAKE, swollen));
      },
    );
    const jets = createBeats(
      puddles,
      (_, p) => p * gapMs,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          jets.tick(ms, now);
          gulping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size =
            Math.max(WISP_SIZE, width * lerp(VACUUM, swollen)) *
            easeOutBack(clamp01((ms - leadMs) / POP_MS));
          drawWispBetween(
            ctx,
            vacuumAt,
            ms,
            now,
            size,
            0.3 + 0.7 * swollen,
            leadMs,
            travelMs,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
