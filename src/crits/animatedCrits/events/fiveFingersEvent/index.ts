// the "Five Fingers" event (lightning; free hires): it covers its crit,
// whose click freezes the screen while a giant hand of lightning reaches
// down from the top of the screen, a long forking bolt for each finger
// crawling down to an empty spot; finger by finger, each quicker than the
// last, a fingertip touches down in a blinding strike, a bang and a jolt as
// a new worker jolts into being, until the hand closes in a huge strike and
// blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "fiveFingers";
const MAX_HIRES = 5;
const FORM_MS = 300;
const PALM_Y = 70;
const KNUCKLE_Y = 150;
const KNUCKLE_GAP = 70;
const LIFT = 30;
const CLOSE_MS = 180;
const STRIKE_MS = 200;
const FADE_MS = 220;
const PALM = 0.7;
const TOUCH_SHAKE: [number, number] = [0.7, 1.4];

interface Finger {
  bolt: Bolt;
  root: Point;
  knuckleX: number;
  tip: Point;
  starts: number;
  touches: number;
  hire: RewardHire;
}

export const forceFiveFingersEvent = registerWispEvent(
  KEY,
  "Five Fingers",
  () => CONFIG.fiveFingersEvent.chance,
  (floor, context, area) => {
    const { reachMs, fingerMs, holdMs, mergeMs } = CONFIG.fiveFingersEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const palm: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + PALM_Y,
    };
    let clock = reachMs;
    const fingers: Finger[] = hires.map((hire, k) => {
      const knuckleX = palm.x + (k - (hires.length - 1) / 2) * KNUCKLE_GAP;
      const root: Point = { x: knuckleX, y: area.top + KNUCKLE_Y };
      const tip: Point = { x: hire.x, y: hire.y - LIFT };
      const touches = clock;
      clock += lerp(fingerMs, k / Math.max(1, hires.length - 1));
      return {
        // drawn with its end crawling down, so it starts at the knuckle
        bolt: createBolt(root, { x: tip.x, y: tip.y }, 3),
        root,
        knuckleX,
        tip,
        starts: k * 40,
        touches,
        hire,
      };
    });
    const closeFrom = fingers[fingers.length - 1].touches + 60;
    const endAt = closeFrom + CLOSE_MS;
    const centre: Point = {
      x: fingers.reduce((s, f) => s + f.tip.x, 0) / fingers.length,
      y: fingers.reduce((s, f) => s + f.tip.y, 0) / fingers.length,
    };
    const hand = (): Point => palm;

    const touching = createBeats(
      fingers,
      (f) => f.touches,
      (f, k) => {
        giveHire(f.hire);
        cover!.burst(f.tip, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TOUCH_SHAKE, k / Math.max(1, fingers.length - 1)));
      },
    );
    const closing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(centre);
        if (cover!.isLive()) playExplosion();
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
          touching.tick(ms, now);
          closing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + FADE_MS) return;
          const close = clamp01((ms - closeFrom) / CLOSE_MS);
          const fade = 1 - clamp01((ms - endAt) / FADE_MS);
          for (const f of fingers) {
            if (ms < f.starts) continue;
            const crawl = easeIn(
              clamp01((ms - f.starts) / (f.touches - f.starts)),
            );
            // the knuckles draw in to the palm as the hand closes
            f.root.x = lerp([f.knuckleX, palm.x], close);
            f.root.y = lerp([area.top + KNUCKLE_Y, palm.y], close);
            f.bolt.to.x = lerp([f.root.x, f.tip.x], crawl);
            f.bolt.to.y = lerp([f.root.y, f.tip.y], crawl);
            const touched = ms >= f.touches;
            const flicker = 0.6 + 0.4 * Math.random();
            drawBolt(
              ctx,
              f.bolt,
              (touched ? 1 : 0.75) * flicker * fade,
              (touched ? 0.9 : 0.5) * (1 + close),
            );
            const t = (ms - f.touches) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, f.tip, 1 - t, 1.6, now);
            if (close > 0) drawStrike(ctx, f.tip, close * fade, 2.4, now);
          }
          if (fade > 0)
            drawWisp(ctx, hand, ms, now, WISP_SIZE * PALM * (1 + close), close);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
