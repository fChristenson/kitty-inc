// the "Bomb Squad" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while a ticking bomb wisp pops up
// hovering over every worker, fuses fizzing and blinking ever faster; a
// defuser wisp zips out of the clicked floor's button from bomb to bomb, and
// every one it reaches goes off anyway, a big blast bursting into a cluster
// round its worker with a bang and a shake as the worker climbs a perma
// tier, the defuser ever quicker; the last two or three blow all at once in
// a huge blast and the biggest shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "bombSquad";
const MAX_WORKERS = 5;
const ABOVE = 55;
const POP_MS = 140;
const BOB = 4;
const CLUSTER = 4;
const CLUSTER_REACH = 58;
const BOMB = 0.4;
const DEFUSER = 0.42;
const FUSE = 15;
const BLAST = 200;
const CLUSTER_BLAST = 105;
const GROUP_BLAST = 240;
const HUGE = 420;
const BANG_GAP_MS = 60;
const BLOW_SHAKE: [number, number] = [0.8, 1.3];

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombSquadEvent = registerWispEvent(
  KEY,
  "Bomb Squad",
  () => CONFIG.bombSquadEvent.chance,
  (floor, context) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.bombSquadEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const n = workers.length;
    const button = getButtonCenter(context.isGroundFloor);
    // the last few blow together: the defuser only reaches their middle
    const together = n >= 5 ? 3 : n >= 3 ? 2 : 1;
    const singles = n - together;
    const group = workers.slice(singles);
    const middle: Point = {
      x: group.reduce((s, w) => s + w.at.x, 0) / group.length,
      y: group.reduce((s, w) => s + w.at.y, 0) / group.length - ABOVE,
    };
    const stops: Point[] = [button];
    const reaches: number[] = [0];
    let clock = 0;
    for (let k = 0; k <= singles; k++) {
      clock += lerp(hopsMs, k / Math.max(1, singles));
      reaches.push(clock);
      stops.push(
        k < singles
          ? { x: workers[k].at.x, y: workers[k].at.y - ABOVE }
          : middle,
      );
    }
    const endAt = clock;
    const blasts: Blast[] = [];
    const bombs = workers.map((worker, k) => {
      const last = k >= singles;
      const spot: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const blows = reaches[Math.min(k, singles) + 1];
      blasts.push({
        at: spot,
        ms: blows,
        size: last ? GROUP_BLAST : BLAST,
        shake: last ? 1.8 : lerp(BLOW_SHAKE, k / Math.max(1, singles)),
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: worker.at.x + Math.cos(a) * CLUSTER_REACH,
            y: worker.at.y + Math.sin(a) * CLUSTER_REACH * 0.8,
          },
          ms: blows + 45 + c * 28,
          size: CLUSTER_BLAST,
          shake: 0.6,
        });
      }
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        blows,
        at: (ms: number): Point => {
          at.x = spot.x;
          at.y = spot.y + Math.sin(Math.max(0, ms) / 90 + k) * BOB;
          return at;
        },
      };
    });
    blasts.push({ at: middle, ms: endAt + 30, size: HUGE, shake: 2.2 });

    const defuserAt: Point = { x: 0, y: 0 };
    const defuser = (ms: number): Point => {
      const t = Math.max(0, ms);
      let i = 0;
      while (i < reaches.length - 2 && t >= reaches[i + 1]) i++;
      const u = easeOut(
        clamp01((t - reaches[i]) / (reaches[i + 1] - reaches[i])),
      );
      defuserAt.x = lerp([stops[i].x, stops[i + 1].x], u);
      defuserAt.y = lerp([stops[i].y, stops[i + 1].y], u);
      return defuserAt;
    };
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
    const promoting = createBeats(
      bombs,
      (b) => b.blows,
      (b) => cover!.promote(b.worker),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(middle),
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
          booming.tick(ms, now);
          promoting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const b of bombs) {
            if (ms >= b.blows) continue;
            const pop = easeOut(clamp01(ms / POP_MS));
            drawLitFuse(ctx, b.at(ms), ms / b.blows, FUSE * pop, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB * pop,
              0.5,
              0,
              b.blows,
            );
          }
          drawWispBetween(
            ctx,
            defuser,
            ms,
            now,
            WISP_SIZE * DEFUSER,
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
