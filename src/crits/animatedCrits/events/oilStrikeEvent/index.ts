// the "Oil Strike" event (drill; cash): it covers its crit, whose click
// freezes the screen while a drill head plunges down onto the bottom of the
// screen and bores into it, shove by shove, sparks and chips spraying up
// out of the hole, every shove a jolt; it strikes cash, and a gusher of
// coins roars up out of the hole and arcs over into the total; three wells
// are sunk one after another, each quicker and each gusher bigger, the last
// striking in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { bezier } from "../../../../shared/curves";
import { drawDrill, planDrill, type Drill } from "../../../../shared/drill";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "oilStrike";
const REWARD = 4;
const WELLS = [0.25, 0.75, 0.5];
const LOW = 50;
const DROP = 320;
const GUSH = 380;
const DRILL = WISP_SIZE * 1.2;
const SPRAY = 30;
const PUSH_SHAKE = 0.35;
const STRIKE_SHAKE: [number, number] = [0.9, 1.6];

interface Well {
  drill: Drill;
  hole: Point;
  river: Point[];
  pour: Pour;
}

export const forceOilStrikeEvent = registerWispEvent(
  KEY,
  "Oil Strike",
  () => CONFIG.oilStrikeEvent.chance,
  (floor, context, area) => {
    const { approachMs, boresMs, holdMs, mergeMs } = CONFIG.oilStrikeEvent;
    const width = area.right - area.left;
    const total = totalSpot(area);
    const into: Point = { x: 0, y: 0 };
    let clock = 0;
    const wells: Well[] = WELLS.map((share, k) => {
      const hole: Point = {
        x: area.left + width * share,
        y: area.bottom - LOW,
      };
      const drill = planDrill(
        { x: hole.x + (k % 2 ? 40 : -40), y: hole.y - DROP },
        hole,
        {
          approachMs,
          boreMs: lerp(boresMs, k / (WELLS.length - 1)),
          pushes: 4,
          reach: 24,
          startMs: clock,
        },
      );
      clock = drill.through + 120;
      // straight up out of the hole, then arcing over into the total
      const peak: Point = { x: hole.x, y: hole.y - GUSH * (1 + 0.3 * k) };
      const river = sampleLine(
        (u) => ({ ...bezier(hole, peak, total, u, into) }),
        30,
      );
      const pour: Pour = {
        coinsAlong: 180 + 60 * k,
        width: 30 + 10 * k,
        streamMs: 420,
        travelMs: 650,
      };
      return { drill, hole, river, pour };
    });
    const last = wells[wells.length - 1];
    const endAt = last.drill.through;
    const pushes = wells.flatMap((w) => w.drill.pushes.slice(0, -1));

    const pushing = createBeats(
      pushes,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PUSH_SHAKE);
      },
    );
    const striking = createBeats(
      wells,
      (w) => w.drill.through,
      (w, k) => {
        pourLine(cover!, w.river, w.pour);
        cover!.launchFrom(
          w.hole,
          clampTargetsY(
            sprayTargets(w.hole, SPRAY, [80, 260], -Math.PI / 2, Math.PI * 0.8),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        if (w === last) {
          cover!.blast(w.hole);
          return;
        }
        cover!.burst(w.hole, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (wells.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: pourDurationMs(endAt, last.pour) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pushing.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0) return;
          for (const w of wells) drawDrill(ctx, w.drill, ms, now, DRILL);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
