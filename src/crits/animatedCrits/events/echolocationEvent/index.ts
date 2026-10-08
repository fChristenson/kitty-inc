// the "Echolocation" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while a bat wisp flits out of the clicked
// floor's button and pings: a ring of sound sweeps out of it across the
// screen, and the moment it finds an empty spot the bat swoops down onto it
// with a pop and a jolt as a new worker forms there; ping after ping, swoop
// after swoop, ever quicker, the last landing in a huge blast and shake.
// Then the crit's tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "echolocation";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 30;
const PERCH = 120;
const SIDES = 16;
const RING_WIDTH = 7;
const BAT = 0.42;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceEcholocationEvent = registerWispEvent(
  KEY,
  "Echolocation",
  () => CONFIG.echolocationEvent.chance,
  (floor, context) => {
    const { pingMs, swoopsMs, holdMs, mergeMs } = CONFIG.echolocationEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const finds = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const pings = clock;
      const swoops = pings + pingMs;
      const lands = swoops + lerp(swoopsMs, k / Math.max(1, hires.length - 1));
      clock = lands;
      const reach = Math.hypot(spot.x - from.x, spot.y - from.y) + 40;
      const ring = Array.from({ length: SIDES + 1 }, () => ({ x: 0, y: 0 }));
      const find = { hire, spot, from, pings, swoops, lands, reach, ring };
      from = { x: spot.x, y: spot.y - PERCH };
      return find;
    });
    const last = finds[finds.length - 1];
    const endAt = last.lands;
    const batAt: Point = { x: 0, y: 0 };
    const bat = (ms: number): Point => {
      let f = finds[0];
      for (const find of finds) if (ms >= find.pings) f = find;
      if (ms < f.swoops) {
        // hovering, flitting, while it listens
        batAt.x = f.from.x + Math.sin(ms / 45) * 8;
        batAt.y = f.from.y + Math.cos(ms / 60) * 6;
        return batAt;
      }
      const u = clamp01((ms - f.swoops) / (f.lands - f.swoops));
      batAt.x = lerp([f.from.x, f.spot.x], easeOut(u));
      batAt.y = lerp([f.from.y, f.spot.y], easeIn(u));
      return batAt;
    };

    const pinging = createBeats(
      finds,
      (f) => f.pings,
      () => {
        if (cover?.isLive()) shakeScreen(0.3);
      },
    );
    const swooping = createBeats(
      finds,
      (f) => f.swoops,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      finds,
      (f) => f.lands,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        cover!.burst(f.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, finds.length - 1)));
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
          pinging.tick(ms, now);
          swooping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const f of finds) {
            const t = (ms - f.pings) / pingMs;
            if (t < 0 || t >= 1) continue;
            const r = f.reach * easeOut(t);
            for (let i = 0; i <= SIDES; i++) {
              const a = (i / SIDES) * Math.PI * 2;
              f.ring[i].x = f.from.x + Math.cos(a) * r;
              f.ring[i].y = f.from.y + Math.sin(a) * r;
            }
            for (let i = 1; i <= SIDES; i++)
              drawBeam(
                ctx,
                f.ring[i - 1],
                f.ring[i],
                RING_WIDTH,
                (1 - t) * 0.8,
              );
          }
          drawWispBetween(ctx, bat, ms, now, WISP_SIZE * BAT, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
