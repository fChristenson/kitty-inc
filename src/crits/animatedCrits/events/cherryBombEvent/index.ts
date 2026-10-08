// the "Cherry Bomb" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a pair of lit bomb wisps hangs from a glitter
// stem at the top of the screen, swinging like a pendulum, wider and faster;
// the stem snaps and the two cherries are flung to the screen's bottom
// corners, each going off in a big blast, a bang and a hard jolt; their
// blasts set off chains of bombs racing along the bottom toward each other,
// each a blast, a jolt and a spray of coins, meeting in the middle in a
// colossal blast; then the total goes up in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "cherryBomb";
const REWARD = 4;
const PIVOT_Y = 130;
const STEM = 260;
const SPREAD = 26;
const SWING: [number, number] = [0.25, 0.9];
const SWINGS = 3.5;
const CORNER_X = 120;
const CORNER_Y = 150;
const CHAIN = 5;
const LAND_BLAST = 300;
const CHAIN_BLAST: [number, number] = [140, 220];
const CORE_BLAST = 440;
const COINS = 10;
const COIN_REACH: [number, number] = [40, 150];
const CHERRY = 0.5;
const FUSE = 16;
const STEM_GAP = 22;
const GLITTER = 6;
const FINALE_DELAY_MS = 220;
const BANG_GAP_MS = 55;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceCherryBombEvent = registerWispEvent(
  KEY,
  "Cherry Bomb",
  () => CONFIG.cherryBombEvent.chance,
  (floor, context, area) => {
    const { swingMs, flightMs, chainMs, holdMs, mergeMs } =
      CONFIG.cherryBombEvent;
    const total = totalSpot(area);
    const cx = (area.left + area.right) / 2;
    const pivot: Point = { x: cx, y: area.top + PIVOT_Y };
    const angleAt = (ms: number): number => {
      const u = clamp01(ms / swingMs);
      return (
        lerp(SWING, u) * Math.sin(Math.PI * 2 * SWINGS * u * (0.6 + 0.4 * u))
      );
    };
    const tipAt = (ms: number, side: number, into: Point): Point => {
      const a = angleAt(ms);
      into.x = pivot.x + Math.sin(a) * STEM + side * SPREAD * Math.cos(a);
      into.y = pivot.y + Math.cos(a) * STEM - side * SPREAD * Math.sin(a);
      return into;
    };
    const bottom = area.bottom - CORNER_Y;
    const corners: Point[] = [
      { x: area.left + CORNER_X, y: bottom },
      { x: area.right - CORNER_X, y: bottom },
    ];
    const snapAt = swingMs;
    const lands = snapAt + flightMs;
    const cherries = [-1, 1].map((side, i) => {
      const from = tipAt(snapAt, side, { x: 0, y: 0 });
      const to = corners[i];
      const bend: Point = {
        x: (from.x + to.x) / 2 + side * 120,
        y: from.y - 160,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        to,
        lands: lands + i * 60,
        at: (ms: number): Point =>
          ms < snapAt
            ? tipAt(Math.max(0, ms), side, at)
            : bezier(from, bend, to, clamp01((ms - snapAt) / flightMs), at),
      };
    });
    const middle: Point = { x: cx, y: bottom };
    const blasts: Blast[] = cherries.map((c) => ({
      at: c.to,
      ms: c.lands,
      size: LAND_BLAST,
      shake: 1.4,
      coins: COINS,
    }));
    for (const c of cherries)
      for (let j = 1; j <= CHAIN; j++)
        blasts.push({
          at: {
            x: lerp([c.to.x, middle.x], j / (CHAIN + 1)),
            y: bottom + Math.sin(j * 1.7) * 30,
          },
          ms: c.lands + j * chainMs,
          size: lerp(CHAIN_BLAST, j / CHAIN),
          shake: 0.6 + 0.1 * j,
          coins: COINS,
        });
    const coreAt =
      Math.max(...cherries.map((c) => c.lands)) + (CHAIN + 1) * chainMs;
    blasts.push({
      at: middle,
      ms: coreAt,
      size: CORE_BLAST,
      shake: 2.4,
      coins: 30,
    });
    const endAt = coreAt + FINALE_DELAY_MS;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            ringTargets(b.at, b.coins, COIN_REACH),
            area.top + 100,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const stemTip: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms < snapAt) {
            tipAt(ms, 0, stemTip);
            for (let i = 0, d = 0; d < STEM; d += STEM_GAP, i++)
              drawGlitterLight(
                ctx,
                lerp([pivot.x, stemTip.x], d / STEM),
                lerp([pivot.y, stemTip.y], d / STEM),
                GLITTER,
                i,
                0.8,
                now,
              );
          }
          for (const c of cherries) {
            if (ms >= c.lands) continue;
            drawLitFuse(ctx, c.at(ms), ms / c.lands, FUSE, now);
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CHERRY,
              0.5,
              0,
              c.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
