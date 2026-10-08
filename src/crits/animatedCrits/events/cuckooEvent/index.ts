// the "Cuckoo" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a cuckoo wisp springs out of the clicked floor's
// button on a boing, bobbing in and out three times, then gets catapulted
// in a high arc across the screen onto an empty spot, landing with a bang
// and a jolt as a new worker forms there; the next cuckoo springs out
// quicker, the last landing in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "cuckoo";
const MAX_HIRES = 6;
const FORM_MS = 300;
const BOINGS = 3;
const BOING = 70;
const ARC = 260;
const LIFT = 20;
const WISP = 0.55;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceCuckooEvent = registerWispEvent(
  KEY,
  "Cuckoo",
  () => CONFIG.cuckooEvent.chance,
  (floor, context) => {
    const { boingsMs, flightMs, holdMs, mergeMs } = CONFIG.cuckooEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const birds = hires.map((hire, k) => {
      const t = k / Math.max(1, hires.length - 1);
      const pops = clock;
      const flies = pops + lerp(boingsMs, t);
      const lands = flies + lerp(flightMs, t);
      clock = flies + lerp(flightMs, t) * 0.5;
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        pops,
        flies,
        lands,
        at: (ms: number): Point => {
          if (ms < flies) {
            const u = clamp01((ms - pops) / (flies - pops));
            at.x = button.x;
            at.y =
              button.y -
              BOING * Math.abs(Math.sin(Math.PI * BOINGS * u)) * (0.5 + u);
            return at;
          }
          const u = clamp01((ms - flies) / (lands - flies));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u) - Math.sin(Math.PI * u) * ARC;
          return at;
        },
      };
    });
    const last = birds[birds.length - 1];
    const endAt = Math.max(...birds.map((b) => b.lands));
    const boings = birds.flatMap((b) =>
      Array.from(
        { length: BOINGS },
        (_, i) => b.pops + ((i + 0.5) / BOINGS) * (b.flies - b.pops),
      ),
    );

    const boinging = createBeats(
      boings,
      (ms) => ms,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      birds,
      (b) => b.lands,
      (b, k) => {
        giveHire(b.hire);
        if (b === last) {
          cover!.blast(b.spot);
          return;
        }
        cover!.burst(b.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, birds.length - 1)));
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
          boinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const b of birds)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * WISP,
              0.6,
              b.pops,
              b.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
