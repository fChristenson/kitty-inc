// the "Tower Crane" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while a tower crane of blazing beams shoots up
// from the bottom of the screen and swings its jib out over the building's
// locked floor; a hook wisp drops on its cable and latches onto the lock
// with a clank and a jolt, and the crane heaves, once, twice, the lock
// straining and flaring hotter at every heave, each a jolt; on the last it
// rips the lock clean out in a colossal blast and shake and the floor
// bursts open, unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "towerCrane";
const SIDE = 90;
const TOP = 120;
const MAST = 14;
const JIB = 10;
const CABLE = 4;
// the lattice: a zigzag of struts along the mast and the jib
const MAST_STRUTS = 10;
const JIB_STRUTS = 8;
const LATTICE = 36;
const HEAVES = 3;
const HEAVE = 40;
const RIP = 200;
const HOOK = 0.55;
const HEAVE_SHAKE: [number, number] = [0.6, 1.3];

export const forceTowerCraneEvent = registerWispEvent(
  KEY,
  "Tower Crane",
  () => CONFIG.towerCraneEvent.chance,
  (floor, context, area) => {
    const { raiseMs, swingMs, dropMs, heavesMs, ripMs, holdMs, mergeMs } =
      CONFIG.towerCraneEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // the mast stands on the side away from the lock, so the jib reaches over it
    const leftSide = lock.x > (area.left + area.right) / 2;
    const mastX = leftSide ? area.left + SIDE : area.right - SIDE;
    const dir = leftSide ? 1 : -1;
    const topY = Math.min(area.top + TOP, lock.y - 200);
    const baseY = area.bottom + 20;
    const swungAt = raiseMs + swingMs;
    const latchAt = swungAt + dropMs;
    const heaves = Array.from(
      { length: HEAVES },
      (_, k) => latchAt + (k + 1) * lerp(heavesMs, k / (HEAVES - 1)),
    );
    const ripsAt = heaves[HEAVES - 1] + ripMs;
    const jibEnd = lock.x + dir * 60;
    // how far up the hook has hauled the lock at ms
    const haulAt = (ms: number) => {
      let haul = 0;
      for (let k = 0; k < HEAVES; k++) {
        const t = ms - heaves[k];
        if (t < 0) break;
        haul =
          k * HEAVE * 0.4 + Math.sin(Math.min(1, t / 160) * Math.PI) * HEAVE;
      }
      if (ms >= heaves[HEAVES - 1] + 160)
        haul =
          (HEAVES - 1) * HEAVE * 0.4 +
          easeIn(clamp01((ms - heaves[HEAVES - 1] - 160) / ripMs)) * RIP;
      return haul;
    };
    const hook: Point = { x: 0, y: 0 };
    const hookAt = (ms: number): Point => {
      const reach = easeOut(clamp01((ms - raiseMs) / swingMs));
      hook.x = lerp([mastX, lock.x], reach);
      const drop = easeIn(clamp01((ms - swungAt) / dropMs));
      hook.y = lerp([topY + 30, lock.y], drop) - haulAt(ms);
      return hook;
    };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    const clanking = createBeats(
      [latchAt, ...heaves],
      (ms) => ms,
      (_, k) => {
        cover!.burst(lock, 0.4 + k * 0.1);
        if (!cover!.isLive()) return;
        if (k === 0) playBloop();
        else playExplosion();
        shakeScreen(lerp(HEAVE_SHAKE, k / HEAVES));
      },
    );
    const ripping = createBeats(
      [ripsAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.6);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: ripsAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          clanking.tick(ms, now);
          ripping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > ripsAt + 300) return;
          const fade = ms > ripsAt ? 1 - (ms - ripsAt) / 300 : 1;
          // the mast shoots up, then the jib swings out from its top
          const up = easeOut(clamp01(ms / raiseMs));
          const mastTop = lerp([baseY, topY], up);
          a.x = b.x = mastX;
          a.y = baseY;
          b.y = mastTop;
          drawBeam(ctx, a, b, MAST, 0.9 * fade);
          for (let i = 0; i < MAST_STRUTS; i++) {
            const y0 = lerp([baseY, mastTop], i / MAST_STRUTS);
            const y1 = lerp([baseY, mastTop], (i + 1) / MAST_STRUTS);
            a.x = mastX + (i % 2 === 0 ? -1 : 1) * LATTICE * 0.5;
            a.y = y0;
            b.x = mastX - (i % 2 === 0 ? -1 : 1) * LATTICE * 0.5;
            b.y = y1;
            drawBeam(ctx, a, b, 4, 0.6 * fade);
          }
          if (ms < raiseMs) return;
          const reach = easeOut(clamp01((ms - raiseMs) / swingMs));
          const tip = lerp([mastX, jibEnd], reach);
          a.x = mastX - dir * 80;
          a.y = b.y = topY;
          b.x = tip;
          drawBeam(ctx, a, b, JIB, 0.9 * fade);
          for (let i = 0; i < JIB_STRUTS; i++) {
            a.x = lerp([mastX, tip], i / JIB_STRUTS);
            b.x = lerp([mastX, tip], (i + 1) / JIB_STRUTS);
            a.y = topY + (i % 2 === 0 ? 0 : LATTICE);
            b.y = topY + (i % 2 === 0 ? LATTICE : 0);
            drawBeam(ctx, a, b, 4, 0.6 * fade);
          }
          const h = hookAt(ms);
          a.x = h.x;
          a.y = topY;
          drawBeam(ctx, a, h, CABLE, 0.8 * fade);
          // the lock strains hotter at every heave
          const strain = clamp01((ms - latchAt) / (ripsAt - latchAt));
          if (ms >= latchAt)
            drawBeamFlare(ctx, lock, 30 + 70 * strain, strain * fade, now);
          drawWispBetween(
            ctx,
            hookAt,
            ms,
            now,
            WISP_SIZE * HOOK,
            0.6,
            raiseMs,
            ripsAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
