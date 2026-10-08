// the "Fizz" event (money; free hires and cash): it covers its crit, whose
// click freezes the screen while cash starts fizzing up from the bottom of
// it like bubbles in a shaken soda, a few streams, then a roaring fizz,
// wobbling as they rise and frothing into a thick head of foam across the
// top; big wisp bubbles rise among them and pop on the empty spots of the
// floors in view, each a pop and a jolt as a new worker forms; then the
// foam overflows into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "fizz";
const REWARD = 2;
const MAX_HIRES = 5;
const FORM_MS = 300;
const COINS = 1_100;
const COIN = 0.42;
// coins rise at RISE px per ms, wobbling WOBBLE px, into a head of foam
// FOAM px deep under the top; spawns crowd toward the end with PACE
const RISE: [number, number] = [0.6, 1.2];
const WOBBLE = 8;
const FOAM: [number, number] = [30, 130];
const PACE = 0.55;
const BUBBLE = 0.5;
const SURGE_SPREAD = 260;
const POP_SHAKE: [number, number] = [0.5, 1.1];

export const forceFizzEvent = registerWispEvent(
  KEY,
  "Fizz",
  () => CONFIG.fizzEvent.chance,
  (floor, context, area) => {
    const { fizzMs, bubblesMs, flightMs, holdMs, mergeMs } = CONFIG.fizzEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const bottom = area.bottom + 10;
    const overflowAt = fizzMs + 200;
    const endAt = overflowAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const x0 = area.left + width * Math.random();
      const born = fizzMs * 0.85 * (i / COINS) ** PACE;
      const head: Point = { x: x0, y: area.top + lerp(FOAM, Math.random()) };
      // late ones rise faster, so every coin is in the foam by the overflow
      const speed = Math.max(
        lerp(RISE, Math.random()),
        (bottom - head.y) / Math.max(100, overflowAt - born - 50),
      );
      const rises = (bottom - head.y) / speed;
      const phase = Math.random() * 6;
      const leaves = overflowAt + Math.random() * SURGE_SPREAD;
      const lift: Point = { x: head.x, y: head.y - 50 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < born) return { x: x0, y: bottom, scale: 0 };
        const t = ms - born;
        if (ms < leaves) {
          // speeding up as it rises, settling into the foam
          const u = clamp01(t / rises);
          return {
            x: x0 + Math.sin(t / 90 + phase) * WOBBLE * (1 - u),
            y: lerp([bottom, head.y], u * u * (3 - 2 * u)),
            scale: COIN * (0.6 + 0.4 * u),
          };
        }
        const total = cover?.total() ?? fallback;
        bezier(
          head,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const bubbles = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const pops =
        fizzMs * 0.3 + bubblesMs * (k / Math.max(1, hires.length - 1));
      const rises = pops - 600;
      const at: Point = { x: spot.x, y: 0 };
      return {
        hire,
        spot,
        pops,
        rises,
        at: (ms: number): Point | null => {
          if (ms < rises || ms >= pops) return null;
          const u = (ms - rises) / (pops - rises);
          at.x = spot.x + Math.sin(ms / 80) * 6;
          at.y = lerp([bottom, spot.y], u);
          return at;
        },
      };
    });

    const popping = createBeats(
      bubbles,
      (b) => b.pops,
      (b, k) => {
        giveHire(b.hire);
        cover!.burst(b.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, bubbles.length - 1)));
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
          popping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const b of bubbles)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BUBBLE,
              0.4,
              b.rises,
              b.pops,
            );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
