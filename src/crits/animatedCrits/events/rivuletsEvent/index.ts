// the "Rivulets" event (money; free hires and cash): it covers its crit,
// whose click freezes the screen while, for every empty spot in view, two
// thin trickles of cash run in from the screen's left and right edges,
// wriggling along the floor toward it; where each pair meets they splash
// together with a bang and a jolt and a new worker forms in the puddle;
// pair after pair, quicker each time, the last meeting in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "rivulets";
const REWARD = 2;
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
const WRIGGLE = 26;
const WRIGGLES = 3;
const MEET_SHAKE: [number, number] = [0.6, 1.3];

export const forceRivuletsEvent = registerWispEvent(
  KEY,
  "Rivulets",
  () => CONFIG.rivuletsEvent.chance,
  (floor, context, area) => {
    const { gapsMs, runMs, holdMs, mergeMs } = CONFIG.rivuletsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const pour: Pour = {
      coinsAlong: 140,
      width: 18,
      streamMs: runMs * 0.6,
      travelMs: runMs,
    };
    let clock = 0;
    const meets = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const lines = [area.left, area.right].map((edge, side) =>
        sampleLine(
          (u): Point => ({
            x: lerp([edge, spot.x], u),
            y:
              spot.y +
              Math.sin(u * Math.PI * WRIGGLES + side * 2) * WRIGGLE * (1 - u),
          }),
          30,
        ),
      );
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      return { hire, spot, lines, starts, meets: starts + runMs };
    });
    const last = meets[meets.length - 1];
    const endAt = last.meets;
    const durationMs = Math.max(
      pourDurationMs(last.starts, pour),
      endAt + holdMs + mergeMs,
    );

    const running = createBeats(
      meets,
      (m) => m.starts,
      (m) => {
        for (const line of m.lines) pourLine(cover!, line, pour);
      },
    );
    const meeting = createBeats(
      meets,
      (m) => m.meets,
      (m, k) => {
        giveHire(m.hire);
        if (m === last) {
          cover!.blast(m.spot);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(m.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(MEET_SHAKE, k / Math.max(1, meets.length - 1)));
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
          running.tick(ms, now);
          meeting.tick(ms, now);
        },
        drawOver: (ctx, _ms, now) => drawRewardHires(ctx, hires, now, FORM_MS),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
