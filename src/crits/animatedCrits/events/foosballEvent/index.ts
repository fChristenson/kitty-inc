// the "Foosball" event (bounce; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a rod of light snaps across
// every income bar, each skewering a pair of player wisps like a foosball
// table; the clicked floor's button serves a ball wisp and the players kick
// it up the screen rod to rod, banking it off the side walls between them,
// every kick a smack, a jolt and free levels for that bar, every bank a
// splash and a boing, quicker each pass; the last rod fires it into the
// total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  drawBounceSplash,
  ricochetThrough,
  SPLASH_MS,
} from "../../../../shared/bounce";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "foosball";
const REWARD = 2;
const MAX_BARS = 4;
// the players stand this share of the width either side of the middle
const SPREAD = 0.25;
const WALL = 30;
// how far between rods the bank off the wall comes
const BANK = 0.45;
const ROD = 5;
const ROD_ALPHA = 0.55;
const PLAYER = 0.55;
const BALL = 0.45;
const KICK = 26;
const KICK_MS = 120;
const OPEN_MS = 150;
const SPLASH = 110;
const KICK_SHAKE: [number, number] = [0.6, 1.3];
const BANK_SHAKE = 0.35;

export const forceFoosballEvent = registerWispEvent(
  KEY,
  "Foosball",
  () => CONFIG.foosballEvent.chance,
  (floor, context, area) => {
    const { serveMs, legsMs, levelShare, holdMs, mergeMs } =
      CONFIG.foosballEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => b.center.y - a.center.y);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const width = area.right - area.left;
    const mid = area.left + width / 2;
    const sides = [mid - width * SPREAD, mid + width * SPREAD];
    // kicked from alternate sides, banking off the near wall between rods
    const kicks: Point[] = bars.map((bar, k) => ({
      x: sides[k % 2],
      y: bar.center.y,
    }));
    const points: Point[] = [button];
    kicks.forEach((kick, k) => {
      points.push(kick);
      const next = kicks[k + 1] ?? total;
      points.push({
        x: k % 2 === 0 ? area.left + WALL : area.right - WALL,
        y: lerp([kick.y, next.y], BANK),
      });
    });
    points.push(total);
    const path = ricochetThrough(points, legsMs, serveMs);
    // the contacts alternate kick, bank, kick, bank, ending in the total
    const hits = path.bounces.map((b, i) => ({
      ...b,
      bar: i % 2 === 0 ? (bars[i / 2] ?? null) : null,
      bank: i % 2 === 1,
    }));
    const kicked = hits.filter((h) => h.bar);
    const banks = hits.filter((h) => h.bank);
    const endAt = path.endMs;
    const players = bars.flatMap((bar, k) =>
      sides.map((x, side) => {
        const at: Point = { x, y: bar.center.y };
        const kickAt = side === k % 2 ? kicked[k].ms : Infinity;
        return {
          bar,
          from: k * 60,
          at: (ms: number): Point => {
            const since = ms - kickAt;
            at.y =
              bar.center.y -
              (since >= 0 && since < KICK_MS
                ? Math.sin((Math.PI * since) / KICK_MS) * KICK
                : 0);
            return at;
          },
        };
      }),
    );
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    const kicking = createBeats(
      kicked,
      (h) => h.ms,
      (h, k) => {
        const bar = h.bar as RewardBar;
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), h.at);
        cover!.burst(h.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(KICK_SHAKE, k / Math.max(1, kicked.length - 1)));
      },
    );
    const banking = createBeats(
      banks,
      (h) => h.ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BANK_SHAKE);
      },
    );
    const scoring = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(cover!.total() ?? total);
      },
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
          kicking.tick(ms, now);
          banking.tick(ms, now);
          scoring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + SPLASH_MS) return;
          const open =
            clamp01(ms / OPEN_MS) * (1 - clamp01((ms - endAt) / SPLASH_MS));
          a.x = area.left;
          b.x = area.right;
          for (const bar of bars) {
            a.y = b.y = bar.center.y;
            drawBeam(ctx, a, b, ROD, ROD_ALPHA * open);
          }
          for (const h of banks)
            drawBounceSplash(ctx, h, ms - h.ms, SPLASH, now);
          for (const p of players)
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * PLAYER * open,
              0.4,
              p.from,
              endAt,
            );
          drawWispBetween(
            ctx,
            path.at,
            ms,
            now,
            WISP_SIZE * BALL,
            1,
            serveMs,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
