// the "Pneumatic Tubes" event (mix; free hires and cash): it covers its
// crit, whose click freezes the screen while a capsule wisp shoots out of
// the clicked floor's button riding the head of a gushing tube of cash,
// whipping round bends to an empty spot, where it pops out in a flash and a
// jolt as a new worker forms; tube after tube fires off, quicker each time,
// every one emptying its cash into the total, the last capsule landing in a
// huge blast and shake. Pays floor income × floor number × REWARD, plus the
// hires
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
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../../cashFlow";

const KEY = "pneumaticTubes";
const REWARD = 2;
const MAX_HIRES = 6;
const RISE = 120;
const SWING = 160;
const CAPSULE = 0.55;
const FORM_MS = 300;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Tube {
  hire: RewardHire;
  line: Point[];
  fires: number;
  lands: number;
  head: (ms: number) => Point | null;
}

export const forcePneumaticTubesEvent = registerWispEvent(
  KEY,
  "Pneumatic Tubes",
  () => CONFIG.pneumaticTubesEvent.chance,
  (floor, context, area) => {
    const { firesMs, travelMs, holdMs, mergeMs } = CONFIG.pneumaticTubesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const midX = (area.left + area.right) / 2;
    const pour: Pour = { coinsAlong: 150, width: 24, streamMs: 280, travelMs };
    const into: Point = { x: 0, y: 0 };
    let clock = 0;
    const tubes: Tube[] = hires.map((hire, k) => {
      // up out of the button, swinging wide, then down onto the spot
      const to: Point = { x: hire.x, y: hire.y };
      const side = hire.x < midX ? -1 : 1;
      const route: Point[] = [
        button,
        { x: button.x, y: button.y - RISE },
        {
          x: lerp([button.x, to.x], 0.5) + side * SWING,
          y: Math.min(button.y, to.y) - RISE,
        },
        { x: to.x, y: to.y - RISE * 0.6 },
        to,
      ];
      const line = sampleLine((u) => ({ ...alongRoute(route, u, into) }), 40);
      const fires = clock;
      clock += lerp(firesMs, k / Math.max(1, hires.length - 1));
      return {
        hire,
        line,
        fires,
        lands: fires + travelMs,
        head: riverHead(line, travelMs, fires),
      };
    });
    const last = tubes[tubes.length - 1];
    const endAt = last.lands;

    const firing = createBeats(
      tubes,
      (t) => t.fires,
      (t) => {
        pourLine(cover!, t.line, pour);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      tubes,
      (t) => t.lands,
      (t, k) => {
        giveHire(t.hire);
        const at = t.line[t.line.length - 1];
        if (t === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, tubes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: pourDurationMs(last.fires, pour) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          for (const t of tubes)
            drawWispBetween(
              ctx,
              t.head,
              ms,
              now,
              WISP_SIZE * CAPSULE,
              1,
              t.fires,
              t.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
