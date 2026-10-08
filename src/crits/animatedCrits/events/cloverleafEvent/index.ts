// the "Cloverleaf" event (money; cash): it covers its crit, whose click
// freezes the screen while a river of cash shoots out of the clicked floor's
// button into the middle of the screen and loops out and back in a giant
// four-leaf clover, petal after petal, each tip it swings round a splash, a
// bloop and a jolt, harder each time; as it closes the last petal it bursts
// in the middle in a huge blast and shake and the coins sweep into the
// total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "cloverleaf";
const REWARD = 4;
// petals reach REACH of the screen's half-width; the lead-in from the button
// takes LEAD steps and the clover STEPS
const REACH = 0.85;
const SQUASH = 1.1;
const LEAD = 16;
const STEPS = 200;
const TIP_SHAKE: [number, number] = [0.5, 1.3];

export const forceCloverleafEvent = registerWispEvent(
  KEY,
  "Cloverleaf",
  () => CONFIG.cloverleafEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.cloverleafEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const r = ((area.right - area.left) / 2) * REACH;
    const line: Point[] = [];
    for (let i = 0; i <= LEAD; i++)
      line.push({
        x: lerp([button.x, center.x], i / LEAD),
        y: lerp([button.y, center.y], i / LEAD),
      });
    // a rose r·cos 2θ from the middle round its four petals and back
    const tipIndex: number[] = [];
    for (let i = 1; i <= STEPS; i++) {
      const theta = Math.PI / 4 + (i / STEPS) * Math.PI * 2;
      const rose = r * Math.cos(2 * theta);
      line.push({
        x: center.x + rose * Math.cos(theta),
        y: center.y + rose * Math.sin(theta) * SQUASH,
      });
      if (i % (STEPS / 4) === STEPS / 8) tipIndex.push(line.length - 1);
    }
    const along = measure(line);
    const length = along[along.length - 1];
    const tips = tipIndex.map((i) => ({
      at: line[i],
      ms: (along[i] / length) * travelMs,
    }));
    const pour: Pour = { coinsAlong: 1_400, width: 36, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );

    const swinging = createBeats(
      tips,
      (t) => t.ms,
      (t, k) => {
        cover!.burst(t.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TIP_SHAKE, k / (tips.length - 1)));
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          swinging.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
