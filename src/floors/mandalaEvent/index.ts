// the "Mandala" event (money; cash): it covers its crit, whose click
// freezes the screen while a stream of cash pours out of the clicked
// floor's button into the middle of the screen and lays itself out in a
// great sand mandala, ring after ring of petals blooming outward, each
// ring a bloop and a jolt, ever faster, the whole pattern slowly turning;
// then it is swept away, swirling inward and pouring into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "mandala";
const REWARD = 4;
const RINGS = 6;
const PER_RING = 220;
const COIN = 0.45;
// rings step RING of the screen's smaller side out, each with PETALS
// petals PETAL of a step deep; the pattern turns TURN rad a second
const RING = 0.075;
const PETALS = [6, 8, 10, 12, 14, 16];
const PETAL = 0.7;
const TURN = 0.4;
const FEED_MS = 220;
const SWIRL = 2.5;
const SURGE_SPREAD = 260;
const RING_SHAKE: [number, number] = [0.4, 1.1];

export const forceMandalaEvent = registerWispEvent(
  KEY,
  "Mandala",
  () => CONFIG.mandalaEvent.chance,
  (floor, context, area) => {
    const { gapsMs, bloomMs, sweepMs, flightMs, holdMs, mergeMs } =
      CONFIG.mandalaEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const step =
      Math.min(area.right - area.left, area.bottom - area.top) * RING;
    let clock: number = FEED_MS;
    const rings = Array.from({ length: RINGS }, (_, k) => {
      const at = clock;
      clock += lerp(gapsMs, k / (RINGS - 1));
      return { at, radius: step * (k + 1) };
    });
    const sweepAt = rings[RINGS - 1].at + bloomMs + 120;
    const surgeAt = sweepAt + sweepMs;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;
    const turn = (ms: number) => (Math.min(ms, sweepAt) / 1000) * TURN;

    const paths: CoinPath[] = [];
    rings.forEach((ring, k) => {
      for (let i = 0; i < PER_RING; i++) {
        const angle = (i / PER_RING) * Math.PI * 2;
        const petal = Math.abs(Math.sin((PETALS[k] * angle) / 2));
        const r =
          ring.radius +
          step * PETAL * (petal - 0.5) +
          (Math.random() - 0.5) * 6;
        const leaves = surgeAt + Math.random() * SURGE_SPREAD;
        const swept: Point = { x: 0, y: 0 };
        const lift: Point = { x: 0, y: 0 };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          // fed out of the button into the middle, then blooming out
          const fed = ring.at - FEED_MS;
          if (ms < fed) return { x: button.x, y: button.y, scale: 0 };
          if (ms < ring.at) {
            const u = easeOut((ms - fed) / FEED_MS);
            return {
              x: lerp([button.x, center.x], u),
              y: lerp([button.y, center.y], u),
              scale: COIN,
            };
          }
          const bloom = easeOutBack(clamp01((ms - ring.at) / bloomMs));
          const a = angle + turn(ms);
          let reach = r * bloom;
          let spin = 0;
          if (ms > sweepAt) {
            const u = easeIn(clamp01((ms - sweepAt) / sweepMs));
            reach *= 1 - 0.85 * u;
            spin = SWIRL * u;
          }
          at.x = center.x + Math.cos(a + spin) * reach;
          at.y = center.y + Math.sin(a + spin) * reach;
          if (ms < leaves) return { x: at.x, y: at.y, scale: COIN };
          swept.x = at.x;
          swept.y = at.y;
          lift.x = swept.x;
          lift.y = swept.y - 60;
          const total = cover?.total() ?? fallback;
          bezier(
            swept,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    });

    const blooming = createBeats(
      rings,
      (r) => r.at,
      (_, k) => {
        cover!.burst(center, 0.3 + 0.05 * k);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(RING_SHAKE, k / (RINGS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          blooming.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
