// the "Calving" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a towering cliff of cash heaps
// up along the screen's right edge; one slab after another cracks off it
// with a shudder and topples over like a glacier face calving, swinging
// down flat onto its income bar in a crash of coins and a jolt of free
// levels, each quicker than the last, the last smashing down in a huge
// blast and shake. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "calving";
const REWARD = 2;
const MAX_BARS = 4;
const CLIFF_W = 170;
const EDGE = 16;
const COIN = 0.45;
// coins per px² of cliff, and at most this many per slab
const DENSITY = 0.0016;
const MAX_SLAB = 220;
const MIN_H = 140;
const CRACK_MS = 160;
const SPLASH_MS = 340;
const SPLASH_HOP: [number, number] = [30, 150];
const SPLASH_REACH = 90;
const CRACK_SHAKE = 0.35;
const HIT_SHAKE: [number, number] = [0.8, 1.5];

interface Slab {
  bar: RewardBar;
  pivot: Point;
  height: number;
  cracks: number;
  topples: number;
  lands: number;
}

export const forceCalvingEvent = registerWispEvent(
  KEY,
  "Calving",
  () => CONFIG.calvingEvent.chance,
  (floor, context, area) => {
    const { riseMs, topplesMs, levelShare, holdMs, mergeMs } =
      CONFIG.calvingEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.box.y - b.box.y);
    if (bars.length === 0) return;
    const left = area.right - EDGE - CLIFF_W;
    let clock: number = riseMs;
    let roof = area.top + 20;
    const slabs: Slab[] = bars.map((bar, k) => {
      const height = Math.max(
        MIN_H,
        Math.min(bar.box.y - roof, left - bar.box.x - 20),
      );
      roof = bar.box.y;
      const toppleMs = lerp(topplesMs, k / Math.max(1, bars.length - 1));
      const cracks = clock;
      const topples = cracks + CRACK_MS;
      const lands = topples + toppleMs;
      clock = topples + toppleMs * 0.6;
      return {
        bar,
        pivot: { x: left, y: bar.box.y },
        height,
        cracks,
        topples,
        lands,
      };
    });
    const last = slabs[slabs.length - 1];
    const travel = last.lands + SPLASH_MS;
    // the cliff heaps up from the bottom
    const heapsAt = (y: number) =>
      riseMs * 0.8 * clamp01((area.bottom - y) / (area.bottom - area.top));
    const paths: CoinPath[] = [];
    for (const s of slabs) {
      const count = Math.min(
        MAX_SLAB,
        Math.round(DENSITY * CLIFF_W * s.height),
      );
      const { pivot, bar } = s;
      for (let i = 0; i < count; i++) {
        // its spot in the slab, from the pivot at the slab's foot
        const dx = Math.random() * CLIFF_W;
        const dy = -Math.random() * s.height;
        const appears = heapsAt(pivot.y + dy);
        // lying flat on the bar after the topple, then splashed along it
        const flatX = pivot.x + dy;
        const flatY = pivot.y - dx;
        const toX = flatX + (Math.random() - 0.5) * 2 * SPLASH_REACH;
        const toY = bar.box.y - 4 - Math.random() * 16;
        const hop = lerp(SPLASH_HOP, Math.random());
        const phase = Math.random() * Math.PI * 2;
        paths.push((f) => {
          const ms = f * travel;
          if (ms < s.topples) {
            const grow = easeOut(clamp01((ms - appears) / 220));
            const shudder = ms > s.cracks ? Math.sin(ms * 0.9 + phase) * 3 : 0;
            return {
              x: pivot.x + dx + shudder,
              y: pivot.y + dy,
              scale: COIN * grow,
            };
          }
          if (ms < s.lands) {
            // falling like a felled tree: slow to tip, fast to land
            const u = (ms - s.topples) / (s.lands - s.topples);
            const a = -(Math.PI / 2) * u * u;
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            return {
              x: pivot.x + dx * cos - dy * sin,
              y: pivot.y + dx * sin + dy * cos,
              scale: COIN,
            };
          }
          const u = clamp01((ms - s.lands) / SPLASH_MS);
          const e = easeOut(u);
          return {
            x: lerp([flatX, toX], e),
            y: lerp([flatY, toY], e) - 4 * hop * u * (1 - u),
            scale: COIN,
          };
        });
      }
    }
    // the cliff's foot under the last slab stays standing
    const foot = Math.max(0, area.bottom - 20 - last.pivot.y);
    const footCount = Math.min(MAX_SLAB, Math.round(DENSITY * CLIFF_W * foot));
    for (let i = 0; i < footCount; i++) {
      const x = left + Math.random() * CLIFF_W;
      const y = last.pivot.y + Math.random() * foot;
      const appears = heapsAt(y);
      paths.push((f) => ({
        x,
        y,
        scale: COIN * easeOut(clamp01((f * travel - appears) / 220)),
      }));
    }

    const cracking = createBeats(
      slabs,
      (s) => s.cracks,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CRACK_SHAKE);
      },
    );
    const landing = createBeats(
      slabs,
      (s) => s.lands,
      (s, k) => {
        const at: Point = {
          x: s.pivot.x - s.height / 2,
          y: s.bar.box.y,
        };
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), at);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, slabs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          cracking.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
