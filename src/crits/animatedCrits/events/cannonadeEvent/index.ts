// the "Cannonade" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a cannon wisp rolls out of the clicked
// floor's button to the screen's side and fires: each shot a muzzle flash
// and a boom as a fizzing cannonball wisp sails high over the screen and
// comes down onto an income bar in a white blast, a bang and a big jolt
// that jumps the bar a crit tier; it fires again and again, ever faster,
// bar after bar; the last shell slams every bar in a huge blast and shake.
// Then the crit's tier pays out
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
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "cannonade";
const MAX_BARS = 3;
// the cannon sits EDGE px in from the side, LOW of the way down; shells
// arc LOFT px over the higher end
const EDGE = 40;
const LOW = 0.82;
const LOFT = 260;
const CANNON = 0.75;
const BALL = 0.45;
const FUSE = 22;
const MUZZLE = 70;
const FLASH_MS = 110;
const BLAST = 200;
const RECOIL = 14;
const HIT_SHAKE: [number, number] = [1, 1.6];

export const forceCannonadeEvent = registerWispEvent(
  KEY,
  "Cannonade",
  () => CONFIG.cannonadeEvent.chance,
  (floor, context, area) => {
    const { rollMs, gapsMs, flightMs, holdMs, mergeMs } = CONFIG.cannonadeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const leftSide = button.x > (area.left + area.right) / 2;
    const cannon: Point = {
      x: leftSide ? area.left + EDGE : area.right - EDGE,
      y: area.top + (area.bottom - area.top) * LOW,
    };
    let clock: number = rollMs;
    const shots = bars.map((bar, k) => {
      const fired = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const hit: Point = {
        x: bar.box.x + bar.box.width * (0.35 + 0.3 * Math.random()),
        y: bar.center.y,
      };
      const ctrl: Point = {
        x: (cannon.x + hit.x) / 2,
        y: Math.max(area.top - 60, Math.min(cannon.y, hit.y) - LOFT),
      };
      const at: Point = { x: 0, y: 0 };
      const lands = fired + flightMs;
      return {
        bar,
        hit,
        fired,
        lands,
        angle: Math.atan2(ctrl.y - cannon.y, ctrl.x - cannon.x),
        at: (ms: number): Point | null =>
          ms < fired || ms >= lands
            ? null
            : bezier(cannon, ctrl, hit, (ms - fired) / flightMs, at),
      };
    });
    const last = shots[shots.length - 1];
    const endAt = last.lands;
    const cannonAt: Point = { x: 0, y: 0 };
    const cannonWisp = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const u = easeOut(Math.min(1, ms / rollMs));
      let kick = 0;
      for (const s of shots) {
        const t = (ms - s.fired) / 200;
        if (t > 0 && t < 1) kick = Math.max(kick, 1 - t);
      }
      cannonAt.x =
        lerp([button.x, cannon.x], u) + (leftSide ? -1 : 1) * kick * RECOIL;
      cannonAt.y = lerp([button.y, cannon.y], u);
      return cannonAt;
    };

    const firing = createBeats(
      shots,
      (s) => s.fired,
      () => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(0.5);
      },
    );
    const landing = createBeats(
      shots,
      (s) => s.lands,
      (s, k) => {
        cover!.tierUp(s.bar, cannon);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.hit);
          return;
        }
        cover!.burst(s.hit, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          firing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const s of shots) {
            const p = s.at(ms);
            if (p)
              drawLitFuse(
                ctx,
                p,
                clamp01((ms - s.fired) / flightMs),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * BALL,
              0.6,
              s.fired,
              s.lands,
            );
            drawMuzzleFlash(
              ctx,
              cannon,
              s.angle,
              (ms - s.fired) / FLASH_MS,
              MUZZLE,
            );
            drawDetonation(ctx, s.hit, ms - s.lands, BLAST, now);
          }
          drawWispBetween(
            ctx,
            cannonWisp,
            ms,
            now,
            WISP_SIZE * CANNON,
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
  (floor, context) => findRewardBars(floor, context).length > 0,
);
