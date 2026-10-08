// the "Light Bridge" event (beam; free hires): it covers its crit, whose
// click freezes the screen while a beam of light arches out of the clicked
// floor's button, building segment by segment into a glowing bridge that
// touches down on an empty spot; a runner wisp races over the span and lands
// with a flare, a bang and a jolt as a new worker forms there; bridge after
// bridge fans out, quicker each time, the last landing in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "lightBridge";
const MAX_HIRES = 5;
const FORM_MS = 300;
const ARCH = 280;
const SEGMENTS = 16;
const BUILD = 0.5;
const OVERLAP = 0.6;
const WIDTH = 14;
const FADE_MS = 300;
const FLARE_MS = 220;
const RUNNER = 0.45;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

interface Bridge {
  hire: RewardHire;
  points: Point[];
  starts: number;
  runs: number;
  lands: number;
  runner: (ms: number) => Point;
  final: boolean;
}

export const forceLightBridgeEvent = registerWispEvent(
  KEY,
  "Light Bridge",
  () => CONFIG.lightBridgeEvent.chance,
  (floor, context) => {
    const { archesMs, holdMs, mergeMs } = CONFIG.lightBridgeEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const bridges: Bridge[] = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y };
      const top: Point = {
        x: (button.x + spot.x) / 2,
        y: Math.min(button.y, spot.y) - ARCH,
      };
      const points = Array.from({ length: SEGMENTS + 1 }, (_, i) =>
        bezier(button, top, spot, i / SEGMENTS, { x: 0, y: 0 }),
      );
      const span = lerp(archesMs, k / Math.max(1, hires.length - 1));
      const starts = clock;
      const runs = starts + span * BUILD;
      const lands = starts + span;
      clock += span * OVERLAP;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        points,
        starts,
        runs,
        lands,
        final: k === hires.length - 1,
        runner: (ms: number): Point =>
          bezier(
            button,
            top,
            spot,
            easeIn(clamp01((ms - runs) / (lands - runs))),
            at,
          ),
      };
    });
    const endAt = Math.max(...bridges.map((b) => b.lands));
    const partial: Point = { x: 0, y: 0 };

    const landing = createBeats(
      bridges,
      (b) => b.lands,
      (b, k) => {
        giveHire(b.hire);
        const spot = b.points[SEGMENTS];
        if (b.final) {
          cover!.blast(spot);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, bridges.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + FADE_MS) return;
          for (const b of bridges) {
            if (ms < b.starts || ms > b.lands + FADE_MS) continue;
            const built = clamp01((ms - b.starts) / (b.runs - b.starts));
            const alpha = 1 - clamp01((ms - b.lands) / FADE_MS);
            const reach = built * SEGMENTS;
            for (let i = 0; i < Math.ceil(reach); i++) {
              const p = b.points[i];
              const q = b.points[i + 1];
              const f = Math.min(1, reach - i);
              partial.x = lerp([p.x, q.x], f);
              partial.y = lerp([p.y, q.y], f);
              drawBeam(ctx, p, partial, WIDTH, alpha);
            }
            const flare = 1 - clamp01((ms - b.lands) / FLARE_MS);
            if (ms >= b.lands && flare > 0)
              drawBeamFlare(ctx, b.points[SEGMENTS], 60 * flare, 1, now);
            drawWispBetween(
              ctx,
              b.runner,
              ms,
              now,
              WISP_SIZE * RUNNER,
              0.8,
              b.runs,
              b.lands,
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
