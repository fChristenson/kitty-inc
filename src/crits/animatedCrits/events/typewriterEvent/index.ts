// the "Typewriter" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a wisp clacks across the top
// row of workers like a typewriter carriage, in hard little jumps, typing a
// line of flowing cash behind it; every worker it types past lights up a
// perma tier with a flash and a jolt; at the end of the line it dings, and a
// carriage return whips it back to type the next row down, ever faster;
// the last ding goes off in a huge blast and shake. Pays floor income ×
// floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "typewriter";
const REWARD = 2;
const MAX_WORKERS = 8;
// workers within ROW px of each other share a row
const ROW = 60;
const MARGIN = 40;
// each line clacks across in KEYS jumps
const KEYS = 12;
const COINS = 1_000;
const TRAIL = 450;
const SPREAD = 10;
const COIN = 0.65;
const HIT_SHAKE = 0.6;
const DING_SHAKE: [number, number] = [0.8, 1.5];

export const forceTypewriterEvent = registerWispEvent(
  KEY,
  "Typewriter",
  () => CONFIG.typewriterEvent.chance,
  (floor, context, area) => {
    const { linesMs, returnMs, holdMs, mergeMs } = CONFIG.typewriterEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.y - b.at.y);
    if (workers.length === 0) return;
    const rows: RewardWorker[][] = [];
    for (const w of workers) {
      const row = rows[rows.length - 1];
      if (row && w.at.y - row[0].at.y < ROW) row.push(w);
      else rows.push([w]);
    }
    const left = area.left + MARGIN;
    const right = area.right - MARGIN;
    const lines = rows.map((row, k) => ({
      row,
      y: row.reduce((s, w) => s + w.at.y, 0) / row.length,
      ms: lerp(linesMs, k / Math.max(1, rows.length - 1)),
      startsAt: 0,
    }));
    let clock = 0;
    lines.forEach((line, k) => {
      line.startsAt = clock;
      clock += line.ms + (k < lines.length - 1 ? returnMs : 0);
    });
    const endAt = clock;
    // typing jumps key by key; the return sweeps back and down
    const path = (ms: number, into: Point): Point => {
      const t = Math.min(Math.max(ms, 0), endAt);
      let k = 0;
      while (k < lines.length - 1 && t >= lines[k + 1].startsAt) k++;
      const line = lines[k];
      const along = t - line.startsAt;
      if (along <= line.ms) {
        const keys = along / (line.ms / KEYS);
        const step = Math.floor(keys) + easeOut(Math.min(1, (keys % 1) * 3));
        into.x = left + ((right - left) * Math.min(KEYS, step)) / KEYS;
        into.y = line.y;
        return into;
      }
      const u = easeOut(clamp01((along - line.ms) / returnMs));
      into.x = right + (left - right) * u;
      into.y = line.y + (lines[k + 1].y - line.y) * u;
      return into;
    };
    const head: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null =>
      ms < 0 || ms > endAt ? null : path(ms, head);
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const lag = (i / COINS) * TRAIL;
      const dx = (Math.random() * 2 - 1) * SPREAD;
      const dy = (Math.random() * 2 - 1) * SPREAD;
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * (endAt + TRAIL) - lag;
        if (ms <= 0) return { x: left, y: lines[0].y, scale: 0 };
        path(ms, at);
        return { x: at.x + dx, y: at.y + dy, scale: COIN };
      };
    });
    const hits = lines.flatMap((line) =>
      line.row.map((worker) => ({
        worker,
        at:
          line.startsAt +
          line.ms * clamp01((worker.at.x - left) / (right - left)),
      })),
    );
    const dings = lines.map((line) => line.startsAt + line.ms);

    const typing = createBeats(
      hits,
      (h) => h.at,
      (h) => {
        cover!.promote(h.worker);
        cover!.burst(h.worker.at, 0.5);
        if (cover!.isLive()) shakeScreen(HIT_SHAKE);
      },
    );
    const dinging = createBeats(
      dings,
      (ms) => ms,
      (_, k) => {
        const at = { x: right, y: lines[k].y };
        if (k === lines.length - 1) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.7);
        if (!cover!.isLive()) return;
        playBloop();
        playSwoosh();
        shakeScreen(lerp(DING_SHAKE, k / Math.max(1, lines.length - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + TRAIL + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        workers,
        tick: (ms, now) => {
          typing.tick(ms, now);
          dinging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE * 0.85,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt + TRAIL);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
