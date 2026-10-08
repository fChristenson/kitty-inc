// the "Bomb Snake" event (explosion; worker perma tiers): it covers its
// crit, whose click freezes the screen while a snake of lit bomb wisps
// slithers out of the clicked floor's button and winds along the workers,
// coiling to a stop with a bomb hovering over every one; then it goes off
// from the tail to the head, a chain of big blasts racing up its body, each
// bursting into a cluster round its worker as they climb a perma tier,
// every blast with its own bang and shake, the head going up in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "bombSnake";
const MAX_WORKERS = 6;
const ABOVE = 50;
const CLUSTER = 3;
const CLUSTER_REACH = 55;
const BOMB = 0.36;
const FUSE = 14;
const BODY_BLAST = 190;
const CLUSTER_BLAST = 110;
const HEAD_BLAST = 340;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombSnakeEvent = registerWispEvent(
  KEY,
  "Bomb Snake",
  () => CONFIG.bombSnakeEvent.chance,
  (floor, context) => {
    const { slitherMs, chainMs, holdMs, mergeMs } = CONFIG.bombSnakeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort(
        (a, b) => Math.abs(a.at.x - button.x) - Math.abs(b.at.x - button.x),
      );
    if (workers.length === 0) return;
    const n = workers.length;
    const route: Point[] = [
      button,
      ...workers.map((w) => ({ x: w.at.x, y: w.at.y - ABOVE })),
    ];
    const blasts: Blast[] = [];
    // segment j comes to rest over worker j; the tail (j = 0) blows first
    const segments = workers.map((worker, j) => {
      const rest = route[j + 1];
      const blows = slitherMs + j * chainMs;
      const head = j === n - 1;
      blasts.push({
        at: rest,
        ms: blows,
        size: head ? HEAD_BLAST : BODY_BLAST,
        shake: head ? 1.6 : 0.8 + 0.1 * j,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + j;
        blasts.push({
          at: {
            x: worker.at.x + Math.cos(a) * CLUSTER_REACH,
            y: worker.at.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: blows + 50 + c * 30,
          size: CLUSTER_BLAST,
          shake: 0.6,
        });
      }
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        rest,
        blows,
        head,
        at: (ms: number): Point => {
          const lead = easeOut(clamp01(ms / slitherMs));
          return alongRoute(route, clamp01(lead - (n - 1 - j) / n), at);
        },
      };
    });
    const head = segments[n - 1];
    const endAt = head.blows;
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
      segments,
      (s) => s.blows,
      (s) => {
        cover!.promote(s.worker);
        if (s.head) cover!.blast(s.worker.at);
      },
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
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const s of segments) {
            if (ms >= s.blows) continue;
            drawLitFuse(ctx, s.at(ms), ms / s.blows, FUSE, now);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * (s.head ? BOMB * 1.4 : BOMB),
              0.5,
              0,
              s.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
