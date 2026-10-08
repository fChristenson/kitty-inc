// the "Negative" event (an experiment beyond the four templates: the frozen
// screen's colours invert): it covers its crit, whose click freezes the
// screen while it strobes between itself and its photo negative, ever
// faster, every flip a bloop, a jolt and coins bursting out somewhere on it;
// then it snaps back in a white flash and a huge blast and shake that sprays
// cash everywhere, and the coins sweep into the total-income readout. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import {
  clampTargetsY,
  ringTargets,
  sprayTargets,
} from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "negative";
const REWARD = 4;
// FLIPS flips, the screen negative after every other one
const FLIPS = 11;
const FLIP_COINS = 18;
const FLIP_REACH: [number, number] = [30, 100];
const FLIP_SHAKE: [number, number] = [0.8, 2];
const FINAL_COINS = 340;
const FINAL_REACH: [number, number] = [0.08, 0.6];

export const forceNegativeEvent = registerWispEvent(
  KEY,
  "Negative",
  () => CONFIG.negativeEvent.chance,
  (floor, context, area) => {
    const { gapsMs, holdMs, mergeMs } = CONFIG.negativeEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const mid = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const flips: number[] = [];
    let clock = 0;
    for (let k = 0; k < FLIPS; k++) {
      flips.push(clock);
      clock += lerp(gapsMs, k / (FLIPS - 1));
    }
    const snapAt = clock;

    const flipping = createBeats(
      flips,
      (ms) => ms,
      (_, k) => {
        const at = {
          x: area.left + width * between([0.15, 0.85]),
          y: area.top + height * between([0.25, 0.85]),
        };
        cover!.launchFrom(at, ringTargets(at, FLIP_COINS, FLIP_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FLIP_SHAKE, k / (FLIPS - 1)));
      },
    );
    const snap = createBeats(
      [snapAt],
      (ms) => ms,
      () => {
        cover!.burst(mid, 3);
        cover!.blast(mid);
        cover!.launchFrom(
          mid,
          clampTargetsY(
            sprayTargets(mid, FINAL_COINS, [
              span * FINAL_REACH[0],
              span * FINAL_REACH[1],
            ]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: snapAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flipping.tick(ms, now);
          snap.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= snapAt) return;
          const latest = flipping.latest();
          if (!latest || latest.index % 2 === 1) return;
          ctx.save();
          ctx.globalCompositeOperation = "difference";
          ctx.fillStyle = COLOR.white;
          ctx.fillRect(area.left, area.top, width, height);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
