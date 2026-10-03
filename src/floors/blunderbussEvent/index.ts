// the "Blunderbuss" event (mix; cash): it covers its crit, whose click
// freezes the screen while a gun wisp leaps out of the clicked floor's
// button and fires a blunderbuss blast: a cone of short rivers of cash
// sprays out of its muzzle in a flash, a bang and a jolt, and the recoil
// kicks the gun back across the screen; it swings round and fires again
// from where it landed, and again, ever faster, ricocheting across the
// screen on its own recoil, until a last double-wide blast sprays cash
// everywhere in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { drawMuzzleFlash } from "../../shared/bullets";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, type Pour } from "../cashFlow";

const KEY = "blunderbuss";
const REWARD = 4;
const SHOTS = 5;
const EDGE = 90;
const TOP = 200;
const PELLETS = 5;
const FINAL_PELLETS = 9;
const SPREAD = 0.7;
const FINAL_SPREAD = 1.6;
const RANGE: [number, number] = [170, 250];
const STEPS = 10;
const RECOIL = 0.6;
const FLASH_MS = 140;
const FLASH = 70;
const GUN = 0.6;
const SHOT_SHAKE: [number, number] = [0.8, 1.4];

export const forceBlunderbussEvent = registerWispEvent(
  KEY,
  "Blunderbuss",
  () => CONFIG.blunderbussEvent.chance,
  (floor, context, area) => {
    const { shotsMs, kickMs, holdMs, mergeMs } = CONFIG.blunderbussEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + TOP,
      bottom: area.bottom - EDGE,
    };
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    const pour: Pour = {
      coinsAlong: 90,
      width: 14,
      streamMs: 110,
      travelMs: 240,
    };
    let clock = 0;
    let spot: Point = {
      x: Math.min(box.right, Math.max(box.left, button.x)),
      y: Math.min(box.bottom, Math.max(box.top, button.y)),
    };
    const shots = Array.from({ length: SHOTS }, (_, s) => {
      const final = s === SHOTS - 1;
      // aim roughly through the middle, so the recoil carries it across
      const aim =
        Math.atan2(cy - spot.y, cx - spot.x) + (Math.random() - 0.5) * 0.8;
      const fires = clock + (s === 0 ? kickMs : 0);
      const count = final ? FINAL_PELLETS : PELLETS;
      const spread = final ? FINAL_SPREAD : SPREAD;
      const from = spot;
      const lines = Array.from({ length: count }, (_, p) => {
        const a = aim + spread * (p / (count - 1) - 0.5);
        const reach = lerp(RANGE, Math.random()) * (final ? 1.3 : 1);
        return Array.from(
          { length: STEPS + 1 },
          (_, i): Point => ({
            x: from.x + Math.cos(a) * reach * (i / STEPS),
            y: from.y + Math.sin(a) * reach * (i / STEPS),
          }),
        );
      });
      const kick =
        Math.hypot(box.right - box.left, box.bottom - box.top) * RECOIL * 0.5;
      const to: Point = {
        x: Math.min(
          box.right,
          Math.max(box.left, from.x - Math.cos(aim) * kick),
        ),
        y: Math.min(
          box.bottom,
          Math.max(box.top, from.y - Math.sin(aim) * kick),
        ),
      };
      clock = fires + (final ? 0 : lerp(shotsMs, s / (SHOTS - 2)));
      spot = to;
      return { from, to, aim, fires, lines, final };
    });
    const last = shots[SHOTS - 1];
    const endAt = last.fires;
    const durationMs = Math.max(
      pourDurationMs(endAt, pour),
      endAt + holdMs + mergeMs,
    );
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      if (ms < shots[0].fires) {
        const u = easeOut(ms / shots[0].fires);
        gunAt.x = lerp([button.x, shots[0].from.x], u);
        gunAt.y = lerp([button.y, shots[0].from.y], u);
        return gunAt;
      }
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.fires) s = shot;
      const u = easeOut(clamp01((ms - s.fires) / kickMs));
      gunAt.x = lerp([s.from.x, s.to.x], u);
      gunAt.y = lerp([s.from.y, s.to.y], u);
      return gunAt;
    };

    const firing = createBeats(
      shots,
      (s) => s.fires,
      (s, k) => {
        for (const line of s.lines) pourLine(cover!, line, pour);
        if (s.final) {
          cover!.blast(s.from);
          return;
        }
        cover!.burst(s.from, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOT_SHAKE, k / (SHOTS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => firing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLASH_MS) return;
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              s.from,
              s.aim,
              (ms - s.fires) / FLASH_MS,
              s.final ? FLASH * 2 : FLASH,
            );
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
