// the "Bomb Garland" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a garland of lit bomb wisps
// sags across over an income bar from edge to edge like a string of party
// lights; both ends catch at once and the blasts race in from either side
// in a rolling chain, every bomb a big bang and a shake, until they meet in
// the middle in a cluster of blasts that lands free levels on the bar; the
// next garland swings in over the next bar as the last one meets, quicker
// each time, the last meeting a colossal blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "bombGarland";
const MAX_BARS = 4;
const BOMBS = 9;
const RISE = 70;
const SAG = 50;
const EDGE = 50;
const SWING_MS = 160;
const BLAST = 130;
const MIDDLE_BLAST = 220;
const CLUSTER = 4;
const CLUSTER_REACH = 60;
const CLUSTER_SIZE = 90;
const BOMB = 0.42;
const FUSE = 22;
const CHAIN_SHAKE: [number, number] = [0.4, 1];
const MEET_SHAKE: [number, number] = [1, 1.6];

interface Garland {
  bar: RewardBar;
  hangs: number;
  lit: number;
  meets: number;
  bombs: { at: Point; blows: number; spot: Point }[];
}

export const forceBombGarlandEvent = registerWispEvent(
  KEY,
  "Bomb Garland",
  () => CONFIG.bombGarlandEvent.chance,
  (floor, context, area) => {
    const { burnsMs, levelShare, holdMs, mergeMs } = CONFIG.bombGarlandEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const mid = (BOMBS - 1) / 2;
    let clock = 0;
    const garlands: Garland[] = bars.map((bar, k) => {
      const hangs = clock;
      const lit = hangs + SWING_MS;
      const step = lerp(burnsMs, k / Math.max(1, bars.length - 1)) / mid;
      const bombs = Array.from({ length: BOMBS }, (_, i) => {
        const u = i / (BOMBS - 1);
        return {
          at: {
            x: lerp([area.left + EDGE, area.right - EDGE], u),
            y: bar.center.y - RISE + SAG * (1 - (2 * u - 1) ** 2),
          },
          // the ends catch first, racing in to the middle
          blows: lit + (mid - Math.abs(i - mid)) * step,
          spot: { x: 0, y: 0 },
        };
      });
      const meets = lit + mid * step;
      clock = meets;
      return { bar, hangs, lit, meets, bombs };
    });
    const last = garlands[garlands.length - 1];
    const endAt = last.meets;
    const bombAts = garlands.flatMap((g) =>
      g.bombs.map((b) => (ms: number): Point | null => {
        if (ms < g.hangs || ms >= b.blows) return null;
        const drop = easeOut(clamp01((ms - g.hangs) / SWING_MS));
        b.spot.x = b.at.x;
        b.spot.y = b.at.y - (1 - drop) * 200;
        return b.spot;
      }),
    );
    const allBombs = garlands.flatMap((g) => g.bombs.map((b) => ({ g, b })));
    const blasts = garlands.flatMap((g, k) => [
      ...g.bombs.map((b) => ({
        at: b.at,
        ms: b.blows,
        size: b.blows === g.meets ? MIDDLE_BLAST : BLAST,
      })),
      ...Array.from({ length: CLUSTER }, (_, c) => {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        const at = g.bombs[Math.round(mid)].at;
        return {
          at: {
            x: at.x + Math.cos(a) * CLUSTER_REACH,
            y: at.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: g.meets + 60 + c * 25,
          size: CLUSTER_SIZE,
        };
      }),
    ]);
    // one bang per pair racing in, the ends of each garland onward
    const chainBeats = garlands.flatMap((g) =>
      Array.from(
        { length: Math.floor(mid) },
        (_, s) => g.lit + (s * (g.meets - g.lit)) / mid,
      ),
    );

    const chaining = createBeats(
      chainBeats,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(
          lerp(
            CHAIN_SHAKE,
            (k % Math.floor(mid)) / Math.max(1, Math.floor(mid) - 1),
          ),
        );
      },
    );
    const meeting = createBeats(
      garlands,
      (g) => g.meets,
      (g, k) => {
        cover!.levels(
          g.bar,
          levelsFor(g.bar.floor, levelShare, 2),
          g.bombs[Math.round(mid)].at,
        );
        if (g === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(g.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(MEET_SHAKE, k / Math.max(1, garlands.length - 1)));
      },
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
          chaining.tick(ms, now);
          meeting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (let i = 0; i < allBombs.length; i++) {
            const { g, b } = allBombs[i];
            const at = bombAts[i](ms);
            if (!at) continue;
            if (ms >= g.lit)
              drawLitFuse(
                ctx,
                at,
                clamp01((ms - g.lit) / (b.blows - g.lit || 1)),
                FUSE,
                now,
              );
            drawWispHead(ctx, bombAts[i], ms, now, WISP_SIZE * BOMB);
          }
          for (const blast of blasts)
            drawDetonation(ctx, blast.at, ms - blast.ms, blast.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
