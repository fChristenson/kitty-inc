// the "Robovac" event (clutter; a free floor): it covers its crit, whose
// click freezes the screen while a checkerboard of glitter rains down over
// the whole screen; a little gravity hole rolls off the clicked floor's
// button like a robot vacuum and cleans it up: first spiralling out round
// the button, then bumping off the screen's edges in long straight runs,
// every bump a jolt, the glitter sliding in and swirling down into it as it
// passes; on its last run it switches to full suction and gulps in what's
// left from all over, then docks in the lock, which blows open in a huge
// blast: the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawGravityHole,
  scatterChecker,
  simulateClean,
} from "../../../../shared/clutter";
import { ricochet } from "../../../../shared/bounce";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "robovac";
const BITS = 380;
const BIT = 10;
const MARGIN = 50;
const CHECKS = 8;
// the spiral's turns and reach (a share of the screen's shorter side), the
// runs off the edges, and ms it takes to roll the screen's width plus height
const TURNS = 2.5;
const SPIRAL = 0.4;
const RUNS = 3;
const ROLL_MS = 800;
// its suction: steady, then the gulp over GULP_MS before it docks (a loose
// bit tops out at 2.5 px/ms, so the gulp must reach across the screen)
const PULL = 0.03;
const GULP_PULL = 0.6;
const GULP_MS = 700;
const CORE = 45;
const SWIRL = 0.7;
const HOLE: [number, number] = [90, 170];
const DROP = 260;
const LAND_SHAKE = 0.5;
const BUMP_SHAKE: [number, number] = [0.4, 0.8];
const GULP_SHAKE = 0.9;

export const forceRobovacEvent = registerWispEvent(
  KEY,
  "Robovac",
  () => CONFIG.robovacEvent.chance,
  (floor, context, area) => {
    const { dumpMs, spiralMs, holdMs, mergeMs } = CONFIG.robovacEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + MARGIN,
      top: area.top + MARGIN,
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const spots = scatterChecker(box, BITS, (box.right - box.left) / CHECKS);
    // the mess rains down, each bit dropping in from above at its own beat
    const drops = spots.map(() => Math.random() * dumpMs * 0.5);
    const fallMs = dumpMs * 0.5;

    const reach =
      SPIRAL * Math.min(area.right - area.left, area.bottom - area.top);
    const spiralEnd = dumpMs + spiralMs;
    const clampX = (x: number) => Math.min(box.right, Math.max(box.left, x));
    const clampY = (y: number) => Math.min(box.bottom, Math.max(box.top, y));
    const spiralAt = (ms: number, into: Point): Point => {
      const u = clamp01((ms - dumpMs) / spiralMs);
      const a = u * TURNS * Math.PI * 2;
      into.x = clampX(button.x + Math.cos(a) * reach * u);
      into.y = clampY(button.y + Math.sin(a) * reach * u);
      return into;
    };
    const turnOut: Point = spiralAt(spiralEnd, { x: 0, y: 0 });
    const runs = ricochet(turnOut, -Math.PI * 0.3, box, {
      bounces: RUNS,
      speed: (area.right - area.left + area.bottom - area.top) / ROLL_MS,
      startMs: spiralEnd,
      finish: lock,
    });
    const bumps = runs.bounces.slice(0, -1);
    const dockAt = runs.endMs;
    const gulpEnd = bumps[bumps.length - 1].ms;
    const gulpFrom = gulpEnd - GULP_MS;
    const vacAt = (ms: number, into: Point): Point | null => {
      if (ms < dumpMs || ms > dockAt) return null;
      if (ms < spiralEnd) return spiralAt(ms, into);
      const p = runs.at(ms);
      into.x = p.x;
      into.y = p.y;
      return into;
    };
    const swept = simulateClean(
      spots,
      [
        {
          kind: "hole",
          at: vacAt,
          pull: (ms) =>
            ms < gulpFrom || ms > gulpEnd
              ? PULL
              : lerp([PULL, GULP_PULL], smoothstep((ms - gulpFrom) / GULP_MS)),
          core: CORE,
          swirl: SWIRL,
        },
      ],
      dumpMs,
      dockAt,
    );

    const landing = createBeats(
      [dumpMs * 0.4, dumpMs * 0.75],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const starting = createBeats(
      [dumpMs],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.5);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const bumping = createBeats(
      bumps,
      (b) => b.ms,
      (b, k) => {
        cover!.burst(b.at, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BUMP_SHAKE, k / Math.max(1, bumps.length - 1)));
      },
    );
    const gulping = createBeats(
      [gulpFrom],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(GULP_SHAKE);
      },
    );
    const docking = createBeats(
      [dockAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const bit: Point = { x: 0, y: 0 };
    const vac: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: dockAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          landing.tick(ms, now);
          starting.tick(ms, now);
          bumping.tick(ms, now);
          gulping.tick(ms, now);
          docking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > dockAt) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < spots.length; i++) {
            if (ms < drops[i]) continue;
            if (ms < dumpMs) {
              const u = easeIn(clamp01((ms - drops[i]) / fallMs));
              bit.x = spots[i].x;
              bit.y = lerp([spots[i].y - DROP, spots[i].y], u);
            } else swept.at(i, ms, bit);
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
          if (!vacAt(ms, vac)) return;
          const full = clamp01((ms - dumpMs) / (dockAt - dumpMs));
          drawGravityHole(ctx, vac, lerp(HOLE, full), 1, ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
