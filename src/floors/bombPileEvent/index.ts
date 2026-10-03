// the "Bomb Pile" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while lit bomb wisps drop out of the sky one
// after another onto an income bar, each landing with a thud on top of the
// last until a wobbling tower of fizzing bombs stands on it; then the tower
// goes off from the top down in a rattling chain of big blasts, every one a
// bang and a shake, the bottom bomb bursting into a cluster right on the bar
// as it jumps a crit tier; tower after tower, quicker each time, the last
// pile's base a colossal blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "bombPile";
const MAX_BARS = 4;
const PILE = 5;
const STACK = 34;
const DROP_MS = 150;
const CHAIN_MS = 70;
const BLAST = 150;
const BASE_BLAST = 230;
const CLUSTER = 4;
const CLUSTER_REACH = 70;
const CLUSTER_SIZE = 100;
const BOMB = 0.5;
const FUSE = 26;
const THUD_SHAKE = 0.35;
const CHAIN_SHAKE: [number, number] = [0.5, 1.2];

interface Pile {
  bar: RewardBar;
  bombs: { at: Point; drops: number; lands: number; blows: number; spot: Point }[];
  base: number;
}

export const forceBombPileEvent = registerWispEvent(
  KEY,
  "Bomb Pile",
  () => CONFIG.bombPileEvent.chance,
  (floor, context, area) => {
    const { dropsMs, holdMs, mergeMs } = CONFIG.bombPileEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const piles: Pile[] = bars.map((bar, k) => {
      const gap = lerp(dropsMs, k / Math.max(1, bars.length - 1));
      const bombs = Array.from({ length: PILE }, (_, i) => {
        const drops = clock + i * gap;
        return {
          at: { x: bar.center.x + (i % 2 === 0 ? -4 : 4), y: bar.box.y - STACK * (i + 0.5) },
          drops,
          lands: drops + DROP_MS,
          blows: 0,
          spot: { x: 0, y: 0 },
        };
      });
      const lit = bombs[PILE - 1].lands + gap;
      // top first, down to the base on the bar
      bombs.forEach((b, i) => (b.blows = lit + (PILE - 1 - i) * CHAIN_MS));
      clock = bombs[0].blows;
      return { bar, bombs, base: bombs[0].blows };
    });
    const last = piles[piles.length - 1];
    const endAt = last.base;
    const bombAts = piles.flatMap((p) =>
      p.bombs.map((b) => (ms: number): Point | null => {
        if (ms < b.drops || ms >= b.blows) return null;
        const u = easeIn(clamp01((ms - b.drops) / DROP_MS));
        b.spot.x = b.at.x;
        b.spot.y = lerp([area.top - 40, b.at.y], u);
        return b.spot;
      }),
    );
    const blasts = piles.flatMap((p, k) => [
      ...p.bombs.map((b, i) => ({ at: b.at, ms: b.blows, size: i === 0 ? BASE_BLAST : BLAST })),
      ...Array.from({ length: CLUSTER }, (_, c) => {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        return {
          at: { x: p.bar.center.x + Math.cos(a) * CLUSTER_REACH, y: p.bar.center.y + Math.sin(a) * CLUSTER_REACH * 0.5 },
          ms: p.base + 60 + c * 25,
          size: CLUSTER_SIZE,
        };
      }),
    ]);
    const allBombs = piles.flatMap((p) => p.bombs);

    const thudding = createBeats(allBombs, (b) => b.lands, () => {
      if (!cover?.isLive()) return;
      playBloop();
      shakeScreen(THUD_SHAKE);
    });
    const chaining = createBeats(
      allBombs.filter((_, i) => i % PILE !== 0),
      (b) => b.blows,
      (_, k) => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CHAIN_SHAKE, (k % (PILE - 1)) / (PILE - 2)));
      },
    );
    const basing = createBeats(
      piles,
      (p) => p.base,
      (p) => {
        cover!.tierUp(p.bar);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CHAIN_SHAKE[1] * 1.2);
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
          thudding.tick(ms, now);
          chaining.tick(ms, now);
          basing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (let i = 0; i < allBombs.length; i++) {
            const b = allBombs[i];
            const at = bombAts[i](ms);
            if (!at) continue;
            if (ms >= b.lands) drawLitFuse(ctx, at, clamp01((ms - b.lands) / (b.blows - b.lands)), FUSE, now);
            drawWispHead(ctx, bombAts[i], ms, now, WISP_SIZE * BOMB);
          }
          for (const blast of blasts) drawDetonation(ctx, blast.at, ms - blast.ms, blast.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
