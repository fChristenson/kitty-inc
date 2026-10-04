// the "Skewer" event (lightning; cash): it covers its crit, whose click
// freezes the screen while cash swarms out of the clicked floor's button
// into five swirling balls of coins strung across the screen; a bolt of
// lightning cracks clean through all of them at once with a blinding flash,
// a bang and a jolt, crackling as they quiver on it, then they blow one
// after another down the bolt, left to right, each spraying its coins wide
// in a flash, a bang and a jolt; the last in a huge blast and shake before
// the cash pours into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";

const KEY = "skewer";
const REWARD = 4;
const HEAPS = 5;
const HEAP_COINS = 110;
const BALL = 65;
const COIN = 0.5;
const FLY_MS = 320;
const BOB = 14;
const SWIRL = 0.004;
const QUIVER = 5;
const SCATTER: [number, number] = [110, 300];
const SCATTER_MS = 280;
const HEIGHT = 0.42;
const STAGGER = 50;
const FADE_MS = 200;
const STRIKE_SHAKE = 1.1;
const POP_SHAKE: [number, number] = [0.7, 1.4];

export const forceSkewerEvent = registerWispEvent(
  KEY,
  "Skewer",
  () => CONFIG.skewerEvent.chance,
  (floor, context, area) => {
    const { gatherGapMs, cookMs, popsMs, holdMs, mergeMs } = CONFIG.skewerEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const midY = area.top + (area.bottom - area.top) * HEIGHT;
    const strikesAt = (HEAPS - 1) * gatherGapMs + FLY_MS + 80;
    let clock = strikesAt + cookMs;
    const heaps = Array.from({ length: HEAPS }, (_, h) => {
      const pops = clock;
      clock += lerp(popsMs, h / (HEAPS - 1));
      const home: Point = {
        x: area.left + (width * (h + 1)) / (HEAPS + 1),
        y: midY + (h % 2 === 0 ? -STAGGER : STAGGER),
      };
      return {
        home,
        at: { ...home },
        gathers: h * gatherGapMs,
        pops,
        phase: h * 1.3,
      };
    });
    const last = heaps[HEAPS - 1];
    const endAt = last.pops;
    const travel = endAt + SCATTER_MS + 60;
    // where heap h's middle is at ms, bobbing, and quivering once skewered
    const heapAt = (h: (typeof heaps)[number], ms: number, out: Point) => {
      const quiver = ms > strikesAt ? QUIVER : 0;
      out.x = h.home.x + Math.sin(ms * 0.07 + h.phase) * quiver;
      out.y =
        h.home.y +
        Math.sin(ms * 0.006 + h.phase) * BOB +
        Math.cos(ms * 0.09 + h.phase) * quiver;
      return out;
    };
    // the bolt runs edge to edge through every heap, one jagged run per gap
    const left: Point = { x: area.left - 20, y: midY };
    const right: Point = { x: area.right + 20, y: midY };
    const stops = [left, ...heaps.map((h) => h.at), right];
    const bolts = stops
      .slice(1)
      .map((to, i) => createBolt(stops[i], to, i === 0 || i === HEAPS ? 0 : 1));

    const spot: Point = { x: 0, y: 0 };
    const paths: CoinPath[] = heaps.flatMap((h) =>
      Array.from({ length: HEAP_COINS }, () => {
        const r = Math.sqrt(Math.random()) * BALL;
        const a = Math.random() * Math.PI * 2;
        const turn = Math.random() < 0.5 ? -1 : 1;
        const fling = a + (Math.random() - 0.5) * 0.6;
        const reach = lerp(SCATTER, Math.random());
        return (f: number) => {
          const ms = f * travel;
          if (ms < h.gathers) return { x: button.x, y: button.y, scale: 0 };
          const t = Math.min(ms, h.pops);
          heapAt(h, t, spot);
          const spin = a + t * SWIRL * turn;
          const inX = spot.x + Math.cos(spin) * r;
          const inY = spot.y + Math.sin(spin) * r;
          if (ms < h.gathers + FLY_MS) {
            const u = easeOut((ms - h.gathers) / FLY_MS);
            return {
              x: lerp([button.x, inX], u),
              y: lerp([button.y, inY], u),
              scale: COIN * u,
            };
          }
          if (ms < h.pops) return { x: inX, y: inY, scale: COIN };
          const u = easeOut(clamp01((ms - h.pops) / SCATTER_MS));
          return {
            x: inX + Math.cos(fling) * reach * u,
            y: inY + Math.sin(fling) * reach * u,
            scale: COIN,
          };
        };
      }),
    );

    const striking = createBeats(
      [strikesAt],
      (ms) => ms,
      () => {
        for (const h of heaps) cover!.burst(heapAt(h, strikesAt, spot), 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(STRIKE_SHAKE);
      },
    );
    const popping = createBeats(
      heaps,
      (h) => h.pops,
      (h, k) => {
        const at = heapAt(h, h.pops, { x: 0, y: 0 });
        if (h === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / (HEAPS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          striking.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < strikesAt || ms > endAt + FADE_MS) return;
          for (const h of heaps) heapAt(h, ms, h.at);
          // blinding as it cracks, then crackling, fading once all have blown
          const since = ms - strikesAt;
          const fade = 1 - clamp01((ms - endAt) / FADE_MS);
          const flash = since < 120 ? 1.6 - since / 200 : 1;
          for (const bolt of bolts) drawBolt(ctx, bolt, fade, flash);
          for (const h of heaps)
            if (ms < h.pops) drawStrike(ctx, h.at, 0.8, 0.8 * flash, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
