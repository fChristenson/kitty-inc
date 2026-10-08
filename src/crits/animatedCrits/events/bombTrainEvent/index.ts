// the "Bomb Train" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while a train of lit bomb wisps, an engine and a
// car for every empty spot, chugs out of the clicked floor's button and
// snakes across the screen; at each spot its last car uncouples, rolls onto
// the spot and blows in a cluster of blasts, bang after bang, shake after
// shake, as a new worker forms in the smoke; the cars blow in a chain down
// the line, and once the last is gone the engine itself blows in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "bombTrain";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 30;
const EDGE = 80;
// cars GAP of the route apart, rolling off in ROLL_MS and blowing FUSE_MS later
const GAP = 0.04;
const ROLL_MS = 140;
const FUSE_MS = 120;
const CLUSTER = 3;
const CLUSTER_REACH = 50;
const ENGINE = 0.5;
const CAR = 0.38;
const FUSE = 14;
const CAR_BLAST = 190;
const CLUSTER_BLAST = 110;
const ENGINE_BLAST = 340;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceBombTrainEvent = registerWispEvent(
  KEY,
  "Bomb Train",
  () => CONFIG.bombTrainEvent.chance,
  (floor, context, area) => {
    const { runMs, holdMs, mergeMs } = CONFIG.bombTrainEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x < (area.left + area.right) / 2;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => (ltr ? a.x - b.x : b.x - a.x));
    if (hires.length === 0) return;
    const spots = hires.map((h): Point => ({ x: h.x, y: h.y - LIFT }));
    const lastSpot = spots[spots.length - 1];
    const end: Point = {
      x: ltr ? area.right - EDGE : area.left + EDGE,
      y: lastSpot.y,
    };
    const route = [button, ...spots, end];
    const legs = route.length - 1;
    // the engine passes route[i] at u = i / legs
    const passes = (i: number) => (runMs * i) / legs;
    const blasts: Blast[] = [];
    const cars = hires.map((hire, j) => {
      const spot = spots[j];
      // the rear car, j cars from the back of a train of hires.length
      const slot = hires.length - j;
      const leaves = passes(j + 1);
      const lands = leaves + ROLL_MS;
      const blows = lands + FUSE_MS;
      blasts.push({
        at: spot,
        ms: blows,
        size: CAR_BLAST,
        shake: 0.9 + 0.1 * j,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + j;
        blasts.push({
          at: {
            x: spot.x + Math.cos(a) * CLUSTER_REACH,
            y: spot.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: blows + 50 + c * 30,
          size: CLUSTER_BLAST,
          shake: 0.7,
        });
      }
      const at: Point = { x: 0, y: 0 };
      const from = alongRoute(route, clamp01(leaves / runMs - slot * GAP), {
        x: 0,
        y: 0,
      });
      return {
        hire,
        blows,
        at: (ms: number): Point => {
          if (ms < leaves)
            return alongRoute(route, clamp01(ms / runMs - slot * GAP), at);
          const u = easeOut(clamp01((ms - leaves) / ROLL_MS));
          at.x = lerp([from.x, spot.x], u);
          at.y = lerp([from.y, spot.y], u);
          return at;
        },
      };
    });
    const endAt = runMs;
    blasts.push({ at: end, ms: endAt, size: ENGINE_BLAST, shake: 1.6 });
    const engineAt: Point = { x: 0, y: 0 };
    const engine = (ms: number): Point =>
      alongRoute(route, clamp01(ms / runMs), engineAt);
    const lastCar = cars[cars.length - 1];
    const finishAt = Math.max(endAt, lastCar.blows + 50 + CLUSTER * 30);
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
    const hiring = createBeats(
      cars,
      (c) => c.blows,
      (c) => giveHire(c.hire),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(end),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finishAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          booming.tick(ms, now);
          hiring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > finishAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const c of cars) {
            if (ms >= c.blows) continue;
            drawLitFuse(ctx, c.at(ms), ms / c.blows, FUSE, now);
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CAR,
              0.5,
              0,
              c.blows,
            );
          }
          if (ms < endAt) {
            drawLitFuse(ctx, engine(ms), ms / endAt, FUSE * 1.4, now);
            drawWispBetween(
              ctx,
              engine,
              ms,
              now,
              WISP_SIZE * ENGINE,
              0.7,
              0,
              endAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
