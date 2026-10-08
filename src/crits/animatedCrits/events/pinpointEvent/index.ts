// the "Pinpoint" event (beam; cash): it covers its crit, whose click freezes
// the screen while six emitter wisps light up round the screen's edges;
// their aim lines flicker in on a spot, then all six beams fire at once and
// converge there in a blinding flare, a bang, a jolt and a ring of coins;
// they swing onto spot after spot, faster and faster, and the last volley
// converges on the total in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "pinpoint";
const REWARD = 4;
const SHOTS = 8;
const EDGE = 50;
const MARGIN = 120;
const TOP = 260;
const AIM = 0.55;
const BEAM_MS = 170;
const WIDTH = 14;
const COINS = 14;
const COIN_REACH: [number, number] = [40, 150];
const EMITTER = 0.38;
const SHOT_SHAKE: [number, number] = [0.6, 1.4];

export const forcePinpointEvent = registerWispEvent(
  KEY,
  "Pinpoint",
  () => CONFIG.pinpointEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.pinpointEvent;
    const total = totalSpot(area);
    const emitters: Point[] = [0.25, 0.5, 0.75].flatMap((f) => {
      const y = lerp([area.top + TOP, area.bottom - EDGE], f);
      return [
        { x: area.left + EDGE, y },
        { x: area.right - EDGE, y },
      ];
    });
    let clock = 0;
    const shots = Array.from({ length: SHOTS }, (_, k) => {
      const final = k === SHOTS - 1;
      const target: Point = final
        ? total
        : {
            x: lerp([area.left + MARGIN, area.right - MARGIN], Math.random()),
            y: lerp([area.top + TOP, area.bottom - MARGIN], Math.random()),
          };
      const span = lerp(shotsMs, k / (SHOTS - 1));
      const starts = clock;
      clock += span;
      return { target, starts, fires: starts + span * AIM, final };
    });
    const endAt = shots[SHOTS - 1].fires;

    const firing = createBeats(
      shots,
      (s) => s.fires,
      (s, k) => {
        if (s.final) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(s.target, 0.7);
        cover!.launchFrom(
          s.target,
          clampTargetsY(
            ringTargets(s.target, COINS, COIN_REACH),
            area.top + EDGE,
            area.bottom - EDGE,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOT_SHAKE, k / (SHOTS - 2)));
      },
    );

    const lamps = emitters.map((spot) => (): Point => spot);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => firing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BEAM_MS) return;
          for (const s of shots) {
            if (ms < s.starts || ms > s.fires + BEAM_MS) continue;
            if (ms < s.fires) {
              for (const e of emitters) drawAimLaser(ctx, e, s.target);
              continue;
            }
            const fade = 1 - clamp01((ms - s.fires) / BEAM_MS);
            for (const e of emitters) drawBeam(ctx, e, s.target, WIDTH, fade);
            drawBeamFlare(ctx, s.target, 80 * fade, 1, now);
          }
          for (const lamp of lamps)
            drawWispBetween(
              ctx,
              lamp,
              ms,
              now,
              WISP_SIZE * EMITTER,
              0.7,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
