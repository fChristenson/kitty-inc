// the "Trust Fall" event (experiment: a team-building trust fall; free
// hires): it covers its crit, whose click freezes the screen while faller
// wisps pop up at the top of the screen over the empty spots, tip back and
// drop, plummeting faster and faster, and each one is caught right on its
// spot: "CAUGHT!", a pop and a jolt as a new worker forms there; one after
// another, ever quicker, the last catch landing in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "trustFall";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const TOP = 170;
const TIP_MS = 160;
const TIP = 30;
const CALL_MS = 340;
const STYLE = { fontSize: 42, strokeWidth: 8 };
const FALLER = 0.42;
const CATCH_SHAKE: [number, number] = [0.6, 1.3];

export const forceTrustFallEvent = registerWispEvent(
  KEY,
  "Trust Fall",
  () => CONFIG.trustFallEvent.chance,
  (floor, context, area) => {
    const { fallsMs, fallMs, holdMs, mergeMs } = CONFIG.trustFallEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const caught = createCritTextSprite("CAUGHT!", COLOR.heavenlyGold, STYLE);
    let clock = 0;
    const falls = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const perch: Point = { x: spot.x, y: area.top + TOP };
      const appears = clock;
      const drops = appears + TIP_MS;
      const lands = drops + fallMs;
      clock += lerp(fallsMs, k / Math.max(1, hires.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        appears,
        lands,
        at: (ms: number): Point => {
          if (ms < drops) {
            // tipping back on its heels
            const t = clamp01((ms - appears) / TIP_MS);
            at.x = perch.x - Math.sin(t * Math.PI * 0.5) * TIP;
            at.y = perch.y;
            return at;
          }
          const u = easeIn(clamp01((ms - drops) / fallMs));
          at.x = lerp([perch.x - TIP, spot.x], u);
          at.y = lerp([perch.y, spot.y], u);
          return at;
        },
      };
    });
    const last = falls.reduce((a, b) => (b.lands > a.lands ? b : a));
    const endAt = last.lands;

    const catching = createBeats(
      falls,
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
        shakeScreen(lerp(CATCH_SHAKE, k / Math.max(1, falls.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => catching.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + CALL_MS) return;
          for (const f of falls) {
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * FALLER,
              0.7,
              f.appears,
              f.lands,
            );
            const c = (ms - f.lands) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              caught,
              f.spot.x,
              f.spot.y - 70,
              (f === last ? 1.4 : 1) * (1 + 0.4 * (1 - clamp01(c * 3))),
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
