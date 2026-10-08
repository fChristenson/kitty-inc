// the "Cat Sketch" event (lightning; free hires): it covers its crit, whose
// click freezes the screen while bolts crack down out of the sky over an
// empty spot, each strike scorching a few glowing dots, faster and faster,
// until the dots make a cat's head; the sketch blazes and drops onto the
// spot as a new worker, and the bolts move on to sketch the next one, the
// last landing in a big blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { drawDots, shapeOutline, SHAPES } from "../../../../shared/drawing";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "catSketch";
const MAX_SKETCHES = 3;
const DOTS = 48;
const STRIKES = 8;
const DOT = 9;
// each sketch this big, this high over its spot
const SIZE = 70;
const ABOVE = 120;
const BOLT_MS = 90;
const STRIKE_SHAKE: [number, number] = [0.3, 0.7];
const DROP_SHAKE = 0.8;

interface Sketch {
  hire: RewardHire;
  centre: Point;
  dots: Point[];
  strikes: { ms: number; at: Point; bolt: Bolt; upTo: number }[];
  doneAt: number;
  lands: number;
}

export const forceCatSketchEvent = registerWispEvent(
  KEY,
  "Cat Sketch",
  () => CONFIG.catSketchEvent.chance,
  (floor, context, area) => {
    const { strikeMs, blazeMs, dropMs, gapMs, holdMs, mergeMs } =
      CONFIG.catSketchEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_SKETCHES);
    if (hires.length === 0) return;
    let clock = 0;
    const sketches: Sketch[] = hires.map((hire, s) => {
      const centre: Point = { x: hire.x, y: hire.y - ABOVE };
      const dots = shapeOutline(SHAPES.catHead, DOTS, centre, SIZE);
      const span =
        strikeMs * lerp([1.2, 0.7], s / Math.max(1, hires.length - 1));
      const strikes = Array.from({ length: STRIKES }, (_, k) => {
        const ms = clock + span * (1 - (1 - (k + 1) / STRIKES) ** 1.5);
        const upTo = Math.round(((k + 1) * DOTS) / STRIKES);
        const at =
          dots[Math.min(DOTS - 1, Math.round(((k + 0.5) * DOTS) / STRIKES))];
        const from: Point = {
          x: at.x + (Math.random() - 0.5) * 300,
          y: area.top - 60,
        };
        return { ms, at, bolt: createBolt(from, at, 2), upTo };
      });
      const doneAt = strikes[STRIKES - 1].ms;
      const lands = doneAt + blazeMs + dropMs;
      clock = lands + gapMs;
      return { hire, centre, dots, strikes, doneAt, lands };
    });
    const last = sketches[sketches.length - 1];
    const endMs = last.lands;
    const allStrikes = sketches.flatMap((s) => s.strikes);

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const striking = createBeats(
      allStrikes,
      (s) => s.ms,
      (s, k) => {
        cover!.burst(s.at, 0.25);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, (k % STRIKES) / (STRIKES - 1)));
      },
    );
    const landing = createBeats(
      sketches,
      (s) => s.lands,
      (s) => {
        giveHire(s.hire);
        const at = { x: s.hire.x, y: s.hire.y };
        if (s === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.9);
        if (cover!.isLive()) shakeScreen(DROP_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          opening.tick(ms, now);
          striking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          for (const s of sketches) {
            if (ms >= s.lands || ms < s.strikes[0].ms) continue;
            // each strike's dots crackle into place along the outline
            let upTo = 0;
            let before = 0;
            for (const st of s.strikes) {
              if (ms < st.ms) break;
              upTo =
                before + (st.upTo - before) * clamp01((ms - st.ms) / BOLT_MS);
              before = st.upTo;
            }
            const drop = easeIn(clamp01((ms - s.doneAt - blazeMs) / dropMs));
            ctx.save();
            ctx.translate(0, ABOVE * drop);
            ctx.translate(s.centre.x, s.centre.y);
            ctx.scale(1 - 0.5 * drop, 1 - 0.5 * drop);
            ctx.translate(-s.centre.x, -s.centre.y);
            drawDots(
              ctx,
              s.dots,
              Math.round(upTo),
              DOT,
              ms,
              clamp01((ms - s.doneAt) / 120),
            );
            ctx.restore();
            for (const st of s.strikes) {
              const t = (ms - st.ms) / BOLT_MS;
              if (t < 0 || t > 1) continue;
              drawBolt(ctx, st.bolt, 1 - t);
              drawStrike(ctx, st.at, 1 - t, 0.8, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
