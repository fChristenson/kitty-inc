// the "Arc Furnace" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a great pool of cash wells up along the bottom
// of the screen; two electrode wisps descend into it and a fierce, forking
// arc of lightning blazes between them, the pool boiling, jets of coins
// erupting out of it again and again, each a crack and a jolt, the arc
// ever fiercer; then the electrodes slam together in a blinding strike and
// the whole pool erupts into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { createBeats } from "../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "arcFurnace";
const REWARD = 4;
const COINS = 1_100;
const COIN = 0.6;
const POOL = 230;
const BOIL = 10;
const GEYSERS = 6;
const GEYSER_RISE = 0.55;
const GAP = 150;
const DESCEND_MS = 360;
const SLAM_MS = 160;
const SPREAD_MS = 220;
const ARCS = 3;
const ELECTRODE = 0.5;
const STRIKE_MS = 160;
const BANG_GAP_MS = 60;
const GEYSER_SHAKE: [number, number] = [0.6, 1.4];

export const forceArcFurnaceEvent = registerWispEvent(
  KEY,
  "Arc Furnace",
  () => CONFIG.arcFurnaceEvent.chance,
  (floor, context, area) => {
    const { fillMs, geyserMs, eruptMs, holdMs, mergeMs } =
      CONFIG.arcFurnaceEvent;
    const fallback = totalSpot(area);
    const width = area.right - area.left;
    const cx = (area.left + area.right) / 2;
    const bottom = area.bottom;
    const surface = bottom - POOL;
    // the arc burns just under the pool's surface
    const arcY = surface + 40;
    let clock = DESCEND_MS;
    const geysers = Array.from({ length: GEYSERS }, (_, k) => {
      const x = area.left + width * (0.12 + 0.76 * ((k * 0.618 + 0.3) % 1));
      const base: Point = { x, y: surface + 20 };
      const peak = area.top + (bottom - area.top) * (1 - GEYSER_RISE);
      const drift = (Math.random() - 0.5) * 120;
      const line = sampleLine(
        (u) => ({ x: x + drift * u, y: lerp([base.y, peak], easeOut(u)) }),
        30,
      );
      const ms = clock;
      clock += lerp(geyserMs, k / (GEYSERS - 1));
      return {
        base,
        line,
        ms,
        bolt: createBolt({ x: cx, y: arcY }, base, 1) as Bolt,
      };
    });
    const pour: Pour = {
      coinsAlong: 240,
      width: 34,
      streamMs: 220,
      travelMs: 360,
    };
    const lastGeyser = geysers[geysers.length - 1].ms;
    const slamFrom = lastGeyser + 80;
    const slamAt = slamFrom + SLAM_MS;
    const endAt = slamAt + SPREAD_MS + eruptMs;
    const durationMs = Math.max(
      pourDurationMs(lastGeyser, pour),
      endAt + holdMs + mergeMs,
    );
    const middle: Point = { x: cx, y: arcY };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x0 = area.left + Math.random() * width;
      const depth = POOL * Math.random() ** 1.5;
      const phase = Math.random() * Math.PI * 2;
      const wells = fillMs * Math.random() * 0.5;
      const rest = surface + depth;
      const leaves = slamAt + (1 - depth / POOL) * SPREAD_MS;
      const lift: Point = { x: x0, y: fallback.y + 60 };
      const from: Point = { x: x0, y: rest };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) {
          const up = easeOut(clamp01((ms - wells) / (fillMs - wells)));
          // the boil churns harder as the arc grows fiercer
          const boil = BOIL * (0.3 + 1.7 * clamp01(ms / slamAt));
          return {
            x: x0 + Math.sin(ms * 0.011 + phase) * boil,
            y:
              lerp([bottom + 40, rest], up) +
              Math.sin(ms * 0.017 + phase * 2) * boil,
            scale: COIN,
          };
        }
        bezier(
          from,
          lift,
          cover?.total() ?? fallback,
          easeIn(clamp01((ms - leaves) / eruptMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const arcs = Array.from({ length: ARCS }, () => {
      const bolt = createBolt(
        { x: cx - GAP, y: arcY },
        { x: cx + GAP, y: arcY },
        4,
      );
      return bolt;
    });
    const electrode = (side: -1 | 1) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const down = easeOut(clamp01(ms / DESCEND_MS));
        const shut = easeIn(clamp01((ms - slamFrom) / SLAM_MS));
        at.x = cx + side * GAP * (1 - shut);
        at.y = lerp([area.top - 40, arcY], down);
        return at;
      };
    };
    const left = electrode(-1);
    const right = electrode(1);
    let lastBang = -Infinity;

    const erupting = createBeats(
      geysers,
      (g) => g.ms,
      (g, k) => {
        pourLine(cover!, g.line, pour);
        cover!.burst(g.base, 0.5 + 0.08 * k);
        if (!cover!.isLive() || g.ms - lastBang < BANG_GAP_MS) return;
        lastBang = g.ms;
        playExplosion();
        shakeScreen(lerp(GEYSER_SHAKE, k / (GEYSERS - 1)));
      },
    );
    const slamming = createBeats(
      [slamAt],
      (ms) => ms,
      () => {
        cover!.burst(middle, 1.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2);
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
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          erupting.tick(ms, now);
          slamming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > slamAt + STRIKE_MS * 2) return;
          if (ms < slamAt) {
            const l = left(ms);
            const r = right(ms);
            const fierce = clamp01(ms / slamFrom);
            for (let i = 0; i < ARCS; i++) {
              if (i > fierce * ARCS) break;
              const bolt = arcs[i];
              bolt.from.x = l.x;
              bolt.from.y = l.y;
              bolt.to.x = r.x;
              bolt.to.y = r.y;
              drawBolt(
                ctx,
                bolt,
                (0.4 + 0.6 * Math.random()) * clamp01(ms / DESCEND_MS),
                0.6 + 0.8 * fierce,
              );
            }
            for (const g of geysers) {
              const t = (ms - g.ms) / STRIKE_MS;
              if (t < 0 || t >= 1) continue;
              g.bolt.from.x = (l.x + r.x) / 2;
              drawBolt(ctx, g.bolt, 1 - t, 0.7);
              drawStrike(ctx, g.base, 1 - t, 1, now);
            }
          } else {
            const t = (ms - slamAt) / (STRIKE_MS * 2);
            drawStrike(ctx, middle, 1 - t, 4, now);
          }
          drawWispBetween(
            ctx,
            left,
            ms,
            now,
            WISP_SIZE * ELECTRODE,
            1,
            0,
            slamAt,
          );
          drawWispBetween(
            ctx,
            right,
            ms,
            now,
            WISP_SIZE * ELECTRODE,
            1,
            0,
            slamAt,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
