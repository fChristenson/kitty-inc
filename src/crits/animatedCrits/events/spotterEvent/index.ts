// the "Spotter" event (gunfire; free hires): it covers its crit, whose click
// freezes the screen while a sniper wisp settles at the top of the screen
// and a spotter wisp darts out of the clicked floor's button from empty
// spot to empty spot; at each one it paints a flickering aim line for the
// sniper, and a beat later a heavy round cracks down the line, a muzzle
// flash, a bang and a jolt, and a new worker forms where it lands; the
// spotter calls the shots ever faster, the last landing in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
} from "../../../../shared/bullets";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "spotter";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const TOP = 140;
const DART_MS = 140;
const SPEED = 3;
const SPOTTER = 0.4;
const SNIPER = 0.55;
const BULLET = WISP_SIZE * 0.4;
const MUZZLE = 64;
const FLASH_MS = 70;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceSpotterEvent = registerWispEvent(
  KEY,
  "Spotter",
  () => CONFIG.spotterEvent.chance,
  (floor, context, area) => {
    const { callsMs, aimMs, holdMs, mergeMs } = CONFIG.spotterEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const nest: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    let clock = 0;
    let from: Point = button;
    const calls = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const darts = clock;
      const marks = darts + DART_MS;
      const fires = marks + aimMs;
      const shot = aimBullet(nest, spot, fires, SPEED);
      clock = marks + lerp(callsMs, k / Math.max(1, hires.length - 1));
      const call = { hire, spot, from, darts, marks, fires, shot };
      from = spot;
      return call;
    });
    const last = calls.reduce((a, b) => (b.shot.hitAt > a.shot.hitAt ? b : a));
    const endAt = last.shot.hitAt;
    const shots = calls.map((c) => c.shot);
    const spotterAt: Point = { x: 0, y: 0 };
    const spotter = (ms: number): Point => {
      let c = calls[0];
      for (const call of calls) if (ms >= call.darts) c = call;
      const u = smoothstep(clamp01((ms - c.darts) / DART_MS));
      spotterAt.x = lerp([c.from.x, c.spot.x + 24], u);
      spotterAt.y = lerp([c.from.y, c.spot.y - 30], u);
      return spotterAt;
    };
    const nestSpot = () => nest;

    const marking = createBeats(
      calls,
      (c) => c.marks,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      calls,
      (c) => c.shot.hitAt,
      (c, k) => {
        giveHire(c.hire);
        if (c === last) {
          cover!.blast(c.spot);
          return;
        }
        cover!.burst(c.spot, 0.45);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, calls.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          marking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const c of calls)
            if (ms >= c.marks && ms < c.fires) drawAimLaser(ctx, nest, c.spot);
          drawBullets(ctx, shots, ms, now, BULLET, true);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              nest,
              Math.atan2(s.dy, s.dx),
              (ms - s.firedAt) / FLASH_MS,
              MUZZLE,
            );
          drawWispBetween(
            ctx,
            nestSpot,
            ms,
            now,
            WISP_SIZE * SNIPER,
            0.6,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            spotter,
            ms,
            now,
            WISP_SIZE * SPOTTER,
            0.9,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
