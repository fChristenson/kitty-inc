// the "Claymore" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a fizzing bomb wisp is planted
// under every income bar; the bottom one goes off first in a fan of three
// big blasts up through its bar, its bang and shake landing free levels, and
// a spark leaps from its blast to set off the next one up, and the next,
// quicker each time; then every bomb goes off again at once with one
// colossal blast in the middle and the hardest shake of all. Then the
// crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "claymore";
const MAX_BARS = 4;
const UNDER = 34;
const BOMB = 0.45;
const FUSE = 50;
// the fan: a big blast on the bomb and two up and out either side
const FAN: Point[] = [
  { x: 0, y: 0 },
  { x: -110, y: -50 },
  { x: 110, y: -50 },
];
const FAN_SIZE = [300, 220, 220];
const FAN_GAP_MS = 60;
const SPARK = 0.35;
const FINAL_GAP_MS = 220;
const COLOSSAL = 700;
const BANG_GAP_MS = 50;
const CHAIN_SHAKE: [number, number] = [0.8, 1.4];
const FINAL_SHAKE = 2.4;

interface Mine {
  bar: RewardBar;
  at: Point;
  blows: number;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

export const forceClaymoreEvent = registerWispEvent(
  KEY,
  "Claymore",
  () => CONFIG.claymoreEvent.chance,
  (floor, context, area) => {
    const { fuseMs, chainMs, levelShare, holdMs, mergeMs } =
      CONFIG.claymoreEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // bottom up
    let clock = fuseMs;
    const mines: Mine[] = bars
      .slice()
      .reverse()
      .map((bar, k) => {
        const blows = clock;
        clock += lerp(chainMs, k / Math.max(1, bars.length - 1));
        return {
          bar,
          at: { x: bar.center.x, y: bar.box.y + bar.box.height + UNDER },
          blows,
        };
      });
    const finalAt =
      mines[mines.length - 1].blows + FINAL_GAP_MS + FAN_GAP_MS * 2;
    const middle: Point = {
      x: (area.left + area.right) / 2,
      y: (mines[0].at.y + mines[mines.length - 1].at.y) / 2,
    };
    const fanOf = (at: Point, ms: number): Blast[] =>
      FAN.map((d, i) => ({
        at: { x: at.x + d.x, y: at.y + d.y },
        ms: ms + i * FAN_GAP_MS,
        size: FAN_SIZE[i],
      }));
    const blasts: Blast[] = [
      ...mines.flatMap((m) => fanOf(m.at, m.blows)),
      ...mines.flatMap((m) => fanOf(m.at, finalAt)),
      { at: middle, ms: finalAt + FAN_GAP_MS, size: COLOSSAL },
    ];
    const endAt = finalAt + FAN_GAP_MS + DETONATION_MS;
    const bombs = mines.map((m) => () => m.at);
    // the spark leaping from each blast up to the next bomb
    const sparks = mines.slice(0, -1).map((m, k) => {
      const next = mines[k + 1];
      const at: Point = { x: 0, y: 0 };
      return {
        starts: m.blows,
        ends: next.blows,
        at: (ms: number): Point => {
          const u = Math.min(
            1,
            Math.max(0, (ms - m.blows) / (next.blows - m.blows)),
          );
          at.x = lerp([m.at.x, next.at.x], u);
          at.y = lerp([m.at.y, next.at.y], u) - Math.sin(Math.PI * u) * 60;
          return at;
        },
      };
    });

    const chaining = createBeats(
      mines,
      (m) => m.blows,
      (m) => cover!.levels(m.bar, levelsFor(m.bar.floor, levelShare, 2), m.at),
    );
    let bang = -Infinity;
    const banging = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive() || b.size === COLOSSAL) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(lerp(CHAIN_SHAKE, b.ms / finalAt) * (b.size / FAN_SIZE[0]));
      },
    );
    const finale = createBeats(
      [finalAt],
      (ms) => ms,
      () => {
        for (const m of mines)
          cover!.levels(m.bar, levelsFor(m.bar.floor, levelShare, 2), m.at);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(middle);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(FINAL_SHAKE);
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
          banging.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let k = 0; k < mines.length; k++) {
            const m = mines[k];
            if (ms >= m.blows) continue;
            drawLitFuse(ctx, m.at, ms / m.blows, FUSE, now);
            drawWispBetween(
              ctx,
              bombs[k],
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6 + 0.4 * (ms / m.blows),
              0,
              m.blows,
            );
          }
          for (const s of sparks)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SPARK,
              1,
              s.starts,
              s.ends,
            );
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
