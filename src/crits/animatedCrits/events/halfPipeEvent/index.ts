// the "Half-Pipe" event (money; cash): it covers its crit, whose click
// freezes the screen while a river of cash drops into a half-pipe curving
// across the bottom of the screen and rides it like a skater, carving down
// one wall and up the other, every lip it reaches a splash and a jolt, each
// pass climbing higher; on the last pass it launches clean off the lip in a
// soaring arc into the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "halfPipe";
const REWARD = 4;
const PASSES = 5;
const EDGE = 70;
const BOTTOM = 80;
const TOP = 260;
// each lip a share of the pipe's height, climbing pass by pass
const LIP: [number, number] = [0.3, 0.85];
const STEPS = 40;
const LIP_SHAKE: [number, number] = [0.5, 1.2];

export const forceHalfPipeEvent = registerWispEvent(
  KEY,
  "Half-Pipe",
  () => CONFIG.halfPipeEvent.chance,
  (floor, context, area) => {
    const { passesMs, launchMs, holdMs, mergeMs } = CONFIG.halfPipeEvent;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const cx = (left + right) / 2;
    const half = (right - left) / 2;
    const floorY = area.bottom - BOTTOM;
    const height = floorY - (area.top + TOP);
    const lip = (k: number) => height * lerp(LIP, k / PASSES);
    let clock = 0;
    const passes = Array.from({ length: PASSES }, (_, k) => {
      const dir = k % 2 === 0 ? 1 : -1;
      const from = lip(k);
      const to = lip(k + 1);
      const line = sampleLine((u) => {
        const s = -dir + 2 * dir * u;
        const h = (s * dir < 0 ? from : to) * s * s;
        return { x: cx + s * half, y: floorY - h };
      }, STEPS);
      const travelMs = lerp(passesMs, k / (PASSES - 1));
      const pour: Pour = {
        coinsAlong: 520,
        width: 30,
        streamMs: travelMs * 0.5,
        travelMs,
      };
      const starts = clock;
      clock += travelMs;
      return { line, pour, starts, tops: clock, lip: line[line.length - 1] };
    });
    const last = passes[PASSES - 1];
    const total = totalSpot(area);
    const into: Point = { x: 0, y: 0 };
    const ctrl: Point = {
      x: (last.lip.x + total.x) / 2,
      y: Math.min(last.lip.y, total.y) - 220,
    };
    const launch = sampleLine(
      (u) => ({ ...bezier(last.lip, ctrl, total, u, into) }),
      40,
    );
    const flight: Pour = {
      coinsAlong: 620,
      width: 34,
      streamMs: launchMs * 0.6,
      travelMs: launchMs,
    };
    const launches = last.tops;
    const endAt = launches + launchMs;
    const durationMs = Math.max(
      pourDurationMs(launches, flight),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      passes,
      (p) => p.starts,
      (p) => pourLine(cover!, p.line, p.pour),
    );
    const topping = createBeats(
      passes,
      (p) => p.tops,
      (p, k) => {
        cover!.burst(p.lip, 0.6);
        if (p === last) pourLine(cover!, launch, flight);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LIP_SHAKE, k / (PASSES - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          topping.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
