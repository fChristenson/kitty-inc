// the "River Juggler" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while two hand wisps rise in the middle of
// the screen and start juggling rivers of cash: gush after gush of coins
// arcs from hand to hand in a crossing cascade, every catch a pop and a
// jolt, ever faster and higher; then the hands hurl their rivers out onto
// the income bars one after another, each splashing down with a crit tier,
// the last in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";

const KEY = "riverJuggler";
const REWARD = 2;
const MAX_BARS = 4;
const THROWS = 8;
const SPAN = 170;
const ARC: [number, number] = [160, 300];
const HAND = 0.45;
const CATCH_SHAKE = 0.25;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Throw {
  line: Point[];
  ms: number;
  lands: number;
  bar: RewardBar | null;
}

export const forceRiverJugglerEvent = registerWispEvent(
  KEY,
  "River Juggler",
  () => CONFIG.riverJugglerEvent.chance,
  (floor, context, area) => {
    const { throwsMs, flightMs, holdMs, mergeMs } = CONFIG.riverJugglerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.5,
    };
    const hands: Point[] = [
      { x: centre.x - SPAN, y: centre.y },
      { x: centre.x + SPAN, y: centre.y },
    ];
    const pour: Pour = {
      coinsAlong: 26,
      width: 16,
      streamMs: 110,
      travelMs: flightMs,
    };
    const into: Point = { x: 0, y: 0 };
    const arcLine = (from: Point, to: Point, rise: number) => {
      const bend: Point = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - rise,
      };
      return sampleLine((u) => ({ ...bezier(from, bend, to, u, into) }), 24);
    };
    let clock = 0;
    const throws: Throw[] = [];
    for (let k = 0; k < THROWS; k++) {
      const t = k / (THROWS - 1);
      const from = hands[k % 2];
      const to = hands[(k + 1) % 2];
      throws.push({
        line: arcLine(from, to, lerp(ARC, t)),
        ms: clock,
        lands: clock + flightMs,
        bar: null,
      });
      clock += lerp(throwsMs, t);
    }
    // the hurls out onto the bars, from alternate hands
    bars.forEach((bar, k) => {
      throws.push({
        line: arcLine(hands[k % 2], bar.center, ARC[1]),
        ms: clock,
        lands: clock + flightMs,
        bar,
      });
      clock += throwsMs[1];
    });
    const hurls = throws.filter((t) => t.bar);
    const last = hurls[hurls.length - 1];
    const lastThrow = throws[throws.length - 1].ms;
    const endAt = last.lands;
    const handAts = hands.map((h, side) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        // a dip at every catch and throw
        spot.x = h.x;
        spot.y = h.y + Math.sin(Math.max(0, ms) * 0.025 + side * Math.PI) * 10;
        return spot;
      };
    });

    const throwing = createBeats(
      throws,
      (t) => t.ms,
      (t) => pourLine(cover!, t.line, pour),
    );
    const catching = createBeats(
      throws.filter((t) => !t.bar),
      (t) => t.lands,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CATCH_SHAKE);
      },
    );
    const landing = createBeats(
      hurls,
      (t) => t.lands,
      (t, k) => {
        const bar = t.bar!;
        cover!.tierUp(bar, bar.center);
        if (t === last) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hurls.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt, pourDurationMs(lastThrow, pour)) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          throwing.tick(ms, now);
          catching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const at of handAts)
            drawWisp(ctx, at, ms, now, WISP_SIZE * HAND, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
