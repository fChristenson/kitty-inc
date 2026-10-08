// the "Genie" event (mix; free hires and cash): it covers its crit, whose
// click freezes the screen while a river of cash spirals up out of the
// clicked floor's button like smoke from a lamp, and at its top a genie
// wisp swells into being; the genie flings a river of cash in an arc down
// onto every empty spot, each landing with a flash, a pop and a jolt as a
// new worker forms there; the last lands in a huge blast and shake as the
// cash sweeps into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "genie";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const TOP = 220;
const TURNS = 2.5;
const SWIRL = 60;
const LOFT = 140;
const GENIE = 1;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceGenieEvent = registerWispEvent(
  KEY,
  "Genie",
  () => CONFIG.genieEvent.chance,
  (floor, context, area) => {
    const { riseMs, flingsMs, flightMs, holdMs, mergeMs } = CONFIG.genieEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const genie: Point = {
      x: (button.x + (area.left + area.right) / 2) / 2,
      y: area.top + TOP,
    };
    // smoke out of the lamp: a widening spiral up to the genie
    const smoke = sampleLine(
      (u) => ({
        x:
          lerp([button.x, genie.x], u) +
          Math.sin(u * TURNS * Math.PI * 2) * SWIRL * u,
        y: lerp([button.y, genie.y], u),
      }),
      80,
    );
    const rise: Pour = {
      coinsAlong: 380,
      width: 34,
      streamMs: riseMs * 0.8,
      travelMs: riseMs,
    };
    const fling: Pour = {
      coinsAlong: 260,
      width: 24,
      streamMs: flightMs * 0.6,
      travelMs: flightMs,
    };
    const into: Point = { x: 0, y: 0 };
    let clock: number = riseMs;
    const flings = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const ctrl: Point = {
        x: (genie.x + spot.x) / 2,
        y: Math.min(genie.y, spot.y) - LOFT,
      };
      const line = sampleLine(
        (u) => ({ ...bezier(genie, ctrl, spot, u, into) }),
        40,
      );
      const starts = clock;
      clock += lerp(flingsMs, k / Math.max(1, hires.length - 1));
      return { hire, spot, line, starts, lands: starts + flightMs };
    });
    const last = flings[flings.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(last.starts, fling),
      endAt + holdMs + mergeMs,
    );
    const genieAt = (): Point => genie;

    const rising = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, smoke, rise),
    );
    const flinging = createBeats(
      flings,
      (f) => f.starts,
      (f) => {
        pourLine(cover!, f.line, fling);
        if (cover?.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      flings,
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
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, flings.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          rising.tick(ms, now);
          flinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          const swell = clamp01((ms - riseMs * 0.6) / (riseMs * 0.4));
          drawWispBetween(
            ctx,
            genieAt,
            ms,
            now,
            WISP_SIZE * GENIE * swell,
            swell,
            riseMs * 0.6,
            last.starts + 100,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
