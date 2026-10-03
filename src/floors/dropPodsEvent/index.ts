// the "Drop Pods" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while blinking bomb wisps streak in from high off
// the top of the screen at a steep slant, one after another like drop pods,
// fuses blazing; each slams down onto an empty spot on a floor in view and
// goes off in a white blast, a bang and a big jolt, and a new worker stands
// up out of it; they rain in ever faster, the last in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "dropPods";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
// pods come in SLANT px sideways for every px they fall
const SLANT = 0.45;
const POD = 0.45;
const FUSE = 20;
const BLAST = 170;
const SLAM_SHAKE: [number, number] = [0.8, 1.5];

export const forceDropPodsEvent = registerWispEvent(
  KEY,
  "Drop Pods",
  () => CONFIG.dropPodsEvent.chance,
  (floor, context, area) => {
    const { gapsMs, fallMs, holdMs, mergeMs } = CONFIG.dropPodsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    let clock = 0;
    const pods = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const from: Point = {
        x: spot.x + side * (spot.y - area.top + 80) * SLANT,
        y: area.top - 80,
      };
      const drops = clock;
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        drops,
        lands: drops + fallMs,
        at: (ms: number): Point => {
          const u = easeIn(clamp01((ms - drops) / fallMs));
          at.x = lerp([from.x, spot.x], u);
          at.y = lerp([from.y, spot.y], u);
          return at;
        },
      };
    });
    const last = pods[pods.length - 1];
    const endAt = last.lands;

    const slamming = createBeats(
      pods,
      (p) => p.lands,
      (p, k) => {
        giveHire(p.hire);
        if (p === last) {
          cover!.blast(p.spot);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, k / Math.max(1, pods.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => slamming.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_000) return;
          for (const p of pods) {
            if (p !== last)
              drawDetonation(ctx, p.spot, ms - p.lands, BLAST, now);
            if (ms < p.drops || ms >= p.lands) continue;
            drawLitFuse(
              ctx,
              p.at(ms),
              clamp01((ms - p.drops) / fallMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              p.at,
              ms,
              now,
              WISP_SIZE * POD,
              1,
              p.drops,
              p.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
