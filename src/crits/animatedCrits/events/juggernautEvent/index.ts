// the "Juggernaut" event (wisp; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while a wisp drops in at a
// top corner and careens down the screen wall to wall, swelling bigger,
// hotter and faster with every bounce, each wall a bang and a jolt; every
// income bar it ploughs through on the way down jolts with free levels, and
// it smashes into the clicked floor's bar at full size in a huge blast and
// shake: that bar jumps one crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "juggernaut";
const LEGS = 5;
const EDGE = 50;
// it swells from SIZE[0] to SIZE[1] wisps across
const SIZE: [number, number] = [0.8, 2.8];
const WALL_SHAKE: [number, number] = [0.5, 1.4];

export const forceJuggernautEvent = registerWispEvent(
  KEY,
  "Juggernaut",
  () => CONFIG.juggernautEvent.chance,
  (floor, context, area) => {
    const { legsMs, levelShare, holdMs, mergeMs } = CONFIG.juggernautEvent;
    const all = findRewardBars(floor, context);
    const own = all.find((b) => b.floor === floor);
    if (!own) return;
    const startY = area.top - 40;
    const side = Math.random() < 0.5 ? -1 : 1;
    // wall to wall, stepping down to the clicked floor's bar
    const stops: Point[] = [];
    for (let k = 0; k <= LEGS; k++) {
      const wall =
        (k % 2 === 0 ? side : -side) > 0 ? area.right - EDGE : area.left + EDGE;
      stops.push({
        x: wall,
        y: startY + ((own.center.y - startY) * k) / (LEGS + 1),
      });
    }
    stops.push(own.center);
    const starts: number[] = [0];
    for (let k = 0; k + 1 < stops.length; k++)
      starts.push(starts[k] + lerp(legsMs, k / (stops.length - 2)));
    const smashAt = starts[starts.length - 1];
    // every bar above the clicked one it ploughs through, and when
    const crossings: { bar: RewardBar; at: number; spot: Point }[] = [];
    for (const bar of all) {
      if (bar === own) continue;
      for (let k = 0; k + 1 < stops.length; k++) {
        const a = stops[k];
        const b = stops[k + 1];
        if ((bar.center.y - a.y) * (bar.center.y - b.y) > 0) continue;
        const f = (bar.center.y - a.y) / (b.y - a.y || 1);
        crossings.push({
          bar,
          at: starts[k] + (starts[k + 1] - starts[k]) * f,
          spot: { x: a.x + (b.x - a.x) * f, y: bar.center.y },
        });
        break;
      }
    }
    const bars = [...crossings.map((c) => c.bar), own];
    const into: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point | null => {
      if (ms < 0 || ms >= smashAt) return null;
      let k = 0;
      while (ms >= starts[k + 1]) k++;
      const u = easeIn((ms - starts[k]) / (starts[k + 1] - starts[k]));
      into.x = stops[k].x + (stops[k + 1].x - stops[k].x) * u;
      into.y = stops[k].y + (stops[k + 1].y - stops[k].y) * u;
      return into;
    };

    const bouncing = createBeats(
      starts.slice(1, -1),
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, LEGS - 1);
        cover!.burst(stops[k + 1], 0.4 + 0.5 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(WALL_SHAKE, t));
      },
    );
    const ploughing = createBeats(
      crossings,
      (c) => c.at,
      (c) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2), c.spot);
        cover!.burst(c.spot, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const smashing = createBeats(
      [smashAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, stops[stops.length - 2]);
        cover!.levels(own, levelsFor(own.floor, levelShare, 3));
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: smashAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          ploughing.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const grow = clamp01(ms / smashAt);
          drawWispBetween(
            ctx,
            ball,
            ms,
            now,
            WISP_SIZE * lerp(SIZE, grow),
            grow,
            0,
            smashAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
