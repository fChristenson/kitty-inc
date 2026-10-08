// the "Fuse Race" event (explosion; free upgrade levels): it covers its crit,
// whose click freezes the screen while lit bomb wisps shoot out of the
// clicked floor's button and race each other along wiggling fuses to the
// income bars in view, fizzing and blinking ever faster; one by one they
// reach their bars and go off, each a white blast, a bang and a big jolt that
// lands free levels; the last to arrive goes off in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "fuseRace";
const MAX_BARS = 4;
// fuses wiggle WIGGLE px, WAVES times along their length
const WIGGLE = 40;
const WAVES = 3;
const BOMB = 0.42;
const FUSE = 22;
const BLAST = 150;
const BLAST_SHAKE: [number, number] = [0.8, 1.5];

export const forceFuseRaceEvent = registerWispEvent(
  KEY,
  "Fuse Race",
  () => CONFIG.fuseRaceEvent.chance,
  (floor, context) => {
    const { racesMs, holdMs, mergeMs } = CONFIG.fuseRaceEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const racers = bars
      .map((bar) => {
        const spot: Point = {
          x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.6,
          y: bar.center.y,
        };
        const phase = Math.random() * Math.PI * 2;
        const at: Point = { x: 0, y: 0 };
        const dx = spot.x - button.x;
        const dy = spot.y - button.y;
        const length = Math.hypot(dx, dy) || 1;
        return {
          bar,
          spot,
          arrives: 0,
          path: (u: number, into: Point) => {
            const wave =
              Math.sin(u * WAVES * Math.PI * 2 + phase) *
              WIGGLE *
              Math.sin(Math.PI * u);
            into.x = button.x + dx * u + (-dy / length) * wave;
            into.y = button.y + dy * u + (dx / length) * wave;
            return into;
          },
          at,
        };
      })
      .map((r, k, all) => ({
        ...r,
        arrives:
          lerp(racesMs, k / Math.max(1, all.length - 1)) *
          (0.85 + 0.3 * Math.random()),
      }))
      .sort((a, b) => a.arrives - b.arrives);
    const last = racers[racers.length - 1];
    const endAt = last.arrives;
    const bombs = racers.map(
      (r) =>
        (ms: number): Point | null =>
          ms >= r.arrives ? null : r.path(ms / r.arrives, r.at),
    );

    const blasting = createBeats(
      racers,
      (r) => r.arrives,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor), r.spot);
        if (r === last) {
          cover!.slam(r.bar);
          cover!.blast(r.spot);
          return;
        }
        cover!.burst(r.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, racers.length - 1)));
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
        tick: (ms, now) => blasting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          racers.forEach((r, k) => {
            if (r !== last)
              drawDetonation(ctx, r.spot, ms - r.arrives, BLAST, now);
            const p = bombs[k](ms);
            if (p) drawLitFuse(ctx, p, clamp01(ms / r.arrives), FUSE, now);
            drawWispBetween(
              ctx,
              bombs[k],
              ms,
              now,
              WISP_SIZE * BOMB,
              0.7,
              0,
              r.arrives,
            );
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
