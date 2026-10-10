// the "Plate Spinner" event (mix; free upgrade levels and cash): it
// covers its crit, whose click freezes the screen while a wisp darts out
// of the clicked floor's button from income bar to income bar, at each one
// flinging out a plate of cash that spins up over the bar like a juggler's
// plate on a pole, with a whirr and a jolt that lands free levels; every
// plate spins faster and faster; then one after another they fly off
// their poles and sail into the total, the last in a huge blast and shake.
// Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "plateSpinner";
const REWARD = 3;
const MAX_BARS = 4;
const PER_PLATE = 200;
const COIN = 0.45;
const DEPTH = 0.2;
// a plate spins UP px over its bar, RADIUS px round, seen FLAT; it whirls
// SPIN laps a second, up to SPIN_UP times that by the throw
const UP = 46;
const RADIUS = 58;
const FLAT = 0.3;
const SPIN = 1.2;
const SPIN_UP = 3;
const SET_MS = 220;
const SPINNER = 0.6;
const THROW_LIFT = 90;
const SET_SHAKE: [number, number] = [0.5, 1.1];

export const forcePlateSpinnerEvent = registerWispEvent(
  KEY,
  "Plate Spinner",
  () => CONFIG.plateSpinnerEvent.chance,
  (floor, context, area) => {
    const { hopsMs, spinMs, throwsMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.plateSpinnerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const plates = bars.map((bar, k) => {
      clock += lerp(hopsMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        set: clock,
        center: { x: bar.center.x, y: bar.box.y - UP },
      };
    });
    const allSet = clock + SET_MS;
    const throwStart = allSet + spinMs;
    const thrownAt = (k: number) => throwStart + throwsMs * k;
    const endAt = thrownAt(plates.length - 1) + flightMs;
    // how far round a plate has whirled, speeding up
    const whirl = (ms: number, set: number) => {
      const t = Math.max(0, ms - set) / 1000;
      const ramp = clamp01((ms - set) / (throwStart - set || 1));
      return Math.PI * 2 * SPIN * t * (1 + (SPIN_UP - 1) * ramp * 0.5);
    };

    const paths: CoinPath[] = [];
    plates.forEach((plate, k) => {
      const flies = thrownAt(k);
      for (let i = 0; i < PER_PLATE; i++) {
        const r = RADIUS * Math.sqrt(Math.random());
        const phase = Math.random() * Math.PI * 2;
        const from: Point = { x: 0, y: 0 };
        const lift: Point = { x: 0, y: 0 };
        const at: Point = { x: 0, y: 0 };
        const onPlate = (ms: number, into: Point) => {
          const a = whirl(ms, plate.set) + phase;
          const grow = easeOutBack(clamp01((ms - plate.set) / SET_MS));
          into.x = plate.center.x + Math.cos(a) * r * grow;
          into.y = plate.center.y + Math.sin(a) * r * FLAT * grow;
          return Math.sin(a);
        };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < plate.set)
            return { x: plate.center.x, y: plate.center.y, scale: 0 };
          if (ms < flies) {
            const d = onPlate(ms, at);
            return { x: at.x, y: at.y, scale: COIN * (1 + DEPTH * d) };
          }
          onPlate(flies, from);
          lift.x = from.x;
          lift.y = from.y - THROW_LIFT;
          const total = cover?.total() ?? fallback;
          bezier(
            from,
            lift,
            total,
            easeIn(clamp01((ms - flies) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    });
    // the spinner darts from plate to plate
    const spinnerAt: Point = { x: 0, y: 0 };
    const spinner = (ms: number): Point | null => {
      if (ms < 0 || ms > allSet + 200) return null;
      let from: Point = button;
      let starts = 0;
      for (const p of plates) {
        if (ms < p.set) {
          const u = smoothstep((ms - starts) / (p.set - starts));
          spinnerAt.x = lerp([from.x, p.center.x], u);
          spinnerAt.y =
            lerp([from.y, p.center.y], u) - Math.sin(Math.PI * u) * 50;
          return spinnerAt;
        }
        from = p.center;
        starts = p.set;
      }
      return from;
    };

    const setting = createBeats(
      plates,
      (p) => p.set,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), p.center);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SET_SHAKE, k / Math.max(1, plates.length - 1)));
      },
    );
    const throwing = createBeats(
      plates,
      (_, k) => thrownAt(k),
      (p) => {
        cover!.burst(p.center, 0.4);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          setting.tick(ms, now);
          throwing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            spinner,
            ms,
            now,
            WISP_SIZE * SPINNER,
            0.7,
            0,
            allSet + 200,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
