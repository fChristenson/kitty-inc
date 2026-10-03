// the "Duck Duck Goose" event (experiment: the playground game; worker
// perma tiers): it covers its crit, whose click freezes the screen while a
// tapper wisp skips out of the clicked floor's button and round the workers,
// tapping each one on the head: "DUCK!", a pop and a jolt as the worker
// climbs a perma tier; ever quicker, until the last tap is "GOOSE!": the
// goose bursts up as a wisp and chases the tapper round in a tight loop,
// catching it in a huge blast and shake as that worker climbs too. Then the
// crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import { findRewardWorkers } from "../eventRewards";
import { COLOR } from "../../palette";

const KEY = "duckDuckGoose";
const MAX_WORKERS = 6;
const ABOVE = 50;
const HOP = 70;
const LOOP = 90;
const CALL_MS = 340;
const STYLE = { fontSize: 40, strokeWidth: 7 };
const TAPPER = 0.4;
const GOOSE = 0.5;
const TAP_SHAKE: [number, number] = [0.4, 0.9];

export const forceDuckDuckGooseEvent = registerWispEvent(
  KEY,
  "Duck Duck Goose",
  () => CONFIG.duckDuckGooseEvent.chance,
  (floor, context) => {
    const { tapsMs, chaseMs, holdMs, mergeMs } = CONFIG.duckDuckGooseEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const duck = createCritTextSprite("DUCK!", COLOR.heavenlyGold, STYLE);
    const goose = createCritTextSprite("GOOSE!", COLOR.heavenlyGold, {
      fontSize: 60,
      strokeWidth: 9,
    });
    let clock = 0;
    let from: Point = button;
    const taps = workers.map((worker, k) => {
      const head: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const ctrl: Point = {
        x: (from.x + head.x) / 2,
        y: Math.min(from.y, head.y) - HOP,
      };
      const leaves = clock;
      clock += lerp(tapsMs, k / Math.max(1, workers.length - 1));
      const a = from;
      from = head;
      return {
        worker,
        head,
        a,
        ctrl,
        leaves,
        taps: clock,
        last: k === workers.length - 1,
      };
    });
    const last = taps[taps.length - 1];
    const endAt = last.taps + chaseMs;
    // the chase: both round a loop over the goose, the goose gaining
    const hub: Point = { x: last.head.x, y: last.head.y - LOOP };
    const tapperAt: Point = { x: 0, y: 0 };
    const tapper = (ms: number): Point => {
      if (ms >= last.taps) {
        const u = clamp01((ms - last.taps) / chaseMs);
        const a = Math.PI / 2 + u * Math.PI * 2.5;
        tapperAt.x = hub.x + Math.cos(a) * LOOP;
        tapperAt.y = hub.y + Math.sin(a) * LOOP;
        return tapperAt;
      }
      let t = taps[0];
      for (const tap of taps) if (ms >= tap.leaves) t = tap;
      return bezier(
        t.a,
        t.ctrl,
        t.head,
        clamp01((ms - t.leaves) / (t.taps - t.leaves)),
        tapperAt,
      );
    };
    const gooseAt: Point = { x: 0, y: 0 };
    const goosePath = (ms: number): Point => {
      const u = clamp01((ms - last.taps) / chaseMs);
      const a = Math.PI / 2 + u * Math.PI * 2.5 - (1 - u) * 1.4;
      gooseAt.x = hub.x + Math.cos(a) * LOOP;
      gooseAt.y = hub.y + Math.sin(a) * LOOP;
      return gooseAt;
    };

    const tapping = createBeats(
      taps,
      (t) => t.taps,
      (t, k) => {
        cover!.promote(t.worker);
        cover!.burst(t.head, t.last ? 0.8 : 0.35);
        if (!cover!.isLive()) return;
        if (t.last) {
          playSwoosh();
          shakeScreen(1.1);
          return;
        }
        playBloop();
        shakeScreen(lerp(TAP_SHAKE, k / Math.max(1, taps.length - 1)));
      },
    );
    const caught = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(tapper(endAt));
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
        workers,
        tick: (ms, now) => {
          tapping.tick(ms, now);
          caught.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const t of taps) {
            const c = (ms - t.taps) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              t.last ? goose : duck,
              t.head.x,
              t.head.y - 40,
              1 + 0.4 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
          drawWispBetween(
            ctx,
            tapper,
            ms,
            now,
            WISP_SIZE * TAPPER,
            0.8,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            goosePath,
            ms,
            now,
            WISP_SIZE * GOOSE,
            1,
            last.taps,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
