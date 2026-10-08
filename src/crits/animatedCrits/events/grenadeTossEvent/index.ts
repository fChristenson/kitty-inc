// the "Grenade Toss" event (explosion; free hires): it covers its crit,
// whose click freezes the screen while the clicked floor's button lobs
// grenade wisps one after another, fuses fizzing, each bouncing twice with
// a clunk as it skitters toward an empty spot on a floor in view; there it
// goes off in a white blast, a bang and a big jolt, and a new worker forms
// in the smoke: hired for free; the last blows in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "grenadeToss";
const MAX_HIRES = 5;
const FORM_MS = 300;
// a throw arcs LOFT px high, then bounces to BOUNCES of that, landing at
// these shares of the way to its worker
const LOFT = 180;
const BOUNCES = [0.35, 0.12];
const STOPS = [0.55, 0.85, 1];
const GRENADE = 0.4;
const FUSE = 20;
const BLAST = 140;
const BOOM_SHAKE: [number, number] = [0.8, 1.6];

export const forceGrenadeTossEvent = registerWispEvent(
  KEY,
  "Grenade Toss",
  () => CONFIG.grenadeTossEvent.chance,
  (floor, context) => {
    const { gapsMs, throwMs, holdMs, mergeMs } = CONFIG.grenadeTossEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const grenades = hires.map((hire, k) => {
      const thrown = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const booms = thrown + throwMs;
      const at: Point = { x: 0, y: 0 };
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const hops = [1, ...BOUNCES];
      return {
        hire,
        spot,
        thrown,
        booms,
        bounces: STOPS.slice(0, -1).map((s) => thrown + throwMs * s),
        at: (ms: number): Point | null => {
          if (ms < thrown || ms >= booms) return null;
          const u = (ms - thrown) / throwMs;
          // which hop: the throw, then each bounce
          let h = 0;
          while (h < STOPS.length - 1 && u > STOPS[h]) h++;
          const u0 = h === 0 ? 0 : STOPS[h - 1];
          const v = (u - u0) / (STOPS[h] - u0);
          const along = lerp([u0, STOPS[h]], v);
          at.x = lerp([button.x, spot.x], along);
          at.y =
            lerp([button.y, spot.y], along) -
            Math.sin(Math.PI * v) * LOFT * hops[h];
          return at;
        },
      };
    });
    const endAt = Math.max(...grenades.map((g) => g.booms));
    const bounces = grenades.flatMap((g) => g.bounces);

    const clunking = createBeats(
      bounces,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const booming = createBeats(
      grenades,
      (g) => g.booms,
      (g, k) => {
        giveHire(g.hire);
        if (k === grenades.length - 1) {
          cover!.blast(g.spot);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / Math.max(1, grenades.length - 1)));
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
          clunking.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + DETONATION_MS) return;
          for (const g of grenades) {
            const p = g.at(ms);
            if (p)
              drawLitFuse(
                ctx,
                p,
                clamp01((ms - g.thrown) / (g.booms - g.thrown)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              g.at,
              ms,
              now,
              WISP_SIZE * GRENADE,
              0.6,
              g.thrown,
              g.booms,
            );
            drawDetonation(ctx, g.spot, ms - g.booms, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
