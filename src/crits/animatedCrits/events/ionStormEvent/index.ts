// the "Ion Storm" event (beam): it covers its crit, whose click freezes the
// screen while beams stab down out of the sky all over it, faster and
// faster, each flickering as a thin aim line before it slams down blazing
// onto its spot in a shower of sparks, a bang, a jolt and a burst of coins;
// the last and biggest slams down onto the clicked floor's button in a huge
// blast and shake that sprays cash everywhere, and the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, lerp } from "../../../../shared/easing";
import {
  clampTargetsY,
  ringTargets,
  sprayTargets,
} from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import type { Point } from "../../../../shared/wisp";

const KEY = "ionStorm";
const REWARD = 4;
// STRIKES bolts onto spots below TOP of the screen's height, the last on the
// button, slanting up to SLANT of its width as they fall
const STRIKES = 11;
const TOP = 0.3;
const SLANT = 0.25;
// each beam BEAM px across (the last BIG times that), thinning over BEAM_MS
const BEAM = 22;
const BIG = 2.6;
const BEAM_MS = 220;
const STRIKE_COINS = 16;
const STRIKE_REACH: [number, number] = [30, 90];
const STRIKE_SHAKE: [number, number] = [1, 2];
const FINAL_COINS = 320;
const FINAL_REACH: [number, number] = [0.1, 0.55];

export const forceIonStormEvent = registerWispEvent(
  KEY,
  "Ion Storm",
  () => CONFIG.ionStormEvent.chance,
  (floor, context, area) => {
    const { aimMs, gapsMs, holdMs, mergeMs } = CONFIG.ionStormEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const strikes = Array.from({ length: STRIKES }, (_, k) => {
      const last = k === STRIKES - 1;
      const at: Point = last
        ? button
        : {
            x: area.left + width * between([0.1, 0.9]),
            y: area.top + height * between([TOP, 0.9]),
          };
      const sky = {
        x: at.x + width * SLANT * (Math.random() - 0.5) * 2,
        y: area.top - 40,
      };
      const aimFrom = clock;
      clock += lerp(gapsMs, k / (STRIKES - 1));
      return {
        at,
        sky,
        aimFrom,
        hitAt: aimFrom + aimMs * (last ? 2 : 1),
        last,
      };
    });
    const endAt = strikes[STRIKES - 1].hitAt;
    const tip = { x: 0, y: 0 };

    const hits = createBeats(
      strikes,
      (s) => s.hitAt,
      (s, k) => {
        if (s.last) {
          cover!.blast(s.at);
          cover!.launchFrom(
            s.at,
            clampTargetsY(
              sprayTargets(s.at, FINAL_COINS, [
                span * FINAL_REACH[0],
                span * FINAL_REACH[1],
              ]),
              area.top + 40,
              area.bottom - 20,
            ),
          );
          return;
        }
        cover!.launchFrom(s.at, ringTargets(s.at, STRIKE_COINS, STRIKE_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (STRIKES - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => hits.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          for (const s of strikes) {
            if (ms < s.aimFrom || ms >= s.hitAt + BEAM_MS * (s.last ? 2 : 1))
              continue;
            if (ms < s.hitAt) {
              drawAimLaser(ctx, s.sky, s.at);
              continue;
            }
            const t = clamp01((ms - s.hitAt) / (BEAM_MS * (s.last ? 2 : 1)));
            const w = BEAM * (s.last ? BIG : 1) * (1 - t) ** 0.6;
            tip.x = s.at.x;
            tip.y = s.at.y;
            drawBeam(ctx, s.sky, tip, w);
            drawBeamFlare(ctx, tip, w * 1.4, 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
