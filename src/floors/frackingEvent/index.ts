// the "Fracking" event (drill; a crit tier): it covers its crit, whose click
// freezes the screen while a drill head screams down out of the sky beside
// the clicked floor's bar and swings round in a tight curve to drive in
// sideways at its end; it stalls there like a bit on hard steel, grinding
// and juddering in a gush of white-hot sparks, then bores along inside the
// bar shove by shove, every shove a jolt; once it's through, the bar
// fractures along its length in a rolling chain of blasts, each its own
// bang and shake, the last a huge one as the bar jumps a crit tier. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDrillHead,
  drawGrind,
  planDrill,
  planGrind,
} from "../../shared/drill";
import { drawDetonation } from "../../shared/explosion";
import { findRewardBars } from "../eventRewards";

const KEY = "fracking";
const SIZE = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
// the curve's radius, how far left of the bar it comes out of it, and how
// far into the bar it bites and bores
const R = 170;
const LEAD = 70;
const BITE = 24;
const BORE = 0.6;
const PUSHES = 8;
const SPIN = 7;
const FRACTURES = 5;
const FRACTURE_SIZES: [number, number] = [200, 300];
const FRACTURE_SHAKE: [number, number] = [0.8, 1.5];
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceFrackingEvent = registerWispEvent(
  KEY,
  "Fracking",
  () => CONFIG.frackingEvent.chance,
  (floor, context, area) => {
    const { curveMs, stallMs, boreMs, fractureMs, holdMs, mergeMs } =
      CONFIG.frackingEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const y = bar.center.y;
    const left = bar.box.x;
    // down a column left of the bar, round a quarter turn onto its line
    const centre: Point = { x: left - LEAD, y: y - R };
    const top: Point = { x: centre.x - R, y: area.top - 80 };
    const drop = centre.y - top.y;
    const curve = drop + (Math.PI / 2) * R;
    const tip: Point = { x: 0, y: 0 };
    let heading = Math.PI / 2;
    const curveAt = (ms: number): Point => {
      const s = curve * easeIn(clamp01(ms / curveMs));
      if (s <= drop) {
        tip.x = top.x;
        tip.y = top.y + s;
        heading = Math.PI / 2;
        return tip;
      }
      const a = Math.PI - (s - drop) / R;
      tip.x = centre.x + Math.cos(a) * R;
      tip.y = centre.y + Math.sin(a) * R;
      heading = a - Math.PI / 2;
      return tip;
    };
    const target: Point = { x: left + BITE, y };
    const drill = planDrill({ x: left - LEAD, y }, target, {
      approachMs: 70,
      boreMs,
      pushes: PUSHES,
      reach: bar.box.width * BORE,
      startMs: curveMs,
    });
    const grind = planGrind(drill, stallMs);
    const { bites, pushes, rumbles, through } = grind;
    const fractures = Array.from({ length: FRACTURES }, (_, k) => {
      const t = k / (FRACTURES - 1);
      return {
        at: { x: lerp([left + BITE, bar.box.x + bar.box.width - 40], t), y },
        ms: through + k * fractureMs,
        size: lerp(FRACTURE_SIZES, t),
        shake: lerp(FRACTURE_SHAKE, t),
        last: k === FRACTURES - 1,
      };
    });
    const endAt = fractures[FRACTURES - 1].ms;

    const hitting = createBeats(
      [bites],
      (ms) => ms,
      () => {
        cover!.levels(bar, 0, { x: left - LEAD, y });
        cover!.burst(target, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k) => {
        cover!.levels(bar, 0, target);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const fracturing = createBeats(
      fractures,
      (f) => f.ms,
      (f) => {
        if (f.last) {
          cover!.tierUp(bar, target);
          cover!.slam(bar);
          cover!.blast(f.at);
          return;
        }
        cover!.levels(bar, 0, f.at);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(f.shake);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          fracturing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 900) return;
          if (ms < curveMs) {
            drawWispBetween(ctx, curveAt, ms, now, SIZE * 0.5, 0.6, 0, curveMs);
            const at = curveAt(ms);
            drawDrillHead(
              ctx,
              at,
              heading,
              SIZE,
              (ms / 1000) * SPIN * Math.PI * 2,
              now,
            );
          } else {
            drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
          }
          for (const f of fractures)
            if (!f.last) drawDetonation(ctx, f.at, ms - f.ms, f.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
