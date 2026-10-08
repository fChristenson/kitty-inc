// the "Kintsugi" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while cracks race out of the clicked
// floor's button across the screen and molten cash floods into them like
// the gold seams of kintsugi pottery, branching and zigzagging ever faster;
// every seam that reaches an income bar fills it with a flash, a bang and a
// jolt that lands free levels; then the gold drains out of every seam into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pointAlong, totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "kintsugi";
const REWARD = 2;
const MAX_BARS = 4;
const DECOYS = 3;
const SEAM_COINS = 260;
const COIN = 0.5;
// a seam zigzags in KINKS steps, up to JAG px off its line, SEAM px thick
const KINKS = 7;
const JAG = 45;
const SEAM = 6;
const DRAIN_SPREAD = 260;
const LIFT = 50;
const FILL_SHAKE: [number, number] = [0.7, 1.5];

export const forceKintsugiEvent = registerWispEvent(
  KEY,
  "Kintsugi",
  () => CONFIG.kintsugiEvent.chance,
  (floor, context, area) => {
    const { crackMs, gapMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.kintsugiEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const jagged = (to: Point): Point[] => {
      const dx = to.x - button.x;
      const dy = to.y - button.y;
      const d = Math.hypot(dx, dy) || 1;
      return Array.from({ length: KINKS + 1 }, (_, i) => {
        const u = i / KINKS;
        const off = i === 0 || i === KINKS ? 0 : (Math.random() * 2 - 1) * JAG;
        return {
          x: button.x + dx * u + (-dy / d) * off,
          y: button.y + dy * u + (dx / d) * off,
        };
      });
    };
    const edge = (): Point => {
      const side = Math.floor(Math.random() * 3);
      const u = Math.random();
      return side === 0
        ? { x: area.left, y: lerp([area.top, area.bottom], u) }
        : side === 1
          ? { x: area.right, y: lerp([area.top, area.bottom], u) }
          : { x: lerp([area.left, area.right], u), y: area.top };
    };
    const targets = [
      ...bars.map((bar) => ({
        bar,
        to: {
          x: bar.box.x + bar.box.width * (0.2 + 0.6 * Math.random()),
          y: bar.center.y,
        },
      })),
      ...Array.from({ length: DECOYS }, () => ({ bar: null, to: edge() })),
    ];
    const seams = targets.map((t, k) => {
      const line = jagged(t.to);
      const lengths = measure(line);
      const starts = k * gapMs;
      return { ...t, line, lengths, starts, fills: starts + crackMs };
    });
    const drainAt = Math.max(...seams.map((s) => s.fills)) + 120;
    const endAt = drainAt + DRAIN_SPREAD + flightMs;

    const paths: CoinPath[] = seams.flatMap((seam) =>
      Array.from({ length: SEAM_COINS }, () => {
        const u = Math.random();
        const p = pointAlong(seam.line, seam.lengths, u, { x: 0, y: 0 });
        const rest: Point = {
          x: p.x + (Math.random() * 2 - 1) * SEAM,
          y: p.y + (Math.random() * 2 - 1) * SEAM,
        };
        // the gold runs along the crack, easing as it nears the end
        const filled = seam.starts + crackMs * (1 - Math.sqrt(1 - u));
        const leaves = drainAt + u * DRAIN_SPREAD;
        const lift: Point = { x: rest.x, y: rest.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        return (f: number) => {
          const ms = f * endAt;
          if (ms < filled) return { x: rest.x, y: rest.y, scale: 0 };
          if (ms < leaves)
            return {
              x: rest.x,
              y: rest.y,
              scale: COIN * easeOut(clamp01((ms - filled) / 80)),
            };
          const total = cover?.total() ?? fallback;
          bezier(
            rest,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        };
      }),
    );

    const reached = seams.filter((s) => s.bar);
    const filling = createBeats(
      reached,
      (s) => s.fills,
      (s, k) => {
        const t = k / Math.max(1, reached.length - 1);
        cover!.levels(s.bar!, levelsFor(s.bar!.floor, levelShare, 2), button);
        cover!.burst(s.to, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FILL_SHAKE, t));
      },
    );
    const draining = createBeats(
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
        bars,
        tick: (ms, now) => {
          filling.tick(ms, now);
          draining.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
