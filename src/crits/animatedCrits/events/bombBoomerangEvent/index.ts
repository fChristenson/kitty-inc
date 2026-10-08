// the "Bomb Boomerang" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// hurls a big lit bomb wisp out in a wide boomerang loop round the screen;
// as it whips over each worker it drops a bomblet that falls onto them and
// goes off in a big blast with a cluster of small ones, a bang and a shake,
// lighting the worker up a perma tier, the bombs rolling on one after
// another; then the boomerang swings back to the button and blows in a
// colossal blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { measure, pointAlong, sampleLine } from "../../cashFlow";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "bombBoomerang";
const MAX_WORKERS = 6;
const OVER = 150;
const DROP_MS = 220;
const BLAST = 180;
const CLUSTER = 3;
const CLUSTER_MS = 80;
const CLUSTER_REACH = 60;
const CLUSTER_SIZE = 80;
const BOOMERANG = 0.75;
const BOMBLET = 0.4;
const FUSE = 34;
const BLAST_SHAKE: [number, number] = [0.6, 1.4];

interface Drop {
  worker: RewardWorker;
  from: Point;
  drops: number;
  lands: number;
  at: (ms: number) => Point | null;
}

export const forceBombBoomerangEvent = registerWispEvent(
  KEY,
  "Bomb Boomerang",
  () => CONFIG.bombBoomerangEvent.chance,
  (floor, context, area) => {
    const { loopMs, holdMs, mergeMs } = CONFIG.bombBoomerangEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const overs = workers.map((w) => ({ x: w.at.x, y: w.at.y - OVER }));
    const route: Point[] = [
      button,
      ...overs,
      { x: area.right - 80, y: area.top + 160 },
      { x: (area.left + area.right) / 2, y: area.top + 120 },
      { x: area.left + 80, y: area.top + 200 },
      button,
    ];
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 240);
    const along = measure(line);
    const length = along[along.length - 1];
    // it slows a touch through the drops and whips home
    const timeOf = (d: number) => loopMs * Math.sqrt(d / length);
    const drops: Drop[] = workers.map((worker, k) => {
      let best = 0;
      for (let i = 1; i < line.length; i++)
        if (
          Math.hypot(line[i].x - overs[k].x, line[i].y - overs[k].y) <
          Math.hypot(line[best].x - overs[k].x, line[best].y - overs[k].y)
        )
          best = i;
      const from = line[best];
      const dropsAt = timeOf(along[best]);
      const spot: Point = { x: 0, y: 0 };
      return {
        worker,
        from,
        drops: dropsAt,
        lands: dropsAt + DROP_MS,
        at: (ms: number) => {
          const u = easeIn(clamp01((ms - dropsAt) / DROP_MS));
          spot.x = lerp([from.x, worker.at.x], u);
          spot.y = lerp([from.y, worker.at.y], u);
          return spot;
        },
      };
    });
    const endAt = loopMs;
    const blasts = drops.flatMap((d, k) => [
      { at: d.worker.at, ms: d.lands, size: BLAST },
      ...Array.from({ length: CLUSTER }, (_, c) => {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        return {
          at: {
            x: d.worker.at.x + Math.cos(a) * CLUSTER_REACH,
            y: d.worker.at.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: d.lands + CLUSTER_MS + c * 30,
          size: CLUSTER_SIZE,
        };
      }),
    ]);
    const headAt: Point = { x: 0, y: 0 };
    const boomerang = (ms: number): Point => {
      const d = length * clamp01(Math.max(0, ms) / loopMs) ** 2;
      return pointAlong(line, along, d / length, headAt);
    };

    const landing = createBeats(
      drops,
      (d) => d.lands,
      (d, k) => {
        cover!.promote(d.worker);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, drops.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(button),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const d of drops) {
            if (ms < d.drops || ms >= d.lands) continue;
            const at = d.at(ms)!;
            drawLitFuse(
              ctx,
              at,
              clamp01((ms - d.drops) / DROP_MS),
              FUSE * 0.6,
              now,
            );
            drawWispHead(ctx, d.at, ms, now, WISP_SIZE * BOMBLET);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms >= 0 && ms < endAt)
            drawLitFuse(ctx, boomerang(ms), ms / endAt, FUSE, now);
          drawWispBetween(
            ctx,
            boomerang,
            ms,
            now,
            WISP_SIZE * BOOMERANG,
            0.8,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
