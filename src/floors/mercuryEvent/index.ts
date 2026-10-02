// the "Mercury" event (money): it covers its crit, whose click freezes the
// screen while the clicked floor's button bursts into eight wobbling droplets
// of cash scattered across it like spilt mercury; they slide together and
// merge in pairs, eight to four to two, each merge a flash, a bloop and a
// jolt as the drops swell, into one great quivering blob, which then shoots
// up into the total-income readout in a huge blast and shake, and the coins
// sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOutCubic,
  lerp,
  smoothstep,
} from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "mercury";
const REWARD = 4;
// DROPS droplets (a power of two) of COINS_EACH, each DROP px across,
// swelling as they merge; spilt over the screen within these shares
const DROPS = 8;
const COINS_EACH = 150;
const DROP = 26;
const AREA_X: [number, number] = [0.12, 0.88];
const AREA_Y: [number, number] = [0.3, 0.82];
const WOBBLE = 3;
const COIN = 0.8;
const MERGE_BURST: [number, number] = [0.6, 1.2];
const MERGE_SHAKE: [number, number] = [1, 2];

export const forceMercuryEvent = registerWispEvent(
  KEY,
  "Mercury",
  () => CONFIG.mercuryEvent.chance,
  (floor, context, area) => {
    const { spillMs, mergeGapMs, slideMs, flightMs, holdMs, mergeMs } =
      CONFIG.mercuryEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    // where the drops sit at each level: 8, then each pair's midpoint...
    const levels: Point[][] = [
      Array.from({ length: DROPS }, () => ({
        x: area.left + width * between(AREA_X),
        y: area.top + height * between(AREA_Y),
      })),
    ];
    while (levels[levels.length - 1].length > 1) {
      const prev = levels[levels.length - 1];
      levels.push(
        Array.from({ length: prev.length / 2 }, (_, j) => ({
          x: (prev[2 * j].x + prev[2 * j + 1].x) / 2,
          y: (prev[2 * j].y + prev[2 * j + 1].y) / 2,
        })),
      );
    }
    // the level-to-level slides, the first after the spill
    const slides = levels
      .slice(1)
      .map((_, k) => spillMs + mergeGapMs + k * (slideMs + mergeGapMs));
    const launchAt = slides[slides.length - 1] + slideMs + mergeGapMs;
    const travelMs = launchAt + flightMs;
    const centre = (drop: number, ms: number, into: Point): Point => {
      let level = 0;
      while (level < slides.length && ms >= slides[level]) level++;
      const from =
        levels[Math.max(0, level - 1)][drop >> Math.max(0, level - 1)];
      const to = levels[level === 0 ? 0 : level][drop >> level];
      const u =
        level === 0
          ? 1
          : smoothstep(clamp01((ms - slides[level - 1]) / slideMs));
      into.x = from.x + (to.x - from.x) * u;
      into.y = from.y + (to.y - from.y) * u;
      return into;
    };
    const radius = (ms: number) => {
      let r = DROP;
      for (const at of slides) if (ms >= at) r *= Math.SQRT2;
      return r;
    };

    const paths: CoinPath[] = Array.from(
      { length: DROPS * COINS_EACH },
      (_, i) => {
        const drop = i % DROPS;
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random());
        const spill = Math.random() * spillMs * 0.6;
        const bob = Math.random() * Math.PI * 2;
        const leave = launchAt + Math.random() * flightMs * 0.3;
        return (f) => {
          const ms = f * travelMs;
          const c = centre(drop, Math.min(ms, leave), { x: 0, y: 0 });
          const r =
            radius(Math.min(ms, leave)) + Math.sin(ms / 90 + bob) * WOBBLE;
          const spot = {
            x: c.x + Math.cos(a) * d * r,
            y: c.y + Math.sin(a) * d * r * 0.8,
          };
          if (ms < spill) return { x: button.x, y: button.y, scale: 0 };
          if (ms < spill + spillMs * 0.4) {
            const u = easeOutCubic((ms - spill) / (spillMs * 0.4));
            return {
              x: button.x + (spot.x - button.x) * u,
              y: button.y + (spot.y - button.y) * u,
              scale: COIN,
            };
          }
          if (ms < leave) return { x: spot.x, y: spot.y, scale: COIN };
          const total = cover?.total() ?? fallback;
          const p = bezier(
            spot,
            { x: spot.x, y: total.y },
            total,
            easeIn(clamp01((ms - leave) / (travelMs - leave))),
            {
              x: 0,
              y: 0,
            },
          );
          return { x: p.x, y: p.y, scale: COIN };
        };
      },
    );

    const merges = createBeats(
      slides,
      (ms) => ms + slideMs,
      (_, k) => {
        const t = k / Math.max(1, slides.length - 1);
        for (const at of levels[k + 1]) cover!.burst(at, lerp(MERGE_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(MERGE_SHAKE, t));
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
          merges.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
