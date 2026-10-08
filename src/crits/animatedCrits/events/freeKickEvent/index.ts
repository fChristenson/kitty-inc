// the "Free Kick" event: it covers its crit, whose click freezes the screen
// while a wall of four wisps lines up across its middle and the wisp, as the
// ball, is blasted up from its bottom: twice it smashes into the wall as the
// wall jumps, the struck one knocked back in a flash, a thud, a jolt and a
// spray of coins, and rebounds off the bottom; the third it bends round the
// end of the wall in a banana curve and buries itself in the total-income
// readout like the top corner of a goal, in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../moneyCover)
import { CONFIG } from "../../../../config";
import { playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "freeKick";
const REWARD = 4;
const WALL = 4;
// the wall WALL_Y of the screen's height down, its wisps GAP of its width
// apart, jumping JUMP of its height as each kick comes in; knocked back
// KNOCK of a wisp's size when struck, settling over KNOCK_MS
const WALL_Y = 0.42;
const GAP = 0.13;
const JUMP = 0.06;
const KNOCK = 0.6;
const KNOCK_MS = 260;
const POP_MS = 200;
// the ball kicked from KICK_Y of the screen's height down; the bend reaching
// BEND of its width past the end of the wall
const KICK_Y = 0.92;
const BEND = 0.35;
// the wisps, as shares of the screen's width
const DEFENDER = 0.065;
const BALL = 0.045;
// each block: a burst, a thud, a jolt and coins sprayed back down
const BLOCK_BURST = 0.6;
const BLOCK_SHAKE = 1.6;
const BLOCK_COINS = 6;
const BLOCK_SPRAY: [number, number] = [80, 240];
const BLOCK_SPAN = 2;

export const forceFreeKickEvent = registerWispEvent(
  KEY,
  "Free Kick",
  () => CONFIG.freeKickEvent.chance,
  (floor, context, area) => {
    const { kickMs, reboundMs, curlMs, holdMs, mergeMs } = CONFIG.freeKickEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middleX = (area.left + area.right) / 2;
    const defender = Math.max(WISP_SIZE, width * DEFENDER);
    const ball = Math.max(WISP_SIZE * 0.8, width * BALL);
    const wallY = area.top + height * WALL_Y;
    const wall: Point[] = Array.from({ length: WALL }, (_, i) => ({
      x: middleX + (i - (WALL - 1) / 2) * width * GAP,
      y: wallY,
    }));
    const kickSpot = {
      x: middleX + between([-0.2, 0.2]) * width,
      y: area.top + height * KICK_Y,
    };
    const offBottom = { x: kickSpot.x, y: area.bottom + ball * 2 };
    // the two it hits, and the end of the wall it bends round
    const struck = [1, 2].sort(() => Math.random() - 0.5);
    const bendSide = kickSpot.x < middleX ? -1 : 1;
    const bend = {
      x: wall[bendSide === 1 ? WALL - 1 : 0].x + bendSide * width * BEND,
      y: wallY,
    };

    // kick, rebound, kick, rebound, curl
    const kickAt = [
      POP_MS,
      POP_MS + kickMs + reboundMs,
      POP_MS + (kickMs + reboundMs) * 2,
    ];
    const blockAt = [kickAt[0] + kickMs, kickAt[1] + kickMs];
    const blastAt = kickAt[2] + curlMs;

    const point = { x: 0, y: 0 };
    const along = (a: Point, b: Point, u: number): Point => {
      point.x = a.x + (b.x - a.x) * u;
      point.y = a.y + (b.y - a.y) * u;
      return point;
    };
    const contactOf = (n: number): Point => ({
      x: wall[struck[n]].x,
      y: wallY + defender * 0.5,
    });
    const ballAt = (ms: number): Point | null => {
      if (ms < kickAt[0] || ms >= blastAt) return null;
      for (let n = 0; n < 2; n++) {
        if (ms < blockAt[n] && ms >= kickAt[n])
          return along(kickSpot, contactOf(n), (ms - kickAt[n]) / kickMs);
        if (ms >= blockAt[n] && ms < blockAt[n] + reboundMs)
          return along(contactOf(n), offBottom, (ms - blockAt[n]) / reboundMs);
      }
      if (ms < kickAt[2]) return null;
      const total = cover?.total();
      if (!total) return null;
      // the banana: out round the end of the wall and into the top corner
      const u = (ms - kickAt[2]) / curlMs;
      const v = 1 - u;
      point.x = v * v * kickSpot.x + 2 * u * v * bend.x + u * u * total.x;
      point.y = v * v * kickSpot.y + 2 * u * v * bend.y + u * u * total.y;
      return point;
    };
    // the wall jumps as each kick comes in; the struck one is knocked back
    const defenders = wall.map((spot, i) => {
      const p = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= blastAt) return null;
        let lift = 0;
        for (const k of kickAt) {
          const u = (ms - k) / kickMs;
          if (u > 0.3 && u < 1.3)
            lift = Math.max(lift, Math.sin(Math.PI * (u - 0.3)));
        }
        let knock = 0;
        blockAt.forEach((b, n) => {
          if (struck[n] === i && ms >= b)
            knock = Math.max(knock, 1 - (ms - b) / KNOCK_MS);
        });
        p.x = spot.x;
        p.y = spot.y - height * JUMP * lift - defender * KNOCK * knock;
        return p;
      };
    });

    const beats = createBeats(
      [...kickAt, ...blockAt, blastAt],
      (ms) => ms,
      (_, k) => {
        if (k < 3) return void (cover!.isLive() && playSwoosh());
        if (k < 5) return blocked(k - 3);
        const total = cover!.total();
        if (total) cover!.blast(total);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          const pop = easeOutBack(clamp01(ms / POP_MS));
          for (const path of defenders)
            drawWispBetween(
              ctx,
              path,
              ms,
              now,
              defender * pop,
              heat * 0.5,
              0,
              blastAt,
            );
          drawWispBetween(ctx, ballAt, ms, now, ball, heat, 0, blastAt);
        },
      },
    );
    if (!cover) return;

    function blocked(n: number): void {
      const at = contactOf(n);
      cover!.burst(at, BLOCK_BURST * lerp([0.8, 1.2], n));
      cover!.launchFrom(
        at,
        sprayTargets(at, BLOCK_COINS, BLOCK_SPRAY, Math.PI / 2, BLOCK_SPAN),
      );
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(BLOCK_SHAKE);
    }
  },
);
