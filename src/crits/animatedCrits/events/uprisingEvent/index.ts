// the "Uprising" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while two great walls of cash surge
// up the screen's left and right edges, climbing ever faster; as their
// fronts rise past each income bar they throw a spray of cash across onto
// it with a splash, a bang and a jolt that lands free levels; at the top
// they curl over toward each other and crash together in the middle, then
// the whole lot pours up into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "uprising";
const REWARD = 2;
const MAX_BARS = 4;
const WALL_COINS = 650;
const COIN = 0.55;
// each wall is WALL px thick, its top CURL of it curling over up to REACH
// of the way to the middle
const WALL = 80;
const CURL = 0.3;
const REACH = 0.95;
const CHURN = 10;
const SPRAY_COINS = 14;
const POUR_SPREAD = 300;
const LIFT = 60;
const SPRAY_SHAKE: [number, number] = [0.7, 1.5];

export const forceUprisingEvent = registerWispEvent(
  KEY,
  "Uprising",
  () => CONFIG.uprisingEvent.chance,
  (floor, context, area) => {
    const { riseMs, curlMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.uprisingEvent;
    const fallback = totalSpot(area);
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(-MAX_BARS)
      : [];
    const top = area.top + 40;
    const bottom = area.bottom;
    const mid = (area.left + area.right) / 2;
    const front = (ms: number) =>
      lerp([bottom, top], easeIn(clamp01(ms / riseMs)));
    const curlAt = riseMs;
    const meetAt = riseMs + curlMs;
    const pourAt = meetAt + 60;
    const endAt = pourAt + POUR_SPREAD + flightMs;

    const wallCoin = (side: -1 | 1) => {
      const edge = side < 0 ? area.left : area.right;
      const h = Math.random();
      const depth = Math.random() * WALL;
      const phase = Math.random() * Math.PI * 2;
      const place = (ms: number, into: Point): Point => {
        const y = lerp([bottom, front(ms)], h);
        const churn = Math.sin(y * 0.04 + ms * 0.012 + phase) * CHURN;
        into.x = edge - side * (depth + churn);
        into.y = y;
        // the top curls over toward the middle
        if (h > 1 - CURL && ms > curlAt) {
          const k = (h - (1 - CURL)) / CURL;
          const u = easeOut(clamp01((ms - curlAt) / curlMs));
          const reach = Math.abs(mid - edge) * REACH * k * u;
          into.x -= side * reach;
          into.y -= Math.sin(k * Math.PI * 0.5) * 60 * u;
        }
        return into;
      };
      const rest = place(pourAt, { x: 0, y: 0 });
      const leaves = pourAt + (1 - h) * POUR_SPREAD;
      const lift: Point = { x: rest.x, y: rest.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f: number) => {
        const ms = f * endAt;
        if (ms < leaves) {
          place(Math.min(ms, pourAt), at);
          return { x: at.x, y: at.y, scale: COIN };
        }
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
    };
    const paths: CoinPath[] = [
      ...Array.from({ length: WALL_COINS }, () => wallCoin(-1)),
      ...Array.from({ length: WALL_COINS }, () => wallCoin(1)),
    ];

    // the fronts pass y when easeIn(ms / riseMs) reaches its share
    const passes = bars
      .map((bar) => ({
        bar,
        at:
          riseMs * Math.sqrt(clamp01((bottom - bar.center.y) / (bottom - top))),
      }))
      .sort((a, b) => a.at - b.at);
    const spraying = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        const { box } = p.bar;
        for (const x of [area.left + WALL / 2, area.right - WALL / 2])
          cover!.launchFrom(
            { x, y: p.bar.center.y },
            Array.from({ length: SPRAY_COINS }, () => ({
              x: box.x + Math.random() * box.width,
              y: box.y - Math.random() * 40,
            })),
          );
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2));
        cover!.burst(
          p.bar.center,
          0.5 + 0.3 * (k / Math.max(1, passes.length - 1)),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPRAY_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const meeting = createBeats(
      [meetAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: mid, y: top }, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.6);
      },
    );
    const pouring = createBeats(
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
          spraying.tick(ms, now);
          meeting.tick(ms, now);
          pouring.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
