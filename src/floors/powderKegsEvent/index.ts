// the "Powder Kegs" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while lit powder-keg wisps fly out of
// the clicked floor's button and line up along an income bar; the first
// keg blows and the blasts chain down the row keg to keg, each a white
// blast, a bang and its own shake, until the last keg on the row bursts into
// a cluster of bomblets that rain onto the next bar and set its row off; each
// row that goes up lands its bar free levels, and the last row ends in a
// cluster of blasts round one huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "powderKegs";
const MAX_BARS = 4;
const KEGS = 3;
const RIDE = 18;
const SETUP_MS = 350;
// the last keg on a row throws BOMBLETS bomblets onto the next row
const BOMBLETS = 3;
const SCATTER = 70;
const HOP_MS = 260;
const KEG = 0.4;
const BOMBLET = 0.25;
const FUSE = 16;
const KEG_BLAST = 170;
const BOMBLET_BLAST = 120;
const FINALE_BLAST = 300;
const BANG_GAP_MS = 60;
const KEG_SHAKE: [number, number] = [0.5, 1.1];
const CLUSTER_SHAKE = 1.3;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forcePowderKegsEvent = registerWispEvent(
  KEY,
  "Powder Kegs",
  () => CONFIG.powderKegsEvent.chance,
  (floor, context) => {
    const { chainsMs, holdMs, mergeMs } = CONFIG.powderKegsEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    const kegs: { at: (ms: number) => Point; shows: number; blows: number }[] =
      [];
    const bomblets: {
      at: (ms: number) => Point;
      leaves: number;
      blows: number;
    }[] = [];
    const rows: { bar: (typeof bars)[number]; done: number }[] = [];
    let clock = SETUP_MS;
    bars.forEach((bar, r) => {
      const gap = lerp(chainsMs, r / Math.max(1, bars.length - 1));
      const ltr = r % 2 === 0;
      const spots = Array.from({ length: KEGS }, (_, i): Point => {
        const u = (i + 0.5) / KEGS;
        return {
          x: bar.box.x + bar.box.width * (ltr ? u : 1 - u),
          y: bar.center.y - RIDE,
        };
      });
      // each row's kegs fly in just before the row goes off
      const shows = clock - SETUP_MS;
      spots.forEach((spot, i) => {
        const blows = clock + i * gap;
        const at: Point = { x: 0, y: 0 };
        kegs.push({
          shows,
          blows,
          at: (ms: number): Point => {
            const u = easeOut(
              clamp01((ms - shows) / (SETUP_MS * (0.6 + 0.12 * i))),
            );
            at.x = lerp([button.x, spot.x], u);
            at.y = lerp([button.y, spot.y], u);
            return at;
          },
        });
        blasts.push({
          at: spot,
          ms: blows,
          size: KEG_BLAST,
          shake: lerp(KEG_SHAKE, i / (KEGS - 1)),
        });
      });
      const lastKeg = spots[KEGS - 1];
      const done = clock + (KEGS - 1) * gap;
      rows.push({ bar, done });
      const next = bars[r + 1];
      // the cluster: bomblets fly from the last keg onto the next row
      for (let b = 0; b < BOMBLETS; b++) {
        const to: Point = next
          ? {
              x:
                next.box.x +
                next.box.width * (ltr ? 0.875 : 0.125) +
                (b - 1) * SCATTER,
              y: next.center.y - RIDE,
            }
          : {
              x:
                lastKeg.x +
                Math.cos((b / BOMBLETS) * Math.PI * 2) * SCATTER * 1.6,
              y: lastKeg.y + Math.sin((b / BOMBLETS) * Math.PI * 2) * SCATTER,
            };
        const ctrl: Point = {
          x: (lastKeg.x + to.x) / 2,
          y: Math.min(lastKeg.y, to.y) - 90,
        };
        const at: Point = { x: 0, y: 0 };
        const blows = done + HOP_MS + b * 30;
        bomblets.push({
          leaves: done,
          blows,
          at: (ms: number): Point =>
            bezier(
              lastKeg,
              ctrl,
              to,
              clamp01((ms - done) / (blows - done)),
              at,
            ),
        });
        blasts.push({
          at: to,
          ms: blows,
          size: BOMBLET_BLAST,
          shake: CLUSTER_SHAKE,
        });
      }
      clock = done + HOP_MS + BOMBLETS * 30;
    });
    const lastRow = rows[rows.length - 1];
    const endAt = clock;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const leveling = createBeats(
      rows,
      (r) => r.done,
      (r) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor), button);
        if (r === lastRow) for (const bar of bars) cover!.slam(bar);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(lastRow.bar.center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          booming.tick(ms, now);
          leveling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(
            ctx,
            lastRow.bar.center,
            ms - endAt,
            FINALE_BLAST,
            now,
          );
          for (const k of kegs) {
            if (ms < k.shows || ms >= k.blows) continue;
            drawLitFuse(
              ctx,
              k.at(ms),
              clamp01((ms - k.shows) / (k.blows - k.shows)),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              k.at,
              ms,
              now,
              WISP_SIZE * KEG,
              0.5,
              k.shows,
              k.blows,
            );
          }
          for (const b of bomblets)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMBLET,
              0.9,
              b.leaves,
              b.blows,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
