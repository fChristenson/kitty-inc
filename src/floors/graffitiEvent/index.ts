// the "Graffiti" event (spray; a free floor): it covers its crit, whose
// click freezes the screen while a nozzle wisp swoops up to the next
// locked floor and tags its lock, raking zigzag strokes of glittering gold
// mist back and forth across it, row under row, every turn a jolt, faster
// and faster, the lock coating thicker and brighter until it's covered,
// flashes white and bursts open in a huge blast and shake, unlocked for
// free. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
} from "../../shared/spray";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "graffiti";
const TAG_W = 360;
const TAG_H = 200;
const ROWS = 5;
// where the nozzle hangs off the stroke it's spraying
const OFF_X = -70;
const OFF_Y = -150;
const FLY_MS = 260;
const FLASH_MS = 240;
const NOZZLE = 0.45;
const DROPLET = WISP_SIZE * 0.6;
const TURN_SHAKE: [number, number] = [0.25, 0.7];
const HIT_SHAKE = 2.4;

export const forceGraffitiEvent = registerWispEvent(
  KEY,
  "Graffiti",
  () => CONFIG.graffitiEvent.chance,
  (floor, context) => {
    const { strokesMs, holdMs, mergeMs } = CONFIG.graffitiEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // the zigzag: across each row, then a diagonal down to the next
    const corners: Point[] = [];
    for (let r = 0; r < ROWS; r++) {
      const y = lock.y - TAG_H / 2 + (r / (ROWS - 1)) * TAG_H;
      const left = lock.x - TAG_W / 2;
      const right = lock.x + TAG_W / 2;
      corners.push(r % 2 ? { x: right, y } : { x: left, y });
      corners.push(r % 2 ? { x: left, y } : { x: right, y });
    }
    const turns: number[] = [FLY_MS];
    for (let k = 1; k < corners.length; k++)
      turns.push(
        turns[k - 1] + lerp(strokesMs, (k - 1) / (corners.length - 2)),
      );
    const sprays = turns[0];
    const done = turns[turns.length - 1];
    const endAt = done + FLASH_MS;
    const tag: Point = { x: 0, y: 0 };
    const tagAt = (ms: number): Point => {
      let k = 0;
      while (k < turns.length - 2 && ms >= turns[k + 1]) k++;
      const u = smoothstep(
        clamp01((ms - turns[k]) / (turns[k + 1] - turns[k])),
      );
      tag.x = lerp([corners[k].x, corners[k + 1].x], u);
      tag.y = lerp([corners[k].y, corners[k + 1].y], u);
      return tag;
    };
    const nozzle: Point = { x: 0, y: 0 };
    const nozzleAt = (ms: number): Point => {
      if (ms < sprays) {
        const u = easeOut(clamp01(ms / FLY_MS));
        nozzle.x = lerp([button.x, corners[0].x + OFF_X], u);
        nozzle.y = lerp([button.y, corners[0].y + OFF_Y], u);
        return nozzle;
      }
      const t = tagAt(ms);
      nozzle.x = t.x + OFF_X;
      nozzle.y = t.y + OFF_Y;
      return nozzle;
    };
    const reach = Math.hypot(OFF_X, OFF_Y);
    const spray = planSpray(nozzleAt, Math.atan2(-OFF_Y, -OFF_X), {
      startMs: sprays,
      endMs: done,
      reach,
      spread: 0.2,
      flightMs: 260,
    });

    const flying = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const turning = createBeats(
      turns.slice(1, -1),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, k / Math.max(1, turns.length - 3)));
      },
    );
    const opening = createBeats(
      [done],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) shakeScreen(HIT_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          flying.tick(ms, now);
          turning.tick(ms, now);
          opening.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          const coverage = clamp01((ms - sprays) / (done - sprays));
          const flash = ms > done ? 1 - clamp01((ms - done) / FLASH_MS) : 0;
          if (ms <= endAt)
            drawSprayCoat(ctx, lock, TAG_W * 1.2, TAG_H * 1.4, coverage, flash);
          drawSpray(ctx, spray, ms, now, DROPLET);
          if (ms >= sprays && ms <= done)
            drawSprayMist(ctx, tagAt(ms), ms - sprays, 1, DROPLET, now);
          drawWispBetween(
            ctx,
            nozzleAt,
            ms,
            now,
            WISP_SIZE * NOZZLE,
            0.8,
            0,
            done,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
