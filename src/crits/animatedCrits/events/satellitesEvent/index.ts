// the "Satellites" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while wisps streak in off the screen's
// edges one after another, each skimming straight through an income bar
// (a flash, a bang and a jolt that lands free levels) and swinging into
// orbit round the clicked floor's button, every one on its own ring, ever
// faster; with all of them circling, the orbits decay and they spiral down
// onto the button together in a huge blast as every bar slams. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "satellites";
const MIN_SATELLITES = 4;
const MAX_BARS = 5;
// ring k sits RING + k × RING_STEP px out, circling once every PERIOD ms
const RING = 90;
const RING_STEP = 45;
const PERIOD = 650;
const SAT = 0.7;
const SKIM_SHAKE: [number, number] = [0.7, 1.4];

export const forceSatellitesEvent = registerWispEvent(
  KEY,
  "Satellites",
  () => CONFIG.satellitesEvent.chance,
  (floor, context, area) => {
    const {
      launchGapsMs,
      approachMs,
      circleMs,
      collapseMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.satellitesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const count = Math.max(MIN_SATELLITES, bars.length);
    const launches: number[] = [0];
    for (let k = 1; k < count; k++)
      launches.push(
        launches[k - 1] + lerp(launchGapsMs, (k - 1) / Math.max(1, count - 2)),
      );
    const captured = launches[count - 1] + approachMs;
    const collapseAt = captured + circleMs;
    const endAt = collapseAt + collapseMs;
    const sats = Array.from({ length: count }, (_, k) => {
      const bar: RewardBar | undefined = bars[k];
      const ring = RING + k * RING_STEP;
      const phase = (k / count) * Math.PI * 2;
      const entry: Point = {
        x: button.x + Math.cos(phase) * ring,
        y: button.y + Math.sin(phase) * ring,
      };
      const side = (k % 2 === 0 ? 1 : -1) * dir;
      const from: Point = bar
        ? {
            x: side > 0 ? area.right + 80 : area.left - 80,
            y: bar.center.y,
          }
        : {
            x: area.left + Math.random() * (area.right - area.left),
            y: area.top - 80,
          };
      const route = bar ? [from, bar.center, entry] : [from, entry];
      const head: Point = { x: 0, y: 0 };
      const launch = launches[k];
      const capture = launch + approachMs;
      return {
        bar,
        launch,
        skimAt: launch + approachMs * 0.5,
        at: (ms: number): Point | null => {
          if (ms < launch || ms > endAt) return null;
          if (ms < capture)
            return alongRoute(route, (ms - launch) / approachMs, head);
          const t = (ms - capture) / PERIOD;
          const a = phase + dir * Math.PI * 2 * (t + 0.3 * t * t);
          const r =
            ring * (1 - easeIn(clamp01((ms - collapseAt) / collapseMs)));
          head.x = button.x + Math.cos(a) * r;
          head.y = button.y + Math.sin(a) * r;
          return head;
        },
      };
    });
    const skims = sats.filter((s) => s.bar);

    const skimming = createBeats(
      skims,
      (s) => s.skimAt,
      (s, k) => {
        const t = k / Math.max(1, skims.length - 1);
        cover!.levels(s.bar!, levelsFor(s.bar!.floor, levelShare, 2));
        cover!.burst(s.bar!.center, 0.6 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SKIM_SHAKE, t));
      },
    );
    const landing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(button);
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
          skimming.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / endAt);
          for (const sat of sats)
            drawWispBetween(
              ctx,
              sat.at,
              ms,
              now,
              WISP_SIZE * SAT,
              heat,
              sat.launch,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
